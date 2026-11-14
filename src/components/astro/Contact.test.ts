// @vitest-environment node
//
// src/components/astro/Contact.test.ts
// Astro Container API test for Contact.astro — closes the TEST-01 coverage gap
// left when the legacy RTL Contact.test.jsx was removed in Phase 27-01 (its
// subject, src/components/Contact.jsx, was deleted). Forced to the `node`
// environment per-file (same esbuild/jsdom rationale as About/Footer tests).
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import data from '../../data/contact.json'
import Contact from './Contact.astro'

async function renderContact(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Contact, { props: { locale } })
}

const hero = data.cards.find((c) => c.primary)
const rail = data.cards.filter((c) => !c.primary)

describe('Contact.astro (Container API)', () => {
  it('renders the contact section landmark with the label + heading', async () => {
    const result = await renderContact('en')
    expect(result).toMatch(/<section[^>]+id="contact"/)
    expect(result).toContain(data.label.en)
  })

  it('renders the primary email card with href and no overriding aria-label', async () => {
    const result = await renderContact('en')
    expect(result).toContain('data-role="primary"')
    expect(result).toContain(`href="${hero.href}"`)
    expect(result).not.toContain(`aria-label="${data.cards.find((c) => c.primary).kLabel.en}: ${hero.value}"`)
  })

  it('renders every non-primary card as a rail item', async () => {
    const result = await renderContact('en')
    const railCount = (result.match(/data-role="rail"/g) || []).length
    expect(railCount).toBe(rail.length)
  })

  it('marks external links with target=_blank and rel=noopener noreferrer', async () => {
    const result = await renderContact('en')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('renders the EN reach-out CTA on the primary card', async () => {
    const result = await renderContact('en')
    expect(result).toContain('Reach out')
  })

  it('renders Spanish copy when locale is es', async () => {
    const result = await renderContact('es')
    expect(result).toContain(data.label.es)
    expect(result).toContain('Escríbeme')
  })
})
