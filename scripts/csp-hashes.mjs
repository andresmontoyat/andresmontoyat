// Prints the sha256 CSP source for every inline <script> served by the site.
//
//   node scripts/csp-hashes.mjs [dir]            hashes dist/**/*.html (default dist)
//   node scripts/csp-hashes.mjs --live [origin]  hashes what production serves (/en/ /es/)
//   node scripts/csp-hashes.mjs --check [origin] fails if the live hashes are not in vercel.json
//   node scripts/csp-hashes.mjs --check-dist     fails the build if our own dist/ scripts are not in it
//
// Why --live: Vercel injects its analytics config (scriptSrc/endpoints) at deploy time, so the
// inline analytics script of a local `astro build` hashes differently from the one production
// serves. dist/ is authoritative for our own scripts (island runtime, details-dismiss); the live
// site is authoritative for the Vercel one. Run `--check` after upgrading astro or @vercel/analytics.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const INLINE = /<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g
const DEFAULT_ORIGIN = 'https://www.andresmontoyat.dev'

// Vercel Analytics' snippet is rewritten at deploy time, so its local hash never matches production:
// --check covers it against the live site, --check-dist leaves it out.
const VERCEL_SNIPPET = /window\.va\b/

export const hashInline = (html, { skipVercel = false } = {}) =>
  [...html.matchAll(INLINE)]
    .map(([, body]) => body)
    .filter((body) => !(skipVercel && VERCEL_SNIPPET.test(body)))
    .map((body) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`)

export const missingFrom = (policy, hashes) => [...new Set(hashes)].filter((h) => !policy.includes(h))

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })

const fromDir = (dir, opts) => walk(dir).flatMap((f) => hashInline(readFileSync(f, 'utf8'), opts))

const fromLive = async (origin) =>
  (await Promise.all(['/en/', '/es/'].map(async (p) => hashInline(await (await fetch(origin + p)).text())))).flat()

const [mode, arg] = process.argv.slice(2)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()

async function main() {
  const live = mode === '--live' || mode === '--check'
  const dist = mode === '--check-dist'
  const found = new Set(live ? await fromLive(arg ?? DEFAULT_ORIGIN) : fromDir(dist ? 'dist' : mode ?? 'dist', { skipVercel: dist }))
  if (mode === '--check' || dist) return check(found, dist ? 'built' : 'live')
  console.log([...found].sort().join(' '))
}

// The CSP is enforced: a script missing from it does not run, and the islands stop hydrating.
// Failing the build is how that surfaces before deploy instead of on the live page.
function check(found, where) {
  const missing = missingFrom(readFileSync('vercel.json', 'utf8'), found)
  if (missing.length) {
    console.error(`Missing from vercel.json script-src (${where}):\n${missing.join('\n')}`)
    process.exit(1)
  }
  console.log(`OK: ${found.size} ${where} inline-script hashes are all in vercel.json`)
}
