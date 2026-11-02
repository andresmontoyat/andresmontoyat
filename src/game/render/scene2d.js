import {
  nearestBiome, tileNameFor, avatarFrame, pathTileName, waterTileName, PATH_THRESHOLD, AVATAR_LAYERS,
} from './tiles.js'
import { BIOMES } from '../world/biomes.js'
import { drawAmbient, swayOffset, DAY_LEN } from './ambient.js'
import { animFrame, animIndex, clipFrame, hashPhase } from './anim.js'
import { CONFIG } from '../config.js'
import { critterDrawables } from '../entities/critters.js'
import { npcDrawables } from '../entities/npcs.js'
import { shake2D } from '../engine/camera2d.js'
import { phaseOf, nightTint } from './lighting.js'
import { WATER_LAYER } from '../world/water.js'
import { DIALOG_FONT, DIALOG_TEXT_X, colsFor } from './dialog.js'

const TILE = 32
const AVATAR_W = CONFIG.avatar.width
const AVATAR_H = CONFIG.avatar.height
// How close the player stands (to a house's base) before the house shows its company name.
const LABEL_RANGE = CONFIG.label.range
// cyber/castillo share the same Hills.png "cliff" ground texture (see manifest.js) — there is no
// dedicated stone/paved tile in either free asset pack (Cute Fantasy / Sprout Lands); a Tiny
// Swords-style tileset would be the real fix for a true rocky/paved read. Until then the two
// biomes are told apart by a per-biome color wash. A 0.12-alpha version of this read as a flat,
// barely-tinted band (polish-pass screenshot review). Scattering 3 shades per biome by hashTile()
// was tried next and read as a blocky checkerboard over the grass (map review, 2026-10-22), so each
// biome now washes with its first tone only: one region, one colour.
const ERA_TINT_ALPHA = CONFIG.tint.eraAlpha
const ERA_TINT_FADE = CONFIG.tint.fade
const ERA_TINTS = {
  // Cool cyan-blue family, keyed off the site's --color-accent token (not BIOMES.cyber.c, which
  // stays reserved for building-marker/company-list color elsewhere — see companies.js, sprites.js).
  cyber: ['#00C2FF', '#2f8fd6', '#5aa8e0'],
  // Violet family toward the AI-era castillo biome color (BIOMES.castillo.c).
  castillo: ['#a855f7', '#8b5fbf', '#c084fc'],
}

// The wash for a world point: its region's tone, at an alpha that grows with how far the point is
// from the border with the nearest OTHER region. Cut off at the border, the wash drew the Voronoi edge
// as a staircase of whole tiles; fading over ERA_TINT_FADE px, the step between neighbouring tiles is
// a few hundredths of alpha and the edge reads as a gradient.
export function eraWash(anchors, wx, wy) {
  let near = null
  let d1 = Infinity
  for (const a of anchors) {
    const d = Math.hypot(wx - a.x, wy - a.y)
    if (d < d1) { d1 = d; near = a }
  }
  const tints = ERA_TINTS[near.bi]
  if (!tints) return null
  let d2 = Infinity
  for (const a of anchors) if (a.bi !== near.bi) d2 = Math.min(d2, Math.hypot(wx - a.x, wy - a.y))
  return { color: tints[0], alpha: ERA_TINT_ALPHA * Math.min(1, (d2 - d1) / ERA_TINT_FADE) }
}

function washTile(ctx, wash, sx, sy) {
  if (!wash || wash.alpha < 0.005) return
  ctx.save()
  ctx.globalAlpha = wash.alpha
  ctx.fillStyle = wash.color
  ctx.fillRect(sx, sy, TILE, TILE)
  ctx.restore()
}

export function activeSites(state) {
  return state.revealed ? state.world.sites.concat(state.world.hiddenSites || []) : state.world.sites
}

// Logical (CSS-px) viewport size — WorldRpg.jsx sizes the canvas DRAWING BUFFER to
// devicePixelRatio × the CSS-displayed size (so pixel art stays crisp on retina) and then
// applies ctx.setTransform(dpr, 0, 0, dpr, 0, 0), so every draw call already operates in
// logical/CSS px. Reading the raw ctx.canvas.width/height here (the dpr-multiplied buffer)
// would place screen-space geometry — the HUD chips, dialog box, night overlay, tile-visibility
// range — off by a factor of dpr. WorldRpg.jsx annotates canvas.logicalWidth/logicalHeight with
// the CSS size before that transform; this falls back to the raw buffer when unset (unit tests,
// or a canvas that was never dpr-sized) so existing callers stay unaffected.
export function viewportOf(ctx) {
  return {
    w: ctx.canvas.logicalWidth || ctx.canvas.width,
    h: ctx.canvas.logicalHeight || ctx.canvas.height,
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const lenSq = abx * abx + aby * aby
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq)) : 0
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t))
}

export function nearestPathDist(path, wx, wy) {
  let min = Infinity
  for (let i = 0; i < path.length - 1; i += 1) {
    const d = distToSegment(wx, wy, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y)
    if (d < min) min = d
  }
  return min
}

// Same idea as nearestPathDist, but over world.roads' segment SET ({a,b,hidden?} objects, not a
// consecutive-point polyline) — the full road graph (spine + every site's door spur + each
// hidden POI's rejoin loop) built by overworld.js's buildRoads. `hidden` loop segments (the POI
// detours) are skipped unless `revealed` is true, mirroring how hidden sites themselves only
// render once state.revealed flips — so the road to a not-yet-discovered POI doesn't spoil it by
// being visible on the ground first. No allocations beyond the running `min`.
export function nearestRoadDist(roads = [], wx, wy, revealed) {
  let min = Infinity
  for (let i = 0; i < roads.length; i += 1) {
    const r = roads[i]
    if (r.hidden && !revealed) continue
    const d = distToSegment(wx, wy, r.a.x, r.a.y, r.b.x, r.b.y)
    if (d < min) min = d
  }
  return min
}

export function visibleTileRange(cam, vw, vh, tile) {
  return {
    x0: Math.floor(cam.x / tile) - 1,
    y0: Math.floor(cam.y / tile) - 1,
    x1: Math.ceil((cam.x + vw) / tile) + 1,
    y1: Math.ceil((cam.y + vh) / tile) + 1,
  }
}

// Exported so worldRpg.js's region-music tracking (nearestBiome under the avatar) shares the
// same farm-inclusive anchor list as ground-tile biome lookup, instead of re-deriving it.
export function regionsWithFarm(world) {
  return world.regions.concat([{ bi: 'farm', x: world.farm.x, y: world.farm.y }])
}

// tileNameFor() returns the sentinel 'path' for any on-path tile — resolved here into one of
// the 9 real Path_Tile.png frames by checking whether the tile's 4 grid-neighbors are also on
// path, so straight road runs and turns get a grass-blended border (pathTileName in tiles.js)
// instead of the old flat rectangle. Neighbor checks only run for tiles that are actually on
// path (the minority), so this stays cheap in the hot per-tile loop. Generalizes to every road
// segment (spine + door spurs + POI loops) for free since it's built on nearestRoadDist.
function resolvePathFrame(roads, tx, ty, revealed) {
  const onPath = (nx, ny) => (
    nearestRoadDist(roads, nx * TILE + TILE / 2, ny * TILE + TILE / 2, revealed) < PATH_THRESHOLD
  )
  return pathTileName(onPath(tx, ty - 1), onPath(tx + 1, ty), onPath(tx, ty + 1), onPath(tx - 1, ty))
}

// Is a world point inside any pond's water? Used both to pick water tiles (below) and, via the
// same radius, to keep the era-tint wash off the pond.
export function pondAt(ponds, wx, wy) {
  for (let i = 0; i < (ponds || []).length; i += 1) {
    const p = ponds[i]
    if ((wx - p.x) ** 2 + (wy - p.y) ** 2 <= p.r * p.r) return true
  }
  return false
}

// A pond tile's water frame, chosen by which of its 4 grid-neighbors are also water — the same
// rounded-island autotiling the cobble road uses, so the grass/dirt shore is picked automatically.
// Returns null for a tile with fewer than 2 water neighbors: the 9-cell set has no cell for a
// 3-sides-open "tip", and falling back to a flat centre cell there produces blocky protrusions off
// a small pond — trimming those tips to grass keeps the silhouette rounded.
function resolveWaterFrame(ponds, tx, ty) {
  const on = (nx, ny) => pondAt(ponds, nx * TILE + TILE / 2, ny * TILE + TILE / 2)
  const n = on(tx, ty - 1); const e = on(tx + 1, ty); const s = on(tx, ty + 1); const w = on(tx - 1, ty)
  if (n + e + s + w < 2) return null
  return waterTileName(n, e, s, w)
}

// A map that paints its own water (a tiles layer named 'water', docs/adr/0003) owns the ponds: the
// ground draws none, and the painted cells are left to the authored layers.
export function proceduralPonds(world) {
  return world.waterAuthored ? [] : (world.ponds || [])
}

// A map that paints its own roads (a tiles layer named 'road') owns them: the generated spurs to
// the doors step aside so the two networks never overlap. The hidden POI loops stay, because the
// map has no idea where those detours run until the Konami code reveals them.
export function proceduralRoads(state) {
  const roads = state.world.roads || []
  const mapPaintsRoads = (state.authored || []).some(l => l.name === 'road')
  return mapPaintsRoads ? roads.filter(r => r.hidden) : roads
}

function drawGround(ctx, state, cam, sprites) {
  const { world } = state
  const roads = proceduralRoads(state)
  const ponds = proceduralPonds(world)
  const anchors = regionsWithFarm(world)
  const { w: vw, h: vh } = viewportOf(ctx)
  const { x0, y0, x1, y1 } = visibleTileRange(cam, vw, vh, TILE)
  for (let ty = y0; ty < y1; ty += 1) {
    for (let tx = x0; tx < x1; tx += 1) {
      const wx = tx * TILE + TILE / 2
      const wy = ty * TILE + TILE / 2
      const bi = nearestBiome(anchors, wx, wy)
      const water = pondAt(ponds, wx, wy) ? resolveWaterFrame(ponds, tx, ty) : null
      let name
      if (water) {
        name = water
      } else {
        const dist = nearestRoadDist(roads, wx, wy, state.revealed)
        name = tileNameFor(bi, wx, wy, dist)
        if (name === 'path') name = resolvePathFrame(roads, tx, ty, state.revealed)
      }
      const sx = tx * TILE - cam.x
      const sy = ty * TILE - cam.y
      sprites.draw(ctx, name, sx, sy, TILE, TILE)
      if (!water) washTile(ctx, eraWash(anchors, wx, wy), sx, sy)
    }
  }
}

// Does the procedural ground own this cell? Roads to every door and pond water are still drawn by
// drawGround, and the authored base layer paints grass over the whole map, so an authored cell
// standing on either would hide it. Until the map paints its own roads and water (docs/adr/0001),
// those cells are left to the ground.
function groundOwnsCell(world, roads, tx, ty, revealed) {
  const wx = tx * TILE + TILE / 2
  const wy = ty * TILE + TILE / 2
  const ponds = proceduralPonds(world)
  if (pondAt(ponds, wx, wy) && resolveWaterFrame(ponds, tx, ty)) return true
  return nearestRoadDist(roads, wx, wy, revealed) < PATH_THRESHOLD
}

// Authored terrain drawn on top of the procedural ground. Same viewport culling drawGround uses,
// so cost tracks the screen, not how much of the world has been painted. Layers draw in order;
// a later layer overdraws an earlier one at the same cell.
//
// The era tint is applied to authored cells too, once per cell (not once per layer). Exempting
// them would turn the painted/generated seam into a visible colour border in cyber/castillo —
// exactly what the hybrid composition has to hide. The cost is that WYSIWYG breaks in those two
// biomes: the editor shows a clean tile, the game shows a washed one. Water is the exception, as
// the procedural water always was: a cell whose top layer is `water` is never washed.
export function drawAuthoredTiles(ctx, state, cam, sprites) {
  const layers = state.authored
  if (!layers || !layers.length) return
  const { w: vw, h: vh } = viewportOf(ctx)
  const { x0, y0, x1, y1 } = visibleTileRange(cam, vw, vh, TILE)
  const { world } = state
  const anchors = world && world.regions ? regionsWithFarm(world) : null
  const roads = world ? proceduralRoads(state) : []
  for (let ty = y0; ty < y1; ty += 1) {
    for (let tx = x0; tx < x1; tx += 1) {
      if (world && groundOwnsCell(world, roads, tx, ty, state.revealed)) continue
      const key = `${tx},${ty}`
      const sx = tx * TILE - cam.x
      const sy = ty * TILE - cam.y
      let painted = false
      let wet = false
      for (const layer of layers) {
        const name = layer.cells.get(key)
        if (!name) continue
        sprites.draw(ctx, name, sx, sy, TILE, TILE)
        painted = true
        wet = layer.name === WATER_LAYER
      }
      if (!painted || wet || !anchors) continue
      washTile(ctx, eraWash(anchors, tx * TILE + TILE / 2, ty * TILE + TILE / 2), sx, sy)
    }
  }
}

// Centred on the house: a company name is often wider than a small house, and drawn from the left
// edge it hung off one side and was clipped at the screen's edge.
function drawBuildingLabel(ctx, s, bx, by) {
  const label = s.seen ? `${s.co} ✓` : s.co
  ctx.fillStyle = '#eafff6'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(label, bx + s.w / 2, by - 6)
  ctx.textAlign = 'left'
}

// Idle breathing cadence: state.clock advances ~96 units/sec, so ~44 units per idle frame gives a
// gentle ~0.9s two-frame loop while standing.
const IDLE_TICKS = CONFIG.avatar.idleTicks

// Carlos is drawn as a stack of modular sprites (bare base + jeans/boots/shirt/hair — see
// AVATAR_LAYERS), each layer sharing the base's frame rects so they land pixel-aligned. Walking
// cycles the 6-frame stride by floor(step); standing runs the 2-frame idle off the clock. There's
// no dedicated left row, so 'left' reuses the right frames mirrored via drawFlipped.
function drawAvatar(ctx, state, cam, sprites) {
  const { player } = state
  const dir = player.dir === 'left' ? 'right' : player.dir
  const moving = player.moving
  const phase = moving ? Math.floor(player.step) : animIndex(state.clock || 0, IDLE_TICKS, 2)
  const dx = player.x - AVATAR_W / 2 - cam.x
  const dy = player.y - AVATAR_H / 2 - cam.y
  const paint = player.dir === 'left' ? sprites.drawFlipped : sprites.draw
  AVATAR_LAYERS.forEach(layer => paint(ctx, avatarFrame(layer, dir, moving, phase), dx, dy, AVATAR_W, AVATAR_H))
}

// Ground-contact footprint (world w/h) per decor type — used both to size the sprite and to
// bottom-anchor it at d.y, so d.y stays the item's "feet" for both placement and y-sorting.
const DECOR_DIMS = {
  tree: { w: 64, h: 80 },
  tree_small: { w: 32, h: 48 },
  bush: { w: 16, h: 16 },
  rock: { w: 16, h: 16 },
  flower: { w: 16, h: 16 },
  fence: { w: 16, h: 32 },
  tree_birch: { w: 32, h: 48 },
  tree_spruce: { w: 32, h: 48 },
  tree_fruit: { w: 32, h: 64 },
  lilypad: { w: 16, h: 16 },
  cattail: { w: 16, h: 16 },
  kapybara: { w: 28, h: 28 },
  frog: { w: 16, h: 16 },
}

// Base-pivoted skew, not a translate: swayOffset(d,t) is now a small horizontal shear factor
// (see ambient.js), applied via ctx.transform() around the sprite's ground-contact point
// (baseX, baseY — d.y is already the item's "feet", per DECOR_DIMS's comment). At the local
// origin (y=0, the base) the shear leaves x unchanged, so the trunk/base stays planted while
// the canopy above it (negative local y) leans — reads as wind, not the old whole-sprite
// translate, which shimmered/vibrated once combined with pixelated rendering + a
// fractional-pixel offset changing every frame.
// Frame-animated decor: type → its baked wind strip. The per-item clock offset (a stable hash of
// world position) desyncs neighboring flowers so they don't sway in lockstep. Static types (trees,
// rocks, …) fall through to their single frame name.
const ANIM_DECOR = {
  flower: { base: 'flowerwind', count: 8, ticks: 14 },
  lilypad: { base: 'lilypad', count: 8, ticks: 16 },
  cattail: { base: 'cattail', count: 8, ticks: 18 },
  kapybara: { base: 'kapybara', count: 9, ticks: 22 },
  frog: { base: 'frog', count: 2, ticks: 30 },
}

function decorFrameName(d, t) {
  const a = ANIM_DECOR[d.type]
  if (!a) return d.type
  const offset = (Math.floor(d.x) * 13 + Math.floor(d.y) * 7) % (a.ticks * a.count)
  return animFrame(a.base, t + offset, a.ticks, a.count)
}

function drawDecorItem(ctx, d, cam, sprites, t) {
  const dim = DECOR_DIMS[d.type]
  const name = decorFrameName(d, t)
  const baseX = d.x - cam.x
  const baseY = d.y - cam.y
  const skew = swayOffset(d, t)
  if (!skew) {
    sprites.draw(ctx, name, baseX - dim.w / 2, baseY - dim.h, dim.w, dim.h)
    return
  }
  ctx.save()
  ctx.translate(baseX, baseY)
  ctx.transform(1, 0, skew, 1, 0, 0)
  sprites.draw(ctx, name, -dim.w / 2, -dim.h, dim.w, dim.h)
  ctx.restore()
}

// An authored house has no `building` to draw: its sprite is a placed object and the placements
// pass already drew it (docs/adr/0001). Drawing one here as well would stack a hashed house on top
// of the one the author chose. The label still belongs to the site, so it is drawn either way — and
// the drawable still takes part in the depth sort, so an authored house occludes correctly.
export function buildingDrawable(s, cam, showLabel = true) {
  return {
    baseY: s.cy + s.h,
    draw: (ctx, sprites) => {
      const bx = s.cx - s.w / 2 - cam.x
      const by = s.cy - cam.y
      if (s.building) sprites.draw(ctx, s.building, bx, by, s.w, s.h)
      if (s.co && showLabel) drawBuildingLabel(ctx, s, bx, by)
    },
  }
}

// The windmill is a composite: a sail-free tower (native x0..69 of the 128-wide sprite) plus the
// rotating sail wheel drawn over its upper-right face. Both scale by k = drawWidth/128; the wheel's
// native offset (SAIL_DX, SAIL_DY) was tuned by screenshot so its hub sits on the tower's mount and
// the arms spread across the face (not detached beside it). The sails cycle 4 frames off the clock
// (ticks 22 ≈ a lazy ~1s rotation); frame 0 is the tower's original static pose, so the loop wraps
// seamlessly, and the sail-free tower crop means no static "+" ever peeks behind the rotation.
const WINDMILL_SAIL = { base: 'windmillsail', count: 4, ticks: CONFIG.windmill.sailTicks }
const SAIL_DX = CONFIG.windmill.sailDx
const SAIL_DY = CONFIG.windmill.sailDy

function windmillDrawable(wm, cam, t) {
  const k = wm.w / 128
  return {
    baseY: wm.cy + wm.h,
    draw: (ctx, sprites) => {
      const bx = wm.cx - wm.w / 2 - cam.x
      const by = wm.cy - cam.y
      sprites.draw(ctx, 'windmill_tower', bx, by, 69 * k, 112 * k)
      const sail = animFrame(WINDMILL_SAIL.base, t, WINDMILL_SAIL.ticks, WINDMILL_SAIL.count)
      sprites.draw(ctx, sail, bx + SAIL_DX * k, by + SAIL_DY * k, 64 * k, 80 * k)
    },
  }
}

// Authored objects carry optional flipX/flipY/rot/scale (world-editor M5). Anchor is the same
// bottom-centre point the flat placements already used, so the no-transform path stays a single
// drawImage with no canvas state changes — that identity case is what guarantees M6 does not
// alter anything the Asset Placer produced.
export function drawTransformed(ctx, sprites, pl, cam, clips = null, t = 0) {
  // A placement that plays a clip draws the clip's frame for this tick; everything else draws the
  // frame the editor placed. Falling back to pl.frame also covers a clip id the table lost, which
  // keeps a stale placements.json rendering a static object rather than throwing mid-frame.
  const clip = pl.clip && clips ? clips[pl.clip] : null
  const name = (clip && clipFrame(clip, t, hashPhase(pl.x, pl.y))) || pl.frame
  const f = sprites.frame(name)
  const scale = pl.scale || 1
  const rot = pl.rot || 0
  if (!pl.flipX && !pl.flipY && !rot && scale === 1) {
    sprites.draw(ctx, name, pl.x - f.w / 2 - cam.x, pl.y - f.h - cam.y, f.w, f.h)
    return
  }
  ctx.save()
  ctx.translate(pl.x - cam.x, pl.y - cam.y)
  if (rot) ctx.rotate((rot * Math.PI) / 180)
  if (scale !== 1) ctx.scale(scale, scale)
  if (pl.flipX || pl.flipY) ctx.scale(pl.flipX ? -1 : 1, pl.flipY ? -1 : 1)
  sprites.draw(ctx, name, -f.w / 2, -f.h, f.w, f.h)
  ctx.restore()
}

// Buildings, decor, and the avatar all draw in one y-sorted pass (sorted by each item's
// ground-contact baseY) so things nearer the bottom of the screen correctly occlude things
// behind them, instead of buildings/avatar always drawing on top of decor regardless of depth.
function depthSortedDrawables(state, cam, t) {
  const { player } = state
  const structures = activeSites(state).concat(state.world.farmBuilding ? [state.world.farmBuilding] : [])
  const near = s => Math.hypot(player.x - s.cx, player.y - (s.cy + s.h)) < LABEL_RANGE
  const buildings = structures.map(s => buildingDrawable(s, cam, near(s)))
  const drawOne = d => (ctx, sprites) => drawDecorItem(ctx, d, cam, sprites, t)
  const decor = (state.decor || []).map(d => ({ baseY: d.y, draw: drawOne(d) }))
  const critters = critterDrawables(state, cam, t)
  const npcs = npcDrawables(state, cam, t)
  // Authored/hand-placed assets — native frame size, bottom-anchored at (x,y), optional transforms.
  const placements = (state.world.placements || []).map(pl => ({
    baseY: pl.y,
    draw: (ctx, sprites) => drawTransformed(ctx, sprites, pl, cam, state.world.clips, t),
  }))
  const windmill = state.world.farmWindmill ? [windmillDrawable(state.world.farmWindmill, cam, t)] : []
  const avatar = { baseY: player.y + player.h / 2, draw: (ctx, sprites) => drawAvatar(ctx, state, cam, sprites) }
  return buildings.concat(decor, critters, npcs, placements, windmill, [avatar]).sort((a, b) => a.baseY - b.baseY)
}

function drawPlaceholderScene(ctx, state, cam) {
  const { player } = state
  activeSites(state).forEach(s => {
    const bx = s.cx - s.w / 2 - cam.x
    const by = s.cy - cam.y
    ctx.fillStyle = s.type === 'castle' ? '#9b6fd0' : '#e6d3ad'
    ctx.fillRect(bx, by, s.w, s.h)
    drawBuildingLabel(ctx, s, bx, by)
  })
  ctx.fillStyle = '#00C2FF'
  ctx.fillRect(player.x - player.w / 2 - cam.x, player.y - player.h / 2 - cam.y, player.w, player.h)
}

export function drawDialog(ctx, state) {
  const { dialog, lang } = state
  if (!dialog.isOpen()) return
  const { w, h } = viewportOf(ctx)
  ctx.font = DIALOG_FONT
  dialog.fit(colsFor(w, ctx.measureText('M').width))
  ctx.fillStyle = '#0d1730f2'
  ctx.fillRect(20, h - 150, w - 40, 120)
  ctx.fillStyle = '#dfeaff'
  dialog.visibleText(lang).split('\n').forEach((ln, i) => ctx.fillText(ln, DIALOG_TEXT_X, h - 120 + i * 22))
  drawPageIndicator(ctx, dialog.page(lang), w, h)
}

function drawPageIndicator(ctx, { index, count }, w, h) {
  if (count < 2) return
  ctx.save()
  ctx.textAlign = 'right'
  ctx.fillText(`${index + 1}/${count}`, w - 36, h - 40)
  ctx.restore()
}

function drawParticles(ctx, state, cam) {
  const particles = state.particles ? state.particles.alive() : []
  particles.forEach(p => {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - cam.x - 2, p.y - cam.y - 2, 4, 4)
  })
}

// lighting.js's nightTint().a is unit-tested as-is (peaks at 0.55 at true midnight) — scaling it
// down here, at the draw site, keeps that module untouched while making the darkest night read
// as an atmospheric dusky blue instead of a near-opaque black-out over the world.
const NIGHT_OVERLAY_STRENGTH = 0.55

function drawNightOverlay(ctx, state) {
  const tint = nightTint(phaseOf(state.clock || 0, DAY_LEN))
  const alpha = tint.a * NIGHT_OVERLAY_STRENGTH
  if (alpha <= 0) return
  const { w, h } = viewportOf(ctx)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = `rgb(${tint.r},${tint.g},${tint.b})`
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// Dark ink-950 chip with a thin brand-neon border — echoes the retro-console bezel around the
// canvas (src/pages/*/game.astro) so the in-canvas HUD reads as part of the same "device" rather
// than a flat, mismatched dark bar. Colors are canvas fillStyle strings (2D context can't consume
// CSS custom properties), hand-matched to --color-ink-950 (#07091A) and --color-brand (#00E5A8)
// in src/index.css — keep these two in sync if either token changes.
const HUD_CHIP_BG = 'rgba(7,9,26,0.72)'
const HUD_CHIP_BORDER = 'rgba(0,229,168,0.55)'
const HUD_CHIP_TEXT = '#00E5A8'

function drawHudChip(ctx, text, x, align) {
  ctx.save()
  ctx.font = 'bold 11px monospace'
  ctx.textBaseline = 'middle'
  const padX = 10
  const h = 22
  const r = h / 2
  const w = ctx.measureText(text).width + padX * 2
  const chipX = align === 'right' ? x - w : x
  ctx.beginPath()
  ctx.moveTo(chipX + r, 10)
  ctx.arcTo(chipX + w, 10, chipX + w, 10 + h, r)
  ctx.arcTo(chipX + w, 10 + h, chipX, 10 + h, r)
  ctx.arcTo(chipX, 10 + h, chipX, 10, r)
  ctx.arcTo(chipX, 10, chipX + w, 10, r)
  ctx.closePath()
  ctx.fillStyle = HUD_CHIP_BG
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = HUD_CHIP_BORDER
  ctx.stroke()
  ctx.fillStyle = HUD_CHIP_TEXT
  ctx.textAlign = 'left'
  ctx.fillText(text, chipX + padX, 10 + h / 2)
  ctx.restore()
}

// regionsWithFarm() (used by both drawGround's tile lookup and worldRpg.js's region-music
// tracking) adds a synthetic { bi: 'farm', ... } anchor that has NO entry in BIOMES — the
// player spawns there, so nearestBiome() returns 'farm' on frame 1. BIOMES[bi] would then be
// undefined and BIOMES[bi].label throw immediately (crashing every render frame). Exported so
// this fallback is independently testable without a canvas.
const FARM_LABEL = { en: 'The Farm', es: 'La Granja' }

export function eraLabel(bi, lang) {
  const biome = BIOMES[bi]
  if (biome) return biome.label[lang] ?? biome.label.en
  if (bi === 'farm') return FARM_LABEL[lang] ?? FARM_LABEL.en
  return bi
}

// Top-left: current era label (biome under the avatar). Top-right: discovery progress —
// visible sites seen so far, plus a "+K🔓" once the Konami reveal has unlocked the hidden
// sideProjects sites, so recruiters get a sense of completion/discoverability at a glance.
function drawHud(ctx, state) {
  const { world, lang } = state
  const bi = nearestBiome(regionsWithFarm(world), state.player.x, state.player.y)
  drawHudChip(ctx, eraLabel(bi, lang), 10, 'left')

  const total = world.sites.length
  const seen = world.sites.filter(s => s.seen).length
  const unlocked = state.revealed ? `  +${world.hiddenSites.length}\u{1F513}` : ''
  drawHudChip(ctx, `sites ${seen}/${total}${unlocked}`, viewportOf(ctx).w - 10, 'right')
}

// World-space Y offset (above the normal follow-cam) the intro's camera descends from — a
// "sky" view of the farm before intro.camY() eases it down to the real cam.y over the intro's
// duration (see intro.js's createIntro/camY).
const INTRO_SKY_OFFSET = -420

function introCamera(state, cam) {
  if (!state.intro || state.intro.done()) return cam
  return { x: cam.x, y: state.intro.camY(cam.y + INTRO_SKY_OFFSET, cam.y) }
}

function drawIntroTitle(ctx, state) {
  const alpha = state.intro.titleAlpha()
  if (alpha <= 0) return
  const { w, h } = viewportOf(ctx)
  const cx = w / 2
  const cy = h / 2
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.textAlign = 'center'
  ctx.fillStyle = '#eafff6'
  ctx.font = 'bold 40px monospace'
  ctx.fillText('World RPG', cx, cy - 10)
  ctx.font = '16px monospace'
  ctx.fillStyle = '#9fd8c4'
  ctx.fillText('Carlos Montoya · Backend Engineer', cx, cy + 26)
  ctx.restore()
}

export function render2d(ctx, state, cam) {
  const { sprites } = state
  const introRunning = !!(state.intro && !state.intro.done())
  const shakeOff = shake2D(state.shake || 0)
  const sceneCam = introCamera(state, cam)
  const drawCam = { x: sceneCam.x + shakeOff.x, y: sceneCam.y + shakeOff.y }
  const { w: bgW, h: bgH } = viewportOf(ctx)
  ctx.fillStyle = '#0B1020'
  ctx.fillRect(0, 0, bgW, bgH)
  if (!sprites) {
    drawPlaceholderScene(ctx, state, drawCam)
  } else {
    const t = state.clock || 0
    // An interior is lit indoors and fully painted by its map: no generated ground, no weather,
    // no night. The HUD's era and site count describe the exterior, so it waits outside too.
    const outdoors = !state.world.interior
    if (outdoors) drawGround(ctx, state, drawCam, sprites)
    drawAuthoredTiles(ctx, state, drawCam, sprites)
    depthSortedDrawables(state, drawCam, t).forEach(item => item.draw(ctx, sprites))
    if (outdoors) drawAmbient(ctx, state, drawCam, t)
    drawParticles(ctx, state, drawCam)
    if (outdoors) drawNightOverlay(ctx, state)
    if (outdoors) drawHud(ctx, state)
  }
  drawDialog(ctx, state)
  if (introRunning) drawIntroTitle(ctx, state)
}
