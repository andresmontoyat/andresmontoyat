// Prints the sha256 CSP source for every inline <script> served by the site.
//
//   node scripts/csp-hashes.mjs [dir]            hashes dist/**/*.html (default dist)
//   node scripts/csp-hashes.mjs --live [origin]  hashes what production serves (/en/ /es/)
//   node scripts/csp-hashes.mjs --check [origin] fails if the live hashes are not in vercel.json
//
// Why --live: Vercel injects its analytics config (scriptSrc/endpoints) at deploy time, so the
// inline analytics script of a local `astro build` hashes differently from the one production
// serves. dist/ is authoritative for our own scripts (island runtime, details-dismiss); the live
// site is authoritative for the Vercel one. Run `--check` after upgrading astro or @vercel/analytics.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const INLINE = /<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g
const DEFAULT_ORIGIN = 'https://www.andresmontoyat.dev'

export const hashInline = (html) =>
  [...html.matchAll(INLINE)].map(([, body]) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`)

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })

const fromDir = (dir) => walk(dir).flatMap((f) => hashInline(readFileSync(f, 'utf8')))

const fromLive = async (origin) =>
  (await Promise.all(['/en/', '/es/'].map(async (p) => hashInline(await (await fetch(origin + p)).text())))).flat()

const [mode, arg] = process.argv.slice(2)
const live = mode === '--live' || mode === '--check'
const found = new Set(live ? await fromLive(arg ?? DEFAULT_ORIGIN) : fromDir(mode ?? 'dist'))

if (mode === '--check') {
  const policy = readFileSync('vercel.json', 'utf8')
  const missing = [...found].filter((h) => !policy.includes(h))
  if (missing.length) {
    console.error(`Missing from vercel.json script-src:\n${missing.join('\n')}`)
    process.exit(1)
  }
  console.log(`OK: ${found.size} live inline-script hashes are all in vercel.json`)
} else {
  console.log([...found].sort().join(' '))
}
