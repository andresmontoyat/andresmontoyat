import React from 'react'
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Nav from './Nav'

// Deterministic active-section highlight: real scroll-spy relies on a live
// IntersectionObserver + DOM layout that jsdom cannot provide meaningfully,
// so the hook is mocked to a fixed id (see 22-PATTERNS.md open question —
// resolved via stub + hook mock, not a real polyfill).
vi.mock('../../hooks/useActiveSection', () => ({ default: () => 'about' }))

function renderNav(locale = 'en') {
  return render(<Nav locale={locale} hrefEn="/en/" hrefEs="/es/" hrefGame={`/${locale}/game`} />)
}

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark'
  try {
    document.cookie = 'cam-lang=; path=/; max-age=0'
  } catch (e) {
    // cookie clear not supported — ignore
  }
})

describe('Nav island (Phase 22 Plan 1)', () => {
  it('renders the primary nav links (EN)', () => {
    renderNav('en')
    expect(screen.getAllByText('About').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Experience').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
  })

  it('translates the primary nav links (ES)', () => {
    renderNav('es')
    expect(screen.getAllByText('Sobre mí').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Experiencia').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Proyectos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Contacto').length).toBeGreaterThan(0)
  })

  it('renders LangPill anchors with locale-correct hrefs and aria-current on the active locale', () => {
    renderNav('en')
    const groups = screen.getAllByRole('group', { name: 'Language' })
    expect(groups.length).toBeGreaterThan(0)
    const group = groups[0]
    const enAnchor = screen.getAllByRole('link', { name: 'Switch to English' })[0]
    const esAnchor = screen.getAllByRole('link', { name: 'Switch to Spanish' })[0]
    expect(group).toContainElement(enAnchor)
    expect(esAnchor.getAttribute('href')).toMatch(/^\/es\//)
    expect(enAnchor.getAttribute('aria-current')).toBe('true')
    expect(esAnchor.getAttribute('aria-current')).toBeNull()
  })

  it('applies the active-section highlight to the About link when useActiveSection returns "about"', () => {
    renderNav('en')
    const aboutLink = screen.getAllByText('About')[0]
    expect(aboutLink.className).toMatch(/border-brand/)
  })

  it('flips the theme dataset when the theme toggle is clicked', () => {
    renderNav('en')
    const toggle = screen.getAllByRole('button', { name: 'Switch to light mode' })[0]
    expect(document.documentElement.dataset.theme).toBe('dark')
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('writes the cam-lang cookie when the ES LangPill anchor is clicked', () => {
    renderNav('en')
    const esAnchor = screen.getAllByRole('link', { name: 'Switch to Spanish' })[0]
    fireEvent.click(esAnchor)
    expect(document.cookie).toContain('cam-lang=es')
  })

  it('renders the Career World route link pointing at hrefGame', () => {
    renderNav('en')
    const links = screen.getAllByText(/Career World/)
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].closest('a').getAttribute('href')).toBe('/en/game')
  })
})
