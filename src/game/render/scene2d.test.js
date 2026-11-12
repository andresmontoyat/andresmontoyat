import { describe, it, expect } from 'vitest'
import { CONFIG } from '../config.js'
import { PLAYER_BOX } from '../engine/topdown.js'
import {
  nearestPathDist, nearestRoadDist, visibleTileRange, eraLabel, drawAuthoredTiles, drawTransformed,
  buildingDrawable, proceduralRoads, proceduralPonds, eraWash, drawDialog, drawFade, avatarSize, drawAvatar, dialogRect, viewportOf,
} from './scene2d.js'
import { createDialog, bulletSource, paginate, DIALOG_FONT } from './dialog.js'

const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }]

describe('nearestPathDist', () => {
  it('returns ~0 for a point on the segment', () => {
    expect(nearestPathDist(path, 50, 0)).toBeCloseTo(0)
  })
  it('returns the perpendicular distance off the segment', () => {
    expect(nearestPathDist(path, 50, 30)).toBeCloseTo(30)
  })
  it('clamps to the nearest endpoint beyond the segment ends', () => {
    expect(nearestPathDist(path, 140, 0)).toBeCloseTo(40)
  })
})

describe('nearestRoadDist', () => {
  const roads = [
    { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
    { a: { x: 500, y: 500 }, b: { x: 600, y: 500 } },
    { a: { x: 200, y: 0 }, b: { x: 200, y: 100 }, hidden: true },
  ]

  it('returns the min distance over every segment in the set, not just the first', () => {
    // (550, 490) is close to the second segment, far from the first — a naive "first segment
    // only" distance would be huge; the real min must come from segment 2.
    expect(nearestRoadDist(roads, 550, 490)).toBeCloseTo(10)
  })
  it('ignores hidden segments when not revealed', () => {
    // (200, 50) sits exactly ON the hidden vertical segment — should NOT count as ~0 while
    // unrevealed; the nearest visible segment is the first spine segment, ~112 away.
    expect(nearestRoadDist(roads, 200, 50, false)).toBeGreaterThan(50)
  })
  it('includes hidden segments once revealed', () => {
    expect(nearestRoadDist(roads, 200, 50, true)).toBeCloseTo(0)
  })
  it('defaults to an empty segment set (Infinity distance) when roads is omitted', () => {
    expect(nearestRoadDist(undefined, 0, 0)).toBe(Infinity)
  })
})

// The map can paint its own roads, on a tiles layer named 'road'. Then the generated roads to the
// doors step aside; only the hidden POI loops stay, because the map does not know where those are.
describe('proceduralRoads', () => {
  const spur = { a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }
  const loop = { a: { x: 0, y: 0 }, b: { x: 0, y: 10 }, hidden: true }
  const world = { roads: [spur, loop] }

  it('keeps every generated road when the map paints none', () => {
    expect(proceduralRoads({ world, authored: [{ name: 'suelo', cells: new Map() }] })).toEqual([spur, loop])
  })
  it('keeps only the hidden loops when the map has a road layer', () => {
    expect(proceduralRoads({ world, authored: [{ name: 'road', cells: new Map() }] })).toEqual([loop])
  })
})

// docs/adr/0003: a map that paints water owns the ponds, so the ground stops drawing its own.
describe('proceduralPonds', () => {
  const ponds = [{ x: 16, y: 16, r: 80 }]
  it('keeps the ponds when the water is the game\'s', () => {
    expect(proceduralPonds({ ponds, waterAuthored: false })).toEqual(ponds)
  })
  it('draws none when the map paints its own water', () => {
    expect(proceduralPonds({ ponds, waterAuthored: true })).toEqual([])
  })
})

// The wash fades out toward the border between two regions. Cut off at the border instead, it drew
// the Voronoi edge as a staircase of 32px tiles across the grass.
describe('eraWash', () => {
  const anchors = [{ bi: 'pradera', x: 0, y: 0 }, { bi: 'cyber', x: 1000, y: 0 }]

  it('is full strength deep inside a tinted region', () => {
    expect(eraWash(anchors, 1000, 0).alpha).toBeCloseTo(CONFIG.tint.eraAlpha)
  })
  it('fades to nothing at the border with the next region', () => {
    expect(eraWash(anchors, 505, 0).alpha).toBeLessThan(0.01)
  })
  it('is null in a region that has no wash', () => {
    expect(eraWash(anchors, 0, 0)).toBe(null)
  })
})

describe('visibleTileRange', () => {
  it('covers the viewport plus a one-tile margin on each side', () => {
    const r = visibleTileRange({ x: 64, y: 64 }, 320, 320, 32)
    expect(r.x0).toBe(1)
    expect(r.y0).toBe(1)
    expect(r.x1).toBe(13)
    expect(r.y1).toBe(13)
  })
})

describe('eraLabel', () => {
  it('returns the bilingual BIOMES label for a known biome', () => {
    expect(eraLabel('pradera', 'en')).toBe('Java / JEE Legacy')
    expect(eraLabel('castillo', 'es')).toBe('Claude Code / IA')
  })
  it('falls back to a farm label instead of throwing — the player spawns on the farm anchor, which has no BIOMES entry', () => {
    expect(eraLabel('farm', 'en')).toBe('The Farm')
    expect(eraLabel('farm', 'es')).toBe('La Granja')
  })
  it('never throws for an unknown biome id', () => {
    expect(() => eraLabel('nonexistent', 'en')).not.toThrow()
    expect(eraLabel('nonexistent', 'en')).toBe('nonexistent')
  })
})

describe('drawAuthoredTiles', () => {
  const fakeCtx = () => ({ canvas: { width: 64, height: 64 } })
  const fakeSprites = calls => ({
    draw: (ctx, name, x, y, w, h) => calls.push({ name, x, y, w, h }),
  })
  const authored = [
    { name: 'suelo', cells: new Map([['0,0', 'am_grass_0_0'], ['50,50', 'am_far_0_0']]) },
    { name: 'detalle', cells: new Map([['0,0', 'am_flower_0_0']]) },
  ]

  it('draws only cells inside the visible tile range', () => {
    const calls = []
    drawAuthoredTiles(fakeCtx(), { authored }, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls.map(c => c.name)).not.toContain('am_far_0_0')
  })
  it('draws layers in order so later layers land on top', () => {
    const calls = []
    drawAuthoredTiles(fakeCtx(), { authored }, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls.map(c => c.name)).toEqual(['am_grass_0_0', 'am_flower_0_0'])
  })
  it('positions a cell at tile coords minus the camera', () => {
    const calls = []
    drawAuthoredTiles(fakeCtx(), { authored }, { x: 10, y: 4 }, fakeSprites(calls))
    expect(calls[0]).toMatchObject({ x: -10, y: -4, w: 32, h: 32 })
  })
  it('does nothing when there is no authored map', () => {
    const calls = []
    drawAuthoredTiles(fakeCtx(), {}, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls).toEqual([])
  })
  it('washes a painted cell once with the era tint, not once per layer', () => {
    const fills = []
    const ctx = {
      canvas: { width: 64, height: 64 },
      save: () => {}, restore: () => {},
      fillRect: (x, y) => fills.push([x, y]),
      set fillStyle(v) { this._f = v },
      set globalAlpha(v) { this._a = v },
    }
    const world = { regions: [{ bi: 'cyber', x: 0, y: 0 }], farm: { x: 9000, y: 9000 } }
    drawAuthoredTiles(ctx, { authored, world }, { x: 0, y: 0 }, fakeSprites([]))
    expect(fills.filter(([x, y]) => x === 0 && y === 0)).toHaveLength(1)
  })

  // The authored base layer covers the whole map with grass. Drawn over the procedural ground, it
  // hid the roads to every door and the water of every pond, so those cells let the ground through.
  it('leaves a road cell to the procedural ground', () => {
    const calls = []
    const world = { roads: [{ a: { x: 0, y: 16 }, b: { x: 64, y: 16 } }] }
    drawAuthoredTiles(fakeCtx(), { authored, world }, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls).toEqual([])
  })
  it('leaves a pond cell to the procedural ground', () => {
    const calls = []
    const world = { ponds: [{ x: 16, y: 16, r: 80 }] }
    drawAuthoredTiles(fakeCtx(), { authored, world }, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls).toEqual([])
  })
  it('paints the map\'s water over a pond the map owns', () => {
    const calls = []
    const world = { ponds: [{ x: 16, y: 16, r: 80 }], waterAuthored: true }
    drawAuthoredTiles(fakeCtx(), { authored, world }, { x: 0, y: 0 }, fakeSprites(calls))
    expect(calls.map(c => c.name)).toContain('am_grass_0_0')
  })
  it('leaves the map\'s water out of the era wash, as the procedural water always was', () => {
    const fills = []
    const ctx = {
      canvas: { width: 32, height: 32 },
      save: () => {}, restore: () => {},
      fillRect: (x, y) => fills.push([x, y]),
      set fillStyle(v) { this._f = v },
      set globalAlpha(v) { this._a = v },
    }
    const world = { regions: [{ bi: 'cyber', x: 0, y: 0 }], farm: { x: 9000, y: 9000 } }
    const wet = [{ name: 'suelo', cells: new Map([['0,0', 'g']]) }, { name: 'water', cells: new Map([['0,0', 'w']]) }]
    drawAuthoredTiles(ctx, { authored: wet, world }, { x: 0, y: 0 }, fakeSprites([]))
    expect(fills).toEqual([])
  })
  it('washes every cell of an era with one tone, so the ground reads as a region and not a checkerboard', () => {
    const styles = new Set()
    const ctx = {
      canvas: { width: 128, height: 128 },
      save: () => {}, restore: () => {}, fillRect: () => {},
      set fillStyle(v) { styles.add(v) },
      set globalAlpha(v) {},
    }
    const cells = new Map([['0,0', 'g'], ['1,0', 'g'], ['2,0', 'g'], ['0,1', 'g'], ['1,1', 'g'], ['2,1', 'g']])
    const world = { regions: [{ bi: 'cyber', x: 0, y: 0 }], farm: { x: 9000, y: 9000 } }
    drawAuthoredTiles(ctx, { authored: [{ name: 'suelo', cells }], world }, { x: 0, y: 0 }, fakeSprites([]))
    expect(styles.size).toBe(1)
  })
})

describe('drawTransformed', () => {
  const recorder = () => {
    const ops = []
    const ctx = {
      canvas: { width: 64, height: 64 },
      save: () => ops.push(['save']),
      restore: () => ops.push(['restore']),
      translate: (x, y) => ops.push(['translate', x, y]),
      rotate: r => ops.push(['rotate', r]),
      scale: (x, y) => ops.push(['scale', x, y]),
    }
    return { ctx, ops }
  }
  const sprites = ops => ({
    frame: () => ({ w: 32, h: 48 }),
    draw: (ctx, name, x, y, w, h) => ops.push(['draw', name, x, y, w, h]),
  })

  it('draws an untransformed placement with no canvas state changes', () => {
    const { ctx, ops } = recorder()
    drawTransformed(ctx, sprites(ops), { frame: 'f', x: 100, y: 200 }, { x: 0, y: 0 })
    expect(ops).toEqual([['draw', 'f', 84, 152, 32, 48]])
  })
  it('offsets by the camera', () => {
    const { ctx, ops } = recorder()
    drawTransformed(ctx, sprites(ops), { frame: 'f', x: 100, y: 200 }, { x: 10, y: 20 })
    expect(ops).toEqual([['draw', 'f', 74, 132, 32, 48]])
  })
  it('mirrors horizontally around the bottom-centre anchor for flipX', () => {
    const { ctx, ops } = recorder()
    drawTransformed(ctx, sprites(ops), { frame: 'f', x: 100, y: 200, flipX: true }, { x: 0, y: 0 })
    expect(ops[0]).toEqual(['save'])
    expect(ops).toContainEqual(['translate', 100, 200])
    expect(ops).toContainEqual(['scale', -1, 1])
    expect(ops[ops.length - 1]).toEqual(['restore'])
  })
  it('rotates in degrees clockwise about the anchor', () => {
    const { ctx, ops } = recorder()
    drawTransformed(ctx, sprites(ops), { frame: 'f', x: 0, y: 0, rot: 90 }, { x: 0, y: 0 })
    expect(ops).toContainEqual(['rotate', Math.PI / 2])
  })
  it('applies uniform scale', () => {
    const { ctx, ops } = recorder()
    drawTransformed(ctx, sprites(ops), { frame: 'f', x: 0, y: 0, scale: 2 }, { x: 0, y: 0 })
    expect(ops).toContainEqual(['scale', 2, 2])
  })
})

// An authored house is a placed object: the placements pass draws its sprite, so the building
// renderer must not draw a second one over it (docs/adr/0001). The label is the site's, not the
// sprite's, so it survives either way.
describe('buildingDrawable', () => {
  const fakeCtx = () => ({ fillStyle: '', font: '', fillText() {} })
  const fakeSprites = () => { const calls = []; return { calls, draw: (...a) => calls.push(a) } }
  const site = (over = {}) => ({ cx: 100, cy: 200, w: 60, h: 80, co: 'Soldife', building: 'house', ...over })

  it('draws the building sprite for a generated house', () => {
    const sprites = fakeSprites()
    buildingDrawable(site(), { x: 0, y: 0 }).draw(fakeCtx(), sprites)
    expect(sprites.calls).toHaveLength(1)
    expect(sprites.calls[0][1]).toBe('house')
  })

  it('draws no sprite for an authored one', () => {
    const sprites = fakeSprites()
    buildingDrawable(site({ building: null, authored: true }), { x: 0, y: 0 }).draw(fakeCtx(), sprites)
    expect(sprites.calls).toEqual([])
  })

  it('still labels the authored one', () => {
    const labels = []
    const ctx = { fillStyle: '', font: '', fillText: t => labels.push(t) }
    buildingDrawable(site({ building: null, authored: true }), { x: 0, y: 0 }).draw(ctx, fakeSprites())
    expect(labels).toContain('Soldife')
  })

  // The depth sort is what makes a house occlude what stands behind it. An authored house takes part
  // in it like any other, or it would draw flat against the world.
  // Every house labelled at once crowded the screen and clipped names at its edges. Only the house
  // the player is near says who it is.
  it('hides the label of a house the player is not near', () => {
    const labels = []
    const ctx = { fillStyle: '', font: '', textAlign: '', fillText: t => labels.push(t) }
    buildingDrawable(site(), { x: 0, y: 0 }, false).draw(ctx, fakeSprites())
    expect(labels).toEqual([])
  })

  it('centres the label on the house, so a long name does not hang off one side', () => {
    const at = []
    const ctx = { fillStyle: '', font: '', textAlign: '', fillText(t, x) { at.push([t, x, this.textAlign]) } }
    buildingDrawable(site(), { x: 0, y: 0 }).draw(ctx, fakeSprites())
    expect(at[0]).toEqual(['Soldife', 100, 'center'])
  })

  it('reports the same ground contact either way', () => {
    expect(buildingDrawable(site({ building: null }), { x: 0, y: 0 }).baseY)
      .toBe(buildingDrawable(site(), { x: 0, y: 0 }).baseY)
  })
})

// A canvas stand-in: monospace glyphs measure 6.6px at 11px, anything else 5px, and every
// fillText records the font it was drawn with.
function textCtx(logicalWidth, { logicalHeight = 400, safeBottom } = {}) {
  const texts = []
  const ctx = {
    canvas: { width: logicalWidth * 2, height: 800, logicalWidth, logicalHeight, safeBottom },
    font: '10px sans-serif',
    fillRect: () => {},
    save: () => {},
    restore: () => {},
    measureText: str => ({ width: str.length * (ctx.font === '11px monospace' ? 6.6 : 5) }),
    fillText: (text, x, y) => { texts.push({ text, x, y, font: ctx.font }) },
  }
  return { ctx, texts }
}
const openDialog = text => {
  const dialog = createDialog()
  dialog.open(bulletSource({ bullets: { en: [text], es: [text] } }, 1))
  dialog.advance()
  return { dialog, lang: 'en' }
}

describe('drawDialog', () => {
  it('draws with its own font, whatever was set before', () => {
    const { ctx, texts } = textCtx(640)
    drawDialog(ctx, openDialog('hello there'))
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.every(t => t.font === DIALOG_FONT)).toBe(true)
  })
})

describe('drawDialog on a phone', () => {
  const LONG = 'Moved the warehouse ops (app and back office) onto one event stream so every bodega reports in seconds, not hours, across the whole fleet'
  it('wraps a bullet to the width the box has, measured in the dialog font', () => {
    const { ctx, texts } = textCtx(336)
    const state = openDialog(LONG)
    drawDialog(ctx, state)
    const lines = texts.filter(t => t.x === 40).map(t => t.text)
    expect(lines).toEqual(paginate(LONG, { cols: 38 })[0].split('\n'))
    expect(lines.every(l => 40 + l.length * 6.6 <= 336 - 40)).toBe(true)
  })
})

// On a phone the D-pad and A sit over the bottom of the canvas (WorldRpg.jsx stamps how much of it
// they cover as canvas.safeBottom). The dialog never goes under them, and never over the player.
describe('dialogRect', () => {
  const W = 336
  const H = 472
  const SAFE = 128
  it.each([0, 100, 171, 172, 250, 400, 471])('never reaches under the touch controls (player at %i)', y => {
    const r = dialogRect(W, H, SAFE, y)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.y + r.h).toBeLessThanOrEqual(H - SAFE)
  })
  it('sits at the bottom of the free area while the player is in its upper half', () => {
    expect(dialogRect(W, H, SAFE, 100)).toEqual({ x: 20, y: H - SAFE - 8 - 120, w: W - 40, h: 120 })
  })
  it('flips to the top when the player is in the lower half', () => {
    expect(dialogRect(W, H, SAFE, 300)).toEqual({ x: 20, y: 20, w: W - 40, h: 120 })
  })
  it('keeps the desktop box where it was when no controls cover the canvas', () => {
    expect(dialogRect(640, 400, 0, 100)).toEqual({ x: 20, y: 400 - 150, w: 600, h: 120 })
  })
})

describe('viewportOf', () => {
  it('carries the strip the touch controls cover, none when the canvas says nothing', () => {
    expect(viewportOf({ canvas: { width: 10, height: 10, safeBottom: 128 } }).safeBottom).toBe(128)
    expect(viewportOf({ canvas: { width: 10, height: 10 } }).safeBottom).toBe(0)
  })
})

describe('drawDialog clears the touch controls', () => {
  const LONG = Array.from({ length: 12 }, (_, i) => `line ${i} of a bullet long enough to need a second page of the box`).join(' ')
  const draw = playerY => {
    const { ctx, texts } = textCtx(336, { logicalHeight: 472, safeBottom: 128 })
    drawDialog(ctx, { ...openDialog(LONG), player: { x: 0, y: playerY } }, { x: 0, y: 0 })
    return texts
  }
  it.each([[100], [300]])('draws every line and the page indicator inside the box (player at %i)', y => {
    const box = dialogRect(336, 472, 128, y)
    const texts = draw(y)
    expect(texts.some(t => /^\d+\/\d+$/.test(t.text))).toBe(true)
    expect(texts.every(t => t.y > box.y && t.y < box.y + box.h)).toBe(true)
  })
  it('measures the player against the camera', () => {
    const { ctx, texts } = textCtx(336, { logicalHeight: 472, safeBottom: 128 })
    drawDialog(ctx, { ...openDialog('hi'), player: { x: 0, y: 1300 } }, { x: 0, y: 1000 })
    expect(texts[0].y).toBeLessThan(200)
  })
})

describe('drawFade', () => {
  it('shows a loading cue only while it holds dark for the room', () => {
    const shown = fade => {
      const { ctx, texts } = textCtx(640)
      drawFade(ctx, { fade })
      return texts.map(t => t.text)
    }
    expect(shown({ phase: 'hold', t: 1 })).toEqual(['…'])
    expect(shown({ phase: 'out', t: 0.5 })).toEqual([])
    expect(shown({ phase: 'in', t: 0.5 })).toEqual([])
    expect(shown(null)).toEqual([])
  })
})

// Inside an interior the room is drawn at world scale 2 (convert.js WORLD_TILE), so the avatar is too:
// its 64px source cell at 128, an exact 2x that keeps the pixel art crisp. Outdoors it stays as tuned.
describe('avatarSize', () => {
  it('is the configured size outdoors', () => {
    expect(avatarSize({ world: {} })).toEqual({ w: CONFIG.avatar.width, h: CONFIG.avatar.height })
  })
  it('is the 64px cell at world scale inside an interior', () => {
    expect(avatarSize({ world: { interior: true } })).toEqual({ w: 128, h: 128 })
  })
})

describe('drawAvatar', () => {
  const player = { x: 300, y: 200, dir: 'down', moving: false, step: 0 }
  const drawn = world => {
    const calls = []
    const paint = (ctx, name, x, y, w, h) => calls.push({ x, y, w, h })
    drawAvatar({}, { player, world, clock: 0 }, { x: 0, y: 0 }, { draw: paint, drawFlipped: paint })
    return calls
  }
  // The source cell's feet end on its row 41 of 64 (82 of 128 drawn). Centred, they fell 6px below the
  // collision box, so the player looked to stand in front of whatever stopped them.
  it('stands the world-scale avatar on its collision box inside an interior', () => {
    const calls = drawn({ interior: true })
    const boxBottom = 200 + PLAYER_BOX.w / 2
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(c => c.x === 300 - 64 && c.y + 82 === boxBottom && c.w === 128 && c.h === 128)).toBe(true)
  })
  it('keeps the outdoor size outside', () => {
    const [c] = drawn({})
    expect(c).toEqual({ x: 300 - CONFIG.avatar.width / 2, y: 200 - CONFIG.avatar.height / 2, w: CONFIG.avatar.width, h: CONFIG.avatar.height })
  })
})
