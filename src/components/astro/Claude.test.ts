// @vitest-environment node
//
// src/components/astro/Claude.test.ts
// Astro Container API parity test — ports all 6 it-blocks of the former
// src/components/Claude.test.jsx RTL suite against the zero-JS Claude.astro
// (D-01/D-06). Forced to the `node` environment per-file (see
// src/pages/_404.test.ts for the esbuild/jsdom rationale established in
// Phase 21) — renderToString() output is plain HTML text, no DOM APIs needed.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Claude from './Claude.astro'
import data from '../../data/claude.json'

async function renderClaude(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Claude, { props: { locale } })
}

describe('Claude.astro (Container API parity — D-06)', () => {
  it('renders the section with id="claude-code"', async () => {
    const result = await renderClaude('en')
    expect(result).toContain('id="claude-code"')
  })

  it('renders pitch hero label/h2/subLead/CTA (EN)', async () => {
    const result = await renderClaude('en')
    expect(result).toMatch(/AI Engineering · For your team/)
    expect(result).toMatch(/Software/)
    expect(result).toMatch(/delivered with AI discipline/)
    expect(result).toMatch(/build the engineering system around them/)
    expect(result).toContain('Let&#39;s talk about your project')
  })

  it('renders all 4 value cards with title + id (EN)', async () => {
    const result = await renderClaude('en')
    expect(data.values).toHaveLength(4)
    expect(result).toContain('Standards agents can execute')
    expect(result).toContain('Specialist reviewers on every diff')
    expect(result).toContain('From spec to PR, traceable')
    expect(result).toContain('Rules that don&#39;t drift')
  })

  it('renders all 6 offerings (EN)', async () => {
    const result = await renderClaude('en')
    expect(data.offerings).toHaveLength(6)
    expect(result).toContain('Agentic delivery setup')
    expect(result).toContain('RAG &amp; MCP servers')
    expect(result).toContain('LLM evals &amp; guardrails')
    expect(result).toContain('Greenfield &amp; legacy modernization')
    expect(result).toContain('Custom review agents')
    expect(result).toContain('CI/CD that guards quality')
  })

  it('translates pitch + values + offerings when locale=es', async () => {
    const result = await renderClaude('es')
    expect(result).toMatch(/AI Engineering · Para tu equipo/)
    expect(result).toMatch(/Software/)
    expect(result).toMatch(/Hablemos de tu proyecto/)
    expect(result).toContain('Estándares que los agentes ejecutan')
    expect(result).toContain('Entrega agéntica en tu equipo')
  })

  it('claude.json schema sanity — values/offerings bilingual', () => {
    expect(Array.isArray(data.values)).toBe(true)
    for (const v of data.values) {
      expect(typeof v.id).toBe('string')
      expect(typeof v.title.en).toBe('string')
      expect(typeof v.title.es).toBe('string')
      expect(typeof v.desc.en).toBe('string')
      expect(typeof v.desc.es).toBe('string')
    }
    for (const o of data.offerings) {
      expect(typeof o.id).toBe('string')
      expect(typeof o.title.en).toBe('string')
      expect(typeof o.title.es).toBe('string')
      expect(typeof o.desc.en).toBe('string')
      expect(typeof o.desc.es).toBe('string')
    }
  })

  // An offering card is 222px of text at a 320px viewport. A run with no break
  // opportunity longer than that pushes the whole page sideways (it did, in ES:
  // "discutir→planear→ejecutar→verificar", 35 chars, 328px of page at 320).
  it('copy has no unbreakable run too long for a 320px card', () => {
    const MAX_RUN = 24
    const runs: string[] = []
    const walk = (v: unknown): void => {
      if (typeof v === 'string') runs.push(...v.split(/\s+/))
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (k !== 'url') walk(x) })
    }
    walk(data)
    expect(runs.filter((r) => r.length > MAX_RUN)).toEqual([])
  })

  it('renders the delivery pipeline as a tablist with one panel per stage', async () => {
    const result = await renderClaude('es')
    expect(result).toContain('role="tablist"')
    expect((result.match(/role="tab"/g) || []).length).toBe(data.pipeline.length)
    expect((result.match(/role="tabpanel"/g) || []).length).toBe(data.pipeline.length)
    expect(result).toContain('Verificar')
    expect(result).toContain('VERIFICATION.md')
  })

  it('links to the guidelines site in a new tab', async () => {
    const result = await renderClaude('en')
    expect(result).toContain('href="https://guidelines.andresmontoyat.dev/"')
    expect(result).toContain('Read the guidelines my agents follow')
  })

  it('shows the work shipped this way', async () => {
    const result = await renderClaude('es')
    expect(result).toContain('Hecho así')
    for (const b of data.built) expect(result).toContain(`href="${b.url}"`)
  })
})
