// Writes the tag vocabulary the map editor loads (src/game/world/authored/career.vocab.json).
// Run after editing src/data/experience.json: npm run map:vocab. A test fails if the file is stale.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { vocabularyFrom } from '../src/game/world/authored/vocab.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IN_EXPERIENCE = path.join(ROOT, 'src/data/experience.json')
const OUT = path.join(ROOT, 'src/game/world/authored/career.vocab.json')

const experience = JSON.parse(await fs.readFile(IN_EXPERIENCE, 'utf8'))
const vocab = vocabularyFrom(experience)
await fs.writeFile(OUT, `${JSON.stringify(vocab, null, 2)}\n`)
console.log(`vocab: ${vocab.overworld.door.values.length} doors`)
