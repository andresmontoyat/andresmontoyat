import { describe, it, expect } from 'vitest'
import { wallSolids, wallCellsOf, WALLS_LAYER } from './walls.js'

const TILE = 32
// A 3x2 block at cells (0..2, 0..1) and a lone pillar at (5, 4).
const BLOCK = ['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']

describe('wallSolids', () => {
  it('merges each row of a block into one box', () => {
    expect(wallSolids(BLOCK, TILE)).toEqual([
      { x: 0, y: 0, w: 96, h: 32 },
      { x: 0, y: 32, w: 96, h: 32 },
    ])
  })

  it('blocks the whole cell, with no inset on any side', () => {
    expect(wallSolids(['5,4'], TILE)).toEqual([{ x: 160, y: 128, w: 32, h: 32 }])
  })

  it('keeps a doorway gap between two runs of one row', () => {
    expect(wallSolids(['0,9', '1,9', '3,9', '4,9'], TILE)).toEqual([
      { x: 0, y: 288, w: 64, h: 32 },
      { x: 96, y: 288, w: 64, h: 32 },
    ])
  })

  it('has nothing to block for no cells', () => {
    expect(wallSolids([], TILE)).toEqual([])
  })
})

describe('wallCellsOf', () => {
  const layer = (name, keys) => ({ name, cells: new Map(keys.map(k => [k, 'f0'])) })

  it('reads the painted cells of the walls layer', () => {
    expect(wallCellsOf([layer('floor', ['9,9']), layer(WALLS_LAYER, ['0,0', '1,0'])])).toEqual(['0,0', '1,0'])
  })

  it('is empty for a map without the layer', () => {
    expect(wallCellsOf([layer('floor', ['0,0'])])).toEqual([])
    expect(wallCellsOf(undefined)).toEqual([])
  })
})
