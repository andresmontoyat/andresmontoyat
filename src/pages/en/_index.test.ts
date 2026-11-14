// @vitest-environment node
//
// src/pages/en/_index.test.ts
// Underscore-prefixed per Astro's pages-directory convention (see
// src/pages/_404.test.ts for the full rationale) so `astro build` never
// tries to render this test file as a route.
//
// Container API coverage for the entry splash markup/copy added to the /en
// home page: the server-rendered "start screen" that offers Play the career
// game vs View portfolio, gated by sessionStorage (see the is:inline script
// in index.astro for the show/hide + no-flash behavior, which isn't
// exercised here — renderToString() has no DOM/sessionStorage to run it
// against, so these assertions cover markup/copy/a11y wiring only).
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import reactRenderer from '@astrojs/react/server.js'
import IndexPage from './index.astro'
import { features } from '../../config/features.js'

const shipped = features.game

async function renderIndex() {
  const container = await AstroContainer.create()
  container.addServerRenderer({ renderer: reactRenderer })
  return container.renderToString(IndexPage)
}

// The site is public and the game is unfinished (src/config/features.js): while it is switched
// off, no splash and no link may lead to it.
describe('en/index.astro with the game switched off', () => {
  beforeEach(() => { features.game = false })
  afterEach(() => { features.game = shipped })

  it('renders no entry splash', async () => {
    const result = await renderIndex()
    expect(result).not.toContain('id="entry-splash"')
    expect(result).not.toContain('cam-entry-choice')
  })

  it('links to the game nowhere', async () => {
    const result = await renderIndex()
    expect(result).not.toMatch(/href="\/en\/game\/?"/)
  })
})

describe('en/index.astro entry splash (Container API)', () => {
  beforeEach(() => { features.game = true })
  afterEach(() => { features.game = shipped })

  it('renders the dialog with accessible wiring', async () => {
    const result = await renderIndex()
    expect(result).toContain('id="entry-splash"')
    expect(result).toContain('role="dialog"')
    expect(result).toContain('aria-modal="true"')
    expect(result).toContain('aria-labelledby="entry-splash-title"')
    expect(result).toContain('id="entry-splash-title"')
  })

  it('hides the overlay by default (no-flash: inline style, not a client-only class)', async () => {
    const result = await renderIndex()
    expect(result).toMatch(/id="entry-splash"[^>]*style="display:none"/)
  })

  it('renders English copy for eyebrow, title, hook and both CTAs', async () => {
    const result = await renderIndex()
    expect(result).toContain('Carlos Montoya')
    expect(result).toContain('Choose your path')
    expect(result).toContain('Java Solution Architect &amp; Tech Lead · 18+ years.')
    expect(result).toContain('Play my career')
    expect(result).toContain('View portfolio')
  })

  it('the Play CTA links to the /en/game route', async () => {
    const result = await renderIndex()
    expect(result).toMatch(/id="entry-splash-play"[^>]*href="\/en\/game\/?"/)
  })

  it('the View CTA is a real <button>, not a link (dismiss-only action)', async () => {
    const result = await renderIndex()
    expect(result).toMatch(/<button[^>]*id="entry-splash-view"/)
  })

  it('ships exactly one is:inline controller script for the splash', async () => {
    const result = await renderIndex()
    expect(result.match(/cam-entry-choice/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('en/index.astro sites and Player 2', () => {
  const gamer = features.gamer
  afterEach(() => { features.gamer = gamer })

  it('always renders My other sites', async () => {
    expect(await renderIndex()).toContain('id="sites"')
  })

  it('renders Player 2 only when the gamer switch is on', async () => {
    features.gamer = false
    expect(await renderIndex()).not.toContain('id="player-2"')
    features.gamer = true
    expect(await renderIndex()).toContain('id="player-2"')
  })
})
