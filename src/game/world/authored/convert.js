import { WATER_LAYER, waterBodies, undersizedBodies } from '../water.js'
import { WALLS_LAYER } from '../walls.js'

// Converts the world-editor's engine-neutral map export into the four artifacts the game
// consumes: atlas manifest entries, a palette-encoded tile JSON, placements, and the clip table
// those placements play.
// Pure — no fs, no network. The import script injects everything environmental.

const PACK_ROOT = 'Cute_Fantasy/'
const PUBLIC_BASE = '/game/cute-fantasy/'
const FRAME_PREFIX = 'am_'
const CELL = /^\d+$/

// The game renderer places every authored cell at 32 world pixels (TILE in scene2d.js), while
// the export measures object positions in editor pixels at the pack's own tileSize. Tiles carry
// indices and scale implicitly; objects carry pixels and must be scaled here, in the adapter —
// scene2d's placement pass and buildOverworld both already work in game world pixels and must
// not learn about the editor's units.
export const WORLD_TILE = 32

export function worldScaleOf(map) {
  return WORLD_TILE / map.tileSize
}

// "path/to/img.png#3,2" -> { path, col, row }  (a cell in a uniform grid)
// "path/to/img.png#7"   -> { path, i }         (a frame in an atlas descriptor's frames[])
// The editor writes both shapes; see frameStr in its src/persist/ref.js. They are told apart by
// the comma, and the split is on the LAST '#' so a path may contain one.
export function splitRef(ref) {
  const hash = ref.lastIndexOf('#')
  if (hash < 0) throw new Error(`malformed ref (no cell): ${ref}`)
  const path = ref.slice(0, hash)
  const tail = ref.slice(hash + 1)
  if (!tail.includes(',')) {
    // Validate the raw token, not Number(tail) — Number('') is 0, which would let 'a.png#'
    // silently parse to a plausible-looking frame 0.
    if (!CELL.test(tail)) throw new Error(`malformed ref (atlas index must be a non-negative integer): ${ref}`)
    return { path, i: Number(tail) }
  }
  const [col, row] = tail.split(',')
  if (col === undefined || row === undefined) throw new Error(`malformed ref (no cell): ${ref}`)
  if (!CELL.test(col) || !CELL.test(row)) {
    throw new Error(`malformed ref (cell must be two non-negative integers): ${ref}`)
  }
  return { path, col: Number(col), row: Number(row) }
}

function stripRoot(path) {
  return path.startsWith(PACK_ROOT) ? path.slice(PACK_ROOT.length) : path
}

// A manifest image key: pack-relative path, extension dropped, every non-alphanumeric run
// collapsed to one underscore. The am_ prefix keeps the authored namespace disjoint from the
// 235 hand-curated frame names in manifest.js — collision with that namespace is impossible by
// construction. It says nothing about two different authored paths collapsing onto each other
// (e.g. 'a/b-c.png' and 'a/b_c.png' both yield 'am_a_b_c') — framesFrom guards that case.
export function slugFor(path) {
  const rel = stripRoot(path).replace(/\.[^./]+$/, '')
  return FRAME_PREFIX + rel.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export function frameNameFor(ref) {
  const r = splitRef(ref)
  return r.i === undefined ? `${slugFor(r.path)}_${r.col}_${r.row}` : `${slugFor(r.path)}_${r.i}`
}

// manifest.images values are URL-encoded (pack folders contain spaces and parentheses) and
// pack-atlas.mjs decodeURIComponent()s them back to read the file off disk.
export function publicUrlFor(path) {
  return PUBLIC_BASE + stripRoot(path).split('/').map(encodeURIComponent).join('/')
}

// The six biome ids buildOverworld knows (ANCHORS in src/game/world/overworld.js).
export const BIOMES = ['farm', 'pradera', 'desierto', 'selva', 'cyber', 'castillo']

const ANCHOR_PREFIX = 'anchor:'
// Where the pack keeps its water sheets: what a `water` layer may be painted with (docs/adr/0003).
const WATER_SHEETS = 'Tiles/Water/'

// The editor has no per-object properties, so layer NAMES carry the semantics. This is the
// only convention the adapter invents, and it uses something the editor already gives away
// for free: free-form layer names.
export function classifyLayer(layer) {
  if (layer.type === 'tiles') return { kind: 'tiles' }
  if (!layer.name.startsWith(ANCHOR_PREFIX)) return { kind: 'objects' }
  const biome = layer.name.slice(ANCHOR_PREFIX.length)
  if (!BIOMES.includes(biome)) {
    throw new Error(`layer "${layer.name}": unknown biome "${biome}" (expected one of ${BIOMES.join(', ')})`)
  }
  return { kind: 'anchor', biome }
}

export function anchorsFrom(layers, scale = 1, world = null) {
  const out = {}
  for (const layer of layers) {
    const c = classifyLayer(layer)
    if (c.kind !== 'anchor') continue
    const items = layer.objects || []
    if (items.length !== 1) {
      throw new Error(`layer "${layer.name}": an anchor layer needs exactly one object, got ${items.length}`)
    }
    const { x, y } = items[0]
    // Anchors and map.world are both editor pixels — check before the `* scale` below. An
    // anchor exactly on the far edge is a legitimate authored position, so the upper bound is
    // strictly greater-than, not >=.
    if (world && (x < 0 || y < 0 || x > world.w || y > world.h)) {
      throw new Error(`layer "${layer.name}": anchor at ${x},${y} is outside the map (${world.w}x${world.h})`)
    }
    out[c.biome] = { x: x * scale, y: y * scale }
  }
  return out
}

// ---- the tag vocabulary ----
//
// The editor validates the SHAPE of a tag — a bare word or `kind:value`, lowercase kind, one colon,
// and a `door:`/`poi:`/`spawn` naming one object — and knows nothing about what any of it means.
// Naming the kinds is this side's job, the same line classifyLayer already draws by throwing on an
// unknown biome.
//
// Every check below is this adapter's own rather than a trust of the exporter: the editor's export
// dialog offers "Exportar igual", so a lint-dirty file can reach here.
const IDENTITY_KINDS = ['door', 'npc', 'animal', 'object', 'poi', 'read']

// A flag says how the world behaves around an object, not what the object IS, so it rides along with
// whatever kind the object already has.
const FLAG_TAGS = ['solid', 'spawn', 'exit']

// Kinds where the id names ONE object. Two npcs may share a dialog id — two villagers with the same
// lines is a legitimate world — so this is per kind rather than blanket.
const UNIQUE_KINDS = new Set(['door', 'poi'])

// footprintOf: the drawn size of the sprite this object places, in game pixels. Defensive about the
// slices block, which a hand-written map or a partial fixture may not carry: a missing or malformed
// entry means no footprint rather than a throw, because identity is useful on its own.
function footprintOf(o, scale, slices) {
  if (!slices) return null
  let parsed
  try { parsed = splitRef(o.frame) } catch { return null }
  const slice = slices[parsed.path]
  if (!slice) return null
  let rect
  try { rect = rectFor(slice, parsed) } catch { return null }
  if (!rect || !rect.w || !rect.h) return null
  const k = scale * (o.scale || 1)
  return { w: rect.w * k, h: rect.h * k }
}

function readTag(tag, where) {
  if (FLAG_TAGS.includes(tag)) return { flag: tag }
  const i = tag.indexOf(':')
  const kind = i < 0 ? tag : tag.slice(0, i)
  const id = i < 0 ? '' : tag.slice(i + 1)
  if (!IDENTITY_KINDS.includes(kind)) {
    throw new Error(`${where}: unknown tag kind "${kind}" (expected one of ${[...IDENTITY_KINDS, ...FLAG_TAGS].join(', ')})`)
  }
  if (!id) throw new Error(`${where}: tag "${tag}" needs a value, as in "${kind}:algo"`)
  return { kind, id }
}

// interactablesFrom: one entry per TAGGED object — what the world contains that the player can do
// something with. Untagged objects are scenery and stay in the placements list alone.
//
// Nothing in the game reads this yet; the interaction system is the next piece of work, and this is
// the contract it will read.
// `slices` is the map's own geometry block. With it, an entry carries the footprint of the sprite
// that stands there — width and height in game pixels, the object's own scale included — so the
// runtime never has to measure a frame that may not be loaded yet. Without it (a caller that only
// wants identity, or a marker with no art worth measuring) the entry simply has no footprint.
export function interactablesFrom(layers, scale = 1, slices = null) {
  const out = []
  const uids = new Set()
  const claimed = new Map()
  let spawn = null
  for (const layer of layers || []) {
    for (const o of layer.objects || []) {
      const tags = Array.isArray(o.tags) ? o.tags.filter(t => typeof t === 'string' && t) : []
      if (!tags.length) continue
      const where = `layer "${layer.name}", object at ${o.x},${o.y}`
      const read = tags.map(t => readTag(t, where))
      const identities = read.filter(r => r.kind)
      if (identities.length > 1) {
        throw new Error(`${where}: carries two identities at once (${identities.map(r => `${r.kind}:${r.id}`).join(', ')}) — an object is one thing`)
      }
      // A uid is how the game addresses the thing at all, and its absence means the map predates the
      // editor writing them: a stale export rather than an authoring mistake.
      if (!o.uid) throw new Error(`${where}: is tagged but has no uid — re-export the map from the world-editor`)
      if (uids.has(o.uid)) throw new Error(`${where}: uid ${o.uid} is already taken by another object`)
      uids.add(o.uid)
      const identity = identities[0]
      const flags = read.filter(r => r.flag).map(r => r.flag)
      if (identity && UNIQUE_KINDS.has(identity.kind)) {
        const tag = `${identity.kind}:${identity.id}`
        if (claimed.has(tag)) throw new Error(`${where}: "${tag}" is already claimed by the object at ${claimed.get(tag)} — it names one object`)
        claimed.set(tag, `${o.x},${o.y}`)
      }
      if (flags.includes('spawn')) {
        if (spawn) throw new Error(`${where}: a second spawn point, the first is at ${spawn}`)
        spawn = `${o.x},${o.y}`
      }
      const entry = { uid: o.uid, kind: identity ? identity.kind : flags[0], x: o.x * scale, y: o.y * scale }
      if (identity) entry.id = identity.id
      if (o.name) entry.name = o.name
      if (o.props && Object.keys(o.props).length) entry.props = { ...o.props }
      const size = footprintOf(o, scale, slices)
      if (size) { entry.w = size.w; entry.h = size.h }
      for (const f of flags) entry[f] = true
      out.push(entry)
    }
  }
  return out
}

// Transform fields are copied only when present, so an untransformed object serializes to
// exactly { frame, x, y } — byte-identical to what the Asset Placer wrote, which is what
// makes the render path's identity case verifiable.
function toPlacement(o, scale, solidOf) {
  const p = { frame: frameNameFor(o.frame), x: o.x * scale, y: o.y * scale }
  // The draw list and the interactable list have to be joinable: a prompt floats over a sprite, so
  // the game needs to know which placement is the thing it is talking about.
  if (o.uid) p.uid = o.uid
  if (o.flipX) p.flipX = true
  if (o.flipY) p.flipY = true
  if (o.rot) p.rot = o.rot
  const s = scale * (o.scale || 1)
  if (s !== 1) p.scale = s
  if (o.clip) p.clip = o.clip
  const hit = solidOf && solidOf(o.frame)
  if (hit) p.solid = solidFor(hit.box, hit.frame, p)
  return p
}

// `solidOf(frame)` answers { box, frame: {w, h} } for a frame that blocks, or null.
export function placementsFrom(layers, scale = 1, solidOf = null) {
  return layers
    .filter(l => classifyLayer(l).kind === 'objects')
    .flatMap(l => (l.objects || []).map(o => toPlacement(o, scale, solidOf)))
}

// solidFor: a frame's hitbox (frame pixels, from its top-left) as the world-pixel box a placed copy
// blocks. Same transform the renderer draws with (scene2d drawTransformed): the frame hangs from
// the bottom-centre anchor, then flips, scales and rotates about it. A rotation keeps the box that
// encloses the turned one — collision is axis-aligned.
export function solidFor(box, frame, pl) {
  const s = pl.scale || 1
  const fx = pl.flipX ? -1 : 1
  const fy = pl.flipY ? -1 : 1
  const a = ((pl.rot || 0) * Math.PI) / 180
  const corners = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]
    .map(([cx, cy]) => [(cx - frame.w / 2) * fx * s, (cy - frame.h) * fy * s])
    .map(([lx, ly]) => [lx * Math.cos(a) - ly * Math.sin(a), lx * Math.sin(a) + ly * Math.cos(a)])
  const xs = corners.map(c => Math.round(pl.x + c[0]))
  const ys = corners.map(c => Math.round(pl.y + c[1]))
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

// solidLookup: the `solidOf` the import hands placementsFrom — each frame's hitbox with the size of
// the frame it was drawn on, read from the same slices the atlas is cut by.
function solidLookup(map) {
  const boxes = map.hitboxes || {}
  return frame => {
    const box = boxes[frame]
    if (!box) return null
    const { path } = splitRef(frame)
    const r = rectFor(map.slices[path], splitRef(frame))
    return { box, frame: { w: r.w, h: r.h } }
  }
}

const TILE_LAYERS = m => m.layers.filter(l => classifyLayer(l).kind === 'tiles')

// Every ref the map uses anywhere (tiles + objects), deduped, in a stable order.
// Skips anchor layers — their marker frames are never drawn by the game.
function allRefs(map) {
  const refs = new Set()
  for (const l of map.layers) {
    if (classifyLayer(l).kind === 'anchor') continue
    if (l.type === 'objects') for (const o of l.objects || []) refs.add(o.frame)
    else for (const c of l.cells || []) refs.add(c.frame)
  }
  // A clip's frames are placed by whichever object plays it — the object only names frame 0, so
  // without this the rest of the cycle never reaches the atlas and the runtime draws blanks.
  for (const c of map.clips || []) for (const f of c.frames || []) refs.add(f)
  return [...refs].sort()
}

// clipsFrom: the clip table the runtime plays, keyed by the id the placements carry. Frame NAMES,
// not a base + count: the adapter already names every ref deterministically and pack-atlas.mjs
// dedupes by source rect, so renaming a clip's frames into a contiguous base_0..n would duplicate
// pixels in the shipped atlas and buy nothing.
export function clipsFrom(map) {
  const out = {}
  for (const c of map.clips || []) {
    out[c.id] = { frames: (c.frames || []).map(frameNameFor), fps: c.fps }
  }
  return out
}

// The editor's exportMap emits world size, never cols/rows — deriving them is the only
// correct source. map.tileSize is the PACK's source granularity (16 for cute-fantasy); the
// renderer's TILE (32 world px) is a separate magnitude and deliberately not referenced here.
export function gridOf(map) {
  return { cols: map.world.w / map.tileSize, rows: map.world.h / map.tileSize }
}

// Palette + triples, not { x, y, frame } objects: covering the 2140x1360 world is 67x43 = 2881
// cells, which is ~144 kB as objects and ~35 kB this way. The file ships to the client inside
// the lazily-imported game chunk, and the site is under a hard Lighthouse mobile gate.
export function tilesFrom(map, scale = 1) {
  const names = [...new Set(TILE_LAYERS(map).flatMap(l => (l.cells || []).map(c => frameNameFor(c.frame))))].sort()
  const index = new Map(names.map((n, i) => [n, i]))
  const { cols, rows } = gridOf(map)
  return {
    version: 1,
    tileSize: map.tileSize,
    cols,
    rows,
    frames: names,
    layers: TILE_LAYERS(map).map(l => ({
      name: l.name,
      cells: (l.cells || []).map(c => [c.x, c.y, index.get(frameNameFor(c.frame))]),
    })),
    anchors: anchorsFrom(map.layers, scale, map.world),
  }
}

// rectFor: the source rect a ref denotes, given how the editor cut that image.
// A 'single' image is one whole sprite and its col,row are filler — slicing it at tileSize
// yields transparent margin, which is exactly the bug this replaces. An 'atlas' image has an
// explicit frame list and the ref carries an index into it.
export function rectFor(slice, ref) {
  const byIndex = ref.i !== undefined
  if (slice.type === 'atlas') {
    if (!byIndex) throw new Error(`ref ${ref.path}#${ref.col},${ref.row}: that image is cut as an atlas — re-export the map`)
    const f = (slice.frames || [])[ref.i]
    if (!f) throw new Error(`ref ${ref.path}#${ref.i}: frame ${ref.i} does not exist (${(slice.frames || []).length} frames)`)
    return { x: f.x, y: f.y, w: f.w, h: f.h }
  }
  if (byIndex) throw new Error(`ref ${ref.path}#${ref.i}: that image is not cut as an atlas — re-export the map`)
  if (slice.type === 'single') return { x: 0, y: 0, w: slice.w, h: slice.h }
  return { x: ref.col * slice.fw, y: ref.row * slice.fh, w: slice.fw, h: slice.fh }
}

// Manifest entries for every referenced cell. pack-atlas.mjs bakes exactly what MANIFEST
// references and dedupes by source rect, so authored frames that land on pixels already in the
// atlas cost nothing extra.
export function framesFrom(map, dimsOf) {
  const images = {}
  const frames = {}
  const sources = new Map()
  const names = new Map()
  for (const ref of allRefs(map)) {
    const parsed = splitRef(ref)
    const { path } = parsed
    const key = slugFor(path)
    const prev = sources.get(key)
    if (prev !== undefined && prev !== path) {
      throw new Error(`manifest image key "${key}": ${prev} and ${path} collapse to the same key — rename one`)
    }
    sources.set(key, path)
    const { w, h } = dimsOf(path)
    const r = rectFor(map.slices[path], parsed)
    if (r.x + r.w > w || r.y + r.h > h) {
      throw new Error(`ref ${ref}: rect ${r.w}x${r.h} at ${r.x},${r.y} is outside the source image (${w}x${h})`)
    }
    // The image-key guard above cannot see this one: the frame name appends the cell to the slug,
    // so two refs whose SLUGS differ can still land on one name. 'a/b 7.png#2' and 'a/b.png#7,2'
    // both give am_a_b_7_2 while their keys (am_a_b_7, am_a_b) differ, and the second frame used
    // to silently overwrite the first — one placement drawing another's pixels, with nothing
    // anywhere saying so. Same remedy as the key collision: refuse and name both refs.
    const name = frameNameFor(ref)
    const clash = names.get(name)
    if (clash !== undefined && clash !== ref) {
      throw new Error(`frame name "${name}": ${clash} and ${ref} collapse to the same name — rename one`)
    }
    names.set(name, ref)
    images[key] = publicUrlFor(path)
    frames[name] = { img: key, ...r }
  }
  return { images, frames }
}

// The export version this adapter needs. v2 is where the editor started writing a per-object uid,
// which is what every link from the game into the map hangs off. Nothing was removed between v1 and
// v2, so this is a floor rather than an equality — a newer export stays readable.
export const MIN_EXPORT_VERSION = 2

// doorCoverage: how far the authored world has got. Per docs/adr/0001 the map owns the world and the
// procedural generator is a fallback, so the interesting number during migration is how many
// experiences have a house placed for them — and the interesting FAILURE is a door pointing at a job
// that does not exist, which no runtime check would ever surface (buildOverworld just never matches
// it, and the house silently does not appear).
//
// `missing` is reported, not refused: an unauthored experience is the normal state until the
// fallback is deleted. That deletion is the ADR's exit criterion, and it is when missing becomes an
// error too.
//
// Every list is sorted, because this feeds a build report and a report that reorders itself between
// runs is a diff nobody can read.
export function doorCoverage(interactables, experienceIds) {
  const known = experienceIds instanceof Set ? experienceIds : new Set(experienceIds || [])
  const doors = new Set((interactables || []).filter(e => e && e.kind === 'door' && e.id).map(e => e.id))
  const authored = [...doors].filter(id => known.has(id)).sort()
  const dead = [...doors].filter(id => !known.has(id)).sort()
  const missing = [...known].filter(id => !doors.has(id)).sort()
  return { authored, missing, dead }
}

// `experienceIds` is optional: hand over the visible CV entries and the coverage check runs, leave
// it out and only the map's own shape is checked. The import passes them; a caller that just wants
// geometry validated does not have to know the CV exists.
// docs/adr/0003: the layer named `water` makes the map own the ponds, so the game builds collision
// and pond life from it without looking twice. It has to be painted, painted with water, and every
// body has to be drawable by the 9-cell water set — which has no frame for a strip one cell wide.
function validateWater(map) {
  const layer = map.layers.find(l => l.name === WATER_LAYER)
  if (!layer) return
  if (layer.type !== 'tiles') throw new Error(`layer "${WATER_LAYER}" must be a tiles layer: paint it with the water terrain`)
  const dry = (layer.cells || []).find(c => !splitRef(c.frame).path.includes(WATER_SHEETS))
  if (dry) throw new Error(`layer "${WATER_LAYER}": cell ${dry.x},${dry.y} is not water (${dry.frame}) — paint it with a ${WATER_SHEETS} sheet`)
  const [thin] = undersizedBodies(waterBodies((layer.cells || []).map(c => `${c.x},${c.y}`), 1))
  if (thin) throw new Error(`layer "${WATER_LAYER}": the body at ${thin.cells[0]} holds no 2x2 square — widen it or erase it`)
}

// docs/adr/0005: the layer named `walls` blocks every cell it paints, so it has to be cells, and the
// spawn may not stand in one — the player would appear inside a wall with no way to move. Feet are the
// bottom-centre base point, read one pixel up as the editor does, so feet on the line between a wall
// and the floor below belong to the wall.
function validateWalls(map) {
  const layer = map.layers.find(l => l.name === WALLS_LAYER)
  if (!layer) return
  if (layer.type !== 'tiles') throw new Error(`layer "${WALLS_LAYER}" must be a tiles layer: paint the walls as cells`)
  const walled = new Set((layer.cells || []).map(c => `${c.x},${c.y}`))
  for (const l of map.layers) {
    for (const o of l.objects || []) {
      if (!(o.tags || []).includes('spawn')) continue
      const cell = `${Math.floor(o.x / map.tileSize)},${Math.floor((o.y - 1) / map.tileSize)}`
      if (walled.has(cell)) throw new Error(`layer "${l.name}": the spawn at ${o.x},${o.y} stands in wall cell ${cell} — move it onto the floor`)
    }
  }
}

// docs/adr/0004: a house's inside is its own map. `door` leads in, so it belongs to the exterior;
// `read` and `exit` only mean something once the player is inside. The tag parser is the same one
// interactablesFrom uses, so a malformed tag is reported once and in one voice.
const EXTERIOR_ONLY = ['door']
const INTERIOR_ONLY = ['read', 'exit']

function validateTagPlacement(map, interior) {
  const refused = interior ? EXTERIOR_ONLY : INTERIOR_ONLY
  const home = interior ? 'exterior' : 'interior'
  const mapKind = interior ? 'an interior' : 'the exterior'
  for (const layer of map.layers) {
    for (const o of layer.objects || []) {
      const where = `layer "${layer.name}", object at ${o.x},${o.y}`
      for (const tag of (o.tags || []).filter(t => typeof t === 'string' && t)) {
        const { kind, flag } = readTag(tag, where)
        const name = kind || flag
        if (refused.includes(name)) {
          throw new Error(`${where}: "${tag}" belongs to the ${home} map, and this is ${mapKind}`)
        }
      }
    }
  }
}

export function validateMap(map, { dimsOf, exists, experienceIds = null, interior = false }) {
  // Until now this function never read the version at all, so a v1 map was accepted and silently
  // carried no object identity — exactly the failure the number exists to prevent. (The `version: 1`
  // further down belongs to the generated tiles artifact, not to the map being read.)
  if (!(map.version >= MIN_EXPORT_VERSION)) {
    throw new Error(`map export version ${map.version === undefined ? '(absent)' : map.version} — this adapter needs ${MIN_EXPORT_VERSION} or newer: re-export the map from the world-editor`)
  }
  if (!Number.isInteger(map.tileSize) || map.tileSize < 1) {
    throw new Error(`map tileSize ${map.tileSize} — expected a positive integer (the pack's source granularity)`)
  }
  if (!map.world || map.world.w % map.tileSize || map.world.h % map.tileSize) {
    const { w, h } = map.world || {}
    throw new Error(`map world ${w}x${h} is not a whole number of ${map.tileSize}px tiles`)
  }
  map.layers.forEach(classifyLayer)
  validateWater(map)
  validateWalls(map)
  anchorsFrom(map.layers, 1, map.world)
  validateTagPlacement(map, interior)
  const interactables = interactablesFrom(map.layers, 1)
  // An interior holds no doors, so there is no CV to cover.
  if (experienceIds && !interior) {
    const { dead, missing } = doorCoverage(interactables, experienceIds)
    if (dead.length) {
      throw new Error(`door tag(s) naming no visible experience: ${dead.join(', ')} — fix the tag in the editor, or the entry's id in experience.json`)
    }
    // No generator stands behind the map any more (docs/adr/0001): an experience without a door
    // would simply have no house.
    if (missing.length) {
      throw new Error(`visible experience(s) with no house in the map: ${missing.join(', ')} — place one tagged door:<id> in the editor, or hide the entry in experience.json`)
    }
  }
  if (!map.slices) {
    throw new Error('map has no slices block — re-export it from a world-editor with slice geometry')
  }
  for (const ref of allRefs(map)) {
    const parsed = splitRef(ref)
    const { path } = parsed
    if (!exists(path)) throw new Error(`ref ${ref}: ${path} not found in the pack`)
    const slice = map.slices[path]
    if (!slice) throw new Error(`ref ${ref}: ${path} is missing from the map's slices block`)
    const { w, h } = dimsOf(path)
    const r = rectFor(slice, parsed)
    if (r.x + r.w > w || r.y + r.h > h) {
      throw new Error(`ref ${ref}: rect ${r.w}x${r.h} at ${r.x},${r.y} is outside the source image (${w}x${h})`)
    }
  }
  // The per-frame rect and slice checks above come for free: allRefs now walks clip frames too.
  // What is left is the pair of shapes only the clip table can be wrong about — an empty cycle,
  // and a placement pointing at a clip nobody defined.
  for (const c of map.clips || []) {
    if (!(c.frames || []).length) throw new Error(`clip "${c.id}": has no frames`)
  }
  validateHitboxes(map)
  const clipIds = new Set((map.clips || []).map(c => c.id))
  for (const l of map.layers) {
    if (l.type !== 'objects') continue
    for (const o of l.objects || []) {
      if (o.clip && !clipIds.has(o.clip)) {
        throw new Error(`layer "${l.name}": an object names clip "${o.clip}", which the map does not define`)
      }
    }
  }
}

// A hitbox has to fit the frame it was drawn on. One that does not is a stale box from before the
// image was re-cut, and the solid it produced would block a spot nothing visibly stands on.
function validateHitboxes(map) {
  for (const [frame, box] of Object.entries(map.hitboxes || {})) {
    const ref = splitRef(frame)
    const slice = map.slices[ref.path]
    if (!slice) throw new Error(`hitbox ${frame}: ${ref.path} is missing from the map's slices block`)
    const r = rectFor(slice, ref)
    const shaped = [box.x, box.y, box.w, box.h].every(Number.isFinite) && box.w > 0 && box.h > 0
    if (!shaped || box.x < 0 || box.y < 0 || box.x + box.w > r.w || box.y + box.h > r.h) {
      throw new Error(`hitbox ${frame}: ${JSON.stringify(box)} is outside the ${r.w}x${r.h} frame — redraw it in the editor`)
    }
  }
}

export function convertMap(map, { dimsOf, exists = () => true, experienceIds = null, interior = false }) {
  validateMap(map, { dimsOf, exists, experienceIds, interior })
  const scale = worldScaleOf(map)
  return {
    manifest: framesFrom(map, dimsOf),
    tiles: tilesFrom(map, scale),
    placements: placementsFrom(map.layers, scale, solidLookup(map)),
    clips: clipsFrom(map),
    interactables: interactablesFrom(map.layers, scale, map.slices),
  }
}
