// Bakes only the sprite frames actually referenced by src/game/assets/manifest.js into a single
// atlas image + json, so the game ships a tiny generated atlas instead of the full raw paid pack
// (public/game/cute-fantasy/, gitignored — see .gitignore + src/game/assets/ASSETS.md).
//
// Run: node scripts/pack-atlas.mjs (npm run assets:pack)
//
// Deterministic: frames are deduped by their exact (img,x,y,w,h) source rect, then shelf-packed
// in a fixed order (tallest-first, name as tiebreaker) into one PNG. No Date.now/Math.random.

import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { MANIFEST } from '../src/game/assets/manifest.js'

const ROOT = process.cwd()
const MAX_ATLAS_WIDTH = 512
const OUT_PNG = path.join(ROOT, 'public', 'game', 'atlas.png')
const OUT_JSON_SRC = path.join(ROOT, 'src', 'game', 'assets', 'atlas.json')
const OUT_JSON_PUBLIC = path.join(ROOT, 'public', 'game', 'atlas.json')
const IN_INTERIORS = path.join(ROOT, 'src', 'game', 'world', 'authored', 'interiors')
const OUT_INTERIOR_JSON = path.join(ROOT, 'src', 'data', 'interiors')
const OUT_INTERIOR_PNG = path.join(ROOT, 'public', 'game', 'interiors')

function fileOfUrl(url) {
  return path.join(ROOT, 'public', decodeURIComponent(url))
}

function sourceFileFor(imgKey) {
  return fileOfUrl(MANIFEST.images[imgKey])
}

function rectKey(f) {
  return `${f.img}|${f.x}|${f.y}|${f.w}|${f.h}`
}

// Group every named frame by its unique source rect; keep the alphabetically-first name as the
// representative used for sort order (packing order), but remember every name for the json output.
function dedupeFrames(frames) {
  const byRect = new Map()
  Object.keys(frames).sort().forEach(name => {
    const f = frames[name]
    const key = rectKey(f)
    if (!byRect.has(key)) byRect.set(key, { key, img: f.img, sx: f.x, sy: f.y, w: f.w, h: f.h, names: [] })
    byRect.get(key).names.push(name)
  })
  return [...byRect.values()]
}

// Shelf-pack: sort tallest-first (better packing density), name as deterministic tiebreaker, then
// lay frames left-to-right until MAX_ATLAS_WIDTH is exceeded, wrapping to a new shelf below.
// Keeps the source rect (sx,sy = offset to extract FROM) separate from the destination rect
// (x,y = where it lands IN the atlas) — conflating the two reads the wrong source pixels.
function shelfPack(rects) {
  const order = [...rects].sort((a, b) => (b.h - a.h) || a.names[0].localeCompare(b.names[0]))
  let x = 0
  let y = 0
  let shelfHeight = 0
  let atlasWidth = 0
  const placed = order.map(r => {
    if (x > 0 && x + r.w > MAX_ATLAS_WIDTH) {
      y += shelfHeight
      x = 0
      shelfHeight = 0
    }
    const pos = { ...r, x, y }
    atlasWidth = Math.max(atlasWidth, x + r.w)
    x += r.w
    shelfHeight = Math.max(shelfHeight, r.h)
    return pos
  })
  return { placed, atlasWidth, atlasHeight: y + shelfHeight }
}

async function extractBuffer(rect, imageUrlOf) {
  const file = fileOfUrl(imageUrlOf(rect.img))
  return sharp(file).extract({ left: rect.sx, top: rect.sy, width: rect.w, height: rect.h }).png().toBuffer()
}

// The home-page entry-splash shows a single standing avatar thumbnail. It used to point at a raw
// pack file (Player.png) that the migration removed and that the atlas pipeline no longer ships —
// so bake a self-contained 64x64 PNG of the dressed hero (idle-down frame: base + Iron plate
// legs/chest/helm) that DOES ship in public/game/, and repoint both index.astro imgs at it.
const AVATAR_PREVIEW_LAYERS = ['cfPlayer', 'cfLegs', 'cfFeet', 'cfChest', 'cfHair']
const OUT_AVATAR = path.join(ROOT, 'public', 'game', 'avatar-preview.png')

async function buildAvatarPreview() {
  const cell = { left: 0, top: 0, width: 64, height: 64 } // idle-down, standing
  const layers = await Promise.all(AVATAR_PREVIEW_LAYERS.map(
    key => sharp(sourceFileFor(key)).extract(cell).png().toBuffer(),
  ))
  await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers.map(input => ({ input }))).png().toFile(OUT_AVATAR)
  console.log(`wrote ${path.relative(ROOT, OUT_AVATAR)}`)
}

// Bakes `frames` (name -> { img, x, y, w, h } in a source image) into one PNG at `outPng` and
// returns the atlas json shape the game loads. `imageUrlOf` maps a frame's source image key to its
// public url; `imgKey` names the atlas image in the result, `url` is where the game fetches it.
export async function packFrames(frames, imageUrlOf, { outPng, imgKey, url }) {
  const { placed, atlasWidth, atlasHeight } = shelfPack(dedupeFrames(frames))
  const buffers = await Promise.all(placed.map(rect => extractBuffer(rect, imageUrlOf)))
  const composite = placed.map((rect, i) => ({ input: buffers[i], left: rect.x, top: rect.y }))

  await fs.mkdir(path.dirname(outPng), { recursive: true })
  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composite).png().toFile(outPng)

  const outFrames = {}
  placed.forEach(rect => {
    rect.names.forEach(name => {
      outFrames[name] = { img: imgKey, x: rect.x, y: rect.y, w: rect.w, h: rect.h }
    })
  })
  return { images: { [imgKey]: url }, frames: outFrames, stats: { atlasWidth, atlasHeight, cells: placed.length } }
}

async function buildAtlas() {
  const { stats, ...atlasJson } = await packFrames(MANIFEST.frames, key => MANIFEST.images[key], {
    outPng: OUT_PNG, imgKey: 'atlas', url: '/game/atlas.png',
  })
  const json = `${JSON.stringify(atlasJson, null, 2)}\n`

  await fs.mkdir(path.dirname(OUT_JSON_SRC), { recursive: true })
  await fs.writeFile(OUT_JSON_SRC, json)
  await fs.mkdir(path.dirname(OUT_JSON_PUBLIC), { recursive: true })
  await fs.writeFile(OUT_JSON_PUBLIC, json)

  const stat = await fs.stat(OUT_PNG)
  const frameCount = Object.keys(atlasJson.frames).length
  console.log(`atlas: ${stats.atlasWidth}x${stats.atlasHeight}px, ${stats.cells} unique cells, ${frameCount} named frames, ${(stat.size / 1024).toFixed(1)}KB`)
  console.log(`wrote ${path.relative(ROOT, OUT_PNG)}`)
  console.log(`wrote ${path.relative(ROOT, OUT_JSON_SRC)}`)
  console.log(`wrote ${path.relative(ROOT, OUT_JSON_PUBLIC)}`)
}

// One atlas per adopted interior, so the main atlas never grows with rooms nobody has entered.
async function buildInteriors() {
  const names = await listSuffix(IN_INTERIORS, '.manifest.json')
  for (const file of names) {
    const id = file.slice(0, -'.manifest.json'.length)
    const manifest = JSON.parse(await fs.readFile(path.join(IN_INTERIORS, file), 'utf8'))
    const outPng = path.join(OUT_INTERIOR_PNG, `${id}.png`)
    const { stats, ...atlas } = await packFrames(manifest.frames, key => manifest.images[key], {
      outPng, imgKey: 'interior', url: `/game/interiors/${id}.png`,
    })
    await fs.mkdir(OUT_INTERIOR_JSON, { recursive: true })
    await fs.writeFile(path.join(OUT_INTERIOR_JSON, `${id}.atlas.json`), `${JSON.stringify(atlas, null, 2)}\n`)
    console.log(`interior ${id}: ${stats.atlasWidth}x${stats.atlasHeight}px, ${Object.keys(atlas.frames).length} named frames`)
  }
  await removeOrphans(OUT_INTERIOR_JSON, '.atlas.json', names.map(n => n.replace('.manifest.json', '.atlas.json')))
  await removeOrphans(OUT_INTERIOR_PNG, '.png', names.map(n => n.replace('.manifest.json', '.png')))
}

async function listSuffix(dir, suffix) {
  const files = await fs.readdir(dir).catch(() => [])
  return files.filter(f => f.endsWith(suffix)).sort()
}

// A removed interior must not leave its atlas behind: the file is what says the house is open.
async function removeOrphans(dir, suffix, keep) {
  for (const f of await listSuffix(dir, suffix)) {
    if (!keep.includes(f)) await fs.rm(path.join(dir, f))
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  buildAtlas().then(buildAvatarPreview).then(buildInteriors).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
