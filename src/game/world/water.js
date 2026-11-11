import { keyOf, parse, rowMajor, cellSolids } from './cells.js'

// Water the map paints (docs/adr/0003). A tiles layer named `water` makes the map own the ponds:
// the game stops inventing them and derives everything water does — collision, pond life, waves —
// from the painted cells. Cells are "x,y" keys in world tiles; positions come out in world px.
export const WATER_LAYER = 'water'

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

// waterCellsOf: the painted cells of the water layer in the runtime index, or null when the map
// paints none — which is what keeps the procedural ponds for a map without water.
export function waterCellsOf(layers) {
  const layer = (layers || []).find(l => l.name === WATER_LAYER)
  return layer ? [...layer.cells.keys()] : null
}

// waterBodies: the 4-connected groups of water cells, each as the pond record the rest of the game
// already reads ({ x, y, r }: centroid and equal-area radius) plus its cells. Walked in row-major
// order, so the same map always yields the same bodies in the same order and the seeded pond life
// does not reshuffle between builds.
export function waterBodies(keys, tile) {
  const left = new Set(keys)
  const bodies = []
  for (const [x, y] of rowMajor(left)) {
    if (left.has(keyOf(x, y))) bodies.push(toBody(floodFrom(left, x, y), tile))
  }
  return bodies
}

function floodFrom(left, x, y) {
  const cells = []
  const todo = [[x, y]]
  left.delete(keyOf(x, y))
  while (todo.length) {
    const [cx, cy] = todo.pop()
    cells.push(keyOf(cx, cy))
    for (const [dx, dy] of STEPS) {
      if (left.delete(keyOf(cx + dx, cy + dy))) todo.push([cx + dx, cy + dy])
    }
  }
  return cells
}

function toBody(keys, tile) {
  const cells = rowMajor(keys)
  const mean = i => cells.reduce((sum, c) => sum + c[i], 0) / cells.length
  return {
    x: (mean(0) + 0.5) * tile,
    y: (mean(1) + 0.5) * tile,
    r: Math.sqrt(cells.length / Math.PI) * tile,
    cells: cells.map(([x, y]) => keyOf(x, y)),
  }
}

// waterSolids: collision that follows the painted shape. Every water cell blocks, pulled in by
// `inset` px on each side that faces land so the player can stand on the dirt bank the shore tiles
// draw. Neighbouring cells of a row that end up the same height merge into one box, so a pond costs
// a few AABBs rather than one per tile.
export function waterSolids(bodies, tile, inset) {
  return cellSolids(bodies.flatMap(b => b.cells), tile, inset)
}

// undersizedBodies: the bodies holding no 2x2 square. The 9-cell water set has no frame for a strip
// one cell wide, so the import refuses them rather than ship a pond drawn as broken shore.
export function undersizedBodies(bodies) {
  return bodies.filter(b => !hasSquare(new Set(b.cells)))
}

function hasSquare(cells) {
  return [...cells].map(parse).some(([x, y]) =>
    cells.has(keyOf(x + 1, y)) && cells.has(keyOf(x, y + 1)) && cells.has(keyOf(x + 1, y + 1)))
}
