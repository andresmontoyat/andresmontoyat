import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WorldRpg, { sizeCanvasBuffer } from './WorldRpg'

// The real game module (src/game/worldRpg.js) calls canvas.getContext('2d') during start(), and
// src/test/setup.jsx globally stubs HTMLCanvasElement.prototype.getContext to return null — a
// null ctx would crash inside render2d's fillRect calls. This test only needs to verify the
// island's own contract — cover button, lazy mount, canvas + touch controls appear — not the
// game engine's rendering, so the dynamic import target is mocked (same approach as
// CareerGame.test.jsx for src/game/careerGame.js).
vi.mock('../../game/worldRpg.js', () => ({
  createWorldRpg: vi.fn(() => ({
    state: {
      intro: { skip: vi.fn(), done: vi.fn(() => true) },
      input: { press: vi.fn() },
    },
    start: vi.fn(),
    stop: vi.fn(),
    interact: vi.fn(),
    reveal: vi.fn(),
    toggleMute: vi.fn(),
    activeSites: vi.fn(() => []),
  })),
  canControl: vi.fn(() => true),
}))

vi.mock('../../data/experience.json', () => ({
  default: { entries: [] },
}))

describe('WorldRpg island', () => {
  it('shows a play cover and does not load the game until clicked', () => {
    render(<WorldRpg locale="en" />)
    expect(screen.getByRole('button', { name: /explore my career world/i })).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('mounts a canvas after pressing play', async () => {
    render(<WorldRpg locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /explore my career world/i }))
    await screen.findByTestId('world-rpg-canvas')
    expect(document.querySelector('canvas')).not.toBeNull()
  })

  it('renders the Spanish cover copy for the es locale', () => {
    render(<WorldRpg locale="es" />)
    expect(screen.getByRole('button', { name: /explora mi mundo de carrera/i })).toBeInTheDocument()
  })

  it('mounts a mute toggle once started', async () => {
    render(<WorldRpg locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: /explore my career world/i }))
    await screen.findByTestId('world-rpg-canvas')
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
  })
})

// The D-pad and A are laid over the bottom of the canvas on a phone. The island measures how much of
// the canvas they cover, so the game can keep its dialog clear of them (scene2d.js dialogRect).
describe('sizeCanvasBuffer', () => {
  const rectOf = r => ({ getBoundingClientRect: () => r })
  const canvasAt = rect => ({ ...rectOf(rect), getContext: () => null })

  it('stamps the strip the touch controls cover as safeBottom', () => {
    const canvas = canvasAt({ top: 100, bottom: 572, width: 336, height: 472 })
    sizeCanvasBuffer(canvas, rectOf({ top: 444, bottom: 556, width: 304, height: 112 }))
    expect(canvas.safeBottom).toBe(128)
  })

  it('stamps 0 when the controls are hidden (desktop) or absent', () => {
    const canvas = canvasAt({ top: 100, bottom: 620, width: 900, height: 520 })
    sizeCanvasBuffer(canvas, rectOf({ top: 0, bottom: 0, width: 0, height: 0 }))
    expect(canvas.safeBottom).toBe(0)
    sizeCanvasBuffer(canvas, null)
    expect(canvas.safeBottom).toBe(0)
  })
})
