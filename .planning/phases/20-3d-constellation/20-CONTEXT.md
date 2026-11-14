# Phase 20: 3D Constellation - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the existing flat 2D-in-3D `OrthographicCamera` WebGL constellation into a genuine 3D experience with `PerspectiveCamera` + `OrbitControls` drag-to-rotate. Mobile SVG path stays UNCHANGED. `prefers-reduced-motion: reduce` users continue on static SVG. Lighthouse mobile HARD gate (Perf ≥95 / A11y 100 / BP 100 / SEO 100) stays cleared by construction.

**In scope:**
- Extend pure `computeLayout()` to return `{x, y, z}` with deterministic `CATEGORY_Z` constants in `src/game/constellation.layout.js`
- `OrthographicCamera` → `PerspectiveCamera(fov=55, aspect, near=10, far=2000)` in `src/game/renderers/WebGLConstellation.js`
- `OrbitControls` from `three/addons/controls/OrbitControls.js` (already shipped in `three@0.169.0`)
- VERTEX_SHADER size-attenuation by depth
- NEW `src/game/useClickVsDrag.js` thin hook + tests
- Bilingual onboarding hint pill ("drag to rotate" / "arrastra para rotar") with 5s auto-dismiss + localStorage `cam-3d-hint-seen` flag
- Bundle-gate regex fix at `scripts/check-bundle-gate.mjs:12` (lands BEFORE OrbitControls import)
- `webglcontextlost`/`restored` handlers (D-20-CONTEXT-LOSS)
- 20-UAT.md scaffold for manual visual UAT

**Out of scope:**
- Mobile WebGL / 3D on mobile
- WebXR / VR mode
- Camera-state persistence across viewmode toggle
- "Reset view" button (deferred to v3.11+ if recruiter UAT shows demand)
- 2D/3D user preference toggle
- Free-look first-person camera
- Scroll-to-zoom / pinch-to-zoom
- Post-processing bloom / fog
- Per-category depth color shift
- Keyboard orbit (Shift+Arrows rotation) — keyboard nav stays Phase 15 D-15-KB-ACTIVATE node focus walk only
- three.js version bump (stays 0.169.0)
- New npm packages (zero install)

</domain>

<decisions>
## Implementation Decisions

### Category-Z Storytelling

- **D-20-CONTEXT-ZMAP:** `CATEGORY_Z` constants mapped front-to-back as architecture-stack narrative: `ai +150 → lang +75 → arch 0 → data −25 → cloud −75 → devops −100 → security −125 → hardware −150`. Recruiter sees AI/lang trending categories closest to camera; foundation (devops/security/hardware) at depth. Communicates "I work across the full stack — surface-to-foundation". Values are UAT-tunable (comment-block them as such). Lives in `src/game/constellation.layout.js` (NOT in `src/data/skills.js` — keeps visual layout data out of domain data per skills.js convention).

### Camera Behavior

- **D-20-CONTEXT-INITIAL-ANGLE:** Initial camera angle = **tilted ~15° azimuth, ~10° polar** (NOT straight-on). Rationale: 3D perspective is obvious frame 1 without requiring user interaction. Auto-rotate enhances; doesn't carry the load alone. Sacrifices visual continuity with v3.9 ortho look in exchange for "this is interactive 3D" telegraphy at first paint.
- **D-20-CONTEXT-AUTOROTATE-RESUME:** Auto-rotate behavior: starts ON at mount → pauses ON FIRST `controls 'start'` event (drag begins) → **STAYS PAUSED INDEFINITELY until page reload**. NO idle-timeout re-resume. Rationale: recruiter took the wheel; don't yank it back. Matches Sketchfab / three.js editor convention.

### Onboarding Affordance

- **D-20-CONTEXT-HINT:** Ship bilingual hint pill in v3.10.0 (NOT deferred). Pill shows "drag to rotate" / "arrastra para rotar" with motion-safe fade-in, auto-dismiss after 5s, AND localStorage `cam-3d-hint-seen` flag (suppress on subsequent visits). New i18n keys `t.game.hint.drag.{en,es}`. Estimated +~30 LOC + 1 test + ~3h to Plan 20-02 (~2.5d → ~3d). Justification: without hint, recruiter sees auto-rotate continuing forever without realizing the constellation is grabbable; cursor `grab` CSS feedback is insufficient at the desktop scroll-past distance.

### Visual Hierarchy — Planets vs Stars (Destiny-2 Director vibe)

- **D-20-PLANETS-TIER:** Top-K skills by `count` (K=6) get `isPlanet: true` on the graph node — derived deterministically in `buildConstellationGraph` final pass via `[...nodes].sort((a,b) => b.count - a.count).slice(0, 6)`. Auto-rebalances when new experience lands; zero manual curation. Planet nodes render LARGER (computeRadius floor 24 / ceil 40 vs star floor 10 / ceil 23) AND with always-on halo (per-vertex `halo` attribute set to 1.0 unconditionally vs star-only-on-select). Both renderers consume the flag (GAME-01 props-contract preserved): WebGL via `isPlanet` attribute + size attribute boost + halo=1.0; SVG via larger `r` + visible halo circle class. Rationale: recruiter glance instantly maps to "this engineer's heavy hitters are X, Y, Z" without parsing every node. Visual differentiation = "planet" (durable, atmospheric, focal) vs "star" (background, ambient). Bundle delta < 200 B gz total (1 attribute + 1 const). Composes cleanly with D-20-CONTEXT-ZMAP — planet heredan z from category; with D-14-01-LAYOUT — planet stays at its category centroid sub-ring position. Does NOT compose with PITFALLS Decision Violations (no 2D/3D toggle, no per-tier color shift in this iteration). Bloom/ring/label refinements DEFERRED to v3.11+ if recruiter UAT demands.

### Keyboard Navigation

- **D-20-CONTEXT-KB-NOORBIT:** Phase 15 `D-15-KB-ACTIVATE` arrow-key node-focus walk stays UNCHANGED. NO keyboard rotation gate (no `Shift+Arrows` for orbit). Keyboard users see constellation from the fixed tilted initial angle and walk node focus along `sortIndex` order. `controls.enableKeys=false` in OrbitControls config (already in research). Rationale: (a) WCAG/motion-induced-disorder spirit — vestibular trigger risk even outside `prefers-reduced-motion`; (b) preserves locked Phase 15 contract; (c) avoids the "rotate-vs-walk" modal ambiguity.

### Implementer's Discretion

- **CATEGORY_Z exact values** — proposed values are UAT-tunable; expect to adjust ±25 per band after first visual UAT.
- **Tilted initial angle exact degrees** — `15°` and `10°` are starting points; can shift during Plan 20-02 dev-server iteration as long as polar-clamp constraints are honored and perspective is obvious.
- **Hint pill exact styling** — Tailwind motion-safe fade-in cadence + dismiss interaction; not gating decisions.
- **PLANETS-TIER K value** — `K=6` is the starting point (matches Destiny 2 Director inner planets). UAT-tunable to K=4..8 if visual reads cluttered or sparse.
- **Planet size band** — `floor 24 / ceil 40` device px is starting point; tune ±4 if planet overpowers neighbor stars or reads too similar.
- **Planet always-on halo opacity** — uHaloAlpha boost band; tune so halo feels "atmospheric" not "selected-state".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Research (v3.10 milestone-scoped — READ FIRST)
- `.planning/research/SUMMARY.md` — synthesized v3.10 research (cross-cutting findings, 6 critical pitfalls, 9 decision violations, 4 D-20-* decisions queued, plan-ordering rationale)
- `.planning/research/STACK.md` — three.js version + OrbitControls import path + measured bundle cost (6850 B gz)
- `.planning/research/FEATURES.md` — table-stakes / differentiators / anti-features, fov=55 rationale, click-vs-drag threshold convention
- `.planning/research/ARCHITECTURE.md` — integration points, camera-state-ownership decision (renderer useRef, NOT useConstellation), Phase 17 decision mapping
- `.planning/research/PITFALLS.md` — 6 critical (incl. bundle-gate regex bug at `scripts/check-bundle-gate.mjs:12`), 9 moderate, 6 minor + 9 pre-rejected decision violations

### Seed (origin + rationale)
- `.planning/seeds/SEED-3D-CONSTELLATION.md` — planted 2026-06-08 during v3.9 Phase 18; "Why This Matters" + Risks/Concerns + estimated scope

### Locked specs / requirements
- `.planning/REQUIREMENTS.md` — v3.10 DEPTH-01 with full acceptance criteria + constraints + 4 D-20-* decisions queued
- `.planning/PROJECT.md` — Current Milestone v3.10 section + Key Decisions table (4 D-20-* rows to append at Phase 20 close)
- `.planning/ROADMAP.md` §"Phase Details (v3.10)" — Phase 20 success criteria (8 items) + plan structure

### Phase 17 decisions to preserve / supersede (READ before touching renderer)
- `.planning/phases/17-webgl-desktop-renderer-lighthouse-gate/17-CONTEXT.md` — D-17-EXTRACT, D-17-HOVERED-PROP, D-17-PRIMITIVES, D-17-LIB (three.js raw, NOT r3f), D-17-EDGE-RGBA, D-17-FRAMELOOP (single rAF), D-17-VISUAL (flat 2D-in-3D ortho — to be SUPERSEDED by D-20-VISUAL-3D), D-17-RM-GATE
- `.planning/milestones/v3.8-ROADMAP.md` §Phase 17 — historical context for renderer architecture

### v3.8 contracts that survive
- `.planning/milestones/v3.8-REQUIREMENTS.md` — GAME-01 (adaptive renderer) REFRAMED as "single props contract, adaptive visual fidelity" (NOT broken); GAME-04 click-to-select preserved via click-vs-drag hook; GAME-06 a11y + reduced-motion contract preserved; GAME-07 Lighthouse HARD gate must hold

### Codebase maps (for downstream agent orientation)
- `.planning/codebase/STACK.md` — current dep versions
- `.planning/codebase/ARCHITECTURE.md` — hexagonal-light React structure
- `.planning/codebase/CONVENTIONS.md` — naming, file org, test patterns
- `.planning/codebase/TESTING.md` — Vitest + RTL infrastructure (introduced v3.8 Phase 14)

### Existing code (primary integration surface)
- `src/game/constellation.layout.js` — pure `computeLayout()` to extend with `CATEGORY_Z` + z-coord
- `src/game/constellation.layout.test.js` — 4 existing layout tests; 3 new z-tests append here
- `src/game/renderers/WebGLConstellation.js` (725 LOC, Slice 4 final from Phase 17) — primary integration target; PerspectiveCamera swap, OrbitControls instantiation, shader update, pointer-pick rewrite
- `src/game/renderers/SvgConstellation.js` — UNCHANGED (silently ignores `.z`)
- `src/game/useConstellation.js` — UNCHANGED (camera state does NOT lift here)
- `src/game/useRendererCapability.js` — UNCHANGED (5 capability gates already filter to capable desktop)
- `src/game/RendererErrorBoundary.js` — UNCHANGED (PerspectiveCamera/OrbitControls failures bubble identically)
- `src/game/GameMode.js` — UNCHANGED (`rendererProps` unchanged; `LAYOUT` constant just happens to carry `.z`)
- `src/data/skills.js` — UNCHANGED (NO z values here per convention)
- `scripts/check-bundle-gate.mjs:12` — `THREE_JS_PATTERN` regex BUG, MUST be fixed in Plan 20-01 BEFORE OrbitControls import
- `src/test/setup.js` — existing canvas/WebGL mocks (`getContext = () => null`) sufficient; no Vitest setup changes
- `vite.config.js` — chunking strategy verified (Vite/Rollup default; no `manualChunks` override)
- `src/i18n/translations.js` — add `t.game.hint.drag.{en,es}` keys for hint pill

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Custom `ShaderMaterial` from Phase 17** — VERTEX_SHADER already wires ambient drift / chip-flash / halo uniforms. Extend in place with size-attenuation (NOT replace with `PointsMaterial`).
- **`useRendererCapability` hook (5 gates)** — already routes `prefers-reduced-motion: reduce` users to SVG before WebGL even mounts. Defensive in-renderer RM gate is belt-and-braces, not load-bearing.
- **`useConstellation` hook** — owns `hoveredSkillId`, `selectedSkillId`, filter state. Phase 17 `D-17-HOVERED-PROP` keeps it props-down; v3.10 preserves this. Camera state stays in `WebGLConstellation` useRef.
- **`LanguageContext` + `useLanguage` hook** — bilingual `t.*` lookup pattern; hint pill consumes via existing convention.
- **`localStorage` access guarded with `typeof window !== 'undefined'`** — reuse for `cam-3d-hint-seen` flag (matches `cam-viewmode` / `cam-lang` / `cam-theme` conventions).
- **`motion-safe:` tailwind prefix** — already used Phase 19 SVG twinkle; hint pill fade-in uses same prefix.

### Established Patterns
- **Pure-function layout** (`D-14-01-LAYOUT`) — `computeLayout()` is deterministic, dep-free. Tests assert shape + values without rendering.
- **Single rAF loop in renderer** (`D-17-FRAMELOOP`) — `tick()` calls `renderer.render()` once per frame. Add `controls.update()` as FIRST line of `tick()`. DO NOT add `controls.addEventListener('change', renderer.render)`.
- **Props-down state ownership** (`D-17-HOVERED-PROP`) — both renderers consume identical props. Layout `{x,y,z}` passes through; SVG silently ignores `.z`.
- **Hexagonal-light layering** — pure data layer (`constellation.layout.js` / `constellation.graph.js`) → state hook (`useConstellation`) → orchestrator (`GameMode`) → adaptive renderer. Phase 20 fits ENTIRELY inside existing layers — no new layers, no new directories.
- **Renderer ErrorBoundary** (Phase 17 SC-2 fix `79991a3`) — `RendererErrorBoundary` falls back to `SvgConstellation` on render exception. `webglcontextlost`/`restored` handlers (D-20-CONTEXT-LOSS) extend this defensively.

### Integration Points
- **Layout extension** — `src/game/constellation.layout.js:72` (where `layout[id] = {x, y}` assignment happens) — extend to `{x, y, z: CATEGORY_Z[node.category] ?? 0}`.
- **Camera swap** — `src/game/renderers/WebGLConstellation.js` line ~250 (current `OrthographicCamera` instantiation).
- **OrbitControls instantiation** — same file, useEffect mount block; `controls.dispose()` MUST be first in cleanup.
- **Shader update** — VERTEX_SHADER `gl_PointSize` line; add `uCanvasHeight` + `uFovRad` uniforms + size-attenuation formula `* perspectiveScale / -mvPosition.z`, clamp ∈ [1, 64].
- **Pointer-pick rewrite** — current 2D distance calc → `Vector3.project(camera)` + perspective-aware pick radius.
- **`useClickVsDrag` hook insertion** — NEW file `src/game/useClickVsDrag.js`; integrate inside `WebGLConstellation.js` between OrbitControls listeners and existing `onSelectSkill` callback.
- **Hint pill rendering** — inside `GameMode.js` renderer slot OR inside `WebGLConstellation.js` directly (decide in Plan 20-02; lean toward `GameMode.js` so SVG path could also use the hint if v3.10.1 decides to).
- **Bundle gate regex** — `scripts/check-bundle-gate.mjs:12` regex widening lands Plan 20-01.

</code_context>

<specifics>
## Specific Ideas

- **Z storytelling = architecture-stack narrative.** "AI / langs at the surface, hardware/security at the foundation" — communicates that Carlos works across the full stack with depth, not a flat skill cloud. Distinct from competitor portfolios that show 2D word clouds.
- **Tilted initial angle telegraphs 3D at frame 0.** Don't make the recruiter discover it — show it. Auto-rotate is a supporting affordance, not the load-bearing reveal.
- **No idle-resume on auto-rotate after drag.** Recruiter took the wheel; don't fight them. Reload restores idle spin.
- **Hint pill ships in v3.10.0.** Cursor `grab` CSS is too subtle at the desktop scroll-past distance; the pill is a recruiter-conversion lever.
- **Keyboard nav stays 2D-walk.** WCAG / motion-induced-disorder spirit > "full 3D parity for KB users". Tilted initial angle is the keyboard user's only view; they walk node focus along `sortIndex`.
- **CATEGORY_Z values are starting points, UAT-tunable.** Comment-block them with "consult v3.10-UAT.md before adjusting after milestone close."

</specifics>

<deferred>
## Deferred Ideas

- **"Reset view" button** — surfaced as a fallback for recruiters who get lost rotating; deferred to v3.11+ pending recruiter UAT signal. If added later, lift `resetViewToken` counter to `useConstellation`; camera state STAYS in renderer.
- **Camera-state persistence across viewmode toggle** (`{phi, theta}` in `cam-viewmode` namespace) — deferred; not v3.10 scope.
- **Per-category depth color shift** — visual differentiation aid for the architecture-stack narrative; deferred to v3.10.1 polish.
- **Fog falloff via shader uniforms** — `scene.fog` doesn't auto-pick up on custom `ShaderMaterial`; deferred to v3.10.1 if UAT shows depth perception unclear.
- **Manual real-device UAT bundling** — v3.9 carried UAT (above-fold + SVG twinkle visual confirm on real devices); bundle with Phase 20 UAT in Plan 20-03 instead of separate UAT phase.
- **Ambient hint cursor-only variant** — considered (cursor change + auto-rotate, no pill); rejected for v3.10.0 in favor of explicit pill. If v3.10.1 finds the pill noisy, revisit.

</deferred>

---

*Phase: 20-3d-constellation*
*Context gathered: 2026-06-08*
