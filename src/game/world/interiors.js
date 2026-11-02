import { buildAuthoredIndex, worldSizeOf } from './authored/index.js'

// One lazy chunk per file: an interior is fetched only when its house is entered, never on first
// load. With nothing adopted the directory does not exist and the glob is simply empty.
export const INTERIOR_MODULES = import.meta.glob('../../data/interiors/*.json', { import: 'default' })

const ATLAS_SUFFIX = '.atlas.json'
const DATA_KEY = /\/interiors\/([^/]+)\.json$/

// Placed objects whose frame has a hitbox in the map (a trunk, a lamp post): the import already
// turned each into a world-pixel box, so they block exactly like a house does.
export function placementSolids(placements) {
  return (placements || []).filter(p => p.solid).map(p => p.solid)
}

const keyOf = (id, suffix) => `../../data/interiors/${id}${suffix}`

export function adoptedInteriorIds(modules = INTERIOR_MODULES) {
  const ids = Object.keys(modules)
    .filter(k => !k.endsWith(ATLAS_SUFFIX))
    .map(k => DATA_KEY.exec(k))
    .filter(Boolean)
    .map(m => m[1])
  return new Set(ids)
}

export async function loadInterior(id, modules = INTERIOR_MODULES) {
  const dataKey = keyOf(id, '.json')
  const atlasKey = keyOf(id, ATLAS_SUFFIX)
  if (!modules[dataKey] || !modules[atlasKey]) throw new Error(`unknown interior: ${id}`)
  const [data, atlas] = await Promise.all([modules[dataKey](), modules[atlasKey]()])
  return { data, atlas }
}

// Interior frames win on a name clash; the avatar frames only exist in the main atlas and survive.
export function withInteriorAtlas(mainAtlas, interiorAtlas) {
  return {
    images: { ...mainAtlas.images, ...interiorAtlas.images },
    frames: { ...mainAtlas.frames, ...interiorAtlas.frames },
  }
}

export function buildInteriorWorld(data) {
  const { tiles, placements, clips, interactables } = data
  const size = worldSizeOf(tiles)
  const spawn = interactables.find(i => i.spawn)
  return {
    interior: true,
    worldW: size.w,
    worldH: size.h,
    authored: buildAuthoredIndex(tiles),
    placements,
    placementSolids: placementSolids(placements),
    clips,
    interactables,
    sites: [],
    spawn: { x: spawn.x, y: spawn.y },
    host: interactables.find(i => i.kind === 'npc' && i.id === 'host'),
    reads: interactables.filter(i => i.kind === 'read').sort((a, b) => Number(a.id) - Number(b.id)),
    exit: interactables.find(i => i.exit),
  }
}
