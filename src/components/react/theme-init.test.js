import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const script = readFileSync('public/js/theme-init.js', 'utf8')

function stubScheme(scheme) {
  window.matchMedia = vi.fn((q) => ({ matches: q.includes('light') && scheme === 'light' }))
}

function runInit() {
  document.documentElement.removeAttribute('data-theme')
  new Function(script)()
  return document.documentElement.dataset.theme
}

beforeEach(() => {
  window.localStorage.clear()
  stubScheme('dark')
})

describe('theme-init.js', () => {
  it('should follow a light system scheme when nothing is stored', () => {
    stubScheme('light')
    expect(runInit()).toBe('light')
  })

  it('should follow a dark system scheme when nothing is stored', () => {
    expect(runInit()).toBe('dark')
  })

  it('should let a stored choice win over the system scheme', () => {
    stubScheme('light')
    window.localStorage.setItem('cam-theme', 'dark')
    expect(runInit()).toBe('dark')
  })

  it('should ignore an invalid stored value and use the system scheme', () => {
    stubScheme('light')
    window.localStorage.setItem('cam-theme', 'purple')
    expect(runInit()).toBe('light')
  })

  it('should fall back to dark when matchMedia is unavailable', () => {
    window.matchMedia = undefined
    expect(runInit()).toBe('dark')
  })

  it('should not store anything itself', () => {
    stubScheme('light')
    runInit()
    expect(window.localStorage.getItem('cam-theme')).toBeNull()
  })
})
