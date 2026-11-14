// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Player2 from './Player2.astro'
import data from '../../data/gamer.json'

async function render(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Player2, { props: { locale } })
}

describe('Player2.astro', () => {
  it('renders the section with id="player-2" and the main game', async () => {
    const html = await render('en')
    expect(html).toContain('id="player-2"')
    expect(html).toContain('Main game')
    expect(html).toContain(data.main.title)
  })

  it('shows one card per console with its handle and five games', async () => {
    const html = await render('en')
    expect(html.match(/<article/g)).toHaveLength(data.consoles.length)
    for (const c of data.consoles) {
      expect(html).toContain(c.handle)
      expect(c.games).toHaveLength(5)
      for (const g of c.games) expect(html).toContain(g)
    }
  })

  it('marks the main game in the console list it belongs to', async () => {
    const html = await render('en')
    expect(html.match(/data-main="true"/g)).toHaveLength(1)
  })

  it('renders the Spanish copy', async () => {
    const html = await render('es')
    expect(html).toContain('Cuando no estoy en el IDE')
    expect(html).toContain('Código de amigo')
  })
})
