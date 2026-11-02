import { describe, it, expect } from 'vitest'
import {
  startFade, stepFade, fadeIn, fadeAlpha, FADE_LENGTH,
} from './fade.js'

const FRAME = 1.6
const frames = (fade, n) => Array.from({ length: n }).reduce(f => stepFade(f, FRAME), fade)

describe('fade', () => {
  it('lasts about 250 ms each way: 15 frames at 60 fps', () => {
    expect(FADE_LENGTH / FRAME).toBe(15)
  })
  it('darkens from clear to black on the way out', () => {
    const f = startFade()
    expect(fadeAlpha(f)).toBe(0)
    expect(fadeAlpha(frames(f, 7))).toBeCloseTo(7 / 15)
    expect(frames(f, 15)).toEqual({ phase: 'hold', t: 1 })
  })
  it('holds black for as long as the switch takes', () => {
    expect(frames(startFade(), 200)).toEqual({ phase: 'hold', t: 1 })
  })
  it('clears on the way back in, then is gone', () => {
    const f = fadeIn()
    expect(fadeAlpha(f)).toBe(1)
    expect(fadeAlpha(frames(f, 5))).toBeCloseTo(10 / 15)
    expect(frames(f, 15)).toBe(null)
  })
  it('is clear when there is no fade', () => {
    expect(fadeAlpha(null)).toBe(0)
    expect(stepFade(null, FRAME)).toBe(null)
  })
})
