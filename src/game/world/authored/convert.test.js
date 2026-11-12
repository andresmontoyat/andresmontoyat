import { describe, it, expect } from 'vitest'
import {
  splitRef, slugFor, frameNameFor, publicUrlFor,
  classifyLayer, anchorsFrom, placementsFrom,
  tilesFrom, framesFrom, convertMap, validateMap, gridOf,
  worldScaleOf, WORLD_TILE, rectFor, interactablesFrom, doorCoverage, solidFor,
} from './convert.js'

describe('splitRef', () => {
  it('splits a bundle ref into path and cell', () => {
    expect(splitRef('Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png#3,2'))
      .toEqual({ path: 'Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png', col: 3, row: 2 })
  })
  it('throws on a ref with no cell part', () => {
    expect(() => splitRef('Cute_Fantasy/Tiles/Grass.png')).toThrow(/malformed ref/)
  })
  it('parses a zero cell and a multi-digit cell', () => {
    expect(splitRef('a/b.png#0,12')).toEqual({ path: 'a/b.png', col: 0, row: 12 })
  })
  it('rejects a non-numeric cell', () => {
    expect(() => splitRef('a/b.png#abc,2')).toThrow(/non-negative integers/)
  })
  it('rejects a negative cell', () => {
    expect(() => splitRef('a/b.png#-1,2')).toThrow(/non-negative integers/)
  })
})

describe('slugFor', () => {
  it('strips the pack root and extension and prefixes am_', () => {
    expect(slugFor('Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png'))
      .toBe('am_Tiles_Grass_Grass_1_Middle')
  })
  it('collapses spaces and parentheses into single underscores', () => {
    expect(slugFor('Cute_Fantasy/NPCs (Premade)/Old Man.png'))
      .toBe('am_NPCs_Premade_Old_Man')
  })
  it('is idempotent for the same input', () => {
    const p = 'Cute_Fantasy/Trees/Tree.png'
    expect(slugFor(p)).toBe(slugFor(p))
  })
})

describe('frameNameFor', () => {
  it('appends the cell coordinates to the slug', () => {
    expect(frameNameFor('Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png#3,2'))
      .toBe('am_Tiles_Grass_Grass_1_Middle_3_2')
  })
  it('never collides with a hand-curated name', () => {
    expect(frameNameFor('Cute_Fantasy/x/house.png#0,0').startsWith('am_')).toBe(true)
  })
})

describe('publicUrlFor', () => {
  it('maps the pack root onto the public game path', () => {
    expect(publicUrlFor('Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png'))
      .toBe('/game/cute-fantasy/Tiles/Grass/Grass_1_Middle.png')
  })
  it('url-encodes spaces and parentheses so the browser can fetch it', () => {
    expect(publicUrlFor('Cute_Fantasy/NPCs (Premade)/Old Man.png'))
      .toBe('/game/cute-fantasy/NPCs%20(Premade)/Old%20Man.png')
  })
})

describe('classifyLayer', () => {
  it('reads the biome out of an anchor layer name', () => {
    expect(classifyLayer({ name: 'anchor:pradera', type: 'objects' }))
      .toEqual({ kind: 'anchor', biome: 'pradera' })
  })
  it('treats any other objects layer as placements', () => {
    expect(classifyLayer({ name: 'props', type: 'objects' })).toEqual({ kind: 'objects' })
  })
  it('treats tiles layers as terrain', () => {
    expect(classifyLayer({ name: 'suelo', type: 'tiles' })).toEqual({ kind: 'tiles' })
  })
  it('rejects an anchor layer naming an unknown biome', () => {
    expect(() => classifyLayer({ name: 'anchor:atlantis', type: 'objects' }))
      .toThrow(/unknown biome "atlantis"/)
  })
})

describe('anchorsFrom', () => {
  const anchorLayer = (biome, x, y) => ({
    name: `anchor:${biome}`, type: 'objects', objects: [{ frame: 'x.png#0,0', x, y }],
  })

  it('maps each anchor layer to its single object position', () => {
    expect(anchorsFrom([anchorLayer('farm', 360, 1120), anchorLayer('cyber', 1360, 1040)]))
      .toEqual({ farm: { x: 360, y: 1120 }, cyber: { x: 1360, y: 1040 } })
  })
  it('returns an empty object when no anchor layers exist', () => {
    expect(anchorsFrom([{ name: 'props', type: 'objects', objects: [] }])).toEqual({})
  })
  it('rejects an anchor layer with no object', () => {
    expect(() => anchorsFrom([{ name: 'anchor:farm', type: 'objects', objects: [] }]))
      .toThrow(/anchor:farm.*exactly one object.*got 0/)
  })
  it('rejects an anchor layer with more than one object', () => {
    const two = { name: 'anchor:farm', type: 'objects', objects: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }
    expect(() => anchorsFrom([two])).toThrow(/anchor:farm.*exactly one object.*got 2/)
  })
})

describe('anchor bounds', () => {
  const anchorLayer = (biome, x, y) => ({
    name: `anchor:${biome}`, type: 'objects', objects: [{ frame: 'x.png#0,0', x, y }],
  })

  it('accepts an anchor inside the world when a world is given', () => {
    expect(anchorsFrom([anchorLayer('farm', 100, 200)], 1, { w: 960, h: 720 }))
      .toEqual({ farm: { x: 100, y: 200 } })
  })
  it('rejects an anchor past the right edge', () => {
    expect(() => anchorsFrom([anchorLayer('farm', 1000, 200)], 1, { w: 960, h: 720 }))
      .toThrow(/anchor:farm.*outside the map/)
  })
  it('rejects a negative anchor coordinate', () => {
    expect(() => anchorsFrom([anchorLayer('farm', -5, 200)], 1, { w: 960, h: 720 }))
      .toThrow(/anchor:farm.*outside the map/)
  })
})

describe('placementsFrom', () => {
  it('converts object refs to frame names and keeps the anchor position', () => {
    const layers = [{
      name: 'props',
      type: 'objects',
      objects: [{ frame: 'Cute_Fantasy/Trees/Tree.png#1,0', x: 100, y: 200 }],
    }]
    expect(placementsFrom(layers)).toEqual([{ frame: 'am_Trees_Tree_1_0', x: 100, y: 200 }])
  })
  it('carries transform fields through when present', () => {
    const layers = [{
      name: 'props',
      type: 'objects',
      objects: [{ frame: 'a/b.png#0,0', x: 1, y: 2, flipX: true, rot: 90, scale: 2 }],
    }]
    expect(placementsFrom(layers)[0]).toEqual({
      frame: 'am_a_b_0_0', x: 1, y: 2, flipX: true, rot: 90, scale: 2,
    })
  })
  it('omits absent transform fields entirely so untransformed output matches today', () => {
    const layers = [{ name: 'props', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 1, y: 2 }] }]
    expect(Object.keys(placementsFrom(layers)[0])).toEqual(['frame', 'x', 'y'])
  })
  it('never emits anchor-layer objects as placements', () => {
    const layers = [
      { name: 'anchor:farm', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 1, y: 2 }] },
      { name: 'props', type: 'objects', objects: [{ frame: 'c/d.png#0,0', x: 3, y: 4 }] },
    ]
    expect(placementsFrom(layers)).toEqual([{ frame: 'am_c_d_0_0', x: 3, y: 4 }])
  })
})

const SAMPLE = {
  version: 2,
  tileSize: 32,
  cols: 4,
  rows: 3,
  world: { w: 128, h: 96 },
  layers: [
    {
      name: 'suelo',
      type: 'tiles',
      cells: [
        { x: 0, y: 0, frame: 'Cute_Fantasy/Tiles/Grass/G.png#0,0' },
        { x: 1, y: 0, frame: 'Cute_Fantasy/Tiles/Grass/G.png#0,0' },
        { x: 2, y: 1, frame: 'Cute_Fantasy/Tiles/Path/P.png#1,1' },
      ],
    },
    { name: 'props', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Trees/T.png#0,0', x: 50, y: 60 }] },
    { name: 'anchor:farm', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Trees/T.png#0,0', x: 8, y: 9 }] },
  ],
  slices: {
    'Cute_Fantasy/Tiles/Grass/G.png': { type: 'sheet', fw: 32, fh: 32, cols: 2, rows: 2 },
    'Cute_Fantasy/Tiles/Path/P.png': { type: 'sheet', fw: 32, fh: 32, cols: 3, rows: 3 },
    'Cute_Fantasy/Trees/T.png': { type: 'sheet', fw: 32, fh: 32, cols: 1, rows: 1 },
  },
}

const DIMS = {
  'Cute_Fantasy/Tiles/Grass/G.png': { w: 64, h: 64 },
  'Cute_Fantasy/Tiles/Path/P.png': { w: 96, h: 96 },
  'Cute_Fantasy/Trees/T.png': { w: 32, h: 32 },
}
const dimsOf = p => DIMS[p]

describe('tilesFrom', () => {
  it('dedupes frames into a palette and encodes cells as [x, y, paletteIndex]', () => {
    const t = tilesFrom(SAMPLE)
    expect(t.frames).toEqual(['am_Tiles_Grass_G_0_0', 'am_Tiles_Path_P_1_1'])
    expect(t.layers).toEqual([{ name: 'suelo', cells: [[0, 0, 0], [1, 0, 0], [2, 1, 1]] }])
  })
  it('sorts the palette by name so indices are stable across re-imports', () => {
    const reversed = { ...SAMPLE, layers: [{ ...SAMPLE.layers[0], cells: [...SAMPLE.layers[0].cells].reverse() }] }
    expect(tilesFrom(reversed).frames).toEqual(tilesFrom(SAMPLE).frames)
  })
  it('carries dimensions and anchors', () => {
    const t = tilesFrom(SAMPLE)
    expect(t).toMatchObject({ version: 1, tileSize: 32, cols: 4, rows: 3 })
    expect(t.anchors).toEqual({ farm: { x: 8, y: 9 } })
  })
  it('keeps object layers out of the tile output', () => {
    expect(tilesFrom(SAMPLE).layers).toHaveLength(1)
  })
})

describe('framesFrom', () => {
  it('emits one image entry per distinct source path', () => {
    const { images } = framesFrom(SAMPLE, dimsOf)
    expect(images).toEqual({
      am_Tiles_Grass_G: '/game/cute-fantasy/Tiles/Grass/G.png',
      am_Tiles_Path_P: '/game/cute-fantasy/Tiles/Path/P.png',
      am_Trees_T: '/game/cute-fantasy/Trees/T.png',
    })
  })
  it('turns each cell into a manifest rect at tileSize granularity', () => {
    const { frames } = framesFrom(SAMPLE, dimsOf)
    expect(frames.am_Tiles_Path_P_1_1).toEqual({ img: 'am_Tiles_Path_P', x: 32, y: 32, w: 32, h: 32 })
  })
  it('includes frames referenced only by objects', () => {
    expect(framesFrom(SAMPLE, dimsOf).frames.am_Trees_T_0_0)
      .toEqual({ img: 'am_Trees_T', x: 0, y: 0, w: 32, h: 32 })
  })
  it('keeps anchor-marker frames out of the manifest — they are never drawn', () => {
    const withOwnMarker = {
      ...SAMPLE,
      layers: [
        ...SAMPLE.layers.filter(l => !l.name.startsWith('anchor:')),
        { name: 'anchor:farm', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Icons/Marker.png#0,0', x: 8, y: 9 }] },
      ],
    }
    const { frames, images } = framesFrom(withOwnMarker, p => (DIMS[p] || { w: 64, h: 64 }))
    expect(frames.am_Icons_Marker_0_0).toBeUndefined()
    expect(images.am_Icons_Marker).toBeUndefined()
    expect(anchorsFrom(withOwnMarker.layers)).toEqual({ farm: { x: 8, y: 9 } })
  })
  it('still emits one image entry when the same path is referenced by several cells', () => {
    expect(Object.keys(framesFrom(SAMPLE, dimsOf).images)).toHaveLength(3)
  })
  it('rejects two paths that collapse to one manifest key', () => {
    const map = {
      version: 2,
      tileSize: 16,
      world: { w: 64, h: 64 },
      layers: [{
        name: 'p',
        type: 'objects',
        objects: [
          { frame: 'Cute_Fantasy/x/a-b.png#0,0', x: 1, y: 1 },
          { frame: 'Cute_Fantasy/x/a_b.png#0,0', x: 2, y: 2 },
        ],
      }],
      slices: {
        'Cute_Fantasy/x/a-b.png': { type: 'single', w: 16, h: 16 },
        'Cute_Fantasy/x/a_b.png': { type: 'single', w: 16, h: 16 },
      },
    }
    expect(() => framesFrom(map, () => ({ w: 16, h: 16 })))
      .toThrow(/am_x_a_b.*collapse to the same key/)
  })

  // The key guard keys on the image slug, and these two differ (am_x_a_b_7 vs am_x_a_b), so it
  // never fired: an atlas index appended to a slug ending in a number reads exactly like a col,row
  // appended to the shorter one. The second frame silently overwrote the first.
  it('rejects two paths whose frame NAMES collide though their image keys differ', () => {
    const map = {
      version: 2,
      tileSize: 16,
      world: { w: 64, h: 64 },
      layers: [{
        name: 'p',
        type: 'objects',
        objects: [
          { frame: 'Cute_Fantasy/x/a b 7.png#2', x: 1, y: 1 },
          { frame: 'Cute_Fantasy/x/a b.png#7,2', x: 2, y: 2 },
        ],
      }],
      slices: {
        'Cute_Fantasy/x/a b 7.png': { type: 'atlas', frames: [{ x: 0, y: 0, w: 8, h: 8 }, { x: 8, y: 0, w: 8, h: 8 }, { x: 0, y: 8, w: 8, h: 8 }] },
        'Cute_Fantasy/x/a b.png': { type: 'sheet', fw: 16, fh: 16 },
      },
    }
    expect(() => framesFrom(map, () => ({ w: 128, h: 64 })))
      .toThrow(/am_x_a_b_7_2.*collapse to the same name/)
  })

  it('keeps both frames when the names stay distinct', () => {
    const map = {
      version: 2,
      tileSize: 16,
      world: { w: 64, h: 64 },
      layers: [{
        name: 'p',
        type: 'objects',
        objects: [
          { frame: 'Cute_Fantasy/x/a b 7.png#2', x: 1, y: 1 },
          { frame: 'Cute_Fantasy/x/a b.png#7,3', x: 2, y: 2 },
        ],
      }],
      slices: {
        'Cute_Fantasy/x/a b 7.png': { type: 'atlas', frames: [{ x: 0, y: 0, w: 8, h: 8 }, { x: 8, y: 0, w: 8, h: 8 }, { x: 0, y: 8, w: 8, h: 8 }] },
        'Cute_Fantasy/x/a b.png': { type: 'sheet', fw: 16, fh: 16 },
      },
    }
    const { frames } = framesFrom(map, () => ({ w: 128, h: 64 }))
    expect(Object.keys(frames).sort()).toEqual(['am_x_a_b_7_2', 'am_x_a_b_7_3'])
  })
})

describe('convertMap', () => {
  it('returns the five artifacts together', () => {
    const out = convertMap(SAMPLE, { dimsOf })
    expect(Object.keys(out).sort()).toEqual(['clips', 'interactables', 'manifest', 'placements', 'tiles'])
    expect(out.placements).toEqual([{ frame: 'am_Trees_T_0_0', x: 50, y: 60 }])
    expect(out.tiles.anchors.farm).toEqual({ x: 8, y: 9 })
    expect(out.manifest.frames.am_Tiles_Grass_G_0_0).toBeDefined()
  })
  it('is deterministic — same input, identical json', () => {
    expect(JSON.stringify(convertMap(SAMPLE, { dimsOf })))
      .toBe(JSON.stringify(convertMap(SAMPLE, { dimsOf })))
  })
})

const exists = () => true

describe('validateMap', () => {
  it('accepts the sample map', () => {
    expect(() => validateMap(SAMPLE, { dimsOf, exists })).not.toThrow()
  })
  it('rejects a ref whose png is missing from the pack', () => {
    expect(() => validateMap(SAMPLE, { dimsOf, exists: p => !p.includes('Path') }))
      .toThrow(/Tiles\/Path\/P\.png.*not found/)
  })
  it('rejects a cell outside the source image bounds', () => {
    const tiny = { ...DIMS, 'Cute_Fantasy/Tiles/Path/P.png': { w: 32, h: 32 } }
    expect(() => validateMap(SAMPLE, { dimsOf: p => tiny[p], exists }))
      .toThrow(/outside the source image/)
  })
  it('rejects an unknown biome via classifyLayer', () => {
    const bad = { ...SAMPLE, layers: [...SAMPLE.layers, { name: 'anchor:atlantis', type: 'objects', objects: [] }] }
    expect(() => validateMap(bad, { dimsOf, exists })).toThrow(/unknown biome/)
  })
})

describe('convertMap validation', () => {
  it('validates before converting', () => {
    expect(() => convertMap({ ...SAMPLE, tileSize: 0 }, { dimsOf, exists }))
      .toThrow(/tileSize/)
  })
})

const REAL = {
  version: 1,
  version: 2,
  tileSize: 16,
  world: { w: 960, h: 720 },
  bundles: [{ id: 'Cute_Fantasy' }],
  terrains: [],
  animations: {},
  layers: [
    { name: 'Capa 1', type: 'tiles', cells: [{ x: 6, y: 12, frame: 'Cute_Fantasy/Tiles/Grass/G.png#0,0' }] },
  ],
  slices: { 'Cute_Fantasy/Tiles/Grass/G.png': { type: 'sheet', fw: 16, fh: 16, cols: 4, rows: 4 } },
}
const REAL_DIMS = { 'Cute_Fantasy/Tiles/Grass/G.png': { w: 64, h: 64 } }

describe('gridOf', () => {
  it('derives cols and rows from world size and tile size', () => {
    expect(gridOf(REAL)).toEqual({ cols: 60, rows: 45 })
  })
  it('does not read cols/rows off the map — the editor never emits them', () => {
    expect(gridOf({ ...REAL, cols: 999, rows: 999 })).toEqual({ cols: 60, rows: 45 })
  })
})

describe('tilesFrom with a real export', () => {
  it('emits derived cols/rows, never undefined', () => {
    const t = tilesFrom(REAL)
    expect(t.cols).toBe(60)
    expect(t.rows).toBe(45)
    expect(t.tileSize).toBe(16)
  })
})

describe('validateMap tile-size model', () => {
  it('accepts a 16px source map — the pack granularity, not the world tile size', () => {
    expect(() => validateMap(REAL, { dimsOf: p => REAL_DIMS[p], exists })).not.toThrow()
  })
  it('rejects a missing or non-positive tileSize', () => {
    expect(() => validateMap({ ...REAL, tileSize: 0 }, { dimsOf: p => REAL_DIMS[p], exists }))
      .toThrow(/tileSize/)
  })
  it('rejects a world size that is not a whole number of tiles', () => {
    expect(() => validateMap({ ...REAL, world: { w: 950, h: 720 } }, { dimsOf: p => REAL_DIMS[p], exists }))
      .toThrow(/world 950x720 is not a whole number of 16px tiles/)
  })
})

const REAL_WITH_OBJECTS = {
  ...REAL,
  layers: [
    ...REAL.layers,
    { name: 'props', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Tiles/Grass/G.png#0,0', x: 100, y: 150 }] },
    { name: 'anchor:farm', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Tiles/Grass/G.png#0,0', x: 200, y: 250 }] },
  ],
}

describe('validateMap rejects an off-world anchor', () => {
  it('fails a map whose anchor is off the world', () => {
    const offWorld = {
      ...REAL_WITH_OBJECTS,
      layers: REAL_WITH_OBJECTS.layers.map(l => (l.name === 'anchor:farm'
        ? { ...l, objects: [{ ...l.objects[0], x: 5000, y: 5000 }] }
        : l)),
    }
    expect(() => validateMap(offWorld, { dimsOf: p => REAL_DIMS[p], exists }))
      .toThrow(/outside the map/)
  })
})

describe('worldScaleOf', () => {
  it('is the ratio between the game world tile and the pack source tile', () => {
    expect(worldScaleOf({ tileSize: 16 })).toBe(2)
    expect(worldScaleOf({ tileSize: 32 })).toBe(1)
    expect(worldScaleOf({ tileSize: 8 })).toBe(4)
  })
  it('exposes the game world tile size it is derived from', () => {
    expect(WORLD_TILE).toBe(32)
  })
})

describe('coordinate scaling', () => {
  const layers = [
    { name: 'props', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 159, y: 160 }] },
    { name: 'anchor:farm', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 100, y: 200 }] },
  ]

  it('scales placement positions into game world pixels, folding the world scale into size too', () => {
    expect(placementsFrom(layers, 2)).toEqual([{ frame: 'am_a_b_0_0', x: 318, y: 320, scale: 2 }])
  })
  it('scales anchor positions into game world pixels', () => {
    expect(anchorsFrom(layers, 2)).toEqual({ farm: { x: 200, y: 400 } })
  })
  it('defaults to a scale of 1 so existing callers are unaffected', () => {
    expect(placementsFrom(layers)[0]).toMatchObject({ x: 159, y: 160 })
    expect(anchorsFrom(layers)).toEqual({ farm: { x: 100, y: 200 } })
  })
  it('multiplies an authored scale by the world scale while leaving other transforms untouched', () => {
    const withRot = [{ name: 'p', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 10, y: 20, rot: 90, scale: 2 }] }]
    expect(placementsFrom(withRot, 2)).toEqual([{ frame: 'am_a_b_0_0', x: 20, y: 40, rot: 90, scale: 4 }])
  })
})

describe('convertMap applies the world scale', () => {
  it('emits placements and anchors already in game world pixels', () => {
    const out = convertMap(REAL_WITH_OBJECTS, { dimsOf: p => REAL_DIMS[p], exists })
    expect(out.placements[0]).toMatchObject({ x: 200, y: 300 })
    expect(out.tiles.anchors.farm).toEqual({ x: 400, y: 500 })
  })
})

describe('rectFor', () => {
  it('gives a sheet cell its col,row offset at frame size', () => {
    expect(rectFor({ type: 'sheet', fw: 16, fh: 16, cols: 4, rows: 4 }, { path: 'x.png', col: 2, row: 3 }))
      .toEqual({ x: 32, y: 48, w: 16, h: 16 })
  })
  it('gives a single sprite the whole image, ignoring col,row filler', () => {
    expect(rectFor({ type: 'single', w: 192, h: 80 }, { path: 'x.png', col: 0, row: 0 }))
      .toEqual({ x: 0, y: 0, w: 192, h: 80 })
    expect(rectFor({ type: 'single', w: 192, h: 80 }, { path: 'x.png', col: 5, row: 7 }))
      .toEqual({ x: 0, y: 0, w: 192, h: 80 })
  })
})

describe('framesFrom with slice geometry', () => {
  const map = {
    version: 2,
    tileSize: 16,
    world: { w: 64, h: 64 },
    layers: [{ name: 'p', type: 'objects', objects: [{ frame: 'Cute_Fantasy/Trees/Oak.png#0,0', x: 1, y: 1 }] }],
    slices: { 'Cute_Fantasy/Trees/Oak.png': { type: 'single', w: 192, h: 80 } },
  }
  const dims = { 'Cute_Fantasy/Trees/Oak.png': { w: 192, h: 80 } }

  it('emits the whole image for a single sprite, not a tileSize corner', () => {
    expect(framesFrom(map, p => dims[p]).frames.am_Trees_Oak_0_0)
      .toEqual({ img: 'am_Trees_Oak', x: 0, y: 0, w: 192, h: 80 })
  })
})

describe('validateMap requires slice geometry', () => {
  it('rejects a map with no slices block — it was exported before the editor emitted one', () => {
    const stale = { ...REAL, slices: undefined }
    expect(() => validateMap(stale, { dimsOf: p => REAL_DIMS[p], exists }))
      .toThrow(/no slices block.*re-export/)
  })
  it('rejects a referenced image missing from slices', () => {
    const gap = { ...REAL, slices: {} }
    expect(() => validateMap(gap, { dimsOf: p => REAL_DIMS[p], exists }))
      .toThrow(/G\.png.*missing from the map's slices/)
  })
})

describe('object sprites scale with the world', () => {
  it('folds the world scale into the placement scale so sprites match the terrain', () => {
    const layers = [{ name: 'p', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 10, y: 20 }] }]
    expect(placementsFrom(layers, 2)[0]).toEqual({ frame: 'am_a_b_0_0', x: 20, y: 40, scale: 2 })
  })
  it('multiplies an authored scale by the world scale', () => {
    const layers = [{ name: 'p', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 0, y: 0, scale: 3 }] }]
    expect(placementsFrom(layers, 2)[0].scale).toBe(6)
  })
  it('emits no scale at all when the world scale is 1 and the object has none', () => {
    const layers = [{ name: 'p', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 0, y: 0 }] }]
    expect(Object.keys(placementsFrom(layers, 1)[0])).toEqual(['frame', 'x', 'y'])
  })
})

describe('atlas refs', () => {
  const frames = [{ x: 0, y: 0, w: 6, h: 64 }, { x: 6, y: 0, w: 38, h: 64 }]
  const atlasSlice = { type: 'atlas', frames }

  it('parses an index ref', () => {
    expect(splitRef('Outdoor decoration/Fences.png#1')).toEqual({ path: 'Outdoor decoration/Fences.png', i: 1 })
  })

  it('still parses a col,row ref', () => {
    expect(splitRef('Tiles/Grass.png#3,1')).toEqual({ path: 'Tiles/Grass.png', col: 3, row: 1 })
  })

  it('rejects an index that is not a non-negative integer', () => {
    expect(() => splitRef('a.png#-1')).toThrow(/malformed ref/)
    expect(() => splitRef('a.png#1.5')).toThrow(/malformed ref/)
    expect(() => splitRef('a.png#')).toThrow(/malformed ref/)
    expect(() => splitRef('a.png#x')).toThrow(/malformed ref/)
  })

  it('names an atlas frame by index and a grid frame by cell', () => {
    expect(frameNameFor('a/b.png#7')).toBe('am_a_b_7')
    expect(frameNameFor('a/b.png#7,2')).toBe('am_a_b_7_2')
  })

  it('resolves the frame rect by index', () => {
    expect(rectFor(atlasSlice, { path: 'F.png', i: 1 })).toEqual({ x: 6, y: 0, w: 38, h: 64 })
  })

  it('throws, naming the ref, when the index is past the end', () => {
    expect(() => rectFor(atlasSlice, { path: 'F.png', i: 9 })).toThrow(/F\.png#9/)
  })

  it('throws when the ref and the slice disagree on addressing', () => {
    expect(() => rectFor(atlasSlice, { path: 'F.png', col: 0, row: 0 })).toThrow(/atlas/)
    expect(() => rectFor({ type: 'sheet', fw: 16, fh: 16 }, { path: 'F.png', i: 0 })).toThrow(/atlas/)
  })

  it('converts a map that mixes both forms', () => {
    const map = {
      version: 2,
      tileSize: 16,
      world: { w: 32, h: 16 },
      slices: {
        'F.png': atlasSlice,
        'G.png': { type: 'sheet', fw: 16, fh: 16, cols: 2, rows: 1 },
      },
      layers: [
        { name: 'suelo', type: 'tiles', cells: [{ x: 0, y: 0, frame: 'G.png#1,0' }] },
        { name: 'props', type: 'objects', objects: [{ frame: 'F.png#1', x: 8, y: 16 }] },
      ],
    }
    const dimsOf = p => (p === 'F.png' ? { w: 64, h: 64 } : { w: 32, h: 16 })
    const out = convertMap(map, { dimsOf })
    expect(out.manifest.frames.am_F_1).toEqual({ img: 'am_F', x: 6, y: 0, w: 38, h: 64 })
    expect(out.manifest.frames.am_G_1_0).toEqual({ img: 'am_G', x: 16, y: 0, w: 16, h: 16 })
  })
})

describe('clips', () => {
  const mapWithClip = () => ({
    version: 1,
    version: 2,
    tileSize: 16,
    world: { w: 64, h: 64 },
    slices: { 'Cow.png': { type: 'sheet', fw: 32, fh: 32, cols: 8, rows: 15 } },
    clips: [{ id: 'C1', name: 'vaca', fps: 6, frames: ['Cow.png#0,3', 'Cow.png#1,3'] }],
    layers: [{ name: 'props', type: 'objects', objects: [{ frame: 'Cow.png#0,3', x: 16, y: 32, clip: 'C1' }] }],
  })
  const dimsOf = () => ({ w: 256, h: 480 })

  it('bakes every frame of a clip, not just the object frame', () => {
    const { manifest } = convertMap(mapWithClip(), { dimsOf })
    expect(Object.keys(manifest.frames).sort()).toEqual(['am_Cow_0_3', 'am_Cow_1_3'])
  })

  it('emits a clip table keyed by clip id, with frame names', () => {
    const { clips } = convertMap(mapWithClip(), { dimsOf })
    expect(clips).toEqual({ C1: { frames: ['am_Cow_0_3', 'am_Cow_1_3'], fps: 6 } })
  })

  it('carries the clip id onto the placement', () => {
    const { placements } = convertMap(mapWithClip(), { dimsOf })
    expect(placements[0].clip).toBe('C1')
  })

  it('leaves a placement without a clip byte-identical to before', () => {
    const map = mapWithClip()
    delete map.layers[0].objects[0].clip
    map.clips = []
    expect(convertMap(map, { dimsOf }).placements[0]).toEqual({ frame: 'am_Cow_0_3', x: 32, y: 64, scale: 2 })
  })

  it('refuses a placement naming a clip the map does not define', () => {
    const map = mapWithClip()
    map.clips = []
    expect(() => convertMap(map, { dimsOf })).toThrow(/clip "C1"/)
  })

  it('refuses a clip with no frames', () => {
    const map = mapWithClip()
    map.clips[0].frames = []
    expect(() => convertMap(map, { dimsOf })).toThrow(/clip "C1"/)
  })

  it('refuses a clip frame whose rect falls outside the image', () => {
    const map = mapWithClip()
    map.clips[0].frames = ['Cow.png#0,3', 'Cow.png#0,99']
    map.layers[0].objects[0].frame = 'Cow.png#0,3'
    expect(() => convertMap(map, { dimsOf })).toThrow(/outside the source image/)
  })

  it('reads a map exported before clips existed', () => {
    const map = mapWithClip()
    delete map.clips
    delete map.layers[0].objects[0].clip
    expect(convertMap(map, { dimsOf }).clips).toEqual({})
  })
})

// The export version gate. The number exists so a consumer can refuse a file older than the
// features it depends on — and until now this side never read it, so a v1 map was accepted and
// silently carried no object identity at all. That is precisely the failure the number prevents.
describe('the export version gate', () => {
  const v2 = (over = {}) => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, slices: {}, layers: [], clips: [], ...over,
  })
  const deps = { dimsOf: () => ({ w: 64, h: 64 }), exists: () => true }

  it('accepts version 2', () => {
    expect(() => validateMap(v2(), deps)).not.toThrow()
  })

  it('accepts a future version, since v2 fields are additive', () => {
    expect(() => validateMap(v2({ version: 3 }), deps)).not.toThrow()
  })

  it('refuses version 1 and says how to fix it', () => {
    expect(() => validateMap(v2({ version: 1 }), deps)).toThrow(/re-export/i)
  })

  it('refuses a map with no version at all', () => {
    const map = v2()
    delete map.version
    expect(() => validateMap(map, deps)).toThrow(/version/i)
  })
})

// Tagged objects. The editor owns the SHAPE of a tag; this side owns the vocabulary — the same line
// classifyLayer already draws by throwing on an unknown biome. And because the editor's export
// dialog offers "Exportar igual", a lint-dirty file can arrive here, so every check below is this
// side's own rather than a trust of the exporter.
describe('interactablesFrom', () => {
  const obj = (over = {}) => ({ frame: 'Cute_Fantasy/Buildings/House.png#0,0', x: 32, y: 48, uid: 'U3', ...over })
  const layer = (objects, name = 'Casas') => ({ name, type: 'objects', objects })

  it('has nothing to say about untagged objects', () => {
    expect(interactablesFrom([layer([obj({ uid: 'U1' }), obj({ uid: 'U2' })])])).toEqual([])
  })

  it('reads a door into a kind and an id', () => {
    const out = interactablesFrom([layer([obj({ tags: ['door:mutual-ser'] })])])
    expect(out).toEqual([{ uid: 'U3', kind: 'door', id: 'mutual-ser', x: 32, y: 48 }])
  })

  it('reads every kind the game knows', () => {
    const tags = ['door:a', 'npc:b', 'animal:cow', 'object:c', 'poi:d']
    const out = interactablesFrom([layer(tags.map((t, i) => obj({ uid: `U${i}`, tags: [t] })))])
    expect(out.map(e => e.kind)).toEqual(['door', 'npc', 'animal', 'object', 'poi'])
    expect(out.map(e => e.id)).toEqual(['a', 'b', 'cow', 'c', 'd'])
  })

  it('scales the world position like a placement does', () => {
    const out = interactablesFrom([layer([obj({ tags: ['poi:x'], x: 10, y: 20 })])], 2)
    expect(out[0]).toMatchObject({ x: 20, y: 40 })
  })

  // A flag is not an identity: `solid` says how the world behaves around the object, and it rides
  // along with whatever kind the object already is.
  it('carries solid as a flag beside the kind', () => {
    const out = interactablesFrom([layer([obj({ tags: ['door:mutual-ser', 'solid'] })])])
    expect(out[0]).toMatchObject({ kind: 'door', id: 'mutual-ser', solid: true })
  })

  it('reads a flag-only object, which has no id', () => {
    const out = interactablesFrom([layer([obj({ tags: ['solid'] })])])
    expect(out).toEqual([{ uid: 'U3', kind: 'solid', x: 32, y: 48, solid: true }])
  })

  it('reads the spawn point', () => {
    const out = interactablesFrom([layer([obj({ tags: ['spawn'] })])])
    expect(out[0]).toMatchObject({ kind: 'spawn', spawn: true })
  })

  it('should read a read:<n> tag as kind read with id n', () => {
    const out = interactablesFrom([layer([obj({ tags: ['read:3'] })])])
    expect(out[0]).toMatchObject({ kind: 'read', id: '3' })
  })

  it('should read exit as a flag', () => {
    const out = interactablesFrom([layer([obj({ tags: ['exit'] })])])
    expect(out[0]).toMatchObject({ kind: 'exit', exit: true })
    expect('id' in out[0]).toBe(false)
  })

  it('passes props through untouched', () => {
    const out = interactablesFrom([layer([obj({ tags: ['npc:katy'], props: { facing: 'south' } })])])
    expect(out[0].props).toEqual({ facing: 'south' })
  })

  it('omits props when the object has none', () => {
    const out = interactablesFrom([layer([obj({ tags: ['npc:katy'] })])])
    expect('props' in out[0]).toBe(false)
  })

  it('keeps the authored name when there is one, for diagnosis', () => {
    const out = interactablesFrom([layer([obj({ tags: ['door:a'], name: 'Casa Mutual SER' })])])
    expect(out[0].name).toBe('Casa Mutual SER')
  })

  it('ignores tags on a tiles layer, which cannot carry objects', () => {
    expect(interactablesFrom([{ name: 'Terreno', type: 'tiles', cells: [] }])).toEqual([])
  })

  it('reads anchor layers too, so a spawn marker can live on one', () => {
    const out = interactablesFrom([layer([obj({ tags: ['spawn'] })], 'anchor:farm')])
    expect(out.map(e => e.kind)).toEqual(['spawn'])
  })

  describe('refusals', () => {
    const boom = (objects, re) => expect(() => interactablesFrom([layer(objects)])).toThrow(re)

    it('refuses an unknown kind, the way an unknown biome is refused', () => {
      boom([obj({ tags: ['puerta:mutual-ser'] })], /unknown tag kind "puerta"/)
    })

    // Without a uid the game cannot address the thing, and the absence means the map predates the
    // editor writing them — a stale export rather than an authoring mistake.
    it('refuses a tagged object with no uid', () => {
      const o = obj({ tags: ['door:a'] })
      delete o.uid
      boom([o], /re-export/i)
    })

    it('refuses two objects claiming one door', () => {
      boom([obj({ uid: 'U1', tags: ['door:mutual-ser'] }), obj({ uid: 'U2', tags: ['door:mutual-ser'] })],
        /door:mutual-ser/)
    })

    it('refuses two objects claiming one poi', () => {
      boom([obj({ uid: 'U1', tags: ['poi:x'] }), obj({ uid: 'U2', tags: ['poi:x'] })], /poi:x/)
    })

    // Two npcs may share a dialog id — two villagers with the same lines is a legitimate world —
    // so identity uniqueness is per kind, not blanket.
    it('allows two objects sharing an npc dialog id', () => {
      const out = interactablesFrom([layer([obj({ uid: 'U1', tags: ['npc:katy'] }), obj({ uid: 'U2', tags: ['npc:katy'] })])])
      expect(out).toHaveLength(2)
    })

    it('refuses a second spawn point', () => {
      boom([obj({ uid: 'U1', tags: ['spawn'] }), obj({ uid: 'U2', tags: ['spawn'] })], /spawn/)
    })

    it('refuses an object that is two things at once', () => {
      boom([obj({ tags: ['door:a', 'npc:b'] })], /door:a.*npc:b|npc:b.*door:a/)
    })

    it('refuses an identity kind with no value', () => {
      boom([obj({ tags: ['door'] })], /door/)
    })

    it('refuses a duplicate uid, since the export dialog can be overridden', () => {
      boom([obj({ uid: 'U1', tags: ['door:a'] }), obj({ uid: 'U1', tags: ['poi:b'] })], /U1/)
    })
  })
})

// The draw list and the behaviour list have to be joinable: a prompt floats over a sprite, so the
// game needs to know which placement belongs to an interactable.
describe('a placement carries its uid', () => {
  it('copies the uid when the object has one', () => {
    const layers = [{ name: 'Casas', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 8, y: 8, uid: 'U3' }] }]
    expect(placementsFrom(layers)[0]).toMatchObject({ uid: 'U3' })
  })

  // An untransformed, unidentified object still serializes to exactly { frame, x, y } — the identity
  // case the render path's tests rely on.
  it('stays byte-identical for an object without one', () => {
    const layers = [{ name: 'Casas', type: 'objects', objects: [{ frame: 'a/b.png#0,0', x: 8, y: 8 }] }]
    expect(placementsFrom(layers)[0]).toEqual({ frame: frameNameFor('a/b.png#0,0'), x: 8, y: 8 })
  })
})

// An interactable carries its own footprint. The import knows the frame geometry — it has the
// slices block and the object's scale — while the runtime would have to go looking for it in the
// atlas, before the atlas has finished loading. Emitting it here is the cheaper truth.
describe('interactablesFrom carries the sprite footprint', () => {
  const SLICES = { 'Cute_Fantasy/Buildings/House.png': { type: 'single', w: 64, h: 80 } }
  const layer = objects => ({ name: 'Casas', type: 'objects', objects })
  const obj = (over = {}) => ({
    frame: 'Cute_Fantasy/Buildings/House.png#0,0', x: 100, y: 200, uid: 'U3', tags: ['door:a'], ...over,
  })

  it('reads width and height off the slice', () => {
    const out = interactablesFrom([layer([obj()])], 1, SLICES)
    expect(out[0]).toMatchObject({ w: 64, h: 80 })
  })

  it('multiplies the footprint by the world scale', () => {
    const out = interactablesFrom([layer([obj()])], 2, SLICES)
    expect(out[0]).toMatchObject({ w: 128, h: 160, x: 200, y: 400 })
  })

  it('honours the object own scale on top of the world scale', () => {
    const out = interactablesFrom([layer([obj({ scale: 1.5 })])], 2, SLICES)
    expect(out[0]).toMatchObject({ w: 192, h: 240 })
  })

  // Without the slices block there is nothing to measure. The entry still exists — a spawn point
  // needs no footprint — so this must not throw.
  it('omits the footprint when the geometry is unavailable', () => {
    const out = interactablesFrom([layer([obj()])], 1)
    expect('w' in out[0]).toBe(false)
    expect('h' in out[0]).toBe(false)
  })

  it('measures a sheet frame by its cell, not the whole image', () => {
    const slices = { 'a/b.png': { type: 'sheet', fw: 32, fh: 48, cols: 4, rows: 2 } }
    const out = interactablesFrom([layer([obj({ frame: 'a/b.png#2,1' })])], 1, slices)
    expect(out[0]).toMatchObject({ w: 32, h: 48 })
  })
})

// Coverage between the map and the CV. Per docs/adr/0001 the drift is validated at import rather
// than discovered at runtime: a door naming nothing fails loudly, while an experience nobody has
// authored yet is a number in the report — until the procedural fallback goes, at which point it
// becomes an error too.
describe('doorCoverage', () => {
  const door = id => ({ uid: `U${id}`, kind: 'door', id, x: 0, y: 0, w: 10, h: 10 })
  const IDS = ['soldife-2026', 'blerify-2023', 'tul-2022']

  it('says which experiences are authored and which are not', () => {
    const out = doorCoverage([door('blerify-2023')], IDS)
    expect(out.authored).toEqual(['blerify-2023'])
    expect(out.missing).toEqual(['soldife-2026', 'tul-2022'])
    expect(out.dead).toEqual([])
  })

  it('names a door that points at nothing', () => {
    const out = doorCoverage([door('blerify-2023'), door('mutual-ser')], IDS)
    expect(out.dead).toEqual(['mutual-ser'])
    expect(out.authored).toEqual(['blerify-2023'])
  })

  it('reports full coverage when every experience has a door', () => {
    const out = doorCoverage(IDS.map(door), IDS)
    expect(out.missing).toEqual([])
    expect(out.dead).toEqual([])
    expect(out.authored).toEqual([...IDS].sort())
  })

  it('reports everything missing for an unauthored map', () => {
    expect(doorCoverage([], IDS)).toEqual({ authored: [], missing: [...IDS].sort(), dead: [] })
  })

  it('ignores interactables that are not doors', () => {
    const out = doorCoverage([{ uid: 'U1', kind: 'npc', id: 'katy', x: 0, y: 0 }], IDS)
    expect(out.dead).toEqual([])
    expect(out.authored).toEqual([])
  })

  it('takes the ids as a Set as happily as an array', () => {
    expect(doorCoverage([door('tul-2022')], new Set(IDS)).authored).toEqual(['tul-2022'])
  })

  // Sorted, because this feeds a build report and a report that reorders itself between runs is a
  // diff nobody can read.
  it('sorts every list', () => {
    const out = doorCoverage([door('tul-2022'), door('blerify-2023')], IDS)
    expect(out.authored).toEqual(['blerify-2023', 'tul-2022'])
  })
})

describe('validateMap checks door coverage when it is given the CV', () => {
  const base = (objects) => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, clips: [],
    slices: { 'Cute_Fantasy/Buildings/House.png': { type: 'single', w: 32, h: 32 } },
    layers: [{ name: 'Casas', type: 'objects', objects }],
  })
  const obj = (tags, over = {}) => ({
    frame: 'Cute_Fantasy/Buildings/House.png#0,0', x: 16, y: 32, uid: 'U3', tags, ...over,
  })
  const deps = extra => ({ dimsOf: () => ({ w: 64, h: 64 }), exists: () => true, ...extra })

  it('refuses a door naming an experience that does not exist', () => {
    const map = base([obj(['door:no-such-job'])])
    expect(() => validateMap(map, deps({ experienceIds: ['tul-2022'] })))
      .toThrow(/no-such-job/)
  })

  it('accepts a door that names a real one', () => {
    const map = base([obj(['door:tul-2022'])])
    expect(() => validateMap(map, deps({ experienceIds: ['tul-2022'] }))).not.toThrow()
  })

  // The generator is gone (docs/adr/0001): a visible experience with no door would have no house at
  // all, so the import stops and names it instead of shipping a career with a job missing.
  it('refuses a visible experience that has no door', () => {
    const map = base([obj(['door:tul-2022'])])
    expect(() => validateMap(map, deps({ experienceIds: ['tul-2022', 'blerify-2023'] })))
      .toThrow(/blerify-2023/)
  })

  // The CV is optional: convert.test's own fixtures, and any caller that only wants the geometry
  // checked, pass nothing and get the old behaviour.
  it('skips the check when no CV is handed over', () => {
    const map = base([obj(['door:no-such-job'])])
    expect(() => validateMap(map, deps())).not.toThrow()
  })
})

// docs/adr/0003: the water layer is a contract, so the import checks it before the game trusts it.
describe('validateMap water layer', () => {
  const W = 'Cute_Fantasy/Tiles/Water/Water_Tile_1.png'
  const deps = { dimsOf: p => ({ ...REAL_DIMS, [W]: { w: 48, h: 80 } })[p], exists }
  const cell = (x, y, frame = `${W}#1,1`) => ({ x, y, frame })
  const square = [cell(0, 0), cell(1, 0), cell(0, 1), cell(1, 1)]
  const withWater = (water, extraSlices = {}) => ({
    ...REAL,
    layers: [...REAL.layers, water],
    slices: { ...REAL.slices, [W]: { type: 'sheet', fw: 16, fh: 16, cols: 3, rows: 5 }, ...extraSlices },
  })

  it('accepts a body of water painted with the water sheet', () => {
    expect(() => validateMap(withWater({ name: 'water', type: 'tiles', cells: square }), deps)).not.toThrow()
  })

  it('refuses a water layer made of objects', () => {
    expect(() => validateMap(withWater({ name: 'water', type: 'objects', objects: [] }), deps))
      .toThrow(/"water" must be a tiles layer/)
  })

  it('refuses a water cell painted with something that is not water', () => {
    const grass = [...square.slice(1), cell(0, 0, 'Cute_Fantasy/Tiles/Grass/G.png#0,0')]
    expect(() => validateMap(withWater({ name: 'water', type: 'tiles', cells: grass }), deps))
      .toThrow(/cell 0,0 is not water/)
  })

  it('refuses a body too thin for the water tiles to draw', () => {
    const strip = [cell(0, 0), cell(1, 0), cell(2, 0)]
    expect(() => validateMap(withWater({ name: 'water', type: 'tiles', cells: strip }), deps))
      .toThrow(/body at 0,0 holds no 2x2 square/)
  })
})

// A frame's hitbox is drawn in the editor in the frame's own pixels. The game needs it in world
// pixels for each placed copy, after the same transform that draws the sprite: anchor bottom-centre,
// rotate, scale, flip.
describe('solidFor', () => {
  const BOX = { x: 20, y: 50, w: 12, h: 8 }
  const FRAME = { w: 48, h: 64 }

  it('places the box under the anchor at the placement\'s scale', () => {
    expect(solidFor(BOX, FRAME, { x: 80, y: 80, scale: 2 })).toEqual({ x: 72, y: 52, w: 24, h: 16 })
  })

  it('mirrors it with a horizontal flip', () => {
    expect(solidFor(BOX, FRAME, { x: 80, y: 80, scale: 2, flipX: true })).toEqual({ x: 64, y: 52, w: 24, h: 16 })
  })

  it('turns it with the sprite, keeping the box that encloses it', () => {
    expect(solidFor(BOX, FRAME, { x: 80, y: 80, scale: 2, rot: 90 })).toEqual({ x: 92, y: 72, w: 16, h: 24 })
  })

  it('works at scale 1 when the placement carries none', () => {
    expect(solidFor(BOX, FRAME, { x: 40, y: 40 })).toEqual({ x: 36, y: 26, w: 12, h: 8 })
  })
})

describe('convertMap hitboxes', () => {
  const OAK = 'Cute_Fantasy/Trees/Oak.png'
  const map = (hitboxes) => ({
    ...REAL,
    layers: [...REAL.layers, { name: 'decor', type: 'objects', objects: [{ frame: `${OAK}#0,0`, x: 40, y: 40 }] }],
    slices: { ...REAL.slices, [OAK]: { type: 'single', w: 48, h: 64 } },
    ...(hitboxes ? { hitboxes } : {}),
  })
  const deps = { dimsOf: p => ({ ...REAL_DIMS, [OAK]: { w: 48, h: 64 } })[p], exists }

  it('gives a placement whose frame has a box a solid in world pixels', () => {
    const [p] = convertMap(map({ [`${OAK}#0,0`]: { x: 20, y: 50, w: 12, h: 8 } }), deps).placements
    expect(p.solid).toEqual({ x: 72, y: 52, w: 24, h: 16 })
  })

  it('leaves a placement without a box walkable', () => {
    const [p] = convertMap(map(), deps).placements
    expect(p.solid).toBeUndefined()
  })

  it('refuses a box that reaches outside its frame', () => {
    expect(() => convertMap(map({ [`${OAK}#0,0`]: { x: 40, y: 50, w: 12, h: 8 } }), deps))
      .toThrow(/hitbox .*Oak.png#0,0.* outside the 48x64 frame/)
  })
})

// docs/adr/0004: a map is either the exterior or an interior, and each kind of tag belongs to one.
describe('where read, exit and door may be used', () => {
  const map = tags => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, clips: [],
    slices: { 'Cute_Fantasy/Buildings/House.png': { type: 'single', w: 32, h: 32 } },
    layers: [{
      name: 'Casas',
      type: 'objects',
      objects: [{ frame: 'Cute_Fantasy/Buildings/House.png#0,0', x: 16, y: 32, uid: 'U3', tags }],
    }],
  })
  const deps = extra => ({ dimsOf: () => ({ w: 64, h: 64 }), exists: () => true, ...extra })

  it.each([['read:1'], ['exit']])('should refuse %s on the exterior map', tag => {
    expect(() => convertMap(map([tag]), deps())).toThrow(/read.*interior|exit.*interior/)
  })

  it('should refuse a door inside an interior', () => {
    expect(() => convertMap(map(['door:tul-2022']), deps({ interior: true }))).toThrow(/door.*interior/)
  })

  it('should skip door coverage for an interior', () => {
    expect(() => convertMap(map(['read:1']), deps({ interior: true, experienceIds: ['tul-2022'] }))).not.toThrow()
  })
})

// docs/adr/0005: the walls layer is a contract too. It blocks whole cells, so it has to be cells, and
// nothing may make the player appear inside one.
describe('validateMap walls layer', () => {
  const F = 'Cute_Fantasy/Tiles/Walls/W.png'
  const S = 'Cute_Fantasy/Buildings/House.png'
  const deps = { dimsOf: () => ({ w: 64, h: 64 }), exists: () => true, interior: true }
  const wall = (x, y) => ({ x, y, frame: `${F}#0,0` })
  const spawnAt = (x, y) => ({ frame: `${S}#0,0`, x, y, uid: 'U1', tags: ['spawn'] })
  const map = (walls, objects = []) => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, clips: [],
    slices: { [F]: { type: 'sheet', fw: 16, fh: 16 }, [S]: { type: 'single', w: 16, h: 16 } },
    layers: [walls, { name: 'Cosas', type: 'objects', objects }],
  })
  const ROW = { name: 'walls', type: 'tiles', cells: [wall(0, 0), wall(1, 0), wall(2, 0), wall(3, 0)] }

  it('accepts a painted walls layer with the spawn on the floor', () => {
    expect(() => validateMap(map(ROW, [spawnAt(24, 40)]), deps)).not.toThrow()
  })

  it('refuses a walls layer made of objects', () => {
    expect(() => validateMap(map({ name: 'walls', type: 'objects', objects: [] }), deps))
      .toThrow(/"walls" must be a tiles layer/)
  })

  it('refuses a spawn standing in a wall cell', () => {
    expect(() => validateMap(map(ROW, [spawnAt(24, 10)]), deps)).toThrow(/spawn .*24,10.* wall cell 1,0/)
  })

  // Feet on the line between a wall and the floor below belong to the wall: read one pixel up.
  it('reads the spawn\'s cell one pixel above its base point', () => {
    expect(() => validateMap(map(ROW, [spawnAt(24, 16)]), deps)).toThrow(/wall cell 1,0/)
    expect(() => validateMap(map(ROW, [spawnAt(24, 17)]), deps)).not.toThrow()
  })
})

// docs/adr/0006: a marker is a point the map tags but never draws — an object with no frame.
describe('marker objects', () => {
  const S = 'Cute_Fantasy/Buildings/House.png'
  const deps = extra => ({ dimsOf: () => ({ w: 64, h: 64 }), exists: () => true, interior: true, ...extra })
  const marker = (tags, over = {}) => ({ x: 24, y: 40, uid: 'M1', marker: true, tags, ...over })
  const map = objects => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, clips: [],
    slices: { [S]: { type: 'single', w: 16, h: 16 } },
    layers: [{ name: 'Cosas', type: 'objects', objects: [{ frame: `${S}#0,0`, x: 8, y: 16, uid: 'U1' }, ...objects] }],
  })

  it('should make a spawn marker an interactable and no placement', () => {
    const out = convertMap(map([marker(['spawn'], { name: 'entrada' })]), deps())
    expect(out.interactables).toEqual([{ uid: 'M1', kind: 'spawn', spawn: true, name: 'entrada', x: 48, y: 80 }])
    expect(out.placements).toEqual([{ frame: 'am_Buildings_House_0_0', x: 16, y: 32, uid: 'U1', scale: 2 }])
  })

  it('should leave markers out of the atlas manifest', () => {
    const out = convertMap(map([marker(['exit']), marker(['read:1'], { uid: 'M2' })]), deps())
    expect(Object.keys(out.manifest.frames)).toEqual(['am_Buildings_House_0_0'])
  })

  it.each([['spawn'], ['exit'], ['read:2']])('should accept %s on a marker', tag => {
    expect(() => validateMap(map([marker([tag])]), deps())).not.toThrow()
  })

  it('should refuse a frameless object that is not a marker', () => {
    expect(() => validateMap(map([{ x: 24, y: 40, uid: 'M1' }]), deps())).toThrow(/24,40.* no frame.* re-export/)
  })

  it.each([['npc:host'], ['door:tul-2022'], ['animal:cow'], ['object:x'], ['poi:x']])('should refuse %s on a marker', tag => {
    expect(() => validateMap(map([marker([tag])]), deps())).toThrow(/marker .*24,40.* cannot carry/)
  })

  it('should refuse a marker that plays a clip', () => {
    expect(() => validateMap(map([marker(['spawn'], { clip: 'flame' })]), deps())).toThrow(/marker .*24,40.* nothing to animate/)
  })

  it('should keep a map without markers byte-identical', () => {
    expect(JSON.stringify(convertMap(map([]), deps()))).toBe(JSON.stringify(convertMap(map([]), deps())))
    expect(placementsFrom(map([]).layers, 2)).toHaveLength(1)
  })
})
