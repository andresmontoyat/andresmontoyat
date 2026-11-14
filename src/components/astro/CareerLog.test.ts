// @vitest-environment node
//
// src/components/astro/CareerLog.test.ts
// Container API coverage for the career git log: the List view is the server-rendered fallback, so
// every visible job must be in the HTML for both locales, and the terminal ships its strings.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import CareerLog from './CareerLog.astro'
import data from '../../data/experience.json'

const visible = data.entries.filter((e) => e.visible !== false)
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;')

async function render(locale: 'en' | 'es') {
  const container = await AstroContainer.create()
  return container.renderToString(CareerLog, { props: { locale } })
}

describe.each(['en', 'es'] as const)('CareerLog.astro (%s)', (locale) => {
  it('renders the section with id="experience"', async () => {
    expect(await render(locale)).toContain('id="experience"')
  })

  it('renders every visible job in the list with its localized title, date and bullets', async () => {
    const html = await render(locale)
    expect(html.match(/class="cl-job"/g)).toHaveLength(visible.length)
    visible.forEach((e) => {
      expect(html).toContain(`<h3>${esc(e.company)}</h3>`)
      expect(html).toContain(esc(e.title[locale]))
      expect(html).toContain(e.date[locale])
      expect(html).toContain(esc(e.bullets[locale].at(-1)))
    })
  })

  it('leaves hidden entries out', async () => {
    const html = await render(locale)
    data.entries.filter((e) => e.visible === false).forEach((e) => expect(html).not.toContain(`<h3>${e.company}</h3>`))
  })

  it('renders the view switch and one graph row per job', async () => {
    const html = await render(locale)
    expect(html).toMatch(/<button type="button" data-v="term" aria-pressed="true">/)
    expect(html).toMatch(/<button type="button" data-v="list" aria-pressed="false">/)
    expect(html.match(/class="cl-row"/g)).toHaveLength(visible.length)
    expect(html).toContain('HEAD → main')
  })

  it('labels the terminal input and announces output politely', async () => {
    const html = await render(locale)
    expect(html).toContain(`for="cl-cmd-${locale}"`)
    expect(html).toContain(`id="cl-cmd-${locale}"`)
    expect(html).toMatch(/class="cl-out" aria-live="polite"/)
  })

  it('offers download cv among the first suggestions', async () => {
    expect(await render(locale)).toMatch(/<button type="button">download cv<\/button>/)
  })

  it('ships contact data without a phone', async () => {
    const html = await render(locale)
    expect(html).toContain('andresmontoyat@gmail.com')
    expect(html).not.toMatch(/\+57|phone|tel:/i)
  })
})

describe('CareerLog.astro copy', () => {
  it('renders English intro and labels', async () => {
    const html = await render('en')
    expect(html).toContain('My career as a commit history')
    expect(html).toContain('>List<')
  })

  it('renders Spanish intro and labels', async () => {
    const html = await render('es')
    expect(html).toContain('Mi carrera como historial de commits')
    expect(html).toContain('>Lista<')
  })

  it('ships the README with the 18+ years claim per locale', async () => {
    expect(await render('en')).toContain('18+ years')
    expect(await render('es')).toContain('18+ años')
  })

  it('carries the CV link text per locale in the terminal strings', async () => {
    expect(await render('en')).toContain('Download CV ({L}, PDF)')
    expect(await render('es')).toContain('Descargar CV ({L}, PDF)')
  })
})
