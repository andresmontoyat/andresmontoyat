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

  it('renders both social links with href + aria-label + an icon instead of abbreviated text', async () => {
    const result = await renderFooter('en')
    expect(result).toContain('href="https://github.com/andresmontoyat"')
    expect(result).toContain('aria-label="GitHub"')
    expect(result).toContain('href="https://www.linkedin.com/in/carlos-andres-montoya-tobon-8b508033/"')
    expect(result).toContain('aria-label="LinkedIn"')
    expect(result).not.toContain('>git<')
    expect(result.match(/<svg/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('links the blog with an accessible label', async () => {
    const result = await renderFooter('es')
    expect(result).toContain('href="https://blog.andresmontoyat.dev/"')
    expect(result).toContain('aria-label="Blog"')
  })

  it('renders name, location and email, with no section navigation of its own', async () => {
    const result = await renderFooter('es')
    expect(result).toContain('Carlos Andrés Montoya Tobón · Bogotá')
    expect(result).toContain('href="mailto:andresmontoyat@gmail.com"')
    expect(result).not.toMatch(/href="#(about|projects|contact)"/)
    expect(result.match(/href="#hero"/g)).toHaveLength(1)
  })

  it('renders the current year in the copyright line', async () => {
    const result = await renderFooter('en')
    expect(result).toContain(String(new Date().getFullYear()))
  })
})
