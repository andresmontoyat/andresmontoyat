import { describe, it, expect } from 'vitest'
import {
  buildInteriorWorld, adoptedInteriorIds, loadInterior, withInteriorAtlas, placementSolids,
} from './interiors.js'

const DATA = {
  tiles: {
    cols: 20, rows: 15, frames: ['f0'],
    layers: [{ name: 'floor', cells: [[0, 0, 0]] }],
  },
  placements: [
    { frame: 'chair', x: 10, y: 10, uid: 'U1', solid: { x: 1, y: 2, w: 3, h: 4 } },
    { frame: 'rug', x: 20, y: 20, uid: 'U2' },
  ],
  clips: {},
  interactables: [
    { uid: 'I1', kind: 'read', id: '3', x: 3, y: 3 },
    { uid: 'I2', kind: 'read', id: '1', x: 1, y: 1 },
    { uid: 'I3', kind: 'npc', id: 'host', x: 5, y: 5 },
    { uid: 'I4', kind: 'read', id: '4', x: 4, y: 4 },
    { uid: 'I5', kind: 'read', id: '2', x: 2, y: 2 },
    { uid: 'I6', kind: 'spawn', spawn: true, x: 7, y: 8 },
    { uid: 'I7', kind: 'exit', exit: true, x: 9, y: 9 },
  ],
}
const ATLAS = { images: { interior: '/game/interiors/tul-2022.png' }, frames: { chair: { img: 'interior', x: 0, y: 0, w: 1, h: 1 } } }
const FAKE = {
  '../../data/interiors/tul-2022.json': () => Promise.resolve(DATA),
  '../../data/interiors/tul-2022.atlas.json': () => Promise.resolve(ATLAS),
}

describe('adoptedInteriorIds', () => {
  it('lists ids and skips atlas files', () => {
    expect(adoptedInteriorIds(FAKE)).toEqual(new Set(['tul-2022']))
  })
  it('is empty when nothing is adopted', () => {
    expect(adoptedInteriorIds({})).toEqual(new Set())
  })
})

describe('loadInterior', () => {
  it('resolves data and atlas', async () => {
    expect(await loadInterior('tul-2022', FAKE)).toEqual({ data: DATA, atlas: ATLAS })
  })
  it('rejects an unknown id', async () => {
    await expect(loadInterior('nope', FAKE)).rejects.toThrow(/nope/)
  })
})

describe('buildInteriorWorld', () => {
  const w = buildInteriorWorld(DATA)
  it('takes spawn, host and exit from the tagged entries', () => {
    expect(w.spawn).toEqual({ x: 7, y: 8 })
    expect(w.host.uid).toBe('I3')
    expect(w.exit.uid).toBe('I7')
  })
  it('sorts reads by bullet number', () => {
    expect(w.reads.map(r => r.id)).toEqual(['1', '2', '3', '4'])
  })
  it('sizes the world from the map', () => {
    expect(w.worldW).toBe(640)
    expect(w.worldH).toBe(480)
    expect(w.interior).toBe(true)
    expect(w.sites).toEqual([])
  })
  it('collects solids from placements', () => {
    expect(w.placementSolids).toEqual([{ x: 1, y: 2, w: 3, h: 4 }])
    expect(placementSolids(DATA.placements)).toEqual(w.placementSolids)
  })
})

describe('withInteriorAtlas', () => {
  const main = { images: { atlas: '/a.png' }, frames: { chair: { img: 'atlas' }, cfPlayerDown: { img: 'atlas' } } }
  const merged = withInteriorAtlas(main, ATLAS)
  it('lets interior frames win', () => {
    expect(merged.frames.chair.img).toBe('interior')
  })
  it('keeps main-only frames and both images', () => {
    expect(merged.frames.cfPlayerDown).toEqual({ img: 'atlas' })
    expect(Object.keys(merged.images)).toEqual(['atlas', 'interior'])
  })
})
