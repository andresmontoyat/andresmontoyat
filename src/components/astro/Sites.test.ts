// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Sites from './Sites.astro'
import data from '../../data/sites.json'

async function render(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Sites, { props: { locale } })
}

describe('Sites.astro', () => {
  it('renders the block with id="sites" and its EN heading', async () => {
    const html = await render('en')
    expect(html).toContain('id="sites"')
    expect(html).toContain('My other sites')
  })

  it('links every site in a new tab without leaking the opener', async () => {
    const html = await render('en')
    for (const site of data.sites) expect(html).toContain(`href="${site.url}"`)
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(data.sites.length)
  })

  it('renders the Spanish copy', async () => {
    const html = await render('es')
    expect(html).toContain('Mis otros sitios')
    expect(html).toContain('Notas de arquitectura')
    expect(html).toContain('Mis Guidelines')
  })
})

describe('Sites inside About', () => {
  it('renders as part of the About section', async () => {
    const { default: About } = await import('./About.astro')
    const container = await AstroContainer.create()
    const html = await container.renderToString(About, { props: { locale: 'es' } })
    expect(html.indexOf('id="sites"')).toBeGreaterThan(html.indexOf('id="about"'))
    expect(html).toContain('Mis otros sitios')
  })
})
