---
phase: 17-webgl-desktop-renderer-lighthouse-gate
written: 2026-06-03
mode: inline (3 prior subagent dispatches dropped on API socket timeouts; written inline by orchestrator after reading all canonical refs + Phase 15/16 source)
researcher_model: opus (inline)
---

# Phase 17 Research: WebGL Desktop Renderer & Lighthouse Gate

## Executive Summary

- **Zero new dependencies beyond `three`.** `react-three-fiber`, `force-graph`, `react-error-boundary`, `detect-gpu` all rejected (CONTEXT). `three` tree-shaken via named imports targets ~40 kB gz lazy chunk.
- **Two assets already exist in GameMode.js — Phase 17 promotes, not creates.** `ConstellationErrorBoundary` class component (lines 46–67) + `detectCapabilities()` function (lines 29–44). Phase 17 lifts these into `src/game/RendererErrorBoundary.js` + `src/game/useRendererCapability.js` and extends both for the WebGL branch + reactive matchMedia listener.
- **Critical test-infra gotcha:** `src/test/setup.js:10` stubs `HTMLCanvasElement.prototype.getContext = () => null` globally. Capability-hook tests asserting WebGL detection MUST override this stub per-test. Use `vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(/* fake WebGL ctx */)`.
- **Vite 6 + React.lazy default behavior already produces separate chunk per lazy import.** GameMode chunk = 8.82 kB gz (Phase 16 verified). Phase 17 lazy `WebGLConstellation` chunk goes to `dist/assets/WebGLConstellation-*.js`. Bundle CI gate must verify (a) `GameMode-*.js` gz ≤ 38.82 kB, (b) no `THREE.` symbol in `GameMode-*.js`, (c) `WebGLConstellation-*.js` exists as a separate file.
- **Most-at-risk Lighthouse metric for v3.8 close: TBT (Total Blocking Time).** Mobile bundle visually unchanged from Phase 16 — Perf score swing comes from JS parse cost of any new mobile import, not from rendering. If the bundle CI gate passes (three.js absent from mobile chunk), TBT should be ≤ Phase 16 measurement.

---

## 1. three.js tree-shaken named imports (Vite 6)

**Findings:**
- Vite 6 + rollup default tree-shaker prunes unused three.js modules on `import { X } from 'three'`. ESM-only path.
- Required imports for Phase 17 contract (from UI-SPEC + CONTEXT):
  ```js
  import {
    Scene,
    OrthographicCamera,
    WebGLRenderer,
    BufferGeometry,
    BufferAttribute,
    ShaderMaterial,
    Points,
    LineSegments,
    LineBasicMaterial,
    Color,
    AdditiveBlending,
  } from 'three'
  ```
- `OrthographicCamera` (not Perspective) — flat 2D-in-3D scene, z=0 for all nodes.
- `AdditiveBlending` for halo render pass.
- Approximate gz contribution: ~35–45 kB based on three.js r158+ ESM module map. Bundle gate measures actual.

**Recommendation:** named imports above. Planner verifies actual gz via `npm run build` post-Slice 2 and again post-Slice 4. If > 50 kB gz lazy chunk, planner trims (e.g., drop `AdditiveBlending` if halo can be done with `NormalBlending` + alpha).

**References:** three.js docs §"Installation > Building" (ESM tree-shaking section). Vite 6 `optimizeDeps` already configured in repo.

---

## 2. Custom GLSL ShaderMaterial — Points + LineSegments (≤80 LOC total)

**Findings:**
- 26 nodes rendered as `Points` with custom shader = single draw call.
- Per-vertex `BufferAttribute`s: `size` (float), `color` (vec3), `glow` (float 0–1), `halo` (float 0–1), `dim` (float 0–1).
- Halo done in fragment via smoothstep ring at `radius * 1.0 → radius * 1.5`. Two-pass would require second draw; UI-SPEC accepts single-pass with smoothstep approximation.

**Code sketch (vertex + fragment, ~50 LOC):**
```glsl
// vertex shader (~20 LOC)
attribute float size;
attribute vec3 color;
attribute float glow;
attribute float halo;
attribute float dim;
varying vec3 vColor;
varying float vGlow;
varying float vHalo;
varying float vDim;
uniform float uDpr;
uniform float uHaloPulse; // ambient pulse 1.0..1.15 driven by uniform
void main() {
  vColor = color;
  vGlow = glow;
  vHalo = halo;
  vDim = dim;
  gl_PointSize = size * uDpr * (1.0 + (uHaloPulse - 1.0) * halo);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```
```glsl
// fragment shader (~25 LOC)
varying vec3 vColor;
varying float vGlow;
varying float vHalo;
varying float vDim;
uniform vec3 uHaloColor;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float r = length(uv);
  float core = 1.0 - smoothstep(0.45, 0.5, r);
  float haloRing = smoothstep(0.45, 0.5, r) - smoothstep(0.5, 0.7, r);
  vec3 col = mix(vColor, uHaloColor, vHalo * haloRing);
  float alpha = (core + haloRing * vHalo * 0.6 + vGlow * (1.0 - core) * 0.3) * vDim;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
```
- `LineSegments` uses stock `LineBasicMaterial` (no shader) for v1; weight-1 reveal driven by per-vertex `color` alpha (set 0 when not active, 1 when revealed). Total LineSegments = single geometry, indices grouped by weight.

**Recommendation:** ship this minimal shader Slice 2. Defer `LineBasicMaterial` → custom-shader migration unless weight-1 reveal needs animation.

---

## 3. React 17 ErrorBoundary + Suspense + React.lazy

**Findings:**
- `ConstellationErrorBoundary` (GameMode.js:46–67) already exists. Phase 17 extracts to `src/game/RendererErrorBoundary.js` (rename for clarity, same shape).
- Class component pattern works with both fetch errors (React.lazy chunk failed) and render-phase errors (shader compile threw).
- ErrorBoundary state is sticky once tripped — only resets on prop change OR page reload.

**Code sketch:**
```js
// src/game/RendererErrorBoundary.js
import React from 'react'

export default class RendererErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[renderer-fallback]', error, info)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

GameMode integration:
```js
const WebGLConstellation = React.lazy(() => import('./renderers/WebGLConstellation'))

// inside render:
{capability === 'webgl' ? (
  <RendererErrorBoundary fallback={<SvgConstellation {...rendererProps} />}>
    <Suspense fallback={<SvgConstellation {...rendererProps} />}>
      <WebGLConstellation {...rendererProps} />
    </Suspense>
  </RendererErrorBoundary>
) : (
  <SvgConstellation {...rendererProps} />
)}
```

**Recommendation:** extract verbatim from GameMode.js. No new dep. Reset semantics: do NOT auto-reset — page reload is the only escape from fallback (acceptable; recruiter won't notice).

---

## 4. WebGL context-loss handling

**Findings:**
- `webglcontextlost` event fires on GPU process kill, tab backgrounding (rare), driver reset.
- Two options: (a) re-create scene on `webglcontextrestored`, (b) trigger ErrorBoundary swap to SVG.
- Option (b) is simpler — no scene-restore code, no resource leak risk. UI-SPEC accepts silent fallback.

**Recommendation:** option (b). Inside WebGLConstellation useEffect, attach:
```js
const canvas = rendererRef.current?.domElement
canvas?.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  throw new Error('webgl_context_lost')
}, { once: true })
```
Throw inside React event handler → caught by RendererErrorBoundary → SVG fallback mounts.

---

## 5. Vitest WebGL test strategy

**Findings:**
- jsdom has no native WebGL.
- `src/test/setup.js:10` globally stubs `HTMLCanvasElement.prototype.getContext = () => null`. This is fine for SVG-only tests but BREAKS any capability-detection test that asserts WebGL is detected.
- Two strategies:
  - **`vitest-canvas-mock`** (~2 kB dev) — provides full canvas 2D + WebGL stub. Drops in via `setupFiles`. Pro: zero config. Con: stubs ALL tests; need to selectively re-stub for WebGL-negative cases.
  - **Per-test spy + manual fake WebGL ctx** — `vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ /* minimal WebGL ctx surface */ })`. Pro: precise, no new dep. Con: ~30 LOC of fake-context boilerplate per test.

**Recommendation:** per-test spy. No new dep. Test surface needed:
- `useRendererCapability` unit tests: spy `getContext` to return either `null` (WebGL absent) OR `{}` truthy (WebGL present). Hook only checks non-null.
- `WebGLConstellation` component test: smoke-test that it mounts without throwing. Stub `WebGLRenderer` constructor via `vi.mock('three', async () => ({ ...actual, WebGLRenderer: vi.fn(() => ({ setSize: vi.fn(), render: vi.fn(), domElement: document.createElement('canvas'), dispose: vi.fn() })) }))`.
- Shader compile not testable in jsdom — defer to manual UAT.

**Code sketch for capability-hook test:**
```js
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import useRendererCapability from './useRendererCapability'

describe('useRendererCapability', () => {
  let getContextSpy
  beforeEach(() => {
    getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
  })
  afterEach(() => getContextSpy.mockRestore())

  it('returns webgl when all gates pass and WebGL is supported', () => {
    getContextSpy.mockReturnValue({})  // truthy = WebGL present
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: q.includes('min-width') ? true : false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useRendererCapability())
    expect(result.current).toBe('webgl')
  })
})
```

---

## 6. matchMedia + capability hook pattern (React 17)

**Findings:**
- Repo already has `usePrefersReducedMotion` (SvgConstellation.js:32–59) — SSR-guarded, addEventListener/addListener compat shim. Copy pattern.
- `navigator.connection?.saveData` and `.effectiveType` available in Chromium/Firefox; Safari returns undefined. Feature-detect with optional chaining.
- `URLSearchParams` read once on init (no listener needed — override is set at page load).

**Code sketch:**
```js
// src/game/useRendererCapability.js
import { useState, useEffect } from 'react'

const isServer = typeof window === 'undefined'

function detect() {
  if (isServer) return 'svg'

  // URL override (highest priority)
  const params = new URLSearchParams(window.location.search)
  const override = params.get('renderer')
  if (override === 'svg' || override === 'webgl') return override

  // Capability gates (all must pass for webgl)
  const viewportOK = window.matchMedia('(min-width: 1024px)').matches
  const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const conn = navigator.connection
  const saveDataOK = !(conn?.saveData === true)
  const networkOK = !['2g', 'slow-2g'].includes(conn?.effectiveType ?? '')

  if (!viewportOK || !motionOK || !saveDataOK || !networkOK) return 'svg'

  // WebGL feature detect (last — cheapest after other gates)
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') || c.getContext('webgl')
    return ctx ? 'webgl' : 'svg'
  } catch {
    return 'svg'
  }
}

export default function useRendererCapability() {
  const [cap, setCap] = useState(detect)

  useEffect(() => {
    if (isServer) return undefined
    const viewport = window.matchMedia('(min-width: 1024px)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setCap(detect())

    const attach = (mql) => mql.addEventListener
      ? mql.addEventListener('change', handler)
      : mql.addListener(handler)
    const detach = (mql) => mql.removeEventListener
      ? mql.removeEventListener('change', handler)
      : mql.removeListener(handler)

    attach(viewport)
    attach(motion)
    return () => {
      detach(viewport)
      detach(motion)
    }
  }, [])

  return cap
}
```

**Recommendation:** ship as-is Slice 1. Mirror `usePrefersReducedMotion` SSR + addListener compat patterns.

---

## 7. `?renderer=svg|webgl` URL override

**Findings:** Pure synchronous read on hook init via `URLSearchParams(window.location.search).get('renderer')`. No listener needed (override is set once on page load). SSR guard via `typeof window` check (already in `detect()` above).

**Recommendation:** included inline in `detect()` (see §6). Highest precedence — short-circuits all capability gates.

---

## 8. Theme reactivity — useTheme → prop → useEffect

**Findings:**
- `useTheme()` hook exists (`src/i18n/ThemeContext.js`). Returns `{ theme: 'dark' | 'light' }`.
- GameMode passes `theme` as prop to SvgConstellation already. WebGLConstellation receives same prop (Phase 15 contract).
- `useEffect` with `[theme]` dep re-reads CSS vars + updates shader uniforms within one rAF (UI-SPEC §6 budget).

**Code sketch (inside WebGLConstellation):**
```js
useEffect(() => {
  if (!materialRef.current) return
  const root = document.documentElement
  const cs = getComputedStyle(root)
  materialRef.current.uniforms.uEdgeColor.value = parseCSSColor(cs.getPropertyValue('--color-constellation-edge'))
  materialRef.current.uniforms.uEdgeHeavyColor.value = parseCSSColor(cs.getPropertyValue('--color-constellation-edge-heavy'))
  materialRef.current.uniforms.uHaloColor.value = parseCSSColor(cs.getPropertyValue('--color-constellation-halo'))
  // No re-render call — rAF loop picks up new uniforms next frame
}, [theme])
```

---

## 9. CSS-var → THREE.Color parsing

**Findings:**
- `getComputedStyle(document.documentElement).getPropertyValue('--color-constellation-edge')` returns a CSS color string.
- Modern syntax: `rgb(56 56 70 / 0.18)`. Legacy: `#383846` or `rgb(56, 56, 70)`.
- `new THREE.Color()` accepts hex strings + named colors but NOT modern `rgb()` syntax. Need manual parser.

**Code sketch:**
```js
function parseCSSColor(str) {
  const s = str.trim()
  // hex
  if (s.startsWith('#')) return new Color(s)
  // rgb(r g b / a) or rgb(r g b) — strip alpha for THREE.Color
  const m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) {
    const [, r, g, b] = m
    return new Color(Number(r) / 255, Number(g) / 255, Number(b) / 255)
  }
  return new Color(0xffffff) // safe fallback
}
```
- Alpha (when present in CSS var) goes into a separate `uniform float uHaloAlpha` rather than THREE.Color.

**Recommendation:** module-scope helper. Unit test with both modern `rgb(r g b / a)` and `#hex` inputs.

---

## 10. rAF visibilitychange pause

**Findings:** Standard pattern; cleanup in same useEffect as the loop.

**Code sketch:**
```js
useEffect(() => {
  let rafId
  let lastT = performance.now()

  function tick(t) {
    const dt = (t - lastT) / 1000
    lastT = t
    // update uniforms (drift sin, glow pulse, halo brighten)
    materialRef.current.uniforms.uTime.value += dt
    rendererRef.current.render(sceneRef.current, cameraRef.current)
    rafId = requestAnimationFrame(tick)
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      cancelAnimationFrame(rafId)
      rafId = null
    } else if (rafId === null) {
      lastT = performance.now()
      rafId = requestAnimationFrame(tick)
    }
  }

  rafId = requestAnimationFrame(tick)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    cancelAnimationFrame(rafId)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}, [])
```

---

## 11. Bundle CI gate

**Findings:**
- Vite 6 default rollup config code-splits `React.lazy()` imports into separate chunks. Already verified Phase 16: `dist/assets/GameMode-*.js` is a single named chunk.
- `rollup-plugin-visualizer` already installed (`vite.config.js:4,11–18`) — emits `dist/stats.html` with gz sizes.
- Mobile chunk MUST satisfy: (a) gz ≤ 38.82 kB (per UI-SPEC §5), (b) no `three` exports.

**Code sketch — Node post-build script `scripts/check-bundle-gate.mjs`:**
```js
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const distAssets = path.resolve('dist/assets')
const files = fs.readdirSync(distAssets)

const mobileChunk = files.find((f) => /^GameMode-.*\.js$/.test(f))
const webglChunk = files.find((f) => /^WebGLConstellation-.*\.js$/.test(f))

if (!mobileChunk) throw new Error('GameMode chunk not found')
if (!webglChunk) {
  console.warn('WARN: WebGLConstellation chunk not found — three.js may be in mobile bundle')
}

const mobileBuf = fs.readFileSync(path.join(distAssets, mobileChunk))
const mobileGz = gzipSync(mobileBuf).length

// Hard checks
if (/THREE\.|from"three"|from'three'/.test(mobileBuf.toString())) {
  throw new Error(`HARD FAIL: ${mobileChunk} contains three.js — Lighthouse mobile gate at risk`)
}

// Size bands (mirror D-16-BUNDLE-GATE)
const KB = mobileGz / 1024
if (KB > 38.82) {
  throw new Error(`HARD FAIL: ${mobileChunk} = ${KB.toFixed(2)} kB gz > 38.82 kB ceiling`)
} else if (KB > 14) {
  console.warn(`WARN: ${mobileChunk} = ${KB.toFixed(2)} kB gz (14–38.82 kB band)`)
} else {
  console.log(`PASS: ${mobileChunk} = ${KB.toFixed(2)} kB gz`)
}
```
Hook into `package.json`: `"build:gate": "vite build && node scripts/check-bundle-gate.mjs"`.

---

## 12. Lighthouse mobile audit reproducibility

**Findings:**
- Phase 11-02 added `npm run lighthouse:mobile` script (existing, deferred-but-implemented). Confirm thresholds: Perf ≥95 / A11y 100 / BP 100 / SEO 100.
- Most-at-risk metric for Phase 17: **TBT (Total Blocking Time)** — JS parse cost dominates score swings. If bundle gate passes (three.js absent from mobile), TBT should match Phase 16 measurement.
- LCP risk: low (hero image LCP unchanged from Phase 15+16).
- CLS risk: zero (no new mobile layout shifts).

**Recommendation:** Phase 17 close runs against `npm run build && npx serve dist` locally. Avoid coupling v3.8 close to deployed `*.vercel.app` (Plan 11-05 deferred).

---

## 13. canvas aria-hidden + sr-only ConstellationFallback coexistence

**Findings:**
- GameMode currently mounts `<ConstellationFallback>` outside renderer slot (GameMode.js:174). SR reads it regardless of which renderer is active.
- Adding `aria-hidden="true"` on the WebGL `<canvas>` is sufficient — SR skips it; `<ol class="sr-only">` is the only accessible surface inside the constellation region.

**Recommendation:** WebGLConstellation renders `<canvas aria-hidden="true" tabIndex={-1}>`. Outer `<div data-game-interactive>` (already in GameMode.js:137) handles ARIA via SvgConstellation's existing `<svg role="application" aria-label=...>`. When WebGL active, the role+aria-label move to a sibling element OR are added to the outer div directly. Planner decides exact wrapping.

---

## 14. 60fps perf budget on integrated GPU

**Findings:**
- 26 Points + ~50 LineSegments + ambient drift (sin per node per frame) + chip-flash uniform → trivially <1ms CPU on any modern integrated GPU (Intel HD 620+).
- Frame budget at 60fps = 16.67ms; this scene uses <5% of it.

**Recommendation:** dev-mode FPS counter gated by `import.meta.env.DEV`:
```js
{import.meta.env.DEV && <FpsCounter />}
```
Implementation: simple useState + rAF rolling average. ~20 LOC. Helps catch regressions during development.

---

## Risks / unknowns

1. **`vitest-canvas-mock` interaction with setup.js stub** — may need to remove the existing `getContext = () => null` stub OR move it to a conditional. Planner verifies during Slice 1 test setup. **Severity: low** (resolvable via `delete HTMLCanvasElement.prototype.getContext` in WebGL test files).
2. **three.js r163+ removed some classes** — verify `LineBasicMaterial` + `Points` still in current ESM. Last checked: r158. **Severity: low** (planner pins via `package.json` if needed).
3. **Safari `navigator.connection` undefined** — already handled via optional chaining in §6. **Severity: none** (handled).
4. **Tab-switch race during rAF pause** — if `visibilitychange` fires between cancel + restart, may leak. Mitigation: `rafId = null` sentinel (see §10 code). **Severity: low.**
5. **CSS-var theme update on `dark`↔`light` may briefly flash old colors for one frame** — UI-SPEC §6 budget says "within one rAF, no visible wrong-theme flash tolerated". If actual measurement shows flash, planner adds explicit `renderer.render()` call inside theme effect. **Severity: medium.**
6. **Lighthouse mobile bundle exceeds 38.82 kB gz** — would block v3.8 close. Mitigation: bundle CI gate fails fast Slice 5; planner has time to refactor before run. **Severity: high if hit, low probability.**

---

## Open questions for planner

None blocking. All Implementer's Discretion zones (D-17-VISUAL, D-17-THEME, D-17-BUNDLE, D-17-LIGHTHOUSE-TARGET, D-17-ERRORBOUNDARY-INIT/RUNTIME) have concrete recommendations above — planner ships them as-is or refines inline.

---

## Wave structure recommendation (MVP vertical slices)

Phase 17 = `**Mode:** mvp`. Slices are END-TO-END demonstrable; each slice ships a strictly larger working surface.

### Slice 1 — Walking thin (capability + ErrorBoundary + 1-node WebGL)
**Files:** `src/game/useRendererCapability.js` (new), `src/game/useRendererCapability.test.js` (new), `src/game/RendererErrorBoundary.js` (extracted from GameMode.js), `src/game/RendererErrorBoundary.test.js` (new), `src/game/renderers/WebGLConstellation.js` (new — renders 1 node as a Point), `src/game/renderers/WebGLConstellation.test.js` (new — smoke test via three mock), `src/game/GameMode.js` (extend renderer slot conditional).
**Demo:** on a capable client, page renders 1 WebGL node where Phase 15 had 26 SVG nodes. On any failed gate or WebGL error, SVG fallback renders normally.
**Tests:** capability hook all 5 input combinations; ErrorBoundary catches thrown error; GameMode selection branches.

### Slice 2 — Full graph parity (26 nodes + edges + theme reactivity + halo)
**Files:** `src/game/renderers/WebGLConstellation.js` (full Points geometry + LineSegments + theme effect + selectedSkillId halo).
**Demo:** WebGL path visually matches SVG path at static state. Theme toggle re-uploads uniforms within one rAF. Selected node shows halo.
**Tests:** theme effect re-uploads correct uniforms; selected halo uniform value matches expected.

### Slice 3 — Ambient motion (drift + glow pulse + halo brighten)
**Files:** `src/game/renderers/WebGLConstellation.js` (rAF loop + visibilitychange + ambient uniforms).
**Demo:** "wow" aesthetic live. Tab-switch pauses loop, restores on focus.
**Tests:** rAF cancel on visibility hidden (jsdom dispatch event).

### Slice 4 — Chip-flash port + weight-1 edge reveal
**Files:** `src/game/renderers/WebGLConstellation.js` (chip-flash uniform from justFilteredId; weight-1 edge alpha driven by hover/select).
**Demo:** Phase 16 D-16-CHIP-FLASH semantics reproduce in WebGL. Hover/select reveals weight-1 edges.
**Tests:** chip-flash uniform updates on justFilteredId change; weight-1 edges fade in.

### Slice 5 — Bundle gate + Lighthouse re-verify + dev FPS
**Files:** `scripts/check-bundle-gate.mjs` (new), `package.json` (add `build:gate` script), `src/game/FpsCounter.js` (dev-only, ~20 LOC).
**Demo:** `npm run build:gate` exits 0; bundle stats logged. `npm run lighthouse:mobile` against `npx serve dist` passes HARD gate. Dev FPS counter visible in dev mode only.
**Tests:** bundle gate script unit test (mock dist files); FPS counter rolling-average correctness.
**Closes v3.8.**

---

## Validation Architecture (Nyquist Dim 8)

| Layer | Test type | File | Coverage |
|---|---|---|---|
| Capability detection | Unit (Vitest) | `useRendererCapability.test.js` | All 5 inputs × on/off; URL override; matchMedia reactivity |
| Renderer selection | Component (Vitest+RTL) | `GameMode.test.js` extension | Branch on capability='webgl'\|'svg'; lazy import triggers Suspense |
| ErrorBoundary fallback | Component (Vitest+RTL) | `RendererErrorBoundary.test.js` | Throws caught + fallback renders; sticky once tripped |
| Theme reactivity | Unit (Vitest) | `WebGLConstellation.test.js` | Theme prop change triggers uniform re-upload (via three mock spy) |
| Chip-flash propagation | Unit (Vitest) | `WebGLConstellation.test.js` | justFilteredId change updates uniform |
| Bundle gate | CI script test (Vitest+fs mock) | `scripts/check-bundle-gate.test.mjs` | HARD/WARN/PASS bands fire correctly; three.js presence detection |
| Lighthouse mobile | Manual UAT | `17-UAT.md` Test 1 | `npm run lighthouse:mobile` against `npx serve dist` passes HARD gate |
| Visual parity SVG↔WebGL | Manual UAT | `17-UAT.md` Test 2 | Screenshot diff at desktop ≥1024px; both themes |
| Ambient motion quality | Manual UAT | `17-UAT.md` Test 3 | Drift not jarring; glow pulse subtle; halo brighten distinguishable from selected pulse |
| Live swap on resize | Manual UAT | `17-UAT.md` Test 4 | Drag window across 1024px → renderer swaps instantly; selection state preserved |
| URL override | Manual UAT | `17-UAT.md` Test 5 | `?renderer=svg` on desktop forces SVG; `?renderer=webgl` on tablet forces WebGL (still capability-gated) |
| WebGL context loss | Manual UAT | `17-UAT.md` Test 6 | Force GPU reset (chrome://gpucrash) → ErrorBoundary swaps to SVG silently |
| Reduced-motion → SVG | Manual UAT | `17-UAT.md` Test 7 | OS prefers-reduced-motion → SVG even on capable desktop |
| Save-Data → SVG | Manual UAT | `17-UAT.md` Test 8 | DevTools Network throttling 2g → SVG |
| FPS counter in dev | Manual smoke | dev only | `import.meta.env.DEV` gate; not in production bundle |

## RESEARCH COMPLETE
