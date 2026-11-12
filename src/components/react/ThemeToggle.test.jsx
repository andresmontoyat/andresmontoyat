import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'
import translations from '../../i18n/translations'

const t = translations.en
const STORAGE_KEY = 'cam-theme'

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark'
  window.localStorage.clear()
})

describe('ThemeToggle', () => {
  it('should render the dark-theme markup first when a light theme is stored, so hydration matches the server', () => {
    document.documentElement.dataset.theme = 'light'
    window.localStorage.setItem(STORAGE_KEY, 'light')

    const html = renderToString(<ThemeToggle t={t} />)

    expect(html).toContain(t.nav.themeLight)
  })

  it('should show the stored light theme once mounted without overwriting it', () => {
    document.documentElement.dataset.theme = 'light'
    window.localStorage.setItem(STORAGE_KEY, 'light')

    render(<ThemeToggle t={t} />)

    expect(screen.getByRole('button', { name: t.nav.themeDark })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('should switch to light and persist it when clicked from dark', () => {
    render(<ThemeToggle t={t} />)

    fireEvent.click(screen.getByRole('button', { name: t.nav.themeLight }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light')
  })
})
