import { hits, PLAYER_BOX } from '../../engine/topdown.js'
import { WATER_LAYER, waterBodies, waterSolids } from '../water.js'
import { WALLS_LAYER, wallSolids } from '../walls.js'
import { WORLD_TILE } from './convert.js'
import { CONFIG } from '../../config.js'

// The rules an interior map must meet (docs/adr/0004). An interior is a room the player walks into
// from a house's door: one host who tells the card, one spawn where the player lands, one exit, and
// one `read:<n>` object per bullet of the job — so every line of the job is something to walk up to,
// exactly once. The map holds references only; the prose stays in experience.json.

const SUFFIX = '.map.json'
const HOST = 'npc:host'

export function interiorIdOf(fileName) {
  return fileName.endsWith(SUFFIX) ? fileName.slice(0, -SUFFIX.length) : null
}

const tagOf = e => (e.id === undefined ? e.kind : `${e.kind}:${e.id}`)

const fail = (id, why) => {
  throw new Error(`interior ${id}: ${why}`)
}

function checkExperience(id, entry, exteriorDoorIds) {
  if (!entry) fail(id, 'no experience entry has that id — name the map after the job it belongs to')
  if (entry.visible === false) fail(id, 'its experience entry is hidden, so no house can lead here')
  if (!exteriorDoorIds.includes(id)) fail(id, `no house on the exterior map has a door:${id} — an interior needs a door to enter by`)
}

function checkExactlyOne(id, count, tag) {
  if (count !== 1) fail(id, `expected exactly 1 ${tag}, found ${count}`)
}

// spawn and exit are flags, and the import makes a flag the kind only when it comes first (a solid
// exit is kind 'solid'): count the flag, which is also what the runtime finds them by.
function checkFlags(id, interactables) {
  for (const flag of ['spawn', 'exit']) checkExactlyOne(id, interactables.filter(e => e[flag]).length, flag)
}

function checkHosts(id, tags) {
  const stranger = tags.find(t => t.startsWith('npc:') && t !== HOST)
  if (stranger) fail(id, `${stranger} — the only npc an interior has is npc:host`)
}

function bulletOf(tag) {
  const n = tag.slice('read:'.length)
  return /^\d+$/.test(n) ? Number(n) : NaN
}

function checkReads(id, tags, bullets) {
  const seen = new Set()
  for (const tag of tags.filter(t => t.startsWith('read:'))) {
    const n = bulletOf(tag)
    if (!(n >= 1 && n <= bullets)) fail(id, `${tag} — bullets run from read:1 to read:${bullets}`)
    if (seen.has(n)) fail(id, `${tag} is placed twice — each bullet is read from one object`)
    seen.add(n)
  }
  for (let n = 1; n <= bullets; n++) {
    if (!seen.has(n)) fail(id, `read:${n} is missing — every bullet needs an object to read it from`)
  }
}

function checkLanguages(id, entry) {
  const { en, es } = entry.bullets
  if (en.length !== es.length) fail(id, `en ${en.length} bullets but es ${es.length} — both languages must say the same number of things`)
}

// A spawn the player's box cannot stand on drops them where they cannot move. The full walk of the
// room (every host, read and exit reachable) is world/interiors.rooms.test.js; this is the cheap half.
function checkSpawnClear(id, interactables, solids) {
  const spawn = interactables.find(e => e.spawn)
  if (hits(spawn.x, spawn.y, PLAYER_BOX.w / 2, solids)) {
    fail(id, `the spawn at ${spawn.x},${spawn.y} puts the player inside a solid — move it onto open floor`)
  }
}

// `solids`: what blocks in the room (interiorSolids). Left out, only the tags are checked.
export function validateInterior(id, interactables, entry, exteriorDoorIds, solids = []) {
  checkExperience(id, entry, exteriorDoorIds)
  checkLanguages(id, entry)
  const tags = interactables.map(tagOf)
  checkFlags(id, interactables)
  checkExactlyOne(id, tags.filter(t => t === HOST).length, HOST)
  checkHosts(id, tags)
  checkReads(id, tags, entry.bullets.en.length)
  checkSpawnClear(id, interactables, solids)
}

// interiorSolids: everything that blocks in a converted room, in world px — the same three sources
// buildInteriorWorld hands the game (placement hitboxes, painted water, painted walls), read from the
// import's own artifacts because the runtime module needs the bundler to load.
export function interiorSolids({ tiles, placements }) {
  const cellsOf = name => {
    const layer = (tiles.layers || []).find(l => l.name === name)
    return layer ? layer.cells.map(([x, y]) => `${x},${y}`) : []
  }
  return [
    ...(placements || []).filter(p => p.solid).map(p => p.solid),
    ...waterSolids(waterBodies(cellsOf(WATER_LAYER), WORLD_TILE), WORLD_TILE, CONFIG.pond.shoreInset),
    ...wallSolids(cellsOf(WALLS_LAYER), WORLD_TILE),
  ]
}

// The manifest belongs to the shared atlas, not to the room: the runtime file is the rest.
export function interiorData({ tiles, placements, clips, interactables }) {
  return { tiles, placements, clips, interactables }
}

// The import receipt names both sides, so a house still waiting for its room is visible without
// diffing directories. Sorted, so the line does not reorder itself between runs.
export function interiorCoverage(ids, doorIds) {
  const adopted = new Set(ids)
  const list = xs => (xs.length ? [...xs].sort().join(', ') : 'none')
  const without = doorIds.filter(d => !adopted.has(d))
  return `interiors: ${ids.length} of ${doorIds.length} houses — with: ${list(ids)} — without: ${list(without)}`
}
