// @vitest-environment node
//
// src/components/astro/Hero.test.ts
// Astro Container API coverage-parity spot-check — ports all it-blocks of the
// former src/components/Hero.test.jsx RTL suite against the zero-JS Hero.astro
// (D-01/D-02/D-05/D-06/D-08), plus new count-up/script/dropped-role/photo
// regression guards this phase introduces. Forced to the `node` environment
// per-file (see src/pages/_404.test.ts for the esbuild/jsdom rationale
// established in Phase 21) — renderToString() output is plain HTML text, no
// DOM APIs needed.
import { readFileSync } from 'node:fs'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Hero from './Hero.astro'

async function renderHero(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Hero, { props: { locale } })
}

// Container API's renderToString() rewrites local <script src> references to
// dev-server virtual module URLs (index-based query strings), losing the
// literal filename — so the script-src wiring is asserted against the raw
// component source instead, mirroring Task 1's build-time acceptance greps.
const heroSource = readFileSync(new URL('./Hero.astro', import.meta.url), 'utf-8')

describe('Hero.astro copy (coverage-parity port)', () => {
  it('renders role-forward H1 via aria-label (EN)', async () => {
    const result = await renderHero('en')
    expect(result).toContain('aria-label="Carlos Andrés Montoya — Java Solution Architect &amp; Tech Lead."')
  })

  it('renders role-forward H1 via aria-label (ES)', async () => {
    const result = await renderHero('es')
    expect(result).toContain('aria-label="Carlos Andrés Montoya — Arquitecto de Soluciones Java y Tech Lead."')
  })

  it('renders the punchy lead (EN)', async () => {
    const result = await renderHero('en')
    expect(result).toMatch(/payments, digital identity, telecom/)
  })

  it('renders the punchy lead (ES)', async () => {
    const result = await renderHero('es')
    expect(result).toMatch(/pagos, identidad digital, telecom/)
  })
})

describe('Hero.astro CTAs (coverage-parity port)', () => {
  it('primary CTA links to #contact', async () => {
    const result = await renderHero('en')
    expect(result).toContain('href="#contact"')
  })

  it('CV dropdown is a native <details> and both EN/ES download links are present in the rendered string', async () => {
    const result = await renderHero('en')
    expect(result).toMatch(/<details[^>]*class="details-dismiss/)
    expect(result).toContain('href="/CarlosMontoya_CV_EN.pdf"')
    expect(result).toContain('href="/CarlosMontoya_CV_ES.pdf"')
    expect(result).toMatch(/href="\/CarlosMontoya_CV_EN\.pdf"[^>]*download/)
    expect(result).toMatch(/href="\/CarlosMontoya_CV_ES\.pdf"[^>]*download/)
  })

  it('renders accessible LinkedIn + GitHub links', async () => {
    const result = await renderHero('en')
    expect(result).toContain('href="https://www.linkedin.com/in/carlos-andres-montoya-tobon-8b508033"')
    expect(result).toContain('href="https://github.com/andresmontoyat"')
    expect(result).toContain('aria-label="LinkedIn profile"')
    expect(result).toContain('aria-label="GitHub profile"')
    expect(result).toMatch(/href="https:\/\/www\.linkedin\.com\/in\/carlos-andres-montoya-tobon-8b508033"[^>]*rel="noopener noreferrer"/)
    expect(result).toMatch(/href="https:\/\/github\.com\/andresmontoyat"[^>]*rel="noopener noreferrer"/)
    expect(result).toMatch(/href="https:\/\/www\.linkedin\.com\/in\/carlos-andres-montoya-tobon-8b508033"[^>]*target="_blank"/)
    expect(result).toMatch(/href="https:\/\/github\.com\/andresmontoyat"[^>]*target="_blank"/)
  })

  it('no longer renders the old .docx download links', async () => {
    const result = await renderHero('en')
    expect(result).not.toMatch(/href="[^"]*\.docx"/)
  })
})

describe('Hero.astro photo layer (LCP element, D-08)', () => {
  it('renders the portrait with descriptive alt text, with no duplicate-DOM #hero-static element', async () => {
    const result = await renderHero('en')
    expect(result).toContain('src="/me-800.webp"')
    expect(result).toContain('alt="Carlos Andrés Montoya at Los Glaciares National Park"')
    expect(result).toContain('Carlos Andrés Montoya')
    expect(result).not.toContain('hero-static')
  })
})

describe('Hero.astro count-up stats (D-02, new this phase)', () => {
  it('all 3 numeric stat spans carry data-count-up + data-count-up-template attributes', async () => {
    const result = await renderHero('en')
    expect(result.match(/data-count-up="/g)?.length).toBe(3)
    expect(result.match(/data-count-up-template="/g)?.length).toBe(3)
  })

  it('renders the settled stat values as zero-JS fallback text', async () => {
    const result = await renderHero('en')
    expect(result).toContain('>18+<')
    expect(result).toContain('>45+<')
    expect(result).toContain('AWS · GCP · Azure')
    expect(result).toContain('>8<')
  })
})

describe('Hero.astro shared script wiring (D-02/D-06, new this phase)', () => {
  it('source references count-up.js and details-dismiss.js exactly once each, never is:inline', () => {
    expect(heroSource.match(/scripts\/count-up\.js/g)?.length).toBe(1)
    expect(heroSource.match(/scripts\/details-dismiss\.js/g)?.length).toBe(1)
    expect(heroSource).not.toContain('is:inline')
  })

  it('renders exactly 2 deferred module scripts (Astro-bundled, not is:inline)', async () => {
    const result = await renderHero('en')
    expect(result.match(/<script type="module"[^>]*><\/script>/g)?.length).toBe(2)
  })
})

describe('Hero.astro dropped ARIA roles (D-05 regression guard, new this phase)', () => {
  it('never renders role="menu" or role="menuitem"', async () => {
    const result = await renderHero('en')
    expect(result).not.toContain('role="menu"')
    expect(result).not.toContain('role="menuitem"')
  })
})
