// Prints the sha256 CSP source for every inline <script> in dist/**/*.html
// (Astro island runtime, details-dismiss, Vercel analytics). Paste the output into
// script-src of vercel.json after upgrading astro / @vercel/analytics.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []
  })

const INLINE = /<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g
const hashes = new Set()
for (const file of walk(process.argv[2] ?? 'dist')) {
  for (const [, body] of readFileSync(file, 'utf8').matchAll(INLINE)) {
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
  }
}
console.log([...hashes].sort().join(' '))
