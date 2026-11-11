import { buildOverworld } from './world/overworld.js'
import { buildAuthoredIndex, worldSizeOf } from './world/authored/index.js'
import {
  placementSolids, adoptedInteriorIds, loadInterior, withInteriorAtlas, buildInteriorWorld,
} from './world/interiors.js'
import { waterCellsOf } from './world/water.js'
import { wallCellsOf, wallSolids } from './world/walls.js'
import { WORLD_TILE } from './world/authored/convert.js'
import { biomeForYear } from './world/biomes.js'
import { buildDecor } from './world/decor.js'
import { stepMovement, PLAYER_BOX } from './engine/topdown.js'
import { followCamera2D } from './engine/camera2d.js'
import { nearestSite, doorPoint } from './entities/site.js'
import { createDialog, siteSource, bulletSource } from './render/dialog.js'
import { startFade, stepFade, fadeIn } from './render/fade.js'
import { createKonami } from './input/konami.js'
import { createTopdownInput } from './input/topdownInput.js'
import { render2d, activeSites, regionsWithFarm } from './render/scene2d.js'
import { nearestBiome } from './render/tiles.js'
import { createLoop } from './engine/loop.js'
import { loadSprites } from './assets/loader.js'
import ATLAS from './assets/atlas.json'
import { createParticles, burst } from './render/juice.js'
import { createCritters, updateCritters } from './entities/critters.js'
import { createNpcs, updateNpcs } from './entities/npcs.js'
import { CONFIG } from './config.js'
import { DAY_LEN } from './render/ambient.js'
import { createIntro } from './intro.js'
import { createMusic } from './audio/music.js'
import { createAudio, initAudio, setMuted, sfx } from './audio/sfx.js'

const STEP_RATE = CONFIG.avatar.stepRate
const FOOTSTEP_EVERY = 14

// Loop-step/input-wiring gate (not baked into the pure `update()`): while the intro plays,
// start()'s step skips calling update() and the input callbacks ignore movement/interact —
// this predicate is the single source of truth both sides check.
export function canControl(state) { return state.intro.done() }

function solidOf(s) {
  return { x: s.cx - s.w / 2, y: s.cy, w: s.w, h: s.h }
}

// Building collision boxes: every company structure plus the farm landmarks (barn + windmill —
// footprints with no dialog), so the player can't walk through any of them. The windmill's solid
// is its tower only (left 69/128 of its width); the overhanging sails are non-blocking air.
function buildingSolids(sites, farmBuilding, farmWindmill) {
  const solids = sites.map(solidOf)
  if (farmBuilding) solids.push(solidOf(farmBuilding))
  if (farmWindmill) {
    const tw = farmWindmill.w * (69 / 128)
    solids.push({ x: farmWindmill.cx - farmWindmill.w / 2, y: farmWindmill.cy, w: tw, h: farmWindmill.h })
  }
  return solids
}

// Small AABB around each solid decor item's ground-contact point (trunk/base width, not the
// full canopy sprite) — keeps trees/rocks/fences blocking without making them feel oversized.
function decorSolids(decor) {
  return decor.filter(d => d.solid).map(d => ({ x: d.x - 10, y: d.y - 14, w: 20, h: 14 }))
}

// Pond collision. Water the map paints already carries its boxes (docs/adr/0003). The configured
// ponds are circle solids (see engine/topdown.js hits), the radius pulled in to ~0.82 of the visual
// water radius so the player can walk right up to and along the shore bank without being blocked a
// whole tile early, but can't stand on open water.
function pondSolids(world) {
  if (world.waterSolids) return world.waterSolids
  return (world.ponds || []).map(p => ({ cx: p.x, cy: p.y, r: p.r * CONFIG.pond.collisionFactor }))
}

// Throttled footstep SFX while walking — a beep every FOOTSTEP_EVERY frames of movement,
// silent (and counter reset) the instant the player stops.
function updateFootsteps(state, moving) {
  if (!moving) { state.walkFrames = 0; return }
  state.walkFrames += 1
  if (state.walkFrames % FOOTSTEP_EVERY === 0) sfx(state.audio, 'footstep')
}

// Region-music crossfade trigger — only calls into music.setRegion() when the biome under the
// avatar actually changes, so setRegion isn't spammed every frame.
function updateRegionMusic(state) {
  const bi = nearestBiome(regionsWithFarm(state.world), state.player.x, state.player.y)
  if (bi === state.lastBiome) return
  state.lastBiome = bi
  state.music.setRegion(bi)
}

// How close the player's base point has to be to a host, read or exit's for the action to reach it.
export const INTERACT_RANGE = 40
// Re-exported beside INTERACT_RANGE: the rooms test (world/interiors.rooms.test.js) walks a room with
// the same box and reach the game plays with.
export { PLAYER_BOX }

function placePlayer(player, { x, y }, dir) {
  Object.assign(player, { x, y, dir, moving: false, step: 0 })
}

// Switching worlds, the camera's lerp would sweep across the map from the old view to the new one.
// draw() reads this and jumps the camera once.
function requestCamSnap(state) { state.camSnap = true }

// The exterior is stashed whole, not rebuilt, so whatever the player discovered out there (seen
// houses, the Konami reveal, the day clock) is still there on the way out.
export function enterInterior(state, site, built, sprites) {
  const { world, authored, decor, critters, npcs, player } = state
  const outside = {
    world, authored, decor, critters, npcs, sprites: state.sprites, player: { x: player.x, y: player.y, dir: player.dir },
  }
  state.scene = { id: site.id, site, outside }
  Object.assign(state, { world: built, authored: built.authored, decor: [], critters: [], npcs: [], sprites })
  placePlayer(state.player, built.spawn, 'up')
  state.dialog = createDialog()
  requestCamSnap(state)
}

export function leaveInterior(state) {
  const { site, outside: { player, ...outside } } = state.scene
  Object.assign(state, outside)
  placePlayer(state.player, doorPoint(site), 'down')
  state.scene = null
  requestCamSnap(state)
}

// A door switches worlds under black: the press starts the fade and queues the switch, which
// waits for the screen to be dark (and for the room to have loaded) before it runs.
function crossDoor(state) {
  state.entering = true
  state.fade = startFade()
}

function switchWhenDark(state, run) { state.pending = run }

function advanceFade(state, dtChars) {
  state.fade = stepFade(state.fade, dtChars)
  if (!state.fade || state.fade.phase !== 'hold' || !state.pending) return
  const run = state.pending
  state.pending = null
  run()
  state.entering = false
  state.fade = fadeIn()
}

function interactablesOf(world) {
  const reads = (world.reads || []).map(entry => ({ kind: 'read', entry }))
  const host = world.host ? [{ kind: 'host', entry: world.host }] : []
  const exit = world.exit ? [{ kind: 'exit', entry: world.exit }] : []
  return host.concat(reads, exit)
}

// Measured to the entry's base point, the (x, y) the editor tagged.
export function nearestInteractable(player, world, r = INTERACT_RANGE) {
  const dist = ({ entry }) => Math.hypot(player.x - entry.x, player.y - entry.y)
  const inReach = interactablesOf(world).filter(hit => dist(hit) < r)
  if (!inReach.length) return null
  return inReach.reduce((best, hit) => (dist(hit) < dist(best) ? hit : best))
}

export function update(state, input, dtChars) {
  advanceFade(state, dtChars)
  const frozen = state.dialog.isOpen() || !!state.entering || !!state.fade
  const solids = buildingSolids(activeSites(state), state.world.farmBuilding, state.world.farmWindmill)
    .concat(decorSolids(state.decor || []), pondSolids(state.world), state.world.placementSolids, state.world.wallSolids || [])
  const r = stepMovement(state.player, { ...input, frozen }, solids, { w: state.world.worldW, h: state.world.worldH })
  state.player.x = r.x; state.player.y = r.y; state.player.dir = r.dir; state.player.moving = r.moving
  state.player.step = r.moving ? state.player.step + STEP_RATE : 0
  updateFootsteps(state, r.moving)
  if (!state.world.interior) updateRegionMusic(state)
  state.dialog.tick(dtChars)
  state.clock += dtChars
  state.particles.update(1)
  state.shake *= 0.9
  state.critters = updateCritters(state.critters, dtChars, state.clock)
  state.npcs = updateNpcs(state.npcs, state.clock)
}

export function createWorldRpg({
  canvas, experience, sideProjects = [], lang = 'es', onLangChange, placements = [], clips = {},
  authoredTiles = null, interactables = [],
  interiorIds = adoptedInteriorIds(), loadInterior: load = loadInterior, loadSheet = loadSprites,
}) {
  const authored = buildAuthoredIndex(authoredTiles)
  // interactables.json: what the authored map says the world CONTAINS, as opposed to what it looks
  // like. Today buildOverworld reads the `door:` entries from it — a house placed and tagged in the
  // editor wins over the one the generator would have hashed into place (docs/adr/0001). The
  // water layer, when the map paints one, replaces the configured ponds (docs/adr/0003).
  const world = buildOverworld(experience, biomeForYear, {
    sideProjects,
    anchors: authoredTiles && authoredTiles.anchors,
    doors: interactables,
    world: worldSizeOf(authoredTiles),
    water: waterCellsOf(authored),
  })
  // Assets placed in the world-editor (src/game/world/authored/career.map.json → npm run
  // map:import → src/data/placements.json): a flat list of { frame, x, y } plus optional
  // transforms, drawn as non-solid decor, bottom-anchored at (x,y).
  world.placements = placements
  world.placementSolids = placementSolids(placements)
  // A tiles layer named 'walls' blocks every cell it paints, here as in any interior (docs/adr/0005).
  world.wallSolids = wallSolids(wallCellsOf(authored), WORLD_TILE)
  // The clip table those placements play (src/data/clips.json), keyed by the clip id a placement
  // carries. Frame names, already baked into the atlas by the same import.
  world.clips = clips
  world.interactables = interactables
  // A map that lays its own roads (a tiles layer named 'road') was composed by hand: the random
  // scatter steps aside, or it would drop trees on those roads. Pond life stays either way.
  const scatter = !authored.some(l => l.name === 'road')
  const state = {
    world,
    decor: buildDecor(world, 1, { scatter }),
    authored,
    player: { x: world.farm.x, y: world.farm.y + 70, ...PLAYER_BOX, dir: 'down', moving: false, step: 0 },
    cam: { x: 0, y: 0 },
    dialog: createDialog(),
    revealed: false,
    lang,
    sprites: null,
    // Start at midday (daylight() peaks at phase 0.5) — a recruiter's first view must be a
    // bright, inviting world, not the dark half of the day/night cycle.
    clock: DAY_LEN / 2,
    particles: createParticles(),
    shake: 0,
    critters: createCritters(world),
    npcs: createNpcs(world),
    // 3s cold-open cutscene: camera descends from the sky to the farm while a title card fades
    // in/out (see scene2d.js's introCamera/drawIntroTitle).
    intro: createIntro(3),
    audio: createAudio(),
    music: createMusic(null), // no-op (muted) until the first user gesture arms real playback
    lastBiome: null,
    walkFrames: 0,
    scene: null,
    entering: false,
    fade: null,
    pending: null,
    camSnap: false,
  }
  const konami = createKonami()
  const input = createTopdownInput()
  // Exposed so a hosting UI (the WorldRpg React island) can wire its own touch D-pad to the
  // same input.state the keyboard writes to — start() only attaches canvas keyboard listeners,
  // it never covers pointer/touch, so touch parity needs direct access to input.press(kind, down).
  state.input = input

  function reveal() { state.revealed = true; state.shake = 8; sfx(state.audio, 'fanfare') }
  const entryOf = id => experience.entries.find(e => e.id === id)

  function markSeen(s) {
    if (!s.seen) { burst(state.particles, s.cx, s.cy, 14); sfx(state.audio, 'discover') }
    s.seen = true
  }

  // Returns the load so a caller (a test) can await it; the switch itself runs from update() once
  // the screen is dark. The room is built here, so a broken one falls back like a failed fetch.
  function enter(site) {
    crossDoor(state)
    return new Promise(resolve => { resolve(load(site.id)) })
      .then(({ data, atlas }) => loadSheet(withInteriorAtlas(ATLAS, atlas)).then(sprites => {
        const built = buildInteriorWorld(data)
        switchWhenDark(state, () => enterInterior(state, site, built, sprites))
      }))
      .catch(err => {
        // A house whose interior fails to arrive still has its card: the player never hits a wall.
        console.warn(`interior ${site.id} failed to load, showing its card`, err)
        switchWhenDark(state, () => state.dialog.open(site))
      })
  }

  function leave() {
    crossDoor(state)
    switchWhenDark(state, () => leaveInterior(state))
  }

  function interactOutside() {
    const s = nearestSite(state.player, activeSites(state))
    if (!s) return undefined
    markSeen(s)
    sfx(state.audio, 'confirm')
    if (interiorIds.has(s.id)) return enter(s)
    state.dialog.open(s)
    return undefined
  }

  function interactInside() {
    const hit = nearestInteractable(state.player, state.world)
    if (!hit) return
    if (hit.kind === 'exit') { leave(); return }
    const { site, id } = state.scene
    state.dialog.open(hit.kind === 'host' ? siteSource(site) : bulletSource(entryOf(id), Number(hit.entry.id)))
    sfx(state.audio, 'confirm')
  }

  function interact() {
    if (state.dialog.isOpen()) { state.dialog.advance(); return undefined }
    if (state.entering || state.fade) return undefined
    if (state.scene) { interactInside(); return undefined }
    return interactOutside()
  }

  function toggleMute() {
    const next = !state.music.isMuted()
    state.music.mute(next)
    setMuted(state.audio, next)
  }

  // Browsers block audio until a real user gesture — the first keydown/pointerdown resumes/
  // creates the AudioContext and swaps in a "live" music instance bound to it. A no-op (and
  // safe to call repeatedly) if AudioContext is unavailable or already armed.
  function armAudio() {
    if (state.audio.ctx) return
    initAudio(state.audio)
    if (!state.audio.ctx) return
    state.music = createMusic(state.audio.ctx)
    state.music.mute(false)
    setMuted(state.audio, false)
    if (state.lastBiome) state.music.setRegion(state.lastBiome)
  }

  let loop = null
  let lastTs = null
  let detachPointer = null
  function start() {
    input.attach(canvas, {
      onInteract: () => { if (canControl(state)) interact() },
      onLanguage: () => {
        state.lang = state.lang === 'es' ? 'en' : 'es'
        if (onLangChange) onLangChange(state.lang)
      },
      onKey: k => {
        armAudio()
        if (!canControl(state)) { state.intro.skip(); return }
        const key = k.length === 1 ? k.toLowerCase() : k
        if (key === 'm') toggleMute()
        if (konami.push(k) && !state.revealed) reveal()
      },
    })
    const onPointer = () => armAudio()
    canvas.addEventListener('pointerdown', onPointer)
    detachPointer = () => canvas.removeEventListener('pointerdown', onPointer)
    // Entered before the main sheet arrived: it belongs to the stashed exterior, not the interior.
    loadSprites(ATLAS).then(sprites => {
      if (state.scene) state.scene.outside.sprites = sprites
      else state.sprites = sprites
    })
    const ctx = canvas.getContext('2d')
    const step = ts => {
      if (!state.intro.done()) {
        state.intro.update(lastTs == null ? 0 : (ts - lastTs) / 1000)
        lastTs = ts
        return
      }
      lastTs = ts
      update(state, input.state, 1.6)
    }
    const draw = () => {
      // WorldRpg.jsx sizes canvas.width/height to devicePixelRatio × the CSS-displayed size (so
      // pixel art renders crisp on retina) and annotates canvas.logicalWidth/logicalHeight with
      // the un-multiplied CSS size — the camera needs that logical size, not the dpr-scaled
      // buffer, or it would think the viewport is dpr× larger than what's actually on screen.
      const vw = canvas.logicalWidth || canvas.width
      const vh = canvas.logicalHeight || canvas.height
      const k = state.camSnap ? 1 : undefined
      state.camSnap = false
      followCamera2D(state.cam, state.player.x, state.player.y, vw, vh, state.world.worldW, state.world.worldH, k)
      render2d(ctx, state, state.cam)
    }
    loop = createLoop(step, draw)
    loop.start()
  }
  function stop() {
    if (loop) loop.stop()
    input.detach()
    if (detachPointer) detachPointer()
  }

  return {
    state, start, stop, reveal, interact, toggleMute, activeSites: () => activeSites(state),
  }
}
