// @vitest-environment node
//
// src/components/astro/Skill.test.ts
// Astro Container API parity test — ports all 8 it-blocks of the former
// src/components/Skill.test.jsx RTL suite against the zero-JS Skill.astro
// (D-01/D-06). Forced to the `node` environment per-file (see
// src/pages/_404.test.ts / About.test.ts for the esbuild/jsdom rationale
// established in Phase 21) — renderToString() output is plain HTML text,
// no DOM APIs needed.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Skill from './Skill.astro'
import data from '../../data/skills.json'
import combos from '../../data/skill-combos.json'

async function renderSkill(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Skill, { props: { locale } })
}

describe('Skill.astro (Container API parity — D-01/D-06)', () => {
  it('renders the section with id="skills"', async () => {
    const result = await renderSkill('en')
    expect(result).toContain('id="skills"')
  })

  it('renders label + heading + intro (EN)', async () => {
    const result = await renderSkill('en')
    expect(result).toContain('Skills')
    expect(result).toContain('Technical stack')
    expect(result).toMatch(/Tools and technologies/)
  })

  it('renders all 4 category titles (EN)', async () => {
    const result = await renderSkill('en')
    expect(result).toContain('Backend')
    expect(result).toContain('Cloud &amp; Infrastructure')
    expect(result).toContain('DevOps &amp; Tools')
    expect(result).toContain('AI &amp; Productivity')
  })

  it('renders every chip with its label (33 chips total)', async () => {
    const result = await renderSkill('en')
    const allChips = data.categories.flatMap((c) => c.chips)
    expect(allChips).toHaveLength(33)
    for (const chip of allChips) {
      expect(result).toContain(chip.label)
    }
  })

  it('renders Kotlin as a Backend skill with 8 years', async () => {
    const result = await renderSkill('en')
    expect(result).toContain('Kotlin')
    const backend = data.categories.find((c) => c.id === 'backend')
    const kotlin = backend.chips.find((ch) => ch.label === 'Kotlin')
    expect(kotlin).toBeDefined()
    expect(kotlin.years).toBe(8)
    expect(kotlin.core).toBe(true)
  })

  it('marks core skills with data-core="true" tiles (6 core total)', async () => {
    const result = await renderSkill('en')
    const coreChips = data.categories.flatMap((c) => c.chips).filter((ch) => ch.core)
    expect(coreChips).toHaveLength(6)
    expect((result.match(/data-core="true"/g) || []).length).toBe(6)
  })

  it('translates h2/intro/category-titles when locale=es', async () => {
    const result = await renderSkill('es')
    expect(result).toContain('Stack técnico')
    expect(result).toMatch(/Herramientas y tecnologías/)
    expect(result).toContain('Nube e Infraestructura')
    expect(result).toContain('DevOps y Herramientas')
    expect(result).toContain('IA y Productividad')
  })

  it('renders years next to chip label in some form (e.g. "18y" or "18a")', async () => {
    const result = await renderSkill('en')
    expect(result).toMatch(/18\s*y/)
  })

  it('skills.json schema sanity — 4 categories, each with bilingual title + chips array', () => {
    expect(Array.isArray(data.categories)).toBe(true)
    expect(data.categories).toHaveLength(4)
    for (const c of data.categories) {
      expect(typeof c.id).toBe('string')
      expect(typeof c.symbol).toBe('string')
      expect(typeof c.title.en).toBe('string')
      expect(typeof c.title.es).toBe('string')
      expect(Array.isArray(c.chips)).toBe(true)
      expect(c.chips.length).toBeGreaterThan(0)
      for (const chip of c.chips) {
        expect(typeof chip.label).toBe('string')
        expect(typeof chip.years).toBe('number')
      }
    }
  })

  it('renders every chip name in Spanish too', async () => {
    const result = await renderSkill('es')
    for (const chip of data.categories.flatMap((c) => c.chips)) expect(result).toContain(chip.label)
  })

  it('renders each deck as a labelled group with its card count', async () => {
    const result = await renderSkill('en')
    expect((result.match(/role="group"/g) || []).length).toBe(4)
    expect(result).toContain('aria-label="Backend deck, 11 cards.')
  })

  it('puts CORE cards first in each deck, then by years', async () => {
    const result = await renderSkill('en')
    const deckNames = result.split('class="sd-deck"').slice(1)
      .map((d) => [...d.matchAll(/class="sd-slot[^"]*"[^>]*data-name="([^"]+)"/g)].map((m) => m[1]))
    expect(deckNames.map((d) => d[0])).toEqual(['Java', 'AWS', 'Maven', 'Claude Code'])
    expect(deckNames[0].slice(0, 3)).toEqual(['Java', 'Kotlin', 'Spring Boot'])
  })

  it('renders rarity tiers by years', async () => {
    const result = await renderSkill('en')
    expect(result).toMatch(/sd-slot t-legendary[^"]*"[^>]*data-name="Java"/)
    expect(result).toMatch(/sd-slot t-common[^"]*"[^>]*data-name="Terraform"/)
    expect((result.match(/data-tier="legendary"/g) || []).length).toBe(3)
  })

  it('renders notes in the visitor language', async () => {
    expect(await renderSkill('en')).toContain('Events and the outbox pattern')
    expect(await renderSkill('es')).toContain('Eventos y outbox')
  })

  it('ships the localized combos for the deck script', async () => {
    const en = await renderSkill('en')
    const es = await renderSkill('es')
    expect(en).toContain('Event-driven systems')
    expect(es).toContain('Sistemas orientados a eventos')
    expect(es).not.toContain('Event-driven systems')
  })

  it('renders the hand region with a polite live combo panel', async () => {
    const result = await renderSkill('en')
    expect(result).toMatch(/role="region"[^>]*aria-label="Your hand"/)
    expect(result).toMatch(/class="sd-combo" aria-live="polite"/)
  })

  it('loads the deck script as an external module, never inline', async () => {
    const result = await renderSkill('en')
    expect(result).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>[^<]+<\/script>/)
  })

  it('skill-combos.json — bilingual titles and builds, pairs reference real chips', () => {
    const names = data.categories.flatMap((c) => c.chips).map((ch) => ch.label)
    const ids = data.categories.map((c) => c.id)
    for (const s of combos.synergy) {
      expect(s.techs.every((t) => names.includes(t))).toBe(true)
      expect(s.title.en && s.title.es).toBeTruthy()
      for (const b of s.builds) expect(b.en && b.es).toBeTruthy()
    }
    for (const g of combos.byCategory) expect(g.cats.every((c) => ids.includes(c))).toBe(true)
  })

  it('ships a touch-only footer, and hides the hand and the open-all button on small screens', async () => {
    const result = await renderSkill('es')
    expect(result).toContain('sd-foot-touch')
    expect(result).toContain(data.decks.footTouch.es)
    const source = readFileSync(new URL('./Skill.astro', import.meta.url), 'utf8')
    expect(source).toMatch(/@media \(max-width: 720px\) \{ \.sd-tools, \.sd-hand, \.sd-foot-desk \{ display: none \}/)
  })
})
