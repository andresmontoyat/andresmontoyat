import { cellSolids } from './cells.js'

// Walls the map paints (docs/adr/0005). A tiles layer named `walls` blocks every cell it paints, the
// whole cell: what the author sees as wall is what stops the player. A doorway is a cell left
// unpainted. Read the same way on the exterior and in every interior.
export const WALLS_LAYER = 'walls'

// wallCellsOf: the painted cells of the walls layer in the runtime index; none for a map without one,
// which therefore blocks exactly as it did before the layer existed.
export function wallCellsOf(layers) {
  const layer = (layers || []).find(l => l.name === WALLS_LAYER)
  return layer ? [...layer.cells.keys()] : []
}

export function wallSolids(keys, tile) {
  return cellSolids(keys, tile)
}
