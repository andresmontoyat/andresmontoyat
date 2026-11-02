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
  if (!entry.visible) fail(id, 'its experience entry is hidden, so no house can lead here')
  if (!exteriorDoorIds.includes(id)) fail(id, `no house on the exterior map has a door:${id} — an interior needs a door to enter by`)
}

function checkExactlyOne(id, tags, tag) {
  const count = tags.filter(t => t === tag).length
  if (count !== 1) fail(id, `expected exactly 1 ${tag}, found ${count}`)
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

export function validateInterior(id, interactables, entry, exteriorDoorIds) {
  checkExperience(id, entry, exteriorDoorIds)
  checkLanguages(id, entry)
  const tags = interactables.map(tagOf)
  for (const tag of ['spawn', HOST, 'exit']) checkExactlyOne(id, tags, tag)
  checkHosts(id, tags)
  checkReads(id, tags, entry.bullets.en.length)
}

// The manifest belongs to the shared atlas, not to the room: the runtime file is the rest.
export function interiorData({ tiles, placements, clips, interactables }) {
  return { tiles, placements, clips, interactables }
}
