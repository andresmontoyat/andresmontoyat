import React, { useEffect, useState } from 'react'

const STORAGE_KEY = 'cam-theme'
const VALID_THEMES = ['dark', 'light']
const DEFAULT_THEME = 'dark'

function readDocumentTheme() {
  const current = document.documentElement.dataset.theme
  if (current && VALID_THEMES.includes(current)) return current
  return DEFAULT_THEME
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function ThemeToggle({ t }) {
  // null until mounted: the first client render must match the server's dark
  // markup, and the persist effect must not overwrite the stored theme.
  const [theme, setTheme] = useState(null)

  useEffect(() => {
    setTheme(readDocumentTheme())
  }, [])

  useEffect(() => {
    if (theme === null) return
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch (e) {
      // localStorage blocked (private mode, etc) — ignore
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const isDark = theme !== 'light'
  const label = isDark ? t.nav.themeLight : t.nav.themeDark

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-muted hover:text-brand focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand motion-safe:transition-colors duration-200"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
