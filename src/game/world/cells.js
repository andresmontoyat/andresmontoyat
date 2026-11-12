// Painted cells as collision. Shared by the layers whose cells block — `water` (docs/adr/0003) and
// `walls` (docs/adr/0005). Cells are "x,y" keys in world tiles; boxes come out in world px.
export const keyOf = (x, y) => `${x},${y}`
export const parse = k => k.split(',').map(Number)
export const rowMajor = keys => [...keys].map(parse).sort((a, b) => a[1] - b[1] || a[0] - b[0])

// cellSolids: one box per painted cell, pulled in by `inset` px on each side that faces an unpainted
// cell, then the neighbouring boxes of a row that end up the same height merged into one — so a
// layer costs a few AABBs rather than one per tile. With no inset every cell blocks to its edge.
export function cellSolids(keys, tile, inset = 0) {
  const painted = new Set(keys)
  return rowMajor(painted).map(([x, y]) => cellBox(painted, x, y, { tile, inset })).reduce(mergeRun, [])
}

function cellBox(painted, x, y, { tile, inset }) {
  const edge = (dx, dy) => (painted.has(keyOf(x + dx, y + dy)) ? 0 : inset)
  const x0 = x * tile + edge(-1, 0)
  const y0 = y * tile + edge(0, -1)
  return { x: x0, y: y0, w: (x + 1) * tile - edge(1, 0) - x0, h: (y + 1) * tile - edge(0, 1) - y0 }
}

function mergeRun(boxes, b) {
  const last = boxes[boxes.length - 1]
  if (!last || last.y !== b.y || last.h !== b.h || last.x + last.w !== b.x) return [...boxes, b]
  return [...boxes.slice(0, -1), { ...last, w: b.x + b.w - last.x }]
}
