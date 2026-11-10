import { describe, it, expect } from 'vitest'
import { followCamera2D, shake2D } from './camera2d.js'

describe('followCamera2D', () => {
  it('eases toward the centered target', () => {
    const cam = { x: 0, y: 0 }
    followCamera2D(cam, 500, 500, 940, 560, 2000, 2000, 0.5)
    expect(cam.x).toBeCloseTo((500 - 470) * 0.5, 3)
    expect(cam.y).toBeCloseTo((500 - 280) * 0.5, 3)
  })
  it('clamps to world bounds', () => {
    const cam = { x: 0, y: 0 }
    followCamera2D(cam, 0, 0, 940, 560, 2000, 2000, 1)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })
  it('centres a world smaller than the viewport and keeps it there', () => {
    const cam = { x: 0, y: 0 }
    followCamera2D(cam, 100, 100, 1024, 768, 640, 480)
    followCamera2D(cam, 500, 400, 1024, 768, 640, 480)
    expect(cam).toEqual({ x: -192, y: -144 })
  })
})

describe('shake2D', () => {
  it('returns zero when magnitude is zero', () => {
    expect(shake2D(0)).toEqual({ x: 0, y: 0 })
  })
  it('scales by magnitude', () => {
    const s = shake2D(4, () => 1)
    expect(s.x).toBe(4)
  })
})
