---
phase: 20-3d-constellation
plan: 02a
type: execute
wave: 2
depends_on: [20-01]
files_modified:
  - src/game/renderers/WebGLConstellation.js
  - src/game/GameMode.js
autonomous: false
requirements: [DEPTH-01]
tags: [webgl, renderer, perspective-camera, orbit-controls, shader, context-loss]

must_haves:
  truths:
    - "WebGL canvas mounts at a tilted ~15° azimuth + ~10° polar initial camera angle (D-20-CONTEXT-INITIAL-ANGLE) — 3D depth is obvious frame 0 without requiring drag"
    - "PerspectiveCamera(fov=55, aspect, near=10, far=2000) replaces OrthographicCamera; foreshortening visible — near nodes larger, far nodes smaller"
    - "OrbitControls drag-to-rotate works with dampingFactor=0.06, rotateSpeed=0.6, polar clamp [π*0.15, π*0.85]; releases at any angle within clamp without snap-back"
    - "Auto-rotate (CCW around world Y, ~30s/orbit) runs from mount; pauses permanently on first drag (D-20-CONTEXT-AUTOROTATE-RESUME); pauses on hover/select; defensive RM gate ensures autoRotate=false when prefers-reduced-motion matches"
    - "VERTEX_SHADER size-attenuation by depth is active — gl_PointSize clamped [1, 64] via perspectiveScale / -mvPosition.z"
    - "Per-vertex edge alpha falloff in fragment shader fades edges going into the screen (MOD-04 Option A)"
    - "OrbitControls.dispose() runs FIRST in useEffect cleanup; no listener leaks on StrictMode double-mount"
    - "webglcontextlost handler calls e.preventDefault() and emits onContextLost callback; GameMode swaps to SVG via local forceSvgFallback state (silent — no error banner, no aria-live announcement)"
    - "Pointer-pick uses Vector3.project(camera) + depth-scaled radius — far-node hover registers correctly under perspective"
    - "Canvas has touch-action: none + cursor states grab/grabbing/pointer per UI-SPEC"
    - "All 271+ existing tests stay GREEN (Plan 20-01 baseline); bundle-gate exits 0 with mobile chunk unchanged; WebGL chunk ≤130 kB gz"
  artifacts:
    - path: "src/game/renderers/WebGLConstellation.js"
      provides: "PerspectiveCamera + OrbitControls + shader size-attenuation + edge alpha falloff + perspective-aware pick + context-loss handlers + dispose discipline + onFirstDrag/onContextLost props"
      contains: "PerspectiveCamera"
    - path: "src/game/GameMode.js"
      provides: "onFirstDrag callback wiring (writes cam-3d-hint-seen flag) + onContextLost wiring (local forceSvgFallback useState routes to SVG)"
      contains: "forceSvgFallback"
  key_links:
    - from: "src/game/renderers/WebGLConstellation.js positions[i*3+2]"
      to: "src/game/constellation.layout.js CATEGORY_Z output (Plan 20-01)"
      via: "positions[i*3+2] = pos.z ?? 0 (Alert A2 — defends CRIT-04 z=0 trap)"
      pattern: "positions\\[i \\* 3 \\+ 2\\] = pos\\.z"
    - from: "WebGLConstellation tick() rAF loop"
      to: "OrbitControls damping + auto-rotate state"
      via: "controls.update() called as FIRST line of tick() — preserves D-17-FRAMELOOP single rAF (Alert A3 / CRIT-01)"
      pattern: "controls\\.update\\(\\)"
    - from: "OrbitControls 'start' event"
      to: "props.onFirstDrag callback + autoRotate permanent pause"
      via: "controls.addEventListener('start', () => { controls.autoRotate = false; dragHappenedRef.current = true; props.onFirstDrag?.() })"
      pattern: "addEventListener\\(['\"]start['\"]"
    - from: "WebGLConstellation webglcontextlost handler"
      to: "GameMode forceSvgFallback useState"
      via: "e.preventDefault() + props.onContextLost?.() — GameMode flips local state to route to SVG; silent swap (D-20-CONTEXT-LOSS, Alert A10)"
      pattern: "webglcontextlost"
    - from: "WebGLConstellation onFirstDrag prop callback"
      to: "localStorage cam-3d-hint-seen flag"
      via: "GameMode wires onFirstDrag={() => writeFlag('cam-3d-hint-seen','true')} — Plan 20-02b OnboardingHint reads same flag at mount"
      pattern: "cam-3d-hint-seen"
---

<objective>
Land the genuine-3D renderer core: swap `OrthographicCamera` → `PerspectiveCamera(55, aspect, 10, 2000)` at the tilted initial angle per D-20-CONTEXT-INITIAL-ANGLE; instantiate `OrbitControls` with damping + polar clamp + auto-rotate + pause-on-first-drag (permanent, per D-20-CONTEXT-AUTOROTATE-RESUME); update the VERTEX_SHADER with depth size-attenuation (CRIT-05) + per-vertex edge alpha falloff (MOD-04 Option A); rewrite pointer-pick with `Vector3.project(camera)` + depth-scaled radius (MOD-08); add `webglcontextlost`/`restored` silent SVG-swap handlers (D-20-CONTEXT-LOSS); wire `onFirstDrag` + `onContextLost` callbacks from WebGLConstellation up to GameMode.

**OnboardingHint + i18n are explicitly DEFERRED to Plan 20-02b** — this plan ships the renderer slot scaffolding (forceSvgFallback state, onFirstDrag callback that writes the localStorage flag for hint suppression) but does NOT mount the pill or add nested `t.game.hint.drag` keys. The split keeps each plan within the 2-3 task / ~50% context budget (per checker Blocker #2).

Purpose:
- Honors PATTERNS Alerts in code — A1 (regex already landed in 20-01), A2 (z write-through), A3 (single rAF preserved), A4 (dispose first), A5 (shader uniforms), A8 placeholder (forceSvgFallback wiring; pill itself in 20-02b), A9 (defensive RM gate), A10 (silent context-loss swap), A11 (camera state in useRef), A12 (Vector3.project pick).
- Defends CRIT-01 (double rAF), CRIT-04 (z=0 trap — pos.z write-through), CRIT-05 (size attenuation), CRIT-06 (autoRotate vs RM), MOD-02/04/05/06/08 + MIN-01/02/03/04/05.
- Preserves D-17-FRAMELOOP single rAF, D-17-HOVERED-PROP (props-down), D-17-RM-GATE, D-17-LIB (three.js raw — no r3f), D-17-PRIMITIVES (custom ShaderMaterial extended, not replaced), D-15-KB-ACTIVATE (controls.enableKeys=false per D-20-CONTEXT-KB-NOORBIT), D-20-PROPS-CONTRACT.
- Lands D-20-VISUAL-3D supersession of D-17-VISUAL (flat 2D-in-3D ortho).

Output: A capable-desktop recruiter on first paint sees a tilted, slowly rotating 3D constellation with visible perspective foreshortening; mouse-down flips cursor `grab` → `grabbing`, auto-rotate pauses for the session, drag rotates with damping inertia, release at any clamped angle holds without snap-back; quick click within ~5px+250ms still triggers the existing pointerup-based pick (Plan 20-03 formalizes the click-vs-drag threshold hook); `prefers-reduced-motion: reduce` users continue to see the SVG path (no WebGL mount); `webglcontextlost` swaps to SVG silently via the new forceSvgFallback state in GameMode. Mobile SVG path unchanged. Bundle-gate green. No hint pill yet (lands in 20-02b).
</objective>

<execution_context>
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/20-3d-constellation/20-CONTEXT.md
@.planning/phases/20-3d-constellation/20-UI-SPEC.md
@.planning/phases/20-3d-constellation/20-PATTERNS.md
@.planning/phases/20-3d-constellation/20-01-SUMMARY.md
@.planning/research/SUMMARY.md
@.planning/research/PITFALLS.md
@src/game/renderers/WebGLConstellation.js
@src/game/renderers/SvgConstellation.js
@src/game/GameMode.js
@src/game/useConstellation.js
@src/game/useRendererCapability.js
@src/game/constellation.layout.js
@src/context/ViewModeContext.js
@tailwind.config.js

<interfaces>
<!-- LOCKED contracts the executor must implement EXACTLY. No invention. -->

## Camera (D-20-VISUAL-3D + D-20-CONTEXT-INITIAL-ANGLE)

Replace the existing `OrthographicCamera(0, 1000, 0, 1000, -1, 1)` at `WebGLConstellation.js:~250` with:

```
const canvas = canvasRef.current
const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
const camera = new PerspectiveCamera(55, aspect, 10, 2000)
const ORBIT_RADIUS = 500
camera.position.set(
  Math.sin((15 * Math.PI) / 180) * ORBIT_RADIUS,
  Math.sin((10 * Math.PI) / 180) * ORBIT_RADIUS,
  Math.cos((15 * Math.PI) / 180) * ORBIT_RADIUS,
)
camera.lookAt(0, 0, 0)
cameraRef.current = camera
```

`fov=55` is LOCKED per research SUMMARY.md §Conflicts. Initial angles (~15° azimuth, ~10° polar) are UAT-tunable ±5° within polar clamp per CONTEXT discretion, but the developer MUST verify perspective is obvious frame 0 before commit.

On ResizeObserver callback: recompute `camera.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)`, then `camera.updateProjectionMatrix()`. Also update `material.uniforms.uCanvasHeight.value = canvas.clientHeight` (shader needs it for size-attenuation).

## OrbitControls (D-20-VISUAL-3D, locked config)

Import: `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` — MUST be the modern `three/addons/*` path (NOT `three/examples/jsm/*`). Bundle-gate (Plan 20-01) catches both paths.

Instantiate AFTER camera setup, BEFORE scene.add, INSIDE the same useEffect:

```
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.rotateSpeed = 0.6
controls.enableZoom = false
controls.enablePan = false
controls.enableKeys = false
controls.minPolarAngle = Math.PI * 0.15
controls.maxPolarAngle = Math.PI * 0.85
controls.autoRotateSpeed = 0.5
controls.target.set(0, 0, 0)

// CRIT-06 + Alert A9 — defensive RM gate inside renderer
const prefersRM = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
controls.autoRotate = !prefersRM

controlsRef.current = controls
```

`controlsRef` MUST be a useRef declared at function top. Camera state stays in useRef — DO NOT lift to `useConstellation` (Alert A11, would cause 60 setState/sec thrash on damped rotation).

## Pause-on-first-drag (D-20-CONTEXT-AUTOROTATE-RESUME)

Attach a 'start' listener that permanently disables auto-rotate for the page session AND fires the `onFirstDrag` callback (used by Plan 20-02b OnboardingHint dismiss flow):

```
const dragHappenedRef = useRef(false)
const onControlsStart = () => {
  controls.autoRotate = false
  dragHappenedRef.current = true
  if (props.onFirstDrag) props.onFirstDrag()
}
controls.addEventListener('start', onControlsStart)
```

NO idle-timeout re-resume. Reload restores `autoRotate = true` at next mount.

Also pause auto-rotate on hover/select (MIN-01) — observe via prop changes in a separate useEffect:

```
useEffect(() => {
  const c = controlsRef.current
  if (!c) return
  if (dragHappenedRef.current) return  // first drag is permanent — never re-enable
  c.autoRotate = !prefersRM && hoveredSkillId == null && selectedSkillId == null
}, [hoveredSkillId, selectedSkillId])
```

## Single rAF preservation (Alert A3 / CRIT-01)

Inside the existing `tick()` function at `WebGLConstellation.js:~674`, add `controls.update()` as the FIRST line:

```
function tick(t) {
  if (controlsRef.current) controlsRef.current.update()
  const dt = (t - lastT) / 1000
  // ... existing uTime / uHaloPulse / uHighlightAlpha logic UNCHANGED
}
```

**FORBIDDEN:** `controls.addEventListener('change', renderer.render)` — would double-render per CRIT-01. `rg "controls\.addEventListener\(['\"]change" src/` MUST return zero hits after this plan.

## Z write-through (Alert A2 / CRIT-04)

At `WebGLConstellation.js:~295` change:
- FROM: `positions[i * 3 + 2] = 0`
- TO: `positions[i * 3 + 2] = pos.z ?? 0`

The `pos.z` is now populated by Plan 20-01's `computeLayout()` extension. The `?? 0` defensive fallback covers the boundary case where a stale layout from prior session is reused.

## VERTEX_SHADER size-attenuation (Alert A5 / CRIT-05)

In the existing VERTEX_SHADER string at `WebGLConstellation.js:~133-176`:

1. Declare two new uniforms:
   ```
   uniform float uCanvasHeight;
   uniform float uFovRad;
   ```

2. Ensure `mvPosition` is computed once: `vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);` (use the existing `drifted` vec3 from current shader; if the shader currently goes straight to `gl_Position`, refactor to compute `mvPosition` first).

3. Replace the existing `gl_PointSize = size * uDpr * ...` line with:
   ```
   float perspectiveScale = uCanvasHeight / (2.0 * tan(uFovRad / 2.0));
   float depthFactor = perspectiveScale / max(-mvPosition.z, 0.001);
   gl_PointSize = clamp(
     size * uDpr * (1.0 + (uHaloPulse - 1.0) * halo) * flashScale * depthFactor,
     1.0,
     64.0
   );
   ```

4. `gl_Position = projectionMatrix * mvPosition;` (reuse mvPosition; avoid double matrix multiply).

5. Add `uCanvasHeight` and `uFovRad` to `material.uniforms` initialization (currently lines ~339-355):
   ```
   uCanvasHeight: { value: canvas.clientHeight || 600 },
   uFovRad: { value: (55 * Math.PI) / 180 },
   ```

6. On ResizeObserver, also update `material.uniforms.uCanvasHeight.value = canvas.clientHeight`.

## Edge alpha falloff (MOD-04 Option A)

In the EDGE custom ShaderMaterial fragment shader, add per-vertex `normalView` falloff: `gl_FragColor.a *= 1.2 - abs(normalView.z);` (or equivalent — pass `vViewPosition` varying from vertex shader to fragment shader; compute `normalize(vViewPosition).z` in fragment).

REJECT the temptation to use `Line2 / LineGeometry / LineMaterial` — adds ~10 kB gz and would push the WebGL chunk over the 130 kB WARN ceiling (PITFALLS MOD-04 Option B REJECTED).

Set `edgeMaterial.depthWrite = false` (MOD-02 z-fighting mitigation; render edges first per existing line 411-412 order).

## Pointer-pick rewrite (Alert A12 / MOD-08)

Replace the existing 2D ortho pick math (`WebGLConstellation.js:~619-621`):

```
// REMOVE
const projX = (pos.x / 1000) * rect.width
const projY = (pos.y / 1000) * rect.height
```

With perspective-aware projection:

```
import { Vector3 } from 'three'  // add to top-of-file imports
const v = new Vector3(pos.x, pos.y, pos.z ?? 0)
v.project(camera)  // NDC: [-1, +1]
const projX = (v.x * 0.5 + 0.5) * rect.width
const projY = (-v.y * 0.5 + 0.5) * rect.height
const depthScale = Math.max(0.4, 1.0 - v.z * 0.3)
const dist = Math.hypot(px - projX, py - projY)
const radius = computeRadius(node.count, maxCount, 'desktop') * depthScale
const pickRadius = radius + 8
```

`v.z ∈ [-1, +1]` post-projection; depthScale floor at 0.4 prevents pick radius collapsing to 0 for back-clipped nodes.

## Dispose discipline (Alert A4 / MOD-05)

In the useEffect cleanup, controls MUST dispose FIRST:

```
return () => {
  if (controlsRef.current) {
    controlsRef.current.removeEventListener('start', onControlsStart)
    controlsRef.current.dispose()
    controlsRef.current = null
  }
  canvas.removeEventListener('webglcontextlost', onContextLost)
  canvas.removeEventListener('webglcontextrestored', onContextRestored)
  geometry.dispose()
  material.dispose()
  edgeGeometry.dispose()
  edgeMaterial.dispose()
  renderer.dispose()
}
```

## Context-loss handlers (Alert A10 / D-20-CONTEXT-LOSS)

```
function onContextLost(e) {
  e.preventDefault()  // signals "we will recover" — three.js retains object handles
  if (props.onContextLost) props.onContextLost()
}
function onContextRestored() {
  // Defensive: do NOT re-mount WebGL. Stay on SVG once swapped (MOD-06 prevention).
}
canvas.addEventListener('webglcontextlost', onContextLost)
canvas.addEventListener('webglcontextrestored', onContextRestored)
```

`props.onContextLost` is the new optional prop; `GameMode.js` wires it to flip the `forceSvgFallback` state to `true`, routing subsequent renders to `<SvgConstellation />`. Silent — NO error banner, NO `aria-live` shout, NO recruiter-visible failure message (per UI-SPEC §ErrorBoundary Visual Continuity).

## Canvas CSS (MIN-03 + cursor states)

Apply via Tailwind utility or inline style on the `<canvas>` element:
- `touch-action: none` — suppresses page scroll during touch drag.
- `cursor: grab` idle, `cursor: grabbing` during drag, `cursor: pointer` over a hovered node.

Cursor switching can be driven by a `style.cursor` mutation inside the existing pointermove/pointerdown/pointerup handlers; OR via a `data-drag-state` attribute + Tailwind variant selectors. Either approach acceptable; the styling MUST match UI-SPEC §"Cursor state map".

## GameMode.js integration (renderer slot scaffolding only — pill lands in 20-02b)

Edit `src/game/GameMode.js`:

1. Add a local useState near other useState declarations:
   ```
   const [forceSvgFallback, setForceSvgFallback] = useState(false)
   ```

2. Compute the effective capability:
   ```
   const effectiveCapability = forceSvgFallback ? 'svg' : capability
   ```

3. In the renderer-slot conditional (lines ~116-132), use `effectiveCapability` instead of `capability`. Pass new props to `<WebGLConstellation />`:
   ```
   <WebGLConstellation
     {...rendererProps}
     onFirstDrag={() => {
       try {
         if (typeof window !== 'undefined') {
           window.localStorage.setItem('cam-3d-hint-seen', 'true')
         }
       } catch (e) { /* blocked — Safari private mode */ }
     }}
     onContextLost={() => setForceSvgFallback(true)}
   />
   ```

4. **Do NOT add an OnboardingHint import or JSX use in this plan.** Plan 20-02b lands that. The renderer slot just exposes the `forceSvgFallback` state so 20-02b's pill conditional can read it (`effectiveCapability === 'webgl'` is the gate).

Why write the `cam-3d-hint-seen` flag here even though the pill doesn't exist yet? Defense-in-depth — if Plan 20-02b lands later and a user has already dragged once during 20-02a's "no pill" interim, the localStorage flag still correctly suppresses the pill on the post-20-02b page load. Harmless write of a flag nobody reads yet.

## Tailwind keyframes — verify-only (Alert A7)

`tailwind.config.js` already defines `animate-fade-in` (line 94) and `animate-hint-fade-out` (line 100). This plan does NOT use them; Plan 20-02b does. DO NOT redefine. DO NOT add new keyframes.

## Forbidden anti-patterns (re-read before commit)

- `controls.addEventListener('change', renderer.render)` — FORBIDDEN (CRIT-01).
- `positions[i * 3 + 2] = 0` after Plan 20-01 — FORBIDDEN (CRIT-04).
- Bumping three.js from 0.169.0 — FORBIDDEN (Phase 17 Lighthouse gate cleared against current pin).
- Importing `Line2` / `LineGeometry` / `LineMaterial` — FORBIDDEN (MOD-04 Option B blows budget).
- Importing `@react-three/fiber` or `@react-three/drei` — FORBIDDEN (D-17-LIB).
- Importing `d3-force-3d` — FORBIDDEN (D-14-01-LAYOUT).
- Adding aria-label to canvas — FORBIDDEN (MIN-04 — canvas stays `aria-hidden="true"`).
- Changing canvas `tabIndex` from `-1` — FORBIDDEN (MIN-05).
- Adding a 2D/3D user preference toggle — FORBIDDEN (PITFALLS Decision Violations).
- Mounting WebGL for `prefers-reduced-motion: reduce` users — FORBIDDEN (D-17-RM-GATE).
- Adding `<OnboardingHint />` JSX or `import OnboardingHint` in this plan — DEFERRED to 20-02b.
- Adding `t.game.hint.drag` i18n keys in this plan — DEFERRED to 20-02b.
- Redefining `animate-fade-in` or `animate-hint-fade-out` in `tailwind.config.js` — FORBIDDEN (Alert A7).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: WebGLConstellation PerspectiveCamera + OrbitControls + shader + pick + context-loss + GameMode scaffolding</name>
  <files>src/game/renderers/WebGLConstellation.js, src/game/GameMode.js</files>
  <read_first>
    - src/game/renderers/WebGLConstellation.js (FULL FILE — 725 LOC, Phase 17 Slice 4 final; integration sites at lines ~250 camera, ~295 z write, ~133-176 VERTEX_SHADER, ~339-355 uniforms, ~411-412 edge render order, ~416-423 cleanup, ~615-630 pointer-pick, ~674-690 tick(), ~692-702 visibilitychange)
    - src/game/GameMode.js (FULL FILE — renderer-slot block at lines 116-132)
    - src/game/useRendererCapability.js (capability tier + RM gating contract)
    - src/game/RendererErrorBoundary.js (Phase 17 fallback pattern — Phase 20 supplements it via context-loss callback, does NOT replace)
    - src/game/constellation.layout.js (Plan 20-01 — confirm CATEGORY_Z + {x,y,z} shape landed)
    - .planning/phases/20-3d-constellation/20-PATTERNS.md §"src/game/renderers/WebGLConstellation.js" (full — integration sites with code excerpts) + §"src/game/GameMode.js"
    - .planning/phases/20-3d-constellation/20-UI-SPEC.md §"Visual Contract — 3D Camera & Depth" + §"Interaction Contract — OrbitControls & Affordances" + §"State Transitions"
    - .planning/research/PITFALLS.md §CRIT-01 + §CRIT-02 + §CRIT-04 + §CRIT-05 + §CRIT-06 + §MOD-02 + §MOD-04 + §MOD-05 + §MOD-06 + §MOD-08 + §MIN-01..05
  </read_first>
  <action>
    This task lands the renderer changes in one cohesive edit pass. Order matters — follow it.

    **Phase A: imports**

    Top of `WebGLConstellation.js`:
    - Add `PerspectiveCamera`, `Vector3` to the existing `from 'three'` import block.
    - Remove `OrthographicCamera` from the same block.
    - Add `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` as a new top-level import.

    **Phase B: useRef declarations**

    At function-top (alongside existing `canvasRef`, `cameraRef`, etc.), add:
    - `const controlsRef = useRef(null)`
    - `const dragHappenedRef = useRef(false)` (used by hover/select autoRotate gate)

    **Phase C: camera + controls instantiation (inside the existing renderer-setup useEffect, near line 250)**

    Replace the `OrthographicCamera(0, 1000, 0, 1000, -1, 1)` block with the PerspectiveCamera + initial position + lookAt block per the `<interfaces>` Camera section.

    Immediately after, instantiate OrbitControls per the `<interfaces>` OrbitControls section. Compute `prefersRM` defensively; set `controls.autoRotate = !prefersRM`. Attach the `'start'` listener that sets `controls.autoRotate = false`, sets `dragHappenedRef.current = true`, and fires `props.onFirstDrag?.()`. Store `controlsRef.current = controls`.

    **Phase D: z write-through (Alert A2 / CRIT-04)**

    At line ~295, change `positions[i * 3 + 2] = 0` to `positions[i * 3 + 2] = pos.z ?? 0`.

    **Phase E: VERTEX_SHADER size-attenuation (Alert A5 / CRIT-05)**

    Edit the VERTEX_SHADER string (lines ~133-176):
    - Add `uniform float uCanvasHeight;` and `uniform float uFovRad;` near other uniform declarations.
    - Ensure `vec4 mvPosition = modelViewMatrix * vec4(drifted, 1.0);` is computed before gl_PointSize.
    - Replace the existing `gl_PointSize = ...` line with the perspectiveScale + depthFactor + clamp formula per `<interfaces>`.
    - Make sure `gl_Position = projectionMatrix * mvPosition;` reuses mvPosition (single matrix multiply).

    Add the new uniforms to `material.uniforms` initialization (~lines 339-355):
    ```
    uCanvasHeight: { value: canvas.clientHeight || 600 },
    uFovRad: { value: (55 * Math.PI) / 180 },
    ```

    **Phase F: edge alpha falloff (MOD-04 Option A)**

    In the EDGE custom ShaderMaterial fragment shader, add per-vertex `normalView` falloff: `gl_FragColor.a *= 1.2 - abs(normalView.z);` (pass `vViewPosition` varying from vertex shader to fragment shader; compute `normalize(vViewPosition).z` in fragment).

    Set `edgeMaterial.depthWrite = false` if not already.

    **Phase G: pointer-pick rewrite (Alert A12 / MOD-08)**

    Replace the existing 2D ortho pick math at ~lines 619-621 with the `Vector3.project(camera)` + `depthScale` formula per `<interfaces>` Pointer-pick section. Make sure the `radius + 8` pickRadius is multiplied by `depthScale` consistently.

    **Phase H: ResizeObserver wiring**

    In the existing ResizeObserver callback, add:
    ```
    camera.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1)
    camera.updateProjectionMatrix()
    material.uniforms.uCanvasHeight.value = canvas.clientHeight
    ```

    **Phase I: tick() single rAF preservation (Alert A3 / CRIT-01)**

    Add `if (controlsRef.current) controlsRef.current.update()` as the FIRST line of the existing `tick(t)` function (~line 674). DO NOT add a `'change'` listener anywhere.

    **Phase J: hover/select autoRotate pause (MIN-01)**

    Add a new useEffect that depends on `[hoveredSkillId, selectedSkillId]`. Inside: if `dragHappenedRef.current` → no-op (first drag is permanent pause). Else set `controlsRef.current.autoRotate = !prefersRM && hoveredSkillId == null && selectedSkillId == null`.

    **Phase K: context-loss handlers (Alert A10 / D-20-CONTEXT-LOSS)**

    Inside the renderer-setup useEffect, add `onContextLost` and `onContextRestored` per `<interfaces>`. Attach via `canvas.addEventListener(...)`. Detach in cleanup.

    **Phase L: cleanup discipline (Alert A4 / MOD-05)**

    Update the existing cleanup return function to dispose controls FIRST, remove all event listeners (controls 'start', canvas webglcontextlost/restored), then dispose geometry/material/edge resources/renderer in current order.

    **Phase M: canvas CSS**

    Apply `touch-action: none` (MIN-03) and cursor states (`grab` idle, `grabbing` drag, `pointer` hover-on-node). Drive cursor via either inline `canvas.style.cursor =` mutations inside pointer event handlers OR via `data-drag-state` + Tailwind utilities. UI-SPEC §"Cursor state map" is the contract — match it.

    **Phase N: GameMode.js scaffolding (NO hint pill yet — deferred to 20-02b)**

    Edit `src/game/GameMode.js`:
    - Add `const [forceSvgFallback, setForceSvgFallback] = useState(false)` near existing useState declarations.
    - Compute `const effectiveCapability = forceSvgFallback ? 'svg' : capability`.
    - In the renderer-slot conditional (lines ~116-132), use `effectiveCapability` in place of `capability`.
    - Pass `onFirstDrag` callback to `<WebGLConstellation />` — writes `cam-3d-hint-seen = 'true'` via try/catch-guarded localStorage. (Plan 20-02b's OnboardingHint reads this flag at mount.)
    - Pass `onContextLost` callback to `<WebGLConstellation />` — calls `setForceSvgFallback(true)`.
    - **DO NOT** import or render `<OnboardingHint />` in this plan. That lands in 20-02b. The renderer-slot wrapper is otherwise unchanged.

    **Phase O: verification pass**

    Run `npm test`. All existing 271 tests (post-Plan-01) MUST stay GREEN. WebGLConstellation tests will continue to pass because jsdom stubs `getContext = () => null` and the renderer's mount path returns early on null context.

    `npm run build` MUST succeed. Run `node scripts/check-bundle-gate.mjs`:
    - Mobile chunk `GameMode-*.js` MUST remain ≤38.82 kB gz (Lighthouse mobile HARD gate intact).
    - Mobile chunk MUST NOT contain any `three/...` import string (Plan 20-01 regex defense holds).
    - WebGL chunk `WebGLConstellation-*.js` SHOULD report ~123 kB gz (~117 kB Phase 17 + ~6 kB OrbitControls + a few hundred bytes for shader uniforms). Plan 20-03 lands the 3-tier WARN ladder verdict.
  </action>
  <verify>
    <automated>npm test && npm run build && node scripts/check-bundle-gate.mjs</automated>
  </verify>
  <acceptance_criteria>
    - `rg "PerspectiveCamera" src/game/renderers/WebGLConstellation.js` returns ≥2 hits (import + instantiation).
    - `rg "OrthographicCamera" src/game/renderers/WebGLConstellation.js` returns 0 hits (replaced).
    - `rg "from\\s+['\\\"]three/addons/controls/OrbitControls" src/game/renderers/WebGLConstellation.js` returns 1 hit.
    - `rg -v '^#' src/game/renderers/WebGLConstellation.js | rg -c "controls\\.addEventListener\\(['\\\"]change"` returns 0 (CRIT-01 guard; `-v '^#'` filters header comments per planner grep hygiene).
    - `rg "positions\\[i \\* 3 \\+ 2\\] = 0" src/game/renderers/WebGLConstellation.js` returns 0 hits.
    - `rg "positions\\[i \\* 3 \\+ 2\\] = pos\\.z" src/game/renderers/WebGLConstellation.js` returns 1 hit (Alert A2 mitigation).
    - `rg "uCanvasHeight" src/game/renderers/WebGLConstellation.js` returns ≥3 hits (uniform decl in shader + uniforms init + ResizeObserver update).
    - `rg "uFovRad" src/game/renderers/WebGLConstellation.js` returns ≥2 hits.
    - `rg "clamp\\([\\s\\S]*?,\\s*1\\.0,\\s*64\\.0\\)" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (gl_PointSize clamp).
    - `rg "Vector3" src/game/renderers/WebGLConstellation.js` returns ≥2 hits (import + project call).
    - `rg "\\.project\\(camera\\)" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (Alert A12 / MOD-08).
    - `rg "controls\\.dispose\\(\\)" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (Alert A4 / MOD-05).
    - `rg "webglcontextlost" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (D-20-CONTEXT-LOSS).
    - `rg "preventDefault" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (context-loss e.preventDefault).
    - `rg "enableKeys = false" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (D-20-CONTEXT-KB-NOORBIT / MIN-02).
    - `rg "enableZoom = false" src/game/renderers/WebGLConstellation.js` returns ≥1 hit.
    - `rg "enablePan = false" src/game/renderers/WebGLConstellation.js` returns ≥1 hit.
    - `rg "touch-action" src/game/` returns ≥1 hit (MIN-03).
    - `rg "aria-hidden=\\\"true\\\"" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (MIN-04 preserved).
    - `rg "tabIndex=\\{-1\\}" src/game/renderers/WebGLConstellation.js` returns ≥1 hit (MIN-05 preserved).
    - `rg "forceSvgFallback" src/game/GameMode.js` returns ≥2 hits (useState + effectiveCapability conditional).
    - `rg "onFirstDrag" src/game/GameMode.js` returns ≥1 hit (callback wiring).
    - `rg "onContextLost" src/game/GameMode.js` returns ≥1 hit (D-20-CONTEXT-LOSS swap wiring).
    - `rg "cam-3d-hint-seen" src/game/GameMode.js` returns ≥1 hit (localStorage flag write in onFirstDrag callback).
    - `rg "OnboardingHint" src/game/GameMode.js` returns 0 hits (DEFERRED to 20-02b — explicit guard against premature integration).
    - `npm test` exits 0; ≥271 GREEN (Plan 20-01 baseline; no new tests in this task — Phase P checkpoint validates manually).
    - `npm run build` exits 0.
    - `node scripts/check-bundle-gate.mjs` exits 0; mobile chunk ≤38.82 kB gz; WebGL chunk reported (Plan 20-03 closes WARN band verdict).
    - `git log --oneline -1` shows `feat(20-02a): genuine 3D renderer — PerspectiveCamera + OrbitControls + shader size-attenuation + context-loss handlers + GameMode forceSvgFallback (D-20-VISUAL-3D, Alerts A2..A12)`.
  </acceptance_criteria>
  <done>
    Renderer ships genuine 3D + drag-to-rotate with damping + polar clamp + auto-rotate + pause-on-first-drag (permanent) + defensive RM gate + shader size-attenuation + edge alpha falloff + perspective-aware pick + silent context-loss swap via GameMode forceSvgFallback state. SVG mobile path UNCHANGED. RM users continue on SVG. Bundle-gate exits 0. 271+ tests GREEN. Hint pill NOT yet rendered (Plan 20-02b ships it). The `onFirstDrag` callback writes `cam-3d-hint-seen` defensively so when 20-02b lands, prior drags during the 20-02a interim correctly suppress the pill.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual visual smoke — 3D obvious frame 0, drag-rotate, auto-rotate, context-loss survival</name>
  <what-built>
    Plan 20-02a Task 1 just landed:
    - `PerspectiveCamera(55, aspect, 10, 2000)` replaced `OrthographicCamera`.
    - `OrbitControls` from `three/addons/controls/OrbitControls.js` with damping=0.06, rotateSpeed=0.6, polar clamp [π*0.15, π*0.85], `enableZoom/Pan/Keys = false`, autoRotateSpeed=0.5.
    - Defensive `prefers-reduced-motion` gate inside renderer; `controls.update()` is FIRST line of tick(); `controls.dispose()` is FIRST in cleanup.
    - VERTEX_SHADER size-attenuation with `clamp(1.0, 64.0)` and `uCanvasHeight`/`uFovRad` uniforms.
    - Pointer-pick rewritten via `Vector3.project(camera)` + depth-scaled radius.
    - `webglcontextlost` handler swaps to SVG silently via new `forceSvgFallback` useState in `GameMode.js`.
    - Canvas has `touch-action: none` + `cursor: grab/grabbing/pointer`.

    No hint pill yet (Plan 20-02b lands it). The `onFirstDrag` callback DOES write `cam-3d-hint-seen` to localStorage as defense-in-depth.
  </what-built>
  <how-to-verify>
    Run the dev server and capture results from a real capable-desktop browser. This checkpoint exists because jsdom cannot execute WebGL — the verifications below must happen against a real GPU.

    **Setup:**
    1. `npm run build && npx serve dist` (production build preferred so you see the lazy-chunk path). If `npx serve` is unavailable in the env, `npm run dev` is acceptable.
    2. Open on a capable desktop browser at viewport ≥ 1024px (Chrome stable on macOS recommended; Safari 17+ / Firefox stable acceptable).
    3. Confirm DevTools → Application → Local Storage shows NO `cam-3d-hint-seen` key (clear first if present).

    **Visual checks (record PASS/FAIL per item):**

    1. **Tilted 3D obvious frame 0** — Load page, wait for game-mode canvas to mount. Verify perspective foreshortening WITHOUT requiring drag — near nodes visibly larger than far nodes; constellation reads as 3D, not flat disc. Initial tilt ≈ 15° azimuth, ≈ 10° polar. Take a screenshot.

    2. **Auto-rotate idle spin** — Without touching anything, verify constellation spins CCW around vertical axis at ~30s/full revolution. No nodes pop in/out at clamp boundaries (autoRotate respects polar clamp, but with default config it rotates azimuth only).

    3. **Cursor state map** — Mousemove over canvas: cursor = `grab`. Mousemove over a node: cursor = `pointer`. Mousemove out of canvas: cursor = `default`.

    4. **Drag-rotate with damping + polar clamp** —
       - Mouse-down on canvas: cursor flips to `grabbing`.
       - Drag horizontally: constellation rotates around vertical axis with damping inertia.
       - Release mid-drag: damping coasts to stop in <1s.
       - Drag UP past polar clamp: camera halts at clamp angle (no snap-back, no upside-down view).
       - Drag DOWN past polar clamp: symmetric halt.
       - Release at any angle within clamp: constellation stays at release angle (no snap-back).

    5. **Auto-rotate permanent pause on first drag** — After any drag completes, verify auto-rotate STAYS paused for the session. Wait ≥10s without touching anything: still no rotation. Reload page: auto-rotate restarts (new session).

    6. **Auto-rotate hover/select pause** — Reload, let auto-rotate spin. Hover over a node: rotation pauses. Mouse out: rotation resumes (only because no drag has happened yet). Click a node (no drag) → ExperienceCard opens, rotation pauses. Close card → rotation resumes (still no drag yet).

    7. **prefers-reduced-motion path** — DevTools → Rendering → Emulate CSS media feature → prefers-reduced-motion: reduce → reload. Verify SVG path renders, NO WebGL canvas mounts, NO autoRotate, NO 3D depth. Console should have no errors.

    8. **Context-loss survival** — Reload (clear RM emulation first). With WebGL mounted: open DevTools → Rendering → Disable WebGL OR use a "Lose Context" extension OR manually invoke `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` in the console. Verify SVG path swaps in silently — no error banner, no aria-live shout, no layout shift, canvas slot replaced cleanly by SVG.

    9. **Click-to-select preserved (pre-Plan-20-03 baseline)** — Reload. Quick tap on a node (no movement): ExperienceCard opens (existing pointerup-based pick still fires; Plan 20-03 will tighten the threshold to 5px+250ms with the new `useClickVsDrag` hook). Click+drag past ~10px: ExperienceCard does NOT open; rotation only.

    10. **localStorage flag side-effect** — After first drag, DevTools → Application → Local Storage shows `cam-3d-hint-seen = "true"`. (Plan 20-02b will use this to suppress the hint pill on next visit.)

    Document any deviations in the resume signal. Screenshots optional but helpful.
  </how-to-verify>
  <resume-signal>Type "approved" if 10/10 visual checks pass. Otherwise list FAIL items with browser version + screenshot path so the next iteration can address them.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser pointer events → OrbitControls + canvas pick handlers | Untrusted DOM events from recruiter input cross into the renderer; gesture state machine arbitrates click vs drag |
| WebGL context lifecycle → React state | Browser may revoke GPU context under memory pressure; renderer must degrade silently to SVG via new GameMode forceSvgFallback state |
| three.js library code → bundle output | Plan 20-01 widened bundle-gate regex defends mobile chunk against any `three/...` leak; this plan's first OrbitControls import is the load-bearing test of that defense |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-20-02a-SC | Tampering / Supply-chain | First `three/addons/controls/OrbitControls.js` import in production code | mitigate | Plan 20-01 widened `THREE_JS_PATTERN` regex catches the import if it ever lands in mobile chunk. This plan verifies bundle-gate exits 0 against the post-build artifact. `node scripts/check-bundle-gate.mjs` runs in `<verify>` block and CI. |
| T-20-02a-DoS | Denial of Service | OrbitControls + rAF loop double-render | mitigate | CRIT-01 — `controls.update()` is FIRST line of `tick()`; FORBIDDEN to add `controls.addEventListener('change', renderer.render)`. Verified by `rg -v '^#' ... | rg -c "controls\.addEventListener\(['\"]change"` returning 0 hits. |
| T-20-02a-DoS-shader | Denial of Service | Shader size-attenuation extreme magnification | mitigate | CRIT-05 — `gl_PointSize` is `clamp(..., 1.0, 64.0)`. Defends against near-clip aggressive rotation causing canvas-sized blob fragments (overdraw). |
| T-20-02a-Repud | Repudiation | Pointer event arbitration | partial — Plan 20-03 completes | CRIT-02 — Plan 20-03 ships `useClickVsDrag` hook with deterministic threshold math (5px+250ms, 8px on touch). This plan integrates OrbitControls FIRST in the useEffect, leaving Plan 20-03's pick handler attachment SECOND. Current pointerup-based pick continues to work pre-20-03. |
| T-20-02a-XSS | XSS via context-loss fallback | webglcontextlost handler | mitigate | Handler calls `e.preventDefault()` only; no DOM injection, no innerHTML usage, no dangerouslySetInnerHTML. Silent SVG swap via new GameMode forceSvgFallback useState — no error banner, no inline error text. |
| T-20-02a-A11y | A11y regression | autoRotate vs prefers-reduced-motion | mitigate | CRIT-06 — defensive `controls.autoRotate = !prefersRM` inside renderer (belt-and-braces; useRendererCapability already routes RM to SVG). Phase 17 D-17-RM-GATE preserved. Lighthouse a11y re-verified in Plan 20-03 UAT. |
| T-20-02a-Privesc | Elevation of Privilege | Canvas keyboard focus / arrow-key conflict | mitigate | MIN-02 — `controls.enableKeys = false` preserves Phase 15 D-15-KB-ACTIVATE arrow-key node-focus walk. MIN-04/05 — canvas stays `aria-hidden="true"` + `tabIndex={-1}`; keyboard nav lives on `role="application"` wrapper unchanged. |

**No package install tasks in this plan** — uses already-installed `three@0.169.0`. No `[ASSUMED]`/`[SUS]` package gates required. Bundle-gate verification (T-20-02a-SC) is the load-bearing supply-chain check.
</threat_model>

<verification>
1. `npm test` exits 0; total GREEN ≥ 271 (Plan 20-01 baseline; this plan adds NO new tests — visual checkpoint validates renderer behavior).
2. `npm run build` succeeds; produces `dist/assets/GameMode-*.js` + `dist/assets/WebGLConstellation-*.js`.
3. `node scripts/check-bundle-gate.mjs` exits 0:
   - Mobile chunk ≤ 38.82 kB gz (Lighthouse HARD ceiling).
   - Mobile chunk contains NO `three/...` import string (Plan 20-01 regex defense holds against the first real OrbitControls import in production).
   - WebGL chunk reported (Plan 20-03 closes 3-tier ladder verdict).
4. Grep matrix from acceptance criteria — every regex must produce the expected hit counts.
5. Manual visual smoke checkpoint (Task 2) confirms all 10 narrative-frame moments.
6. `git log --oneline -1` shows the Task 1 commit.
</verification>

<success_criteria>
- [ ] `PerspectiveCamera(55, aspect, 10, 2000)` replaces `OrthographicCamera` at the tilted initial angle per D-20-CONTEXT-INITIAL-ANGLE.
- [ ] `OrbitControls` instantiated with the LOCKED config (damping 0.06, rotateSpeed 0.6, zoom/pan/keys disabled, polar clamp [π*0.15, π*0.85], autoRotateSpeed 0.5).
- [ ] `controls.update()` is FIRST line of `tick()`; NO `'change'` listener exists in `src/`.
- [ ] `positions[i*3+2] = pos.z ?? 0` write-through lands at line ~295 — CRIT-04 z=0 trap defended.
- [ ] VERTEX_SHADER has `uCanvasHeight` + `uFovRad` uniforms + `perspectiveScale / -mvPosition.z` formula + `clamp(..., 1.0, 64.0)`.
- [ ] EDGE shader has per-vertex angle-fade alpha multiplier (MOD-04 Option A); `edgeMaterial.depthWrite = false`.
- [ ] Pointer-pick uses `Vector3.project(camera)` + depth-scaled radius (MOD-08).
- [ ] OrbitControls `'start'` listener: sets `controls.autoRotate = false` (permanent), sets `dragHappenedRef.current = true`, fires `props.onFirstDrag?.()`.
- [ ] Defensive `controls.autoRotate = !prefersRM` at instantiation (CRIT-06 belt-and-braces).
- [ ] Hover/select autoRotate pause (MIN-01) gated by `dragHappenedRef.current` so it cannot un-pause after first drag.
- [ ] `webglcontextlost` handler: `e.preventDefault()` + `props.onContextLost?.()` — silent swap to SVG via GameMode forceSvgFallback (Alert A10 / D-20-CONTEXT-LOSS).
- [ ] `webglcontextrestored` handler: defensive no-op (stay on SVG once swapped — MOD-06).
- [ ] Cleanup disposes `controlsRef.current` FIRST, removes all event listeners, then existing GPU resources (Alert A4 / MOD-05).
- [ ] Canvas has `touch-action: none` (MIN-03) and `cursor` states `grab/grabbing/pointer` per UI-SPEC §"Cursor state map".
- [ ] Canvas stays `aria-hidden="true"` + `tabIndex={-1}` (MIN-04/05).
- [ ] `src/game/GameMode.js` has `forceSvgFallback` useState + `effectiveCapability` conditional; wires `onFirstDrag` and `onContextLost` callbacks to `<WebGLConstellation />`.
- [ ] `src/game/GameMode.js` does NOT yet import or render `<OnboardingHint />` (deferred to 20-02b).
- [ ] `tailwind.config.js` diff is empty (Alert A7 — keyframes not redefined).
- [ ] `npm test` ≥271 GREEN. `npm run build` succeeds. Bundle-gate exits 0.
- [ ] Manual visual smoke (Task 2 checkpoint) confirms 10/10 checks pass on a real capable-desktop browser.
- [ ] One atomic commit lands: `feat(20-02a): genuine 3D renderer — PerspectiveCamera + OrbitControls + shader size-attenuation + context-loss handlers + GameMode forceSvgFallback (D-20-VISUAL-3D, Alerts A2..A12)`.
</success_criteria>

<output>
Create `.planning/phases/20-3d-constellation/20-02a-SUMMARY.md` when done. SUMMARY must report:
- Final test count (target ≥271 GREEN — same as Plan 20-01 baseline; no new tests added).
- WebGL chunk size after build (target ≤130 kB gz; alarms if >125 kB gz so Plan 20-03 has lead-time).
- Mobile chunk size after build (target ≤8.91 kB gz unchanged).
- Bundle-gate exit status (must be 0).
- Manual visual smoke checkpoint result (Task 2) — list 10/10 PASS or document specific FAIL items with browser version + screenshot paths.
- Confirmation that D-20-VISUAL-3D + D-20-CONTEXT-INITIAL-ANGLE + D-20-CONTEXT-AUTOROTATE-RESUME + D-20-CONTEXT-LOSS are all backed by code (D-20-CONTEXT-HINT defers to Plan 20-02b).
- Confirmation that no `<OnboardingHint />` JSX or `t.game.hint.drag` keys leaked into this plan (boundary integrity for 20-02b's domain).
- Open items handed to Plan 20-02b: OnboardingHint component + tests + nested `t.game.hint.drag` i18n keys + GameMode pill slot conditional.
</output>
</content>
</invoke>