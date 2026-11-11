import { describe, it, expect } from 'vitest'
import { adoptedInteriorIds, loadInterior, buildInteriorWorld } from './interiors.js'
import { hits } from '../engine/topdown.js'
import { nearestInteractable, PLAYER_BOX, INTERACT_RANGE } from '../worldRpg.js'

// Every adopted room has to be playable, not just well-formed: the import checks the tags, this checks
// the floor plan. From the spawn, the player has to be able to walk to every host, read and exit, and
// each one has to be the thing the action picks from somewhere the player can stand — a read hidden
// behind a wall, or always shadowed by a closer one, is text nobody can get to.

const STEP = 4
const HALF = PLAYER_BOX.w / 2
const key = (x, y) => `${x},${y}`

function solidsOf(world) {
  return [...world.placementSolids, ...world.waterSolids, ...world.wallSolids]
}

// The positions the player can stand on, flood-filled from the spawn on a STEP px grid.
function reachable(world) {
  const solids = solidsOf(world)
  const inside = (x, y) => x >= HALF && y >= HALF && x <= world.worldW - HALF && y <= world.worldH - HALF
  const free = (x, y) => inside(x, y) && !hits(x, y, HALF, solids)
  const start = world.spawn
  const seen = new Set([key(start.x, start.y)])
  const todo = [start]
  const out = []
  while (todo.length) {
    const p = todo.pop()
    out.push(p)
    for (const [dx, dy] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) {
      const q = { x: p.x + dx, y: p.y + dy }
      if (seen.has(key(q.x, q.y)) || !free(q.x, q.y)) continue
      seen.add(key(q.x, q.y))
      todo.push(q)
    }
  }
  return out
}

const nameOf = ({ kind, entry }) => `${kind === 'read' ? `read:${entry.id}` : kind} (${entry.name || entry.uid})`

// What is wrong with a room, in words: empty means playable.
function playableProblems(world) {
  const { spawn } = world
  if (hits(spawn.x, spawn.y, HALF, solidsOf(world))) return [`the spawn at ${spawn.x},${spawn.y} is inside a solid`]
  const picked = new Set()
  for (const p of reachable(world)) {
    const hit = nearestInteractable(p, world, INTERACT_RANGE)
    if (hit) picked.add(hit.entry)
  }
  const wanted = [{ kind: 'host', entry: world.host }, ...world.reads.map(entry => ({ kind: 'read', entry })), { kind: 'exit', entry: world.exit }]
  return wanted.filter(w => !picked.has(w.entry)).map(w => `${nameOf(w)} is never the nearest thing from anywhere the player can walk`)
}

// The checker on rooms whose answer is known, so a green run over the adopted rooms means something —
// and so it means something on a branch where no room is adopted yet.
describe('playableProblems', () => {
  const W = 320
  const wall = (x, y, w, h) => ({ x, y, w, h })
  const room = ({ solids = [], reads = [{ id: '1', x: 160, y: 100 }], spawn = { x: 160, y: 260 } } = {}) => ({
    worldW: W,
    worldH: W,
    spawn,
    placementSolids: solids,
    waterSolids: [],
    wallSolids: [],
    host: { uid: 'H', x: 60, y: 200 },
    reads: reads.map(r => ({ uid: `R${r.id}`, ...r })),
    exit: { uid: 'E', x: 160, y: 300 },
    interactables: [],
  })

  it('passes an open room', () => {
    expect(playableProblems(room())).toEqual([])
  })

  it('reports a spawn inside a solid', () => {
    expect(playableProblems(room({ solids: [wall(150, 250, 20, 20)] }))).toEqual(['the spawn at 160,260 is inside a solid'])
  })

  it('reports a read sealed off behind a wall', () => {
    const sealed = room({ solids: [wall(0, 140, W, 16)] })
    expect(playableProblems(sealed)).toEqual(['read:1 (R1) is never the nearest thing from anywhere the player can walk'])
  })

  // Both reads stand on a back counter. Read 2 is in reach from the floor in front of it, but read 1
  // is between it and every spot of that floor, so the action always picks read 1.
  it('reports a read always shadowed by a closer one', () => {
    const counter = [wall(0, 0, W, 60)]
    const shadowed = room({ solids: counter, reads: [{ id: '1', x: 160, y: 60 }, { id: '2', x: 160, y: 40 }] })
    expect(playableProblems(shadowed)).toEqual(['read:2 (R2) is never the nearest thing from anywhere the player can walk'])
    const sideBySide = room({ solids: counter, reads: [{ id: '1', x: 120, y: 60 }, { id: '2', x: 200, y: 60 }] })
    expect(playableProblems(sideBySide)).toEqual([])
  })
})

const ROOMS = [...adoptedInteriorIds()].sort()

describe('adopted rooms are playable', () => {
  if (!ROOMS.length) {
    it('has no adopted room on this branch — every room adopted later is checked below', () => {
      expect(ROOMS).toEqual([])
    })
    return
  }
  it.each(ROOMS)('%s: the player can reach and read everything from the spawn', async id => {
    const { data } = await loadInterior(id)
    expect(playableProblems(buildInteriorWorld(data))).toEqual([])
  })
})
