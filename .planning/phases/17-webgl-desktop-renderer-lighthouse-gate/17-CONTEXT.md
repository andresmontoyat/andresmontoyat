# Phase 17: WebGL Desktop Renderer & Lighthouse Gate - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Approved design spec (`docs/superpowers/specs/2026-05-29-game-mode-design.md` §"Architecture / Adaptive Render") + Phase 15 renderer contract + Phase 16 GameMode wiring + this session's discussion (Areas A + B across 9 single-question turns; Areas C + D deferred to planner as Implementer's Discretion).

<domain>
## Phase Boundary

Phase 17 ships **the WebGL desktop renderer** (`src/game/renderers/WebGLConstellation.js`) plugged into the **same Phase 15 props contract** as `SvgConstellation`, behind a **capability-based selection hook** (`src/game/useRendererCapability.js`) that lazy-loads the WebGL chunk only on capable desktop clients. Wraps the WebGL path in a Suspense fallback + ErrorBoundary so init/runtime failure silently degrades to SVG. **Closes** the v3.8 milestone by re-verifying the Lighthouse mobile HARD gate (Perf ≥95 / A11y 100 / BP 100 / SEO 100) against a production build.

Maps to REQs **GAME-01** (WebGL desktop path) and **GAME-07** (Lighthouse mobile HARD gate + perf budget).

**Delivers:**
- `src/game/renderers/WebGLConstellation.js` — three.js raw renderer. Accepts the **exact same props** Phase 15 SvgConstellation accepts (`{ nodes, edges, highlightedSkillIds, selectedSkillId, yearRange, justFilteredId, theme, lang, onSelectSkill, onHoverSkill }`). 26 nodes rendered as `Points` with custom `ShaderMaterial` (single draw call, per-vertex attributes for size/color/glow/halo/dim). Edges as `LineSegments`. Always-running `requestAnimationFrame` loop for gentle ambient drift + glow pulse; pauses on `document.visibilityState === 'hidden'`.
- `src/game/useRendererCapability.js` — pure React hook returns `'webgl' | 'svg'`. Inputs: `window.matchMedia('(min-width: 1024px)')` (Tailwind `lg:`) + `window.matchMedia('(prefers-reduced-motion: reduce)')` + `navigator.connection?.saveData` + `navigator.connection?.effectiveType in ('2g','slow-2g')` + WebGL feature detect (`canvas.getContext('webgl2') || .getContext('webgl')`) + `?renderer=svg|webgl` query-param override. Reactive: re-evaluates on viewport resize via matchMedia listener; live-swaps renderer mid-session when crossing 1024px breakpoint.
- `src/game/RendererErrorBoundary.js` — wraps the lazy WebGL renderer. On caught error, falls back to `<SvgConstellation>` with the same props. Phase 17 introduces the first ErrorBoundary in the codebase (Phase 16 verified none existed) — follow React 17 class-component pattern.
- `src/game/GameMode.js` updates — select renderer via `useRendererCapability()`. When `'webgl'` → lazy-load via `React.lazy(() => import('./renderers/WebGLConstellation.js'))` wrapped in `<RendererErrorBoundary><Suspense fallback={<SvgConstellation .../>}>`. When `'svg'` → render `<SvgConstellation>` directly (no lazy). Both paths share state from `useConstellation` unchanged.
- `src/game/renderers/WebGLConstellation.test.js` — Vitest + RTL. Capability-based-selection test (SC-5): mocks `useRendererCapability` returning each branch, asserts component tree picks correct renderer; smoke-test for shader compile via three.js test utilities OR jsdom-canvas stub (planner picks).
- `src/game/useRendererCapability.test.js` — unit tests for all 5 gate inputs + the matchMedia reactivity + the query-param override.
- Lighthouse mobile HARD gate re-verification — re-run existing `npm run lighthouse:mobile` (Phase 11-02) against the production `npm run build` + `npx serve dist` OR against deployed `*.vercel.app` (final target chosen by planner — see Implementer's Discretion D-17-LIGHTHOUSE-TARGET below). Gate is HARD: Perf ≥95 / A11y 100 / BP 100 / SEO 100.

**Does NOT deliver:**
- Mobile WebGL path (D-v3.8-ADAPTIVE explicitly rules out). Mobile stays SVG/DOM.
- New filter/card behavior beyond what Phase 16 shipped. Phase 17 is a renderer-swap-only feature.
- Custom-domain cutover (Phase 12, DEFERRED).
- Real-device touch UAT (Phase 16 closed this for the SVG path; WebGL path is desktop-only so no touch UAT applies).
- URL-encoded filter state (deferred per Phase 16 D-16-PERSIST-URL).

</domain>

<decisions>
## Implementation Decisions

### WebGL Library (Area A — locked via discussion)
- **D-17-LIB:** three.js raw, **NOT** force-graph or react-three-fiber. force-graph was the user's first pick but was reconsidered after flagging: (1) force-graph's d3-force layout conflicts with **Phase 14 D-14-01-LAYOUT** (locked deterministic baked radial layout, zero new physics deps), (2) bundle ~125 kB gz vs three.js raw ~70 kB, (3) Phase 15 props contract maps 1:1 to imperative three.js but needs adapter for force-graph. Final: three.js raw.
- **D-17-TREESHAKE:** Named imports — `import { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, ShaderMaterial, Points, Color, LineSegments, LineBasicMaterial } from 'three'`. Target lazy chunk ~40 kB gz (40–60% reduction vs full bundle). Planner verifies via `vite build` + `gzip-size`.
- **D-17-PRIMITIVES:** Nodes = `Points` + custom `ShaderMaterial`. Single draw call for all 26 nodes. Per-vertex `BufferAttribute`s for size, color (hex from `SKILL_CATEGORY_COLORS`), glow intensity, halo factor (for selected/highlighted state), dim factor (for year-range or selectedSkill mismatch).
- **D-17-EDGES:** `LineSegments` (`BufferGeometry` + `LineBasicMaterial`). Single draw call. Matches Phase 15 SVG `<line>` semantics 1:1 — same edge data from `buildConstellationGraph()`. Color from edge weight (Phase 15 D-15-VIS-EDGE pattern). Reveal weight-1 edges on hover/select (Phase 15 D-15-VIS-EDGE — extend to WebGL).
- **D-17-FRAMELOOP:** Always-running `requestAnimationFrame` at native 60 fps. Continuous gentle ambient drift + glow pulse for "wow" aesthetic. **Pauses** on `document.visibilityState === 'hidden'` (re-resumes on visible). No throttle.

### Capability Detection + Selection (Area B — locked via discussion)
- **D-17-BREAKPOINT:** WebGL activates at viewport **≥ 1024px** (Tailwind `lg:`). Safely above Lighthouse mobile gate emulation (375–768px). Smaller than 1024 → SVG.
- **D-17-CAP-GATES:** All four mandatory gates (any fail → SVG): (1) viewport ≥ 1024px, (2) `prefers-reduced-motion: reduce` → SVG (a11y), (3) `navigator.connection?.saveData === true` OR `effectiveType in ('2g','slow-2g')` → SVG (data-saver), (4) WebGL feature-detect via `canvas.getContext('webgl2') || .getContext('webgl')` non-null. **No GPU-tier detection** — overkill at 26 nodes.
- **D-17-CAP-HOOK:** New `src/game/useRendererCapability.js` pure hook returns `'webgl' | 'svg'`. Reactive to viewport resize via `matchMedia.addEventListener('change', ...)`. Memoized via `useMemo`/`useState`. Honors `?renderer=svg|webgl` URL override (debug/UAT).
- **D-17-OVERRIDE:** `?renderer=svg|webgl` query-param overrides capability detection. Mirrors existing `?mode=` pattern from D-v3.8-DEFAULT. **No localStorage** write (matches Phase 16 D-16-PERSIST-MEMORY in-memory-only spirit). Useful for recruiter QA on the SVG path from a powerful desktop.
- **D-17-SELECTION-MECH:** GameMode uses `useRendererCapability()` → if `'webgl'`: render `<RendererErrorBoundary><Suspense fallback={<SvgConstellation {...props}/>}><WebGLConstellation {...props}/></Suspense></RendererErrorBoundary>`. If `'svg'`: render `<SvgConstellation {...props}/>` directly with no lazy/Suspense wrapper. **Critical:** the WebGL chunk import lives inside the lazy branch so it's tree-shaken out of the SVG-only mobile bundle (SC-2 + SC-3 enforcement).
- **D-17-RESIZE-SWAP:** Live-swap on resize across 1024px breakpoint via matchMedia listener. Renderer unmounts and remounts with the new branch. Selection state (`selectedSkillId`, `filterState`) preserved via the `useConstellation` hook owned by GameMode (state is above the renderer slot — unaffected by remount). Mirrors Phase 16 bottom-sheet ↔ popover live-swap pattern.

### Fallback / Error Recovery (Implementer's Discretion — planner finalizes)
- **D-17-ERRORBOUNDARY-INIT (implementer's discretion):** Wrap WebGL renderer in `RendererErrorBoundary` class component (React 17 pattern). Catches errors from: (a) WebGL context creation failure post-feature-detect, (b) shader compile failure, (c) lazy-chunk fetch network error. On catch → render `<SvgConstellation {...props}/>` with the SAME props the boundary received from GameMode (props are shared via outer context). Boundary state is "fallen back" — does NOT re-attempt WebGL until page reload. Recommendation: log to `console.error` with prefix `[renderer-fallback]`; no telemetry endpoint (no analytics infra in repo).
- **D-17-ERRORBOUNDARY-RUNTIME (implementer's discretion):** Runtime errors (e.g., context lost mid-session) caught by the same boundary. Same SVG fallback. Optional refinement: handle `webglcontextlost` event explicitly via canvas listener for graceful recovery without React re-render. Planner picks final.

### Lighthouse Gate Target (Implementer's Discretion — D-17-LIGHTHOUSE-TARGET)
- **D-17-LIGHTHOUSE-TARGET (implementer's discretion):** SC-4 requires Lighthouse mobile audit passes Perf ≥95 / A11y 100 / BP 100 / SEO 100. Two viable targets:
  1. **Local prod build** — `npm run build && npx serve dist` + `npm run lighthouse:mobile` (Phase 11-02 script already configured). Cheapest, deterministic, no deploy required. Recommended.
  2. **Deployed `*.vercel.app`** — re-runs Plan 11-05 (currently DEFERRED). Tests under real CDN. Surfaces Vercel-specific perf wins (HTTP/2, image opt) AND penalties (cold start). Couples v3.8 close to v3.7 deploy resumption.
- Planner picks ONE target. Recommendation: **local prod build** for v3.8 close — keeps v3.8 self-contained; v3.7 deploy gate (Plan 11-05) remains a separate deferred concern.

### Visual Style (Implementer's Discretion — D-17-VISUAL — Area C not discussed)
- **D-17-VISUAL (implementer's discretion):** The "wow" aesthetic — gentle ambient drift on idle (subtle x/y perturbation per node, ~0.2px amplitude, 4–6s period), glow pulse on selected node (radius scale 1.0→1.15 ease-in-out, 2s period), halo brighten on highlightedSkillIds (alpha 0.4→0.8). NO depth-parallax on mouse move (avoids motion-sickness risk; rejected by D-17-CAP-GATES reduced-motion path anyway). Edge weight-1 reveals on hover/select per Phase 15 D-15-VIS-EDGE — extend to WebGL via shader uniform on hovered edge index. Planner picks exact shader uniforms + animation timing curves.

### Theme reactivity (Implementer's Discretion — D-17-THEME)
- **D-17-THEME (implementer's discretion):** WebGL renderer must react to theme toggle (dark ↔ light). Two options: (a) re-read CSS vars via `getComputedStyle(document.documentElement).getPropertyValue('--color-…')` on theme-change event + update shader uniforms; (b) pass `theme` prop (already in Phase 15 contract) + recompute colors imperatively. Planner picks. Same CSS-var token palette as SVG (`--color-constellation-node-*`, `--color-constellation-edge*`).

### Bundle Headroom (Implementer's Discretion — D-17-BUNDLE)
- **D-17-BUNDLE (implementer's discretion):** Mobile baseline = 8.82 kB gz (Phase 16 close-out). SC-3 budget = +30 kB gz over baseline = **38.82 kB gz mobile chunk ceiling**. Mobile chunk MUST NOT import three.js. Desktop WebGL lazy chunk has no hard budget — but planner records gzip size and flags if >60 kB gz (TTI concern on desktop). Planner adds programmatic gzip-size gate in CI build script mirroring Phase 16 D-16-BUNDLE-GATE pattern (HARD/WARN/PASS bands).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design (source of truth)
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §"Architecture / Adaptive Render" — D7 capability + viewport + reduced-motion detection contract.
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §"Performance Budget" — Lighthouse mobile HARD gate (Perf ≥95 / A11y 100 / BP 100 / SEO 100), <30 kB gz mobile add ceiling, three.js in lazy desktop chunk only.

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 17" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — GAME-01 (WebGL desktop adapter), GAME-07 (Lighthouse mobile HARD gate + perf budget).
- `.planning/PROJECT.md` §"Constraints" — Lighthouse 90+ baseline (HARD gate is the tighter v3.4 baseline 98/100/100/100).

### Prior phase carry-forward
- `.planning/phases/15-accessible-constellation-seo-fallback/15-CONTEXT.md` — D-15-VIS-EDGE (weight-1 edge reveal on hover/select), D-15-KB-ACTIVATE (roving tabindex — interactivity layer is decoupled from renderer; WebGL inherits via shared event handler contract), D-15-LAND-COPY (H1 derivation pattern).
- `.planning/phases/15-accessible-constellation-seo-fallback/15-UI-SPEC.md` — constellation CSS-var tokens (dark + light), animation budget, AA contrast pairs.
- `.planning/phases/15-accessible-constellation-seo-fallback/15-01-SUMMARY.md`, `15-02-SUMMARY.md`, `15-03-SUMMARY.md` — Phase 15 SvgConstellation as the reference contract WebGL must match.
- `.planning/phases/16-filters-floating-experiencecard/16-CONTEXT.md` — D-16-INTERSECT-AND (filter semantics WebGL must honor via dim-others), D-16-CHIP-FLASH (justFilteredId chip-flash WebGL must implement), D-16-BUNDLE-GATE (gzip-size gate pattern WebGL bundle check should mirror).
- `.planning/phases/16-filters-floating-experiencecard/16-06-SUMMARY.md` — GameMode wiring point Phase 17 extends. data-game-interactive contract preserved.
- `.planning/phases/14-foundation-data-layer-viewmode-toggle-test-infra/14-01-SUMMARY.md` — D-14-01-LAYOUT (deterministic baked radial layout — WebGL renderer reads same LAYOUT map, does NOT recompute).
- `.planning/phases/11-vercel-deploy-uat-gate/11-02-PLAN.md` — `npm run lighthouse:mobile` script already exists; tightened thresholds match Phase 17 SC-4. WebGL phase reuses, does not redefine.

### Existing code to follow / extend
- `src/game/renderers/SvgConstellation.js` (Phase 15) — reference implementation of the props contract WebGL must match. Read FULLY before implementing WebGL — every prop name, event handler, ARIA contract, theme/lang reactivity carries over.
- `src/game/useConstellation.js` (Phase 15+16) — state hook GameMode passes to whichever renderer is active. WebGL consumes derived props identically.
- `src/game/GameMode.js` (Phase 16) — current renderer slot at the `data-game-interactive` wrapper. Phase 17 swaps the inner renderer choice; outer wrapper + data-game-interactive contract unchanged.
- `src/game/constellation.layout.js` (Phase 14) — LAYOUT map. WebGL reads positions as `(x,y,z=0)` — flat 2D-in-3D scene (no perspective beyond camera ortho).
- `src/data/skills.js` — `SKILL_CATEGORY_COLORS` hex palette (data-exception color tokens, documented).
- `src/index.css` — CSS-var palette for theme reactivity (`--color-constellation-*`).
- `package.json` — currently zero three.js / react-three-fiber / d3-force. Phase 17 adds ONLY `three` as a dependency (no peers).
- `vite.config.js` — Vitest + RTL setup; verify three.js is externalizable or has Vitest-compatible mock. Likely need shader-text Vitest stub.

### Test infrastructure
- `src/test/setup.js` — canvas mock from Phase 15. May need WebGL context stub for Phase 17 component test (verifies selection mechanism, NOT shader output). Planner decides whether to add `vitest-canvas-mock` (~2 kB dev) or hand-roll a WebGL ctx stub.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 15's `SvgConstellation` is the **specification** for the WebGL renderer's props contract — they are interchangeable from GameMode's perspective. Read SvgConstellation as a contract document, not as code to copy.
- Phase 16's `useConstellation` already owns all the state (`selectedSkillId`, `filterState`, `highlightedSkillIds`, `justFilteredId`) — WebGL adapter consumes the same derived props, zero new state.
- Phase 16's data-game-interactive wrapper in GameMode is the renderer-slot — drop the conditional inside it; nothing outside the wrapper changes.
- `React.lazy + Suspense` already proven in `App.js` (sections), `Projects.js`, `GameMode.js` (lazy game-mode chunk). Pattern is repo-native.
- `useViewMode` / `useTheme` / `useLanguage` context hooks — WebGL renderer reads theme + lang via the same hooks (or via props pass-through from GameMode).

### Established Patterns
- JSX in `.js` (esbuild loader). Three.js types come from `@types/three` — install with `three` as a dev dep peer.
- Bilingual via `t.game.*` — WebGL canvas has no user-facing text (constellation is glyph-only); accessible name comes from the `aria-label` on the wrapping `<div role="application">` which is set by GameMode (unchanged from Phase 15).
- No new heavy deps beyond `three` itself. NO `d3-force`, NO `react-three-fiber`, NO `force-graph`, NO GPU-detect library.
- Token-driven colors via CSS-vars + Tailwind utilities for surrounding UI. Shader uniforms read color values via `getComputedStyle` OR via JS color constants synced to the theme.
- Pure-logic separation: `useRendererCapability.js` has zero three.js imports — it just returns `'webgl' | 'svg'`. Renderer file is the ONLY three.js consumer.
- Vitest colocated tests beside source files (project convention — verified Phase 16).

### Integration Points
- `src/App.js` — no change. GameMode is already lazy-loaded.
- `src/game/GameMode.js` — single conditional swap point. Existing data-game-interactive wrapper unchanged. Existing useConstellation hook unchanged.
- `src/i18n/translations.js` — no new keys. WebGL renderer has no surfaces with text.
- `src/index.css` — possibly add `.webgl-canvas` block (positioning, theme-aware background). Reuse existing constellation tokens.
- `tailwind.config.js` — no change anticipated.
- `package.json` — `three` added to `dependencies`; `@types/three` to `devDependencies`. NO peer additions.
- `vite.config.js` — verify three.js is in `optimizeDeps.include` OR explicitly excluded for SSR/test contexts.

</code_context>

<specifics>
## Specific Ideas

- 26 nodes, ~50 edges (from Phase 14 `buildConstellationGraph()` output) — trivial scene size; even an integrated Intel HD GPU handles 60fps comfortably with single-draw-call Points + LineSegments.
- Baked layout from `constellation.layout.js` LAYOUT map — WebGL reads `LAYOUT[skillId] = {x, y}` and uses as `(x, y, z=0)`. Ortho camera, no perspective.
- Always-running rAF loop: `let rafId; function tick(t) { /* uniforms update + render */; rafId = requestAnimationFrame(tick) }`. Cleanup on unmount cancels the rAF; visibilitychange listener pauses/resumes via cancel/restart pattern.
- Capability hook outline:
  ```js
  const useRendererCapability = () => {
    const [cap, setCap] = useState(() => detect()) // synchronous initial
    useEffect(() => {
      const mql = window.matchMedia('(min-width: 1024px)')
      const handler = () => setCap(detect())
      mql.addEventListener('change', handler)
      return () => mql.removeEventListener('change', handler)
    }, [])
    return cap
  }
  ```
  `detect()` returns `'svg'` if any gate fails OR if URL override is `svg`; returns `'webgl'` otherwise.
- ErrorBoundary as React 17 class component (no react-error-boundary dep). Component holds `{ hasError: boolean }` state; on `componentDidCatch` logs and sets `hasError = true`; render returns SVG fallback. Reset only on prop change OR page reload.
- Shader strategy: vertex shader reads `attribute float size`, `attribute vec3 color`, `attribute float glow`, `attribute float dim`, `attribute float halo`; outputs `gl_PointSize` + varying color. Fragment shader paints circular sprite with optional halo ring. ~30 LOC GLSL total.
- Theme switch: subscribe to a custom event OR read `data-theme` attribute change via MutationObserver. Update color uniforms imperatively. No re-render needed.

</specifics>

<deferred>
## Deferred Ideas

- **GPU-tier detection** (e.g. `detect-gpu` lib) — overkill for 26 nodes.
- **react-three-fiber + drei** — heavier (~110 kB gz), unnecessary abstraction over imperative useEffect for this scene size.
- **force-graph / 3d-force-graph** — conflicts with D-14-01-LAYOUT baked positions; opinionated rendering fights Phase 15 contract.
- **Mobile WebGL path** — explicit non-goal (D-v3.8-ADAPTIVE).
- **Mouse-parallax depth field** — motion-sickness risk; rejected. (Even if added, reduced-motion gate would already drop those users to SVG.)
- **Live deploy + Lighthouse against `*.vercel.app`** — Phase 11-05 carry-forward; remains DEFERRED. Phase 17 closes the gate against local prod build (recommended).
- **Custom domain cutover** — Phase 12, DEFERRED.
- **Renderer-swap telemetry endpoint** — no analytics infra in repo. Console-log on fallback is sufficient v1.
- **WebGL Points blur post-process / bloom pass** — adds shader complexity + frame cost. Defer to a future "polish" phase if recruiter UAT calls for it.
- **WebGPU path** — adoption too early (Safari support partial). Phase 17 is WebGL-only.

</deferred>

---

*Phase: 17-webgl-desktop-renderer-lighthouse-gate*
*Context gathered: 2026-06-03 via /gsd:discuss-phase 17 (default mode, 2 areas discussed across 9 single-question turns; 4 Implementer's Discretion zones marked for planner).*
