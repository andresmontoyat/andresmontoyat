// @vitest-environment node
//
// src/components/astro/Footer.test.ts
// Astro Container API test with fresh assertions authored from Footer.jsx
// source (no RTL baseline exists — see 23-02-PLAN.md interfaces note).
// Forced to the `node` environment per-file (see src/pages/_404.test.ts /
// About.test.ts for the esbuild/jsdom rationale established in Phase 21) —
// renderToString() output is plain HTML text, no DOM APIs needed.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Footer from './Footer.astro'

async function renderFooter(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Footer, { props: { locale } })
}

describe('Footer.astro (fresh Container API assertions — D-02/D-03)', () => {
  it('renders the footer landmark with the brand link', async () => {
    const result = await renderFooter('en')
    expect(result).toMatch(/<footer/)
    expect(result).toContain('href="#hero"')
    expect(result).toContain('camt')
  })

  it('renders both social links with href + aria-label + visible label text', async () => {
    const result = await renderFooter('en')
    expect(result).toContain('href="https://github.com/andresmontoyat"')
    expect(result).toContain('aria-label="GitHub"')
    expect(result).toContain('href="https://www.linkedin.com/in/carlos-andres-montoya-tobon-8b508033/"')
    expect(result).toContain('aria-label="LinkedIn"')
    expect(result).toContain('>git<')
    expect(result).toContain('>in<')
  })

  it('renders EN tagline + rights copy', async () => {
    const result = await renderFooter('en')
    expect(result).toContain("I write code. Let&#39;s build something amazing together.")
    expect(result).toContain('All rights reserved')
  })

  it('renders ES tagline + rights copy', async () => {
    const result = await renderFooter('es')
    expect(result).toContain('Escribo código. Construyamos algo increíble juntos.')
    expect(result).toContain('Todos los derechos reservados')
  })

  it('renders the current year in the copyright line', async () => {
    const result = await renderFooter('en')
    expect(result).toContain(String(new Date().getFullYear()))
  })
})
