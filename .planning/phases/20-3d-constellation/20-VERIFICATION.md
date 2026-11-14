---
phase: 20-3d-constellation
verified: 2026-06-10T18:55:00Z
status: human_needed
score: 8/8 auto-verifiable truths VERIFIED; 4 visual/Lighthouse truths require operator UAT
overrides_applied: 0
human_verification:
  - test: "Tilted 3D obvious frame 0 — perspective foreshortening visible without drag"
    expected: "Front nodes visibly larger than back nodes; constellation reads as 3D not flat disc"
    why_human: "WebGL render output cannot be inspected in jsdom; requires real GPU + visual judgement (Success Criterion #1)"
  - test: "Drag-rotate damping + polar clamp feel"
    expected: "Cursor flips grab→grabbing; damping coast <1s; polar clamp halts without snap-back; release holds angle"
    why_human: "OrbitControls inertia + clamp are observable only in a live browser (Success Criterion #2)"
  - test: "Auto-rotate idle spin ~30s/orbit + permanent pause-on-first-drag"
    expected: "CCW rotation around vertical axis at ~30s/orbit; first drag stops autoRotate permanently for session"
    why_human: "rAF-driven cadence + dragHappenedRef latch behavior require real browser observation (Success Criterion #3)"
  - test: "Click-vs-drag in real browser (D-20-CLICK-DRAG-THRESHOLD UAT)"
    expected: "Quick click <5px+250ms opens ExperienceCard; drag >10px does not; touch threshold 8px"
    why_human: "Hook math is unit-tested but the integrated path with OrbitControls gesture state requires real pointer events (Success Criterion #4)"
  - test: "prefers-reduced-motion: reduce stays on SVG; Lighthouse a11y=100"
    expected: "DevTools emulate RM → SVG mounts, NO WebGL canvas, NO OnboardingHint pill"
    why_human: "Requires DevTools emulation + real Lighthouse run (Success Criterion #5)"
  - test: "Lighthouse mobile HARD gate verdict — Perf ≥95 / A11y 100 / BP 100 / SEO 100"
    expected: "npm run lighthouse:mobile && npm run lighthouse:check both exit 0; scores at or above HARD gate"
    why_human: "Requires real-device or headless-Chrome Lighthouse run + score capture (Success Criterion #6 — milestone HARD gate)"
  - test: "WebGL context-loss silent SVG swap"
    expected: "canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext() → SVG swaps in silently; no error banner"
    why_human: "Requires DevTools console invocation against real GPU (D-20-CONTEXT-LOSS)"
  - test: "OnboardingHint pill bilingual real-browser UAT"
    expected: "Pill fades in 800ms after canvas; bilingual EN/ES; click-dismiss writes flag; reload suppresses"
    why_human: "Tailwind motion-safe animation cadence + real localStorage persistence + theme tokens require live browser"
  - test: "Planets-tier visual distinction at depth + theme toggle"
    expected: "Top-6 nodes visibly larger with always-on halo; distinction holds under rotation + theme toggle"
    why_human: "Visual hierarchy under perspective + dark/light theme is an observable visual judgement"
  - test: "v3.9 carried debt — above-fold + SVG ambient twinkle real-device confirm"
    expected: "Real iPhone 14 / Pixel 7 above-fold layout reads; desktop SVG twinkle visible motion-safe"
    why_human: "Real-device sweep required (CONTEXT §deferred); already bundled into 20-UAT.md"
---

# Phase 20: 3D Constellation Verification Report

**Phase Goal:** Recruiter on a capable desktop sees a genuine 3D skill constellation with drag-to-rotate that they cannot get from any other personal portfolio — the existing 117 kB gz three.js lazy chunk finally earns its bundle cost, while mobile SVG path stays untouched and Lighthouse mobile HARD gate stays cleared.

**Verified:** 2026-06-10T18:55:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

The phase goal decomposes into 8 must-haves from PLAN frontmatter + 7 ROADMAP Success Criteria. Code-layer truths are VERIFIED via grep + test-suite + bundle-gate. Visual/behavioral truths require operator UAT.

| # | Truth (from ROADMAP SC + PLAN must_haves) | Status | Evidence |
|---|------|--------|----------|
| 1 | Genuine 3D with PerspectiveCamera(55, aspect, 10, 2000) replacing OrthographicCamera; foreshortening visible (SC #1) | VERIFIED (code) / HUMAN (visual) | `src/game/renderers/WebGLConstellation.js:4,335` — `PerspectiveCamera(55, aspect, 10, 2000)` imported + instantiated; `rg "OrthographicCamera" src/game/renderers/WebGLConstellation.js` → 0 hits; visible foreshortening requires real GPU |
| 2 | OrbitControls drag-to-rotate with dampingFactor=0.06, rotateSpeed=0.6, polar clamp [π·0.15, π·0.85], autoRotateSpeed=0.5; cursor grab→grabbing; permanent pause on first drag (SC #2 + #3) | VERIFIED (code) / HUMAN (feel) | `src/game/renderers/WebGLConstellation.js:14,369-378` — `import { OrbitControls } from 'three/addons/controls/OrbitControls.js'`; `dampingFactor=0.06`, `rotateSpeed=0.6`, `enableZoom=false`, `enablePan=false`, `enableKeys=false`, `minPolarAngle=Math.PI*0.15`, `maxPolarAngle=Math.PI*0.85`, `autoRotateSpeed=0.5`; permanent-pause latch via `dragHappenedRef`; feel verification needs real browser |
| 3 | CATEGORY_Z layout returns {x, y, z}; ≥2 distinct z + range ≥100; bounded [-200, +200] | VERIFIED | `src/game/constellation.layout.js:23-32,78,90` — 8-category map (ai=150…hardware=-150); `?? 0` fallback at both assignment sites; 5 z-storytelling tests in `src/game/constellation.layout.test.js:105-152` (z numeric, clustered by category, ≥2 distinct + range ≥100 per CRIT-04, range bounded [-200,200] per MOD-01, deterministic) — all GREEN |
| 4 | Click-vs-drag arbitration (5px mouse / 8px touch / 250ms); preserves GAME-04 (SC #4) | VERIFIED (code+unit) / HUMAN (integration) | `src/game/useClickVsDrag.js:9-11` — `DIST_THRESHOLD_MOUSE=5`, `DIST_THRESHOLD_TOUCH=8`, `TIME_THRESHOLD_MS=250` constants present; `pointerType === 'touch'` branch line 37; 6 unit tests in `useClickVsDrag.test.js`; wired into renderer at `WebGLConstellation.js:15,311`; `rg "addEventListener\(['\"]click" src/game/renderers/WebGLConstellation.js` → 0 hits (legacy listener removed); real-pointer integration UAT pending |
| 5 | Bundle-gate 3-tier ladder (WEBGL_SOFT_CEIL_KB=125, WEBGL_WARN_KB=130, HARD FAIL >130 via process.exit(1)); regex catches three/addons/* | VERIFIED | `scripts/check-bundle-gate.mjs:12` — widened `THREE_JS_PATTERN = /THREE\.|from\s*['"]three(\/[^'"]+)?['"]/`; lines 22-25 declare all 4 constants `WEBGL_SOFT_CEIL_KB=125`, `WEBGL_WARN_KB=130`, `WEBGL_HARD_KB=130`, `WEBGL_TTI_WARN_KB=60`; HARD FAIL throws at line 68 → CLI catch at line 97-100 calls `process.exit(1)`; 5 regression tests in `src/scripts/check-bundle-gate.test.mjs` all GREEN |
| 6 | Mobile SVG path UNCHANGED; mobile chunk ≤38.82 kB gz; no three.js leak (SC #6) | VERIFIED | Bundle gate ran live this session: `GameMode-FYwrZFgR.js = 9.46 kB gz PASS`; mobile chunk does NOT contain any `three/...` import string (regex defense holds); `src/game/renderers/SvgConstellation.js` does NOT reference `pos.z` (D-20-PROPS-CONTRACT — silently ignores z); `isPlanet` is the only Phase-20 prop consumed by SVG (visually adds halo + larger radius for top-K) |
| 7 | webglcontextlost/restored handlers swap to SVG via GameMode forceSvgFallback | VERIFIED | `WebGLConstellation.js:400-408` — `onContextLost(e)` calls `e.preventDefault()` then invokes `onContextLostProp`; both event listeners attached + removed in cleanup (lines 599-600); `GameMode.js:49-50,63,150` — `forceSvgFallback` useState + `effectiveCapability = forceSvgFallback ? 'svg' : capability` derived value + `onContextLost = () => setForceSvgFallback(true)` callback wiring |
| 8 | Planets-tier (D-20-PLANETS-TIER) — top-K=6 isPlanet flag in graph; both renderers apply larger radii + halos | VERIFIED | `src/game/constellation.graph.js:16,72-76` — `PLANETS_K=6` exported; sort by count desc + tiebreak by id asc; `planetIds` Set; `isPlanet` spread on final nodes; WebGL `SIZING.desktop_planet={floor:24,ceil:40}` + `sizes[i] = computeRadius(..., isPlanet ? 'desktop_planet' : 'desktop')` (line 467) + `halos[i] = (isPlanet || selected) ? 1.0 : 0.0` (line 471, also at theme-reactive re-upload line 664); SVG mirrors with `sizingKey` + `haloFilter` (lines 265,283) |
| 9 | OnboardingHint (D-20-CONTEXT-HINT) — bilingual pill; nested t.game.hint.drag (NOT flat); GameMode slot | VERIFIED | `src/game/OnboardingHint.js` — 121 LOC `<button type="button">` with `min-h-[44px]` (line 109), `motion-safe:animate-fade-in` (line 113), 800ms fade-in + 5s auto-dismiss timers; nested key in `translations.js:33-34` (EN `hint: { drag: 'drag to rotate' }`) and `:252-253` (ES `hint: { drag: 'arrastra para rotar' }`); `rg "hintDrag" src/i18n/translations.js` → 0 hits (Alert A13 satisfied); `GameMode.js:17,156` imports + renders `{effectiveCapability === 'webgl' && <OnboardingHint t={t} />}`; 6 fake-timer tests in `OnboardingHint.test.js` |
| 10 | Test count ≥293 GREEN (post-merge baseline) | VERIFIED | `npx vitest run` executed this session: **293/293 tests passing across 22 test files**, duration 2.26s, exit 0 |
| 11 | UAT scaffold (20-UAT.md) with 8 items + Lighthouse mobile row + v3.9 carried debt section | VERIFIED | `.planning/phases/20-3d-constellation/20-UAT.md` exists with YAML front-matter, `## Scope`, `## Environment`, `## Test Matrix` (8 numbered items), `### v3.9 above-fold real-device confirm`, `### v3.9 SVG ambient twinkle real-device confirm`, `## Lighthouse Mobile` row table, `## Bundle Gate Verification`, `## Pass Criteria`, `## Summary` counters, `## Notes / Findings`, `## Gaps` sections |
| 12 | Lighthouse mobile HARD gate Perf ≥95 / A11y 100 / BP 100 / SEO 100 (SC #6) | HUMAN | `20-UAT.md` ## Test Matrix Item 6 + Lighthouse Mobile table both pending operator pass; cannot run `npm run lighthouse:mobile` against a static build from this agent session |
| 13 | RM users continue on SVG; WCAG 2.1 AA contrast preserved (SC #5) | VERIFIED (defensive code) / HUMAN (visual+a11y audit) | `OnboardingHint.js:37-54` defensive RM gate via `usePrefersReducedMotion`; `WebGLConstellation.js` uses `prefersRM` to set `controls.autoRotate=!prefersRM`; useRendererCapability (Phase 17 contract) already routes RM users to SVG; Lighthouse a11y verdict pending operator UAT Item 5 |

**Score:** 8/8 auto-verifiable truths VERIFIED; 5 visual/Lighthouse truths require operator UAT (mirrored into `human_verification` frontmatter)

### Required Artifacts

Mapping PLAN frontmatter must_haves.artifacts to filesystem state.

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/constellation.layout.js` | CATEGORY_Z + computeLayout returns {x,y,z} | VERIFIED | 97 LOC; CATEGORY_Z block at lines 23-32; `?? 0` fallback present at both lines 78 + 90; JSDoc `@returns {Object} Map of node.id → { x, y, z }` at line 38 |
| `src/game/constellation.layout.test.js` | 3+ z-storytelling tests | VERIFIED | 5 new tests under `describe('computeLayout - z storytelling (D-20-CONTEXT-ZMAP)')` at line 105 |
| `scripts/check-bundle-gate.mjs` | Widened regex + named export + 3-tier ladder | VERIFIED | Line 12 `export const THREE_JS_PATTERN = /THREE\.|from\s*['"]three(\/[^'"]+)?['"]/`; constants `WEBGL_SOFT_CEIL_KB=125`, `WEBGL_WARN_KB=130`, `WEBGL_HARD_KB=130`, `WEBGL_TTI_WARN_KB=60` at lines 22-25; throw → CLI catch → `process.exit(1)` |
| `src/scripts/check-bundle-gate.test.mjs` | Regex Vitest tests | VERIFIED | 5 it() cases under `src/` so Vitest default discovery picks them up; all GREEN |
| `src/game/renderers/WebGLConstellation.js` | PerspectiveCamera + OrbitControls + Vector3 pick + size-attenuation + context-loss + useClickVsDrag wiring + isPlanet planet band | VERIFIED | 970 LOC; all 12 expected grep hits found (camera, controls, vector3, perspective scale, gl_PointSize clamp, webglcontextlost, touch-none, aria-hidden, tabIndex, useClickVsDrag, isPlanet, desktop_planet) |
| `src/game/renderers/SvgConstellation.js` | Mobile/RM path; consumes isPlanet but NOT pos.z | VERIFIED | 405 LOC; `pos.z` references → 0 hits (D-20-PROPS-CONTRACT silent z-ignore); `isPlanet` references at lines 23, 24, 265, 283 (SIZING bands + sizingKey + haloFilter); rest of SVG path UNCHANGED visually for mobile users |
| `src/game/GameMode.js` | forceSvgFallback + OnboardingHint slot + onFirstDrag + onContextLost | VERIFIED | 181 LOC; `forceSvgFallback` useState (line 49); `effectiveCapability` (line 50); `onFirstDrag` writes `cam-3d-hint-seen` localStorage (lines 56-62); `onContextLost = setForceSvgFallback(true)` (line 63); `<OnboardingHint t={t} />` slot at line 156 gated on `effectiveCapability === 'webgl'` |
| `src/game/OnboardingHint.js` | Bilingual pill with fade-in/auto-dismiss/RM gate/44x44 touch target | VERIFIED | 121 LOC; `STORAGE_KEY = 'cam-3d-hint-seen'` (line 23); `FADE_IN_DELAY_MS=800`, `AUTO_DISMISS_MS=5000` (lines 24-25); `usePrefersReducedMotion` (lines 37-54); `<button type="button">` with `min-h-[44px]` + `motion-safe:animate-fade-in` (lines 102-118) |
| `src/game/constellation.graph.js` | PLANETS_K + isPlanet derivation | VERIFIED | 103 LOC; `export const PLANETS_K = 6` at line 16; UAT-tunable comment block at lines 11-15; sort + planetIds Set + `isPlanet` spread at lines 72-76 |
| `src/i18n/translations.js` | Nested t.game.hint.drag EN/ES | VERIFIED | EN at lines 33-34, ES at lines 252-253; both lowercase, no trailing period; `hintDrag` flat key absent |
| `src/game/useClickVsDrag.js` | Pure hook with locked thresholds | VERIFIED | 45 LOC; `DIST_THRESHOLD_MOUSE=5`, `DIST_THRESHOLD_TOUCH=8`, `TIME_THRESHOLD_MS=250` (lines 9-11); `pointerType === 'touch'` branch (line 37); jsdom-defensive `typeof performance !== 'undefined'` guards |
| `.planning/phases/20-3d-constellation/20-UAT.md` | 8-item scaffold + v3.9 carried + Lighthouse mobile row | VERIFIED | All required sections present per PLAN 20-03 §interfaces UAT scaffold template |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `constellation.layout.js` CATEGORY_Z | `WebGLConstellation.js` `positions[i*3+2]` write | `pos.z ?? 0` fallback at line 462 | WIRED | Z value flows from layout pure function to GPU buffer attribute |
| `useClickVsDrag` hook | Renderer pick path | `useClickVsDrag` consumed at WebGLConstellation:15,311 BEFORE `onSelectSkill` fires (line 311 `useClickVsDrag({ onClick: ... })`) | WIRED | Hook arbitrates click vs drag in pointer-space; legacy `'click'` listener removed (0 grep hits) |
| Bundle-gate regex | First `three/addons/*` import in production code | `WebGLConstellation.js:14 import { OrbitControls } from 'three/addons/controls/OrbitControls.js'` would be caught if it leaked to mobile chunk | WIRED | Build artifact verified: `GameMode-*.js` does NOT contain `three/...` import strings (gate exits 0) |
| `controls.update()` | First line of `tick()` rAF loop | `tick(t)` line 916-920: `if (controlsRef.current) controlsRef.current.update()` is the FIRST executable statement | WIRED | CRIT-01 / D-17-FRAMELOOP single rAF preserved; no `'change'` listener anywhere (forbidden pattern grep → 0 hits) |
| OrbitControls 'start' event | `onFirstDrag` callback + autoRotate permanent pause | Plan 20-02a wired this; permanent latch via `dragHappenedRef` | WIRED | Code path present per `addEventListener('start', ...)` in WebGLConstellation; integration UAT pending operator (real drag-event in browser) |
| `webglcontextlost` handler | `GameMode forceSvgFallback` state | `WebGLConstellation.js:400-408` → `onContextLostProp?.()` → `GameMode.js:63 setForceSvgFallback(true)` → `effectiveCapability` flips to `'svg'` | WIRED | Code path complete; behavioral UAT pending operator (DevTools loseContext invocation) |
| `onFirstDrag` callback | `cam-3d-hint-seen` localStorage flag | `GameMode.js:56-62` try/catch-guarded localStorage write | WIRED | Defensive cross-session suppression for OnboardingHint reads at next mount |
| `OnboardingHint` pill | `t.game.hint.drag` i18n key | `OnboardingHint.js:95 const copy = t?.game?.hint?.drag ?? ''` (nested namespace per Alert A13) | WIRED | Nested key resolves; bilingual EN/ES values present |
| `buildConstellationGraph` `isPlanet` | Both renderers (halos + sizes) | `node.isPlanet` flows as part of GRAPH_NODES; WebGL reads at lines 467+471+664; SVG reads at lines 265+283 | WIRED | GAME-01 props-contract preserved (single shape, divergent pixels) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| WebGLConstellation | `positions[i*3+2]` (z attribute) | `LAYOUT[node.id].z` from `computeLayout(GRAPH_NODES)` (computed at GameMode.js:26 module-load) | Yes — CATEGORY_Z lookup yields 8 distinct values in [-150, +150] across nodes | FLOWING |
| OnboardingHint | `t.game.hint.drag` copy | `useLanguage()` → `t` prop → `translations[lang].game.hint.drag` | Yes — nested key resolves to "drag to rotate" / "arrastra para rotar" | FLOWING |
| GameMode renderer slot | `effectiveCapability` | `forceSvgFallback ? 'svg' : capability` where `capability` is `useRendererCapability()` (Phase 17 contract) | Yes — flows to renderer-slot conditional + OnboardingHint gate | FLOWING |
| WebGLConstellation `isPlanet` | `halos[i]` + `sizes[i]` GPU attributes | `node.isPlanet` from `buildConstellationGraph` (top-K=6 set lookup) | Yes — top-6 by count get larger radii + always-on halo; both initial-setup AND theme-reactive re-upload paths gate on isPlanet | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Vitest suite GREEN | `npx vitest run` | 293/293 tests passing across 22 files; duration 2.26s; exit 0 | PASS |
| Bundle gate exits 0 | `node scripts/check-bundle-gate.mjs` | Output: `PASS: GameMode-FYwrZFgR.js = 9.46 kB gz` + `INFO: WebGLConstellation-DiC1C-QX.js = 122.63 kB gz > 60 kB gz baseline`; exit code 0 | PASS |
| Mobile chunk has NO three.js leak | Regex check inside bundle-gate | Bundle-gate completed without throw; `THREE_JS_PATTERN.test(mobileBuf.toString())` returned false | PASS |
| WebGL chunk tier classification | Bundle-gate output | 122.63 kB gz falls into INFO baseline tier (60 < x ≤ 125) — under SOFT_CEIL=125 and under HARD=130 | PASS |
| Mobile chunk size | Bundle-gate output | 9.46 kB gz, well under HARD ceiling 38.82 kB | PASS |
| Lighthouse mobile HARD gate verdict | `npm run lighthouse:mobile && npm run lighthouse:check` | Not run in this session (operator-only step) | SKIP — routed to human |
| Real-browser drag-rotate feel | Manual UAT | Not executable from this session | SKIP — routed to human |

### Probe Execution

N/A — Phase 20 is not a migration/CLI tooling phase; PLAN documents do not declare `scripts/*/tests/probe-*.sh` paths. The bundle-gate script `scripts/check-bundle-gate.mjs` is invoked above as the load-bearing supply-chain check and exits 0.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| **DEPTH-01** | 20-01-PLAN, 20-02a-PLAN, 20-02b-PLAN, 20-03-PLAN frontmatter `requirements: [DEPTH-01]` | "Genuine 3D constellation on WebGL desktop renderer: OrthographicCamera→PerspectiveCamera(fov=55), CATEGORY_Z {x,y,z}, OrbitControls drag-to-rotate, autoRotate, click-vs-drag threshold, VERTEX_SHADER size-attenuation, cursor grab/grabbing, OnboardingHint bilingual pill, webglcontextlost handlers, props-contract {x,y,z}, mobile SVG path UNCHANGED, RM users on SVG" (REQUIREMENTS.md lines 13-25) | PARTIAL SATISFIED — automated portions verified; final closure pending operator UAT 8/8 + Lighthouse mobile HARD gate | All 4 PLAN files declare `requirements: [DEPTH-01]` in YAML frontmatter; all 7 ROADMAP Success Criteria for Phase 20 mapped to code + tests above; SC #5 (RM/a11y) + SC #6 (Lighthouse mobile gate) + SC #1/#2/#3 (visual perspective + drag feel + autoRotate cadence) require operator UAT |

REQUIREMENTS.md line 100-101 traceability: `DEPTH-01 | Phase 20 | Pending`. No orphaned requirements for Phase 20 detected.

### Anti-Patterns Found

Modified-files anti-pattern scan against Phase-20 commit history. Files scanned: `src/game/constellation.layout.js`, `src/game/useClickVsDrag.js`, `src/game/OnboardingHint.js`, `src/game/constellation.graph.js`, `src/game/GameMode.js`, `src/game/renderers/WebGLConstellation.js`, `src/game/renderers/SvgConstellation.js`, `src/i18n/translations.js`, `scripts/check-bundle-gate.mjs`, `.planning/phases/20-3d-constellation/20-UAT.md`.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/game/renderers/WebGLConstellation.js` | comments only | "FORBIDDEN to add controls.addEventListener('change'…) — would double-render per CRIT-01" appears in source comments as documentation, not active code | INFO | This is the intentional Alert A3/CRIT-01 guard comment per SUMMARY 20-02a §"Forbidden-grep false positives" — rewritten to avoid matching its own forbidden pattern. Verified harmless. |
| `src/game/constellation.graph.js` | 5 | `// TODO(WR-02): bump CURRENT_YEAR at the start of each calendar year` | INFO | Pre-existing tech debt from Phase 14; references formal follow-up `WR-02` ticket; not introduced by Phase 20 |

No `TBD`, `FIXME`, `XXX`, hardcoded-empty-state stubs, placeholder copy, or console.log-only implementations found in Phase-20-modified files. Debt-marker gate PASSED — the only TODO references a formal follow-up identifier (`WR-02`).

### Human Verification Required

Items requiring operator UAT pass before milestone v3.10 can close. Mirror of `20-UAT.md` test matrix + Lighthouse + v3.9 carried debt. Status authoritative source: `20-UAT.md ## Notes / Findings` (currently empty — operator must populate).

#### 1. Tilted 3D obvious at frame 0 (SC #1)

**Test:** Load production build on Chrome stable / macOS at ≥1024px viewport; screenshot first paint.
**Expected:** Perspective foreshortening visible without drag — near nodes larger than far nodes; constellation reads as 3D, not flat disc.
**Why human:** WebGL shader output cannot be inspected in jsdom; foreshortening is a visual judgement that requires a real GPU.

#### 2. Drag-rotate with damping + polar clamp (SC #2)

**Test:** Mouse-down on canvas → drag horizontal + vertical → release at clamp boundary → release mid-drag.
**Expected:** Cursor flips `grab` → `grabbing` → `grab`; rotation has damping inertia (<1s coast to stop); polar clamp halts without snap-back; constellation stays at release angle within clamp.
**Why human:** OrbitControls damping coefficient + clamp behavior require real pointer events + browser-side rAF.

#### 3. Auto-rotate idle spin + permanent pause-on-first-drag (SC #3, D-20-CONTEXT-AUTOROTATE-RESUME)

**Test:** Fresh page load → observe spin → drag once → wait ≥10s → reload.
**Expected:** ~30s/orbit CCW spin around vertical axis at frame 0; first drag stops auto-rotate permanently for the session; reload restarts auto-rotate.
**Why human:** rAF-driven cadence + dragHappenedRef latch behavior require live observation.

#### 4. Click selects, drag does not — D-20-CLICK-DRAG-THRESHOLD (SC #4)

**Test:** Quick click ≤5px movement / ≤250ms → ExperienceCard opens; drag ≥10px → does NOT open. Touch emulation 7px tap → opens (8px threshold); 9px swipe → no select.
**Expected:** GAME-04 click-to-select preserved under OrbitControls gesture state; touch capacitive jitter (MOD-03) absorbed at 8px.
**Why human:** Hook math is unit-tested in jsdom (6 tests GREEN); the integrated path with OrbitControls in a real browser requires pointer-event sequence verification.

#### 5. prefers-reduced-motion path preserved (SC #5)

**Test:** DevTools → Rendering → Emulate prefers-reduced-motion: reduce → reload.
**Expected:** SVG path renders; NO WebGL canvas mounts; NO OnboardingHint pill; SVG ambient twinkle (Phase 19) suppressed; Lighthouse a11y = 100.
**Why human:** Requires DevTools emulation + Lighthouse run; WCAG 2.1 AA contrast check is an accessibility audit.

#### 6. Mobile SVG path UNCHANGED + Lighthouse mobile HARD gate (SC #6 — MILESTONE HARD GATE)

**Test:** `npm run lighthouse:mobile && npm run lighthouse:check`. Record all 4 scores in `20-UAT.md` Lighthouse Mobile table.
**Expected:** Both commands exit 0; Performance ≥0.95 / Accessibility =1.00 / Best Practices =1.00 / SEO =1.00. Mobile chunk gz ≈ 9.46 kB unchanged.
**Why human:** Lighthouse run requires a real (or headless) browser audit; this is the load-bearing milestone HARD gate that determines v3.10 close.

#### 7. Planets-tier visual hierarchy on BOTH renderers (D-20-PLANETS-TIER)

**Test:** On WebGL path: confirm top-K=6 nodes render with halos + larger radii by default (no selection required). On SVG path: same 6 nodes render with halos + larger radii. Verify under depth rotation + theme toggle.
**Expected:** Visible visual hierarchy; planet/star distinction holds at all depths and themes.
**Why human:** Visual judgement under perspective + theme tokens require live browser.

#### 8. OnboardingHint bilingual pill (D-20-CONTEXT-HINT)

**Test:** Clear `cam-3d-hint-seen` → load page → wait 800ms → see pill; toggle EN ↔ ES → copy reflows; drag canvas → pill dismisses or 5s auto-dismiss → reload → no pill.
**Expected:** Bilingual nested copy "drag to rotate" / "arrastra para rotar"; localStorage suppression on reload; pill never shown under prefers-reduced-motion.
**Why human:** Tailwind motion-safe animation + real localStorage persistence + bilingual switch require live browser pass.

#### 9. WebGL context-loss silent SVG swap (D-20-CONTEXT-LOSS)

**Test:** DevTools console → `document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` on a capable desktop.
**Expected:** SVG path swaps in silently — no error banner, no aria-live announcement, no zombie pill over SVG.
**Why human:** Requires DevTools console invocation + real GPU context.

#### 10. v3.9 carried deferred items (per CONTEXT §deferred)

**Test:** Open production build on real iPhone 14 / Pixel 7 (above-fold layout); open on real desktop without prefers-reduced-motion (SVG ambient twinkle).
**Expected:** SkillFilters fixed `bottom-0 z-30`, H1 compact, renderer slot fills `flex-1`; ambient twinkle visible motion-safe.
**Why human:** Real-device sweep — bundled per CONTEXT §deferred + 20-UAT.md.

### Gaps Summary

No code-layer gaps blocking goal achievement. All 8 PLAN frontmatter must-haves and all 7 ROADMAP Success Criteria that admit static verification are VERIFIED. The remaining gates are visual-behavioral truths that explicitly require operator UAT — specifically the milestone HARD gate (Lighthouse mobile Perf ≥95 / A11y 100 / BP 100 / SEO 100, SC #6) cannot be programmatically asserted from this agent session.

Per 20-UAT.md `## Summary`: `pending: 12` rows, `passed: 0`, `issues: 0`. Operator-pending items are tracked in `20-UAT.md ## Notes / Findings` (currently empty) and recorded above under `human_verification` frontmatter.

**Recommendation:** Do NOT mark milestone v3.10 closed until:
1. `20-UAT.md` `## Notes / Findings` is populated by operator with PASS/FAIL per item.
2. Lighthouse Mobile table populated with the 4 score values + verdict.
3. v3.9 carried debt rows documented as PASS or `operator-pending`.

Status `human_needed` is the correct verdict — automated checks all PASS, but the phase goal includes load-bearing visual/Lighthouse claims that need real-browser confirm.

---

_Verified: 2026-06-10T18:55:00Z_
_Verifier: gsd-verifier_
