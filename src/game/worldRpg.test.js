import { describe, it, expect, vi } from 'vitest'
import {
  createWorldRpg, update, canControl, enterInterior, nearestInteractable,
} from './worldRpg.js'
import { buildInteriorWorld } from './world/interiors.js'
import { paginate } from './render/dialog.js'
import { render2d } from './render/scene2d.js'
import { AVATAR_LAYERS, avatarFrame } from './render/tiles.js'
import { doorPoint } from './entities/site.js'
import { DAY_LEN } from './render/ambient.js'
import { phaseOf, daylight } from './render/lighting.js'
import { createMusic } from './audio/music.js'
import experience from '../data/experience.json'
import authoredTiles from './world/authored/career.tiles.json'
import interactables from '../data/interactables.json'

// The world comes from the map (docs/adr/0001): the same artifacts the page hands the game.
const MAP = { authoredTiles, interactables }

describe('worldRpg core', () => {
  it('builds a playable state with the real career data', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    expect(g.state.world.sites.length).toBeGreaterThan(0)
    expect(g.state.player).toBeTruthy()
  })
  it('starts the world clock at midday — a recruiter must see daylight on load, not night', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    expect(daylight(phaseOf(g.state.clock, DAY_LEN))).toBeGreaterThan(0.8)
  })
  it('builds state with sprites unset until start() loads them', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    expect(g.state.sprites).toBe(null)
  })
  it('update moves the player when input is held', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    const x0 = g.state.player.x
    update(g.state, { R: 1 }, 1.6)
    expect(g.state.player.x).toBeGreaterThan(x0)
  })
  it('update freezes movement while dialog is open', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    g.state.dialog.open(g.state.world.sites[0])
    const x0 = g.state.player.x
    update(g.state, { R: 1 }, 1.6)
    expect(g.state.player.x).toBe(x0)
  })
  it('revealing appends hidden sites to the interactable set', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [{ co: 'Mr. Yoker', title: { en: 'Indie', es: 'Indie' }, date: { en: 's', es: 'p' }, tech: ['Astro'] }], lang: 'es' })
    expect(g.activeSites().length).toBe(g.state.world.sites.length)
    g.reveal()
    expect(g.activeSites().length).toBe(g.state.world.sites.length + 1)
  })
  it('first read of a site emits a discovery particle burst', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    const site = g.state.world.sites[0]
    const door = doorPoint(site)
    g.state.player.x = door.x
    g.state.player.y = door.y
    g.interact()
    expect(g.state.particles.alive().length).toBeGreaterThan(0)
  })
  it('re-reading an already-seen site does not emit another burst', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    const site = g.state.world.sites[0]
    const door = doorPoint(site)
    g.state.player.x = door.x
    g.state.player.y = door.y
    g.interact() // closed -> opens (typing) + bursts on first read
    g.state.particles.update(1000) // let the discovery burst fully expire
    g.interact() // typing -> waiting
    g.interact() // waiting -> closed
    g.interact() // closed -> reopens the now-seen site: no burst this time
    expect(g.state.particles.alive().length).toBe(0)
  })
  it('the Konami reveal sets a screen-shake impulse', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    expect(g.state.shake).toBe(0)
    g.reveal()
    expect(g.state.shake).toBeGreaterThan(0)
  })
  it('update advances the world clock and never throws without a canvas', () => {
    const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    expect(() => update(g.state, {}, 1.6)).not.toThrow()
    expect(g.state.clock).toBeGreaterThan(0)
  })

  describe('intro sequence', () => {
    it('exists and is not done at start, and skip() completes it', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      expect(g.state.intro).toBeTruthy()
      expect(g.state.intro.done()).toBe(false)
      g.state.intro.skip()
      expect(g.state.intro.done()).toBe(true)
    })
    it('canControl gates on the intro: false while playing, true once done', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      expect(canControl(g.state)).toBe(false)
      g.state.intro.skip()
      expect(canControl(g.state)).toBe(true)
    })
  })

  describe('audio wiring', () => {
    it('state.music exists and is muted until a gesture arms it', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      expect(g.state.music).toBeTruthy()
      expect(g.state.music.isMuted()).toBe(true)
    })
    it('createMusic(null) is muted and tolerates a null ctx — the pre-gesture no-op path', () => {
      expect(createMusic(null).isMuted()).toBe(true)
    })
    it('update tracks the biome under the player for region-music switching, without throwing', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      expect(g.state.lastBiome).toBe(null)
      expect(() => update(g.state, {}, 1.6)).not.toThrow()
      expect(g.state.lastBiome).toBeTruthy()
    })
    it('walking throttles a footstep frame counter without throwing (no audio ctx in tests)', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      for (let i = 0; i < 20; i += 1) expect(() => update(g.state, { R: 1 }, 1.6)).not.toThrow()
      expect(g.state.walkFrames).toBeGreaterThan(0)
    })
    it('reveal() and interact() never throw when firing their SFX hooks with no audio ctx', () => {
      const g = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
      const site = g.state.world.sites[0]
      const door = doorPoint(site)
      g.state.player.x = door.x
      g.state.player.y = door.y
      expect(() => g.interact()).not.toThrow() // discover + confirm
      expect(() => g.reveal()).not.toThrow() // fanfare
    })
  })
})

// docs: a placement with a hitbox (a tree trunk, a lamp post) blocks the player like a house does.
describe('worldRpg placement collision', () => {
  it('stops the player at a placed object\'s solid box', () => {
    const probe = createWorldRpg({ canvas: null, experience, ...MAP, sideProjects: [], lang: 'es' })
    const { x, y } = probe.state.player
    const trunk = { frame: 'am_tree', x: x + 40, y: y + 10, solid: { x: x + 20, y: y - 10, w: 16, h: 20 } }
    const g = createWorldRpg({ canvas: null, experience, ...MAP, placements: [...(MAP.placements || []), trunk], sideProjects: [], lang: 'es' })
    for (let i = 0; i < 30; i++) { update(probe.state, { R: 1 }, 1.6); update(g.state, { R: 1 }, 1.6) }
    expect(probe.state.player.x).toBeGreaterThan(x + 20)
    expect(g.state.player.x).toBeLessThan(x + 20)
  })
})

// docs/adr/0004: a house with an adopted interior is walked into, read, and walked out of.
const TUL = experience.entries.find(e => e.id === 'tul-2022')
const SPAWN = { x: 320, y: 400 }
const HOST = { x: 320, y: 120 }
const READS = [[100, 200], [200, 200], [440, 200], [540, 200]]
const EXIT = { x: 320, y: 460 }
const CRATE = { x: 360, y: 380, w: 20, h: 40 }
function interiorData({ cols = 20, rows = 15, spawn = SPAWN, solids = [CRATE] } = {}) {
  return {
    tiles: { cols, rows, frames: ['f0'], layers: [{ name: 'floor', cells: [[0, 0, 0]] }] },
    placements: solids.map((solid, i) => ({ frame: 'crate', x: solid.x, y: solid.y + solid.h, uid: `P${i}`, solid })),
    clips: {},
    interactables: [
      { uid: 'I1', kind: 'spawn', spawn: true, ...spawn },
      { uid: 'I2', kind: 'npc', id: 'host', ...HOST },
      ...READS.map(([x, y], i) => ({ uid: `R${i}`, kind: 'read', id: String(i + 1), x, y })),
      { uid: 'I3', kind: 'exit', exit: true, ...EXIT },
    ],
  }
}
const INTERIOR_ATLAS = { images: { interior: '/game/interiors/tul-2022.png' }, frames: { crate: { img: 'interior', x: 0, y: 0, w: 1, h: 1 } } }
const FAKE_SPRITES = { draw: () => {}, drawFlipped: () => {}, frame: () => ({ w: 16, h: 16 }) }

function interiorGame({ data = interiorData(), load } = {}) {
  const calls = []
  const loader = load || (id => { calls.push(id); return Promise.resolve({ data, atlas: INTERIOR_ATLAS }) })
  const g = createWorldRpg({
    canvas: null, experience, ...MAP, sideProjects: [], lang: 'en',
    interiorIds: new Set(['tul-2022']), loadInterior: loader, loadSheet: () => Promise.resolve(FAKE_SPRITES),
  })
  return { g, calls, site: g.state.world.sites.find(s => s.id === 'tul-2022') }
}
function standAt(state, { x, y }) { state.player.x = x; state.player.y = y }
// Frames until the door's fade has played out; how many it took.
function settle(state) {
  let n = 0
  while (state.fade && n < 200) { update(state, {}, 1.6); n += 1 }
  return n
}
async function enterTul(t) {
  standAt(t.g.state, doorPoint(t.site))
  await t.g.interact()
  settle(t.g.state)
}

describe('worldRpg interiors', () => {
  it('enters Tul through its door: the scene switches, the player stands at the spawn, the house is seen', async () => {
    const t = interiorGame()
    standAt(t.g.state, doorPoint(t.site))
    const loading = t.g.interact()
    // The burst greets the press; by the time the fade has played out it has faded too.
    expect(t.g.state.particles.alive().length).toBeGreaterThan(0)
    await loading
    settle(t.g.state)
    expect(t.g.state.scene.id).toBe('tul-2022')
    expect(t.g.state.world.interior).toBe(true)
    expect(t.g.state.sprites).toBe(FAKE_SPRITES)
    expect([t.g.state.player.x, t.g.state.player.y, t.g.state.player.dir]).toEqual([SPAWN.x, SPAWN.y, 'up'])
    expect(t.site.seen).toBe(true)
    expect(t.g.state.entering).toBe(false)
  })
  it('a door without an interior opens the card, as today', () => {
    const t = interiorGame()
    const other = t.g.state.world.sites.find(s => s.id !== 'tul-2022')
    standAt(t.g.state, doorPoint(other))
    expect(t.g.interact()).toBeUndefined()
    expect(t.g.state.dialog.isOpen()).toBe(true)
    expect(t.g.state.scene).toBe(null)
    expect(t.calls).toEqual([])
  })
  it('the host tells the card of the house', async () => {
    const t = interiorGame()
    await enterTul(t)
    standAt(t.g.state, HOST)
    t.g.interact()
    t.g.state.dialog.advance()
    expect(t.g.state.dialog.visibleText('en')).toContain(TUL.title.en)
    expect(t.g.state.dialog.visibleText('en')).toContain(TUL.company)
  })
  it('read:2 shows bullet 2 of the experience, in the current language', async () => {
    const t = interiorGame()
    await enterTul(t)
    t.g.state.lang = 'es'
    standAt(t.g.state, { x: READS[1][0], y: READS[1][1] })
    t.g.interact()
    t.g.state.dialog.advance()
    expect(t.g.state.dialog.visibleText('es')).toBe(paginate(TUL.bullets.es[1])[0])
  })
  it('the exit puts the player back at the door, facing down, with the clock kept', async () => {
    const t = interiorGame()
    const sites = t.g.state.world.sites.length
    await enterTul(t)
    for (let i = 0; i < 5; i += 1) update(t.g.state, {}, 1.6)
    const clock = t.g.state.clock
    standAt(t.g.state, EXIT)
    t.g.interact()
    const frames = settle(t.g.state)
    expect(t.g.state.scene).toBe(null)
    expect(t.g.state.world.sites.length).toBe(sites)
    expect(t.g.state.world.interior).toBeUndefined()
    const door = doorPoint(t.site)
    expect([t.g.state.player.x, t.g.state.player.y, t.g.state.player.dir]).toEqual([door.x, door.y, 'down'])
    expect(t.g.state.clock).toBeCloseTo(clock + frames * 1.6)
    expect(t.site.seen).toBe(true)
  })
  it('presses during the load start one load and one switch, and the player is frozen meanwhile', async () => {
    const t = interiorGame()
    standAt(t.g.state, doorPoint(t.site))
    const first = t.g.interact()
    t.g.interact()
    t.g.interact()
    expect(t.calls).toEqual(['tul-2022'])
    expect(t.g.state.entering).toBe(true)
    const x0 = t.g.state.player.x
    update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBe(x0)
    await first
    settle(t.g.state)
    expect(t.g.state.scene.id).toBe('tul-2022')
    expect(t.g.state.scene.outside.world.interior).toBeUndefined()
  })
  it('a failed load falls back to the card and leaves the player free to walk', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const t = interiorGame({ load: () => Promise.reject(new Error('offline')) })
    await enterTul(t)
    expect(t.g.state.scene).toBe(null)
    expect(t.g.state.entering).toBe(false)
    expect(t.g.state.dialog.isOpen()).toBe(true)
    t.g.state.dialog.advance()
    expect(t.g.state.dialog.visibleText('en')).toContain(TUL.company)
    t.g.state.dialog.advance()
    const x0 = t.g.state.player.x
    update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBeGreaterThan(x0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('inside, the player walks and is stopped by the interior\'s placed objects', async () => {
    const t = interiorGame()
    await enterTul(t)
    for (let i = 0; i < 40; i += 1) update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBeGreaterThan(SPAWN.x)
    expect(t.g.state.player.x).toBeLessThan(CRATE.x)
  })
  it('inside, painted water stops the player at its shore', async () => {
    const data = interiorData({ solids: [] })
    const pool = [11, 12, 13].flatMap(y => [[12, y, 0], [13, y, 0]])
    data.tiles.layers.push({ name: 'water', cells: pool })
    const t = interiorGame({ data })
    await enterTul(t)
    for (let i = 0; i < 40; i += 1) update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBeGreaterThan(SPAWN.x)
    expect(t.g.state.player.x).toBeLessThan(12 * 32)
  })
  it('inside, the exterior houses do not block', async () => {
    const probe = interiorGame()
    const { site } = probe
    const spawn = { x: site.cx - site.w / 2 - 30, y: site.cy + site.h / 2 }
    const t = interiorGame({ data: interiorData({ cols: 80, rows: 60, spawn, solids: [] }) })
    await enterTul(t)
    for (let i = 0; i < 40; i += 1) update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBeGreaterThan(site.cx)
  })
  it('inside, a revealed world neither breaks update nor counts hidden sites', async () => {
    const t = interiorGame()
    t.g.reveal()
    await enterTul(t)
    expect(() => update(t.g.state, { R: 1 }, 1.6)).not.toThrow()
  })
  it('the door fades to dark, switches under black, and fades back in', async () => {
    const t = interiorGame()
    standAt(t.g.state, doorPoint(t.site))
    await t.g.interact()
    expect(t.g.state.fade.phase).toBe('out')
    expect(t.g.state.scene).toBe(null)
    for (let i = 0; i < 14; i += 1) update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.scene).toBe(null)
    update(t.g.state, {}, 1.6)
    expect(t.g.state.scene.id).toBe('tul-2022')
    expect(t.g.state.fade).toEqual({ phase: 'in', t: 1 })
    expect(t.g.state.entering).toBe(false)
    expect([t.g.state.player.x, t.g.state.player.y]).toEqual([SPAWN.x, SPAWN.y])
    for (let i = 0; i < 15; i += 1) update(t.g.state, {}, 1.6)
    expect(t.g.state.fade).toBe(null)
    update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.player.x).toBeGreaterThan(SPAWN.x)
  })
  it('stays dark, the player held, for as long as the room takes to load', () => {
    const t = interiorGame({ load: () => new Promise(() => {}) })
    standAt(t.g.state, doorPoint(t.site))
    t.g.interact()
    const x0 = t.g.state.player.x
    for (let i = 0; i < 60; i += 1) update(t.g.state, { R: 1 }, 1.6)
    expect(t.g.state.fade).toEqual({ phase: 'hold', t: 1 })
    expect(t.g.state.entering).toBe(true)
    expect(t.g.state.player.x).toBe(x0)
    expect(t.g.interact()).toBeUndefined()
  })
  it('the exit fades too: out, back outside under black, then in', async () => {
    const t = interiorGame()
    await enterTul(t)
    standAt(t.g.state, EXIT)
    t.g.interact()
    expect(t.g.state.fade.phase).toBe('out')
    expect(t.g.state.scene.id).toBe('tul-2022')
    t.g.interact()
    for (let i = 0; i < 15; i += 1) update(t.g.state, {}, 1.6)
    expect(t.g.state.scene).toBe(null)
    expect(t.g.state.fade.phase).toBe('in')
    settle(t.g.state)
    expect(t.g.state.fade).toBe(null)
  })
  it('entering closes an open dialog and asks the camera to snap', () => {
    const t = interiorGame()
    t.g.state.dialog.open(t.site)
    enterInterior(t.g.state, t.site, buildInteriorWorld(interiorData()), FAKE_SPRITES)
    expect(t.g.state.dialog.isOpen()).toBe(false)
    expect(t.g.state.camSnap).toBe(true)
  })
})

// Any ctx method is a no-op; the sprites record the frame names drawn.
function recordingCtx() {
  const ctx = new Proxy({ canvas: { width: 640, height: 480 } }, {
    get: (o, k) => (k in o ? o[k] : () => ({ width: 0 })),
    set: (o, k, v) => { o[k] = v; return true },
  })
  return ctx
}
function recordingSprites(drawn) {
  const draw = (ctx, name) => { drawn.push(name) }
  return { draw, drawFlipped: draw, frame: () => ({ w: 16, h: 16 }) }
}

describe('render2d inside an interior', () => {
  it('draws the map and the avatar, but no generated ground or HUD', async () => {
    const t = interiorGame()
    await enterTul(t)
    t.g.state.intro.skip()
    const drawn = []
    t.g.state.sprites = recordingSprites(drawn)
    expect(() => render2d(recordingCtx(), t.g.state, { x: -10, y: -20 })).not.toThrow()
    expect(drawn).toContain('f0')
    expect(drawn).toContain('crate')
    const avatar = [0, 1].flatMap(phase => AVATAR_LAYERS.map(layer => avatarFrame(layer, 'up', false, phase)))
    expect(drawn.filter(n => !avatar.includes(n)).sort()).toEqual(['crate', 'f0'])
  })
})

describe('nearestInteractable', () => {
  const world = buildInteriorWorld(interiorData())
  it('finds the host, a read and the exit by their base point', () => {
    expect(nearestInteractable(HOST, world)).toEqual({ kind: 'host', entry: world.host })
    expect(nearestInteractable({ x: 205, y: 210 }, world)).toEqual({ kind: 'read', entry: world.reads[1] })
    expect(nearestInteractable(EXIT, world)).toEqual({ kind: 'exit', entry: world.exit })
  })
  it('is null out of reach, and on the exterior', () => {
    expect(nearestInteractable(SPAWN, world)).toBe(null)
    expect(nearestInteractable(HOST, { sites: [] })).toBe(null)
  })
  it('picks the closest of two in reach', () => {
    expect(nearestInteractable({ x: 130, y: 200 }, world, 200).entry).toBe(world.reads[0])
  })
})
