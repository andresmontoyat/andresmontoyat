// The player's collision box. stepMovement and hits treat it as a square of half-width w / 2 centred
// on the player's position; h is kept for the depth sort (the avatar's ground line).
export const PLAYER_BOX = { w: 24, h: 28 }

export function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// A solid is either an AABB ({x,y,w,h}) or a circle ({cx,cy,r} — used for ponds). For a circle we
// test the closest point on the player's AABB to the circle centre against the radius.
function hitsCircle(cx, cy, half, s) {
  const nx = Math.max(cx - half, Math.min(s.cx, cx + half))
  const ny = Math.max(cy - half, Math.min(s.cy, cy + half))
  return (nx - s.cx) ** 2 + (ny - s.cy) ** 2 < s.r * s.r
}

export function hits(cx, cy, half, solids) {
  for (const s of solids) {
    if (s.r != null) {
      if (hitsCircle(cx, cy, half, s)) return true
    } else if (aabb(cx - half, cy - half, half * 2, half * 2, s.x, s.y, s.w, s.h)) return true
  }
  return false
}

export function stepMovement(p, input, solids, bounds, opts = {}) {
  const sp = opts.speed || 2.6
  if (input.frozen) return { x: p.x, y: p.y, dir: p.dir, moving: false }
  let mx = 0
  let my = 0
  let dir = p.dir
  if (input.L) { mx = -sp; dir = 'left' }
  if (input.R) { mx = sp; dir = 'right' }
  if (input.U) { my = -sp; dir = 'up' }
  if (input.D) { my = sp; dir = 'down' }
  let { x, y } = p
  const half = (p.w || 20) / 2
  if (mx && !hits(x + mx, y, half, solids)) x += mx
  if (my && !hits(x, y + my, half, solids)) y += my
  x = Math.max(half, Math.min(bounds.w - half, x))
  y = Math.max(half, Math.min(bounds.h - half, y))
  return { x, y, dir, moving: !!(mx || my) }
}
