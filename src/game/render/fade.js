// The short fade a door plays (docs/superpowers/specs/2026-11-02-interiors-design.md): the screen
// goes dark on the press, stays dark while the room loads, and clears once the scene has switched,
// so the cut between worlds happens under black. `t` is how dark it is, 0 clear to 1 black.
//
// Measured in the same units update() advances the clock by (1.6 a frame at 60 fps): 24 is 15
// frames, about 250 ms.
export const FADE_LENGTH = 24

export const startFade = () => ({ phase: 'out', t: 0 })

export const fadeIn = () => ({ phase: 'in', t: 1 })

// Fifteen steps of 1/15 do not sum to exactly 1 in floating point; the slack keeps it 15 frames.
const EPSILON = 1e-9

export function stepFade(fade, dt) {
  if (!fade || fade.phase === 'hold') return fade
  const step = dt / FADE_LENGTH
  if (fade.phase === 'out') {
    const t = fade.t + step
    return t >= 1 - EPSILON ? { phase: 'hold', t: 1 } : { phase: 'out', t }
  }
  const t = fade.t - step
  return t <= EPSILON ? null : { phase: 'in', t }
}

export const fadeAlpha = fade => (fade ? fade.t : 0)
