export function followCamera2D(cam, tx, ty, VW, VH, worldW, worldH, k = 0.12) {
  cam.x += (tx - VW / 2 - cam.x) * k
  cam.y += (ty - VH / 2 - cam.y) * k
  cam.x = clampAxis(cam.x, worldW, VW)
  cam.y = clampAxis(cam.y, worldH, VH)
}

// A world smaller than the viewport (an interior) is centred and never scrolls.
function clampAxis(v, worldSize, viewSize) {
  if (worldSize < viewSize) return (worldSize - viewSize) / 2
  return Math.max(0, Math.min(worldSize - viewSize, v))
}

export function shake2D(mag, rnd = Math.random) {
  if (!mag) return { x: 0, y: 0 }
  return { x: (rnd() * 2 - 1) * mag, y: (rnd() * 2 - 1) * mag }
}
