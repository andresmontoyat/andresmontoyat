---
phase: 17-webgl-desktop-renderer-lighthouse-gate
verified: 2026-06-03T23:35:00-05:00
status: passed
score: 5/5 must-haves verified (SC-1, SC-2, SC-3, SC-4, SC-5 all PASS) + UAT 9/9 pass
sc2_fixed: "commit 79991a3 — RendererErrorBoundary fallback now <SvgConstellation {...rendererProps}/>; SC-2 regression test added; 253/253 GREEN"
sc4_verified: "2026-06-06 — npm run lighthouse:mobile && npm run lighthouse:check exit 0 (Perf ≥95 / A11y 100 / BP 100 / SEO 100). Phase 17 HARD gate passed."
re_verification: true
overrides_applied: 0
gaps:
  - truth: "SC-2 — WebGL init failure falls back to the SVG renderer via an ErrorBoundary, never a broken screen"
    status: partial
    reason: |
      RendererErrorBoundary itself works (sticky, logs `[renderer-fallback]`, swaps to its `fallback` prop on
      caught error — proven by 4 GREEN tests in RendererErrorBoundary.test.js). HOWEVER, GameMode.js:132 passes
      `errorFallbackUI` (the Phase 15 "Switch to dev mode" anchor link) as the boundary's fallback — NOT
      `<SvgConstellation {...rendererProps} />` as mandated by 17-UI-SPEC.md lines 311-315, 340-343, 450-454
      AND explicitly stated as Pattern from 17-01-SUMMARY.md line 33 ("ErrorBoundary fallback = SvgConstellation
      per Pitfall 12 (chunk-fetch + shader-compile + ctx-init all degrade gracefully)").
      The Slice 1 GREEN commit message a8bf568 confirms this divergence verbatim. On a real WebGL chunk-fetch
      failure / shader-compile error / context-init failure in production, the user sees a dev-mode-switch link
      instead of a seamless SVG fallback. This directly contradicts SC-2's "never a broken screen" promise —
      the silent fallback path is the headline contract.
      Note: Suspense fallback IS correctly wired to `<SvgConstellation {...rendererProps} />` at GameMode.js:141,
      so lazy-chunk pending state degrades gracefully. The gap is strictly the ErrorBoundary slot, which catches
      the post-load shader/context/runtime errors plus chunk-fetch network errors that escape Suspense.
    artifacts:
      - path: "src/game/GameMode.js"
        issue: "line 132: <RendererErrorBoundary fallback={errorFallbackUI}> passes a 'Switch to dev mode' UI instead of SvgConstellation; lines 68-79 define errorFallbackUI as the carry-over Phase 15 dev-mode-switch JSX"
    missing:
      - "Change GameMode.js:132 from `fallback={errorFallbackUI}` to `fallback={<SvgConstellation {...rendererProps} />}` (matching Suspense fallback at line 141 and UI-SPEC lines 311-315)"
      - "Optionally keep `errorFallbackUI` for a different concern (e.g., a HARD failure where even SvgConstellation could not render — surrounding boundary outside the renderer slot) — but the inner renderer-fallback boundary MUST hand back SvgConstellation per the SC-2 contract"
      - "Add a GameMode.test.js case asserting that when the WebGL child throws, the rendered output contains an svg element (the SVG fallback DOM), not the 'Switch to dev mode' button"
human_verification:
  - test: "SC-4 — Lighthouse mobile HARD gate (BLOCKER 3 flow)"
    expected: "`npm run lighthouse:mobile && npm run lighthouse:check` exits 0; scores: Perf ≥ 0.95, A11y = 1.0, BP = 1.0, SEO = 1.0, target-size audit = 1"
    why_human: "Requires a real Chrome headless run against the prod build preview server (port 4173) with simulated mobile throttling. Programmatic to assert score thresholds via lighthouse:check exit code, but the underlying run cannot be invoked from this verifier session safely (would conflict with other dev work). Captured in 17-UAT.md Test 1 — Test 1 is the SC-4 HARD gate; non-zero exit blocks v3.8 close. Run before signing off Phase 17."
  - test: "17-UAT.md Test 2 — Visual parity SVG ↔ WebGL at desktop ≥ 1024px (both themes)"
    expected: "26 nodes at identical positions, same category colors, edges visible at matching opacities, theme toggle correct on both renderers"
    why_human: "Visual side-by-side comparison."
  - test: "17-UAT.md Test 3 — Ambient motion quality (drift, glow pulse, halo brighten)"
    expected: "Subtle drift; halo pulses at ~2s on selected; ~3s decoupled brighten on highlighted; no strobing"
    why_human: "Perceptual motion quality."
  - test: "17-UAT.md Test 4 — Live swap on resize across 1024px"
    expected: "Renderer swap in both directions preserves the selected node halo / ExperienceCard"
    why_human: "Browser window resize behavior."
  - test: "17-UAT.md Test 5 — URL override `?renderer=svg|webgl`"
    expected: "URL param overrides capability detection in both directions, including on tablet"
    why_human: "Real-browser URL navigation."
  - test: "17-UAT.md Test 6 — WebGL context loss → ErrorBoundary SVG fallback (chrome://gpucrash)"
    expected: "Silent swap to SVG with `[renderer-fallback]` console log"
    why_human: "GPU crash simulation requires Chrome's chrome://gpucrash internal URL. NOTE: this test's expected behavior depends on the SC-2 gap (above) being closed FIRST — currently the fallback is the 'Switch to dev mode' link, not SvgConstellation."
  - test: "17-UAT.md Test 7 — prefers-reduced-motion → SVG path"
    expected: "OS-level reduced-motion toggle routes desktop user to SvgConstellation without `[renderer-fallback]` log"
    why_human: "OS accessibility setting toggle."
  - test: "17-UAT.md Test 8 — Save-Data → SVG path"
    expected: "DevTools Save-Data emulation routes user to SvgConstellation"
    why_human: "DevTools network throttling toggle."
  - test: "17-UAT.md Test 9 — FPS counter visible in dev / tree-shaken in prod"
    expected: "Visible in `npm run dev`; `grep -c FpsCounter dist/assets/*.js` == 0 (already programmatically confirmed in this run — 0 matches)"
    why_human: "Visual confirmation that the widget renders in dev (the tree-shake half is already verified programmatically by this report)."
---

# Phase 17: WebGL Desktop Renderer & Lighthouse Gate Verification Report

**Phase Goal:** Desktop visitors get the full WebGL "wow" constellation as a lazy-loaded enhancement plugged into the same contract — without ever risking the Lighthouse mobile HARD gate, which is re-verified at the close.
**Verified:** 2026-06-03T23:35:00-05:00
**Status:** gaps_found
**Re-verification:** No — initial verification.

## Executive Summary

The phase ships **substantially complete** WebGL infrastructure: a reactive 4-gate `useRendererCapability` hook (12 tests), a sticky `RendererErrorBoundary` with `[renderer-fallback]` log prefix (4 tests), a full-fidelity `WebGLConstellation` renderer (41 tests, including chip-flash, weight-1 edge reveal, theme reactivity, rAF loop with visibility pause, ambient drift, pointer-pick hover/click callbacks), a dev-only `FpsCounter` (3 tests, tree-shaken from prod), and a programmatic bundle gate (`scripts/check-bundle-gate.mjs`, 6 tests).

**252/252 tests GREEN. `npm run build` succeeds. `npm run build:gate` exits 0** with mobile GameMode chunk = **8.91 kB gz** (well under 38.82 kB SC-3 ceiling) and three.js **physically absent** from the mobile chunk (verified by `rg "from\\s*['\"]three['\"]" dist/assets/GameMode-*.js` → 0 matches; only `WebGLConstellation-*.js` chunk contains the import).

**One BLOCKER:** `GameMode.js:132` passes `errorFallbackUI` (a "Switch to dev mode" anchor link) as the `RendererErrorBoundary`'s fallback rather than `<SvgConstellation {...rendererProps} />`. This contradicts:

1. ROADMAP SC-2: "a WebGL init failure falls back to the SVG renderer via an ErrorBoundary, never a broken screen"
2. 17-UI-SPEC.md lines 311-315, 340-343, 450-454 (mandates `<SvgConstellation {...props}/>` as boundary fallback for every error class)
3. 17-01-SUMMARY.md line 33 (explicitly claims pattern is "ErrorBoundary fallback = SvgConstellation per Pitfall 12")
4. The companion Suspense fallback at GameMode.js:141 IS correctly `<SvgConstellation {...rendererProps} />` — so chunk-pending degrades gracefully, but post-load shader/context/runtime errors plus chunk-fetch failures that escape Suspense will show the wrong UI.

This is a one-line fix but blocks SC-2 closure. **SC-4 (Lighthouse HARD gate) remains a human-only verification step** captured in 17-UAT.md Test 1 (BLOCKER 3 flow).

## Goal Achievement

### Observable Truths (5 ROADMAP Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| SC-1 | On desktop (≥ breakpoint, WebGL supported, no reduced-motion/save-data) WebGL constellation activates with full motion; identical props contract as SVG; same selection/filter behavior | ✓ VERIFIED | `useRendererCapability.js:18-43` implements all 4 gates + URL override; 12 GREEN tests cover every branch. `WebGLConstellation.js:215-229` accepts the verbatim Phase 15 props contract (`{ nodes, edges, layout, highlightedSkillIds, selectedSkillId, hoveredSkillId, yearRange, justFilteredId, theme, lang, t, onSelectSkill, onHoverSkill }`). `GameMode.js:86-100` spreads identical `rendererProps` to BOTH branches. Selection via canvas pointer-pick at `WebGLConstellation.js:604-659` calls `props.onSelectSkill`/`onHoverSkill` (BLOCKER 2 — no internal hover useState; verified by negative grep test at WebGLConstellation.test.js:720-727). |
| SC-2 | three.js + WebGL deps load only in lazy desktop chunk via React.lazy + Suspense; absent from mobile load; WebGL init failure falls back to SVG via ErrorBoundary, never a broken screen | ✗ PARTIAL (BLOCKER) | Lazy + Suspense: VERIFIED. `GameMode.js:34` declares `React.lazy(() => import('./renderers/WebGLConstellation'))` at module scope (Pattern G); `GameMode.js:141` Suspense fallback = `<SvgConstellation {...rendererProps} />`. Mobile-absence: VERIFIED. `npm run build` produces separate `WebGLConstellation-*.js` chunk (117.05 kB gz); `rg "from\\s*['\"]three['\"]" dist/assets/GameMode-*.js` → 0 matches; `rg -l "from\\s*['\"]three['\"]" dist/assets/*.js` → only `WebGLConstellation-*.js`. **ErrorBoundary fallback to SVG: FAILED.** `GameMode.js:132` wraps the WebGL branch with `<RendererErrorBoundary fallback={errorFallbackUI}>` where `errorFallbackUI` (GameMode.js:68-79) is a "Switch to dev mode" prompt — not `<SvgConstellation {...rendererProps} />`. UI-SPEC mandate (lines 340-343) plus Slice 1 SUMMARY pattern claim (line 33) are not honored. |
| SC-3 | Mobile/light path adds < ~30 kB gz over baseline (no three.js, no d3-force, vector-only) | ✓ VERIFIED | `npm run build:gate` exit 0. Mobile chunk `GameMode-C03yR_JA.js` = **8.91 kB gz** (Phase 16 baseline was 8.82 kB; delta = **+0.09 kB**, well under +30 kB allowance and HARD ceiling 38.82 kB enforced by `check-bundle-gate.mjs:13`). No `d3-force` dependency anywhere in package.json (verified). Bundle-gate fixture tests (6 GREEN) confirm HARD FAIL fires on three.js leak. |
| SC-4 | Lighthouse mobile audit on game-mode landing passes HARD gate (Perf ≥ 95 / A11y 100 / BP 100 / SEO 100) | ? HUMAN | Requires real Chrome headless run. UAT scaffold 17-UAT.md Test 1 is the BLOCKER 3 flow: `npm run lighthouse:mobile && npm run lighthouse:check`. Scripts verified in package.json:19-21 (lighthouse:mobile self-contained: `vite preview --port=4173` + lighthouse + cleanup; lighthouse:check enforces Perf≥0.95, A11y=BP=SEO=1.0, target-size=1; exits 1 on any miss). v3.8 close gate IS the `lighthouse:check` exit code per UAT.md line 138. Sign-off pending. |
| SC-5 | Capability-based-selection component test confirms WebGL chosen on desktop + SVG chosen otherwise | ✓ VERIFIED | `GameMode.test.js:189-261` "Phase 17 SC-5 capability-based renderer selection" describe block contains **3 it() blocks** (≥3 required per D-17-SC5-TEST): Test A `capability='webgl'` mounts WebGLConstellation under Suspense; Test B `capability='svg'` mounts SvgConstellation directly with `data-renderer="svg"` attribute and no canvas; Test C live-swap from svg→webgl preserves selection state (ExperienceCard dialog stays in DOM across renderer remount). All GREEN. |

**Score:** 4/5 truths verified; SC-2 PARTIAL; SC-4 awaiting human UAT.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/useRendererCapability.js` | Pure hook, 4 gates + URL override + reactive matchMedia | ✓ VERIFIED | 73 LOC; zero three.js imports; SSR-safe; addEventListener/addListener Safari 13 shim; 12 GREEN tests cover every gate × on/off, URL override × svg/webgl, viewport breakpoint cross, cleanup, memoization |
| `src/game/useRendererCapability.test.js` | All 4 gates + URL override + reactivity tests | ✓ VERIFIED | 226 LOC, 12 it() blocks, all GREEN |
| `src/game/RendererErrorBoundary.js` | React 17 class boundary, `[renderer-fallback]` log prefix, sticky | ✓ VERIFIED | 36 LOC; `componentDidCatch` logs `console.error('[renderer-fallback]', error, info)`; `getDerivedStateFromError` sets `hasError=true`; renders `props.fallback` on error; sticky (no auto-reset). NOTE: the boundary itself is correct — the gap is the CALLER (GameMode) passing the wrong fallback prop. |
| `src/game/RendererErrorBoundary.test.js` | children/fallback/log-prefix/sticky | ✓ VERIFIED | 72 LOC, 4 it() blocks, all GREEN. Asserts greppable `[renderer-fallback]` prefix per Pattern I. |
| `src/game/renderers/WebGLConstellation.js` | Full WebGL renderer matching Phase 15 props contract | ✓ VERIFIED | 725 LOC. Named imports from `three` (D-17-TREESHAKE). Single-draw `Points` + `LineSegments` with RGBA `BufferAttribute(arr, 4)` per D-17-EDGE-RGBA. ShaderMaterial with `transparent: true`. hoveredSkillId consumed as PROP (lines 221, 538) — zero internal hover useState (D-17-HOVERED-PROP). rAF loop with visibilitychange pause + Pitfall 15/16 guards. Theme reactivity via `getComputedStyle` re-reads CSS vars + re-uploads uHaloColor uniform + per-vertex strokeColor + edge RGBA color on every theme change (lines 431-471). Slice 4 chip-flash (uFlashNodeId + uFlashStartTime) + weight-1 edge reveal (uActiveNodeId) + canvas pointermove/click → callbacks. Canvas `aria-hidden="true"`. |
| `src/game/renderers/WebGLConstellation.test.js` | ≥30 tests; capability + 26-Point geometry + theme reactivity + rAF + chip-flash + pointer-pick + BLOCKER 2 negative assertion | ✓ VERIFIED | 41 it() blocks across Slice 1 (5), parseCSSColor (4), parseCSSAlpha (3), Slice 2 geometry (5), Slice 2 theme (2), Slice 3 rAF + motion (10), Slice 4 chip-flash + edge + pointer-pick (12). Includes line 720-727 "source code contains NO useState call for hover state" BLOCKER 2 negative assertion. All GREEN. |
| `src/game/GameMode.js` | Single conditional swap; data-game-interactive preserved; shared rendererProps to both branches | ⚠️ PARTIAL | All structural requirements VERIFIED: lazy at module scope (line 34), useRendererCapability call (line 43), shared rendererProps spread (lines 86-100), Suspense fallback = SvgConstellation (line 141), data-game-interactive preserved (line 134), data-renderer={capability} attribute (line 138), FpsCounter conditional mount (line 168). DEVIATION: RendererErrorBoundary fallback (line 132) is `errorFallbackUI` not `<SvgConstellation/>` — see SC-2 BLOCKER. |
| `src/game/GameMode.test.js` | SC-5 ≥ 3 capability-selection it() blocks | ✓ VERIFIED | 17 tests; Phase 17 SC-5 describe at lines 189-261 contains exactly 3 it() blocks (Test A webgl, Test B svg, Test C live-swap with state preservation). vi.hoisted capabilityState drives mock; vi.mock('three') provides fake WebGLRenderer for jsdom (Pitfall 7). |
| `src/game/FpsCounter.js` | Dev-only widget, rAF rolling FPS, theme-token classes | ✓ VERIFIED | 27 LOC; useState + rAF loop with 1-second rolling avg; cleanup via cancelAnimationFrame; theme-token classes (text-text-secondary, bg-ink-900/80, font-mono, z-[300]). |
| `src/game/FpsCounter.test.js` | ≥ 3 tests; initial render, ~60 fps after 60 frames, unmount cancels rAF | ✓ VERIFIED | 3 it() blocks. performance.now pinned at baseT=1_000_000 for deterministic timing. |
| `scripts/check-bundle-gate.mjs` | HARD FAIL on three.js leak in mobile chunk OR gz > 38.82 kB; WARN bands; WebGL TTI warn | ✓ VERIFIED | 86 LOC; named exports of regex constants and thresholds (HARD_FAIL_KB=38.82, WARN_LOWER_KB=14, WEBGL_TTI_WARN_KB=60); THREE_JS_PATTERN handles minified `from"three"` per Slice 5 auto-fix; CLI-vs-import detection via fileURLToPath (handles spaces in this repo's path). Default export `checkBundleGate()` callable from tests. |
| `scripts/check-bundle-gate.test.mjs` | 6 tests: PASS/HARD-leak/HARD-size/WARN-band/WARN-no-webgl/HARD-no-mobile | ✓ VERIFIED | 6 GREEN tests, all bands + edge cases; crypto.randomBytes fixtures defeat gzip RLE per WARNING 3. |
| `package.json` `three` dep + `build:gate` + lighthouse scripts | three.js ^0.169; build:gate after build:analyze; lighthouse scripts UNCHANGED per BLOCKER 3 | ✓ VERIFIED | three ^0.169.0 in dependencies; `build:gate` = "vite build && node scripts/check-bundle-gate.mjs"; lighthouse:mobile + lighthouse:check unchanged from Phase 11 (D-17-LIGHTHOUSE-FLOW honored). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| GameMode | useRendererCapability | direct call | ✓ WIRED | `GameMode.js:43` `const capability = useRendererCapability()` |
| GameMode | WebGLConstellation | React.lazy + import | ✓ WIRED | `GameMode.js:34` lazy at module scope; line 142 mounts when capability==='webgl' |
| GameMode | SvgConstellation | direct render OR Suspense fallback | ✓ WIRED | Direct: line 145 when capability==='svg'; Suspense fallback: line 141 |
| GameMode | RendererErrorBoundary | wraps WebGL slot | ⚠️ PARTIAL | line 132 wraps the slot correctly, but the `fallback` prop passes `errorFallbackUI` (wrong UI on error). See SC-2 BLOCKER. |
| WebGLConstellation | useConstellation (via props) | shared rendererProps spread (incl. hoveredSkillId) | ✓ WIRED | `GameMode.js:92` passes `hoveredSkillId: cons.hoveredSkillId` to both renderer branches via spread |
| WebGLConstellation | onSelectSkill / onHoverSkill | canvas event listeners | ✓ WIRED | `WebGLConstellation.js:632-648` pointermove/pointerleave/click handlers call `props.onSelectSkill` / `props.onHoverSkill`; BLOCKER 2 callback-OUT pattern verified by Slice 4 tests |
| WebGLConstellation | theme uniforms | useEffect on `[theme, nodes, edges]` | ✓ WIRED | `WebGLConstellation.js:431-471` re-reads CSS vars via `getComputedStyle(document.documentElement)`, updates uHaloColor + per-vertex strokeColor + edge RGBA; explicit `renderer.render()` lands change within one rAF. Test asserts `getComputedStyle` is called on theme change. |
| Build pipeline | bundle gate | `npm run build:gate` | ✓ WIRED | `package.json:17` `vite build && node scripts/check-bundle-gate.mjs`; verified exit 0 with PASS for mobile + WARN for WebGL TTI-only |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|---------------------|--------|
| WebGLConstellation | nodes, edges, layout | GameMode module-scope `buildConstellationGraph(EXPERIENCE, SKILLS)` + `computeLayout(GRAPH_NODES)` | Yes — 26 real nodes, ~50 real edges from live data | ✓ FLOWING |
| WebGLConstellation | hoveredSkillId, selectedSkillId, highlightedSkillIds, yearRange, justFilteredId | useConstellation hook (Phase 15+16) | Yes — useConstellation owns state, GameMode spreads to both renderers | ✓ FLOWING |
| GameMode renderer slot | capability | useRendererCapability hook → matchMedia + WebGL feature detect | Yes — reactive enum 'webgl'\|'svg' | ✓ FLOWING |
| FpsCounter | fps | internal useState + rAF loop computing real frame deltas | Yes — programmatically verified by 3 tests | ✓ FLOWING |
| bundle gate | mobile.gzKB | fs.readFileSync + gzipSync on real dist/assets/*.js | Yes — real prod build → 8.91 kB measured this session | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full Vitest suite passes | `npm run test:run` | 252/252 GREEN (19 test files) | ✓ PASS |
| Production build succeeds | `npm run build` | "built in 1.75s"; GameMode-*.js 26.38 kB raw / 9.13 kB gz; WebGLConstellation-*.js 476.40 kB raw / 119.86 kB gz | ✓ PASS |
| Bundle gate exits 0 | `node scripts/check-bundle-gate.mjs` | "PASS: GameMode-C03yR_JA.js = 8.91 kB gz" + "WARN: WebGLConstellation-CoTR_mFR.js = 117.05 kB gz > 60 kB (TTI concern on slow desktop)"; EXIT=0 | ✓ PASS |
| three.js absent from mobile chunk | `rg "THREE\\.\|from\\s*['\"]three['\"]" dist/assets/GameMode-*.js` | 0 matches | ✓ PASS |
| three.js confined to WebGL chunk | `rg -l "from\\s*['\"]three['\"]" dist/assets/*.js` | only `dist/assets/WebGLConstellation-CoTR_mFR.js` | ✓ PASS |
| FpsCounter tree-shaken from prod | `rg -c "FpsCounter" dist/assets/*.js` | 0 matches across all chunks (Vite import.meta.env.DEV → static `false` substitution in prod removes the entire conditional + import) | ✓ PASS |
| Lighthouse mobile HARD gate (SC-4) | `npm run lighthouse:mobile && npm run lighthouse:check` | NOT RUN this session — defer to human UAT (17-UAT.md Test 1) | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GAME-01 | 17-01..05 plans | WebGL desktop adapter plugging into adaptive render contract | ✓ SATISFIED | Capability hook + WebGLConstellation + lazy/Suspense wiring all GREEN; props contract identical to Phase 15. (SC-2 ErrorBoundary fallback gap above is the one outstanding piece.) |
| GAME-07 | 17-01..05 plans | Lighthouse mobile HARD gate + perf budget (three.js lazy desktop chunk; mobile +<30kB gz) | ◐ PARTIAL | Perf budget: programmatically VERIFIED (mobile +0.09 kB gz vs baseline; three.js confined to WebGLConstellation chunk). Lighthouse mobile HARD gate: DEFERRED to human UAT (17-UAT.md Test 1) — script wiring correct, exit code is the verdict. |

No ORPHANED requirements: REQUIREMENTS.md maps GAME-01 (Phase 17 secondary) and GAME-07 (Phase 17 primary); both are claimed by Phase 17 plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none in Phase 17 files) | — | — | — | Zero TODO/FIXME/XXX/HACK/TBD/PLACEHOLDER markers across useRendererCapability.js, RendererErrorBoundary.js, WebGLConstellation.js, GameMode.js, FpsCounter.js, check-bundle-gate.mjs |

### CONTEXT Decision Compliance

| Decision | Compliance | Notes |
|----------|-----------|-------|
| D-17-LIB three.js raw (not force-graph) | ✓ | `import { Scene, OrthographicCamera, WebGLRenderer, ... } from 'three'` — named imports only |
| D-17-TREESHAKE named imports targeting ~40 kB gz | ⚠️ KNOWN FINDING | Named imports honored, but realized WebGL chunk = **117.05 kB gz** (far exceeds the ~40 kB aspirational target). This is a desktop-only chunk so it does not affect SC-3 / mobile / Lighthouse. Bundle-gate warns at 60 kB (TTI concern on slow desktop); planner noted this as advisory. Acceptable for v3.8 close; revisit in a future polish phase if recruiter UAT calls for faster desktop TTI. |
| D-17-PRIMITIVES Points + custom ShaderMaterial | ✓ | Single draw call for 26 Points (WebGLConstellation.js:358) |
| D-17-EDGES LineSegments + LineBasicMaterial | ✓ | Single draw call for ~50 edges (WebGLConstellation.js:411) |
| D-17-EDGE-RGBA BufferAttribute(arr, 4) + transparent | ✓ | Line 405 `setAttribute('color', new BufferAttribute(edgeColors, 4))`; line 408 `transparent: true`; WARNING 5 RGBA alpha channel honored |
| D-17-FRAMELOOP always-running rAF + visibilitychange pause | ✓ | WebGLConstellation.js:670-713; Pitfall 15 rafId=null sentinel + Pitfall 16 performance.now() reset on resume |
| D-17-BREAKPOINT viewport ≥ 1024px | ✓ | useRendererCapability.js:15 `VIEWPORT_QUERY = '(min-width: 1024px)'` |
| D-17-CAP-GATES 4 mandatory gates + WebGL feature detect | ✓ | useRendererCapability.js:27-43 all 4 + getContext probe |
| D-17-CAP-HOOK pure hook returns 'webgl'\|'svg' | ✓ | useRendererCapability.js:45-73 |
| D-17-OVERRIDE ?renderer=svg\|webgl URL param | ✓ | useRendererCapability.js:21-24 short-circuits all gates |
| D-17-SELECTION-MECH lazy + Suspense + ErrorBoundary on WebGL branch only | ✓ STRUCTURAL / ✗ FALLBACK | Branch structure correct (GameMode.js:140-146). ErrorBoundary fallback prop is WRONG (errorFallbackUI not SvgConstellation). |
| D-17-RESIZE-SWAP live-swap on resize across 1024px | ✓ | useRendererCapability.js:48-70 matchMedia change listener; verified by test "matchMedia change event re-evaluates capability" + GameMode SC-5 Test C |
| D-17-HOVERED-PROP hoveredSkillId via props, no internal useState | ✓ | WebGLConstellation.js:221, 538; negative assertion test at WebGLConstellation.test.js:720-727 |
| D-17-CLICK-OUTSIDE-RENDERER data-game-interactive preserved | ✓ | GameMode.js:134; renderer slot still carries the attribute; SkillFilters + ExperienceCard click-outside contract intact |
| D-17-EXTRACT ConstellationErrorBoundary + detectCapabilities lifted (not re-authored) | ✓ | Slice 1 SUMMARY commits a8bf568 and 2519e96 confirm the lift; old GameMode.js inline class deleted |
| D-17-SC5-TEST ≥ 3 capability-selection it() blocks | ✓ | GameMode.test.js:189-261 has 3 it() blocks (Test A, Test B, Test C) |
| D-17-LIGHTHOUSE-FLOW uses lighthouse:mobile + lighthouse:check (NOT npx serve dist) | ✓ | package.json lighthouse:mobile spins its own `vite preview --port=4173`; UAT.md Test 1 step 1 explicitly notes "No external static-file-server step needed — the script handles preview itself" (avoids prior plan-revision's banned literal) |
| D-17-VISUAL implementer's discretion (drift + glow pulse + halo brighten) | ✓ | Slice 3 implements all three; verified by tests (uHaloPulse uniform range [1.0, 1.15], uHighlightAlpha uniform range [0.4, 0.8], per-vertex phaseX/Y/periodX/Y attributes for drift) |
| D-17-THEME implementer's discretion (getComputedStyle re-read on theme change) | ✓ | Option (a) implemented — Slice 2 useEffect on [theme, nodes, edges] re-reads CSS vars + re-uploads uniforms within one rAF; theme-reactivity test asserts getComputedStyle spy called |
| D-17-BUNDLE implementer's discretion (HARD/WARN bands, WebGL TTI warn) | ✓ | check-bundle-gate.mjs implements HARD 38.82 / WARN-lower 14 / WebGL TTI WARN 60 kB bands |

## Manual UAT Items

Phase 17 ships with a 9-test manual UAT scaffold at `.planning/phases/17-webgl-desktop-renderer-lighthouse-gate/17-UAT.md`:

- **Test 1** — Lighthouse mobile HARD gate (BLOCKER 3 flow) — **SC-4 verdict; v3.8 close gate**
- **Test 2** — Visual parity SVG ↔ WebGL at desktop ≥ 1024px (both themes)
- **Test 3** — Ambient motion quality (drift, glow pulse, halo brighten)
- **Test 4** — Live swap on resize across 1024px
- **Test 5** — URL override `?renderer=svg|webgl`
- **Test 6** — WebGL context loss → ErrorBoundary SVG fallback (chrome://gpucrash) — **NOTE: Test 6 expected behavior is currently broken by the SC-2 BLOCKER; fix the GameMode.js:132 fallback prop before running Test 6**
- **Test 7** — prefers-reduced-motion → SVG path
- **Test 8** — Save-Data → SVG path
- **Test 9** — FPS counter visible in dev / tree-shaken in prod (tree-shake half already programmatically verified in this report — 0 matches in dist/assets/*.js)

Test 1 is HARD. Tests 2-9 are advisory but recommended for v3.8 close.

## Risks / Open Questions for v3.8 Milestone Close

1. **BLOCKER (must close before Phase 17 marked complete):** SC-2 ErrorBoundary fallback discrepancy — GameMode.js:132 passes `errorFallbackUI` instead of `<SvgConstellation {...rendererProps} />`. One-line fix + one regression test. See gaps section above.
2. **Human UAT pending:** SC-4 Lighthouse mobile HARD gate not run in this verification session. Run `npm run lighthouse:mobile && npm run lighthouse:check`; exit code IS the verdict.
3. **Advisory (non-blocking):** WebGL desktop chunk is 117.05 kB gz, exceeding the 60 kB TTI-warn threshold. This is desktop-only (mobile gate unaffected) and tracked by bundle-gate WARN log. Acceptable for v3.8 close; revisit if recruiter UAT shows slow desktop TTI.
4. **Phase 11-05 carry-forward:** Lighthouse audit against deployed `*.vercel.app` remains DEFERRED. Phase 17 closes the gate against local prod build per D-17-LIGHTHOUSE-TARGET (local build chosen). Plan 11-05 stays an independent deferred concern; not blocking v3.8 close.
5. **WebGLConstellation chunk size growth risk:** Future shader additions (bloom pass, depth-parallax, GPU-tier UAT polish) will likely push the desktop chunk beyond 120 kB gz. Bundle-gate has a hard ceiling for mobile but only a soft WARN for WebGL. Consider tightening WebGL TTI threshold in a future phase.

## Recommendation

**SEND BACK to /gsd:plan-phase --gaps to address SC-2 BLOCKER**, then close the SC-4 human UAT and proceed with v3.8 milestone close.

Specifically:
1. Plan a tiny fix-up slice: change GameMode.js:132 to pass `<SvgConstellation {...rendererProps} />` as the RendererErrorBoundary fallback (matching the Suspense fallback at line 141 and UI-SPEC lines 311-315, 340-343, 450-454). Add a regression test in GameMode.test.js asserting that when the WebGL renderer throws inside the boundary, the rendered output contains an `<svg>` element (the SVG fallback DOM) AND does NOT contain the "Switch to dev mode" button text. ~10 LOC of code + ~20 LOC of test.
2. Re-run `npm run test:run` + `npm run build:gate`; both must remain GREEN.
3. Re-verify Phase 17 (re-verification mode will focus only on the SC-2 gap).
4. Run 17-UAT.md Test 1 (lighthouse:mobile + lighthouse:check) for the SC-4 HARD gate verdict.
5. Run advisory UAT Tests 2-9 (Test 6 now valid once gap is closed).
6. On clean re-verification + lighthouse:check exit 0 + UAT sign-off → mark Phase 17 complete + close v3.8 milestone.

Everything else in Phase 17 is solid: hook + boundary + renderer + bundle gate + dev FPS counter + UAT scaffold all wired, tested, and shipped. 252/252 tests GREEN, mobile chunk 8.91 kB gz (well under 38.82 kB ceiling), three.js physically absent from mobile bundle. The single boundary fallback prop wiring is the only thing standing between Phase 17 and a clean PASS.

---

_Verified: 2026-06-03T23:35:00-05:00_
_Verifier: gsd-verifier_
