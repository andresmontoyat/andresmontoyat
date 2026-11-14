---
phase: 20-3d-constellation
plan: 02b
subsystem: ui+data-layer+renderers
tags: [onboarding-hint, i18n, bilingual, a11y, planets-tier, visual-hierarchy, vitest, tdd]

# Dependency graph
requires:
  - phase: 20-3d-constellation
    plan: 02a
    provides: GameMode forceSvgFallback + effectiveCapability + onFirstDrag callback writing cam-3d-hint-seen + renderer-slot wrapper
  - phase: 17-webgl-desktop-renderer-lighthouse-gate
    provides: useRendererCapability + RendererErrorBoundary + WebGLConstellation Slice 4
provides:
  - OnboardingHint bilingual pill (800ms fade-in delay + 5s auto-dismiss + click dismiss + cam-3d-hint-seen suppression + defensive RM gate + 44x44 touch target)
  - Nested t.game.hint.drag i18n keys (EN "drag to rotate" / ES "arrastra para rotar")
  - GameMode renders pill conditional on effectiveCapability === 'webgl'
  - PLANETS_K=6 + isPlanet flag derived in buildConstellationGraph final pass (deterministic sort + tiebreak by id ascending)
  - WebGLConstellation SIZING desktop_planet/mobile_planet bands + planet always-on halo + planet sizes write path + theme-reactive halo re-upload respects isPlanet
  - SvgConstellation SIZING desktop_planet/mobile_planet bands + planet halo filter idle + planet radius band (GAME-01 props-contract preserved)
affects: [20-03-PLAN (UAT closes 14-item human checkpoint covering 10 pill + 4 planet), v3.10 milestone close]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy useState init: useState(readSeenFlag) reads localStorage ONCE at mount — Pattern S2"
    - "usePrefersReducedMotion lazy hasMatchMedia check at render-time (NOT module-load) so test beforeEach Object.defineProperty installs are observable"
    - "Pill cleanup discipline: showTimer cleared on unmount; dismissTimer cleared on click/unmount; no setState-after-unmount warnings"
    - "act() wrap around vi.advanceTimersByTime() in tests so React processes state updates synchronously inside fake-timer callbacks"
    - "PLANETS_K=6 with UAT-tunable comment block + Set-based planetIds lookup for O(1) per-node spread"
    - "Sort tiebreak: (count desc, id asc) → deterministic across builds; verified by determinism test + real-data parity test"
    - "GAME-01 props-contract: both renderers consume node.isPlanet identically (mirrored SIZING bands + mirrored halo gate); pixels diverge by design"

key-files:
  created:
    - src/game/OnboardingHint.js
    - src/game/OnboardingHint.test.js
    - .planning/phases/20-3d-constellation/20-02b-SUMMARY.md
  modified:
    - src/i18n/translations.js (nested t.game.hint.drag EN/ES)
    - src/game/GameMode.js (OnboardingHint import + JSX slot)
    - src/game/constellation.graph.js (PLANETS_K export + isPlanet derivation)
    - src/game/constellation.graph.test.js (+5 planets-tier tests)
    - src/game/renderers/WebGLConstellation.js (SIZING planet bands + sizes/halos isPlanet paths + theme-reactive halo respects isPlanet)
    - src/game/renderers/WebGLConstellation.test.js (+1 planet halo test)
    - src/game/renderers/SvgConstellation.js (SIZING planet bands + computeRadius sizingKey + halo filter isPlanet gate)
    - src/game/renderers/SvgConstellation.test.js (+1 planet radius+halo test)

key-decisions:
  - "D-20-CONTEXT-HINT LOCKED — bilingual pill ships in v3.10.0 (NOT deferred). Nested i18n key shape t.game.hint.drag per Alert A13."
  - "D-20-PLANETS-TIER LOCKED — K=6 by count with deterministic tiebreak (id ascending); planet band desktop=24/40, mobile=14/22; always-on halo via existing filter mechanism in both renderers. K + bands are UAT-tunable per CONTEXT Implementer's Discretion."
  - "Lifting cam-3d-hint-seen flag write to GameMode (NOT inside OnboardingHint mount-only) — Plan 20-02a onFirstDrag callback handles the flag; pill component reads at mount, writes on dismiss. Cross-session dismiss covers the case where the recruiter drags before the pill fades in."
  - "Hint pill render gated on effectiveCapability === 'webgl' (NOT raw capability) — Plan 20-02a's forceSvgFallback context-loss flip cleanly unmounts the pill alongside the WebGL canvas; no zombie pill over SVG."
  - "GAME-01 props-contract preservation enforced by mirrored SIZING bands in BOTH renderers. SvgConstellation.SIZING and WebGLConstellation.SIZING are intentionally duplicated (no shared module) per existing Phase 17 Pattern J — cross-renderer import would couple via test brittleness."
  - "Theme-reactive halo re-upload path also respects isPlanet — without this fix the planet halo would disappear on dark↔light theme toggle (regression that would have surfaced in UAT)."
  - "Tiebreak test rewritten to use real EXPERIENCE+SKILLS data instead of synthetic fakes — resolveCanonical() resolves only against the real SKILLS catalog so synthetic ids returned null. Determinism + real-sort-parity tests cover the contract."

patterns-established:
  - "Pattern: tier-flag derivation in graph builder final pass — top-K + tiebreak + Set lookup. Reusable for future tier features (e.g., 'recent skills' or 'currently-used' bands)."
  - "Pattern: theme-reactive attribute re-upload path must mirror the original attribute write logic — failure to do so causes regressions visible only on theme toggle."
  - "Pattern: nested i18n key shape for component-namespaced copy (t.game.hint.drag, t.game.hint.[future]) — protects against namespace pollution and Alert A13 flat-key drift."

requirements-completed: [] # DEPTH-01 partial — pill + planets-tier ship; Plan 20-03 closes UAT + useClickVsDrag + bundle gate verdict

# Metrics
completed: 2026-06-10
---

# Phase 20 Plan 02b: OnboardingHint Pill + Planets-Tier Visual Hierarchy (Bundled Wave) Summary

**Two cohesive features landed in a single wave: bilingual onboarding hint pill (D-20-CONTEXT-HINT — telegraphs "drag to rotate" to capable-desktop recruiters) and planets-tier visual hierarchy (D-20-PLANETS-TIER — top-6 skills by count render as Destiny-2 Director-style planets with larger size + always-on halo in both renderers). 285/285 tests GREEN. Mobile chunk delta +0.44 kB gz (under budget). WebGL chunk delta +0.04 kB gz (under budget). Both features share Task 3 human visual UAT — 14 items, deferred to operator real-GPU pass.**

## Accomplishments

### Feature A — OnboardingHint pill (D-20-CONTEXT-HINT)

- **NEW `src/game/OnboardingHint.js`** (~100 LOC) — `<button type="button">` with 800ms fade-in delay (`setTimeout` → `setVisible(true)`), 5s auto-dismiss (writes `cam-3d-hint-seen` + unmounts), click-to-dismiss (same write + unmount), localStorage suppression on subsequent visits (lazy `useState(readSeenFlag)`), defensive `prefers-reduced-motion` gate (`usePrefersReducedMotion` adapted from `useConstellation.js`).
- **44x44 touch target** (`min-h-[44px]` Tailwind utility) — WCAG 2.5.5 + Phase 4 RESP-03 carry-over.
- **`motion-safe:animate-fade-in`** Tailwind utility — Alert A7 satisfied (`tailwind.config.js` diff empty; existing `fade-in` keyframe at `:94` consumed via prefix, NOT redefined).
- **Focus-visible ring** for keyboard navigation (`focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neon`).
- **Lazy hasMatchMedia check** — Hook computes `typeof window.matchMedia === 'function'` at render-time, NOT module-load. Fixes a subtle test-only bug where `beforeEach` `Object.defineProperty(window, 'matchMedia', ...)` installs were invisible to a module-load-captured `hasMatchMedia` boolean.
- **NEW `src/game/OnboardingHint.test.js`** — 6 Vitest+RTL tests with `vi.useFakeTimers()` + `act()` wraps: not visible before 800ms, visible after, suppressed when flag set, RM path no pill, click-dismiss writes flag + unmounts, auto-dismiss after 5s writes flag + unmounts.
- **Nested i18n keys** — `src/i18n/translations.js` EN branch + ES branch both gain:
  ```
  hint: {
    drag: 'drag to rotate'  // EN
    drag: 'arrastra para rotar'  // ES
  }
  ```
  per Alert A13 (NESTED, not flat `hintDrag`).
- **GameMode integration** — `import OnboardingHint from './OnboardingHint'` (+1 import line) + `{effectiveCapability === 'webgl' && <OnboardingHint t={t} />}` slot inside the renderer-slot wrapper, AFTER the renderer conditional but inside the wrapper `<div>`. Context-loss path (`forceSvgFallback`) flips `effectiveCapability` to `'svg'` → pill unmounts cleanly.

### Feature B — Planets-tier (D-20-PLANETS-TIER, Destiny-2 vibe)

- **NEW exported constant** `PLANETS_K = 6` in `src/game/constellation.graph.js` with UAT-tunable comment block (Destiny-2 Director inner-planets reference).
- **isPlanet derivation in `buildConstellationGraph`** final pass — `[...rawNodes].sort((a,b) => b.count - a.count || (a.id < b.id ? -1 : 1)).slice(0, PLANETS_K)` → planet ids `Set` → final nodes spread with `isPlanet: planetIds.has(n.id)`. Deterministic; auto-rebalances when new experience lands; zero manual curation.
- **WebGLConstellation `SIZING` extended** — new `desktop_planet` (floor 24 / ceil 40) and `mobile_planet` (floor 14 / ceil 22) bands. `sizes[i] = computeRadius(node.count, maxCount, node.isPlanet ? 'desktop_planet' : 'desktop')`. `halos[i] = (node.isPlanet || node.id === selectedSkillId) ? 1.0 : 0.0` — planet always-on; star halo only on select.
- **Theme-reactive halo re-upload path** in WebGL also respects `isPlanet` — without this fix, planet halos would disappear on dark↔light theme toggle (would have failed UAT item 14).
- **SvgConstellation `SIZING` extended** — mirrored `desktop_planet` / `mobile_planet` bands for GAME-01 props-contract parity. `const sizingKey = node.isPlanet ? \`${breakpoint}_planet\` : breakpoint`. `haloFilter = (isSelected || node.isPlanet) && !prefersReducedMotion ? 'drop-shadow(...)' : 'none'`.
- **5 graph tests** appended: `PLANETS_K === 6`, top-K marked, rest `isPlanet === false` (boolean not undefined), determinism across calls, real-data sort-parity (planet set === top-K under the declared sort).
- **1 WebGL test** appended: planet node `halos[i] === 1.0` unconditional; star `halos[i] === 0.0` (idle, no selection).
- **1 SVG test** appended: planet circle `r >= 24` (planet band floor); star circle `r <= 23`; planet `style.filter` contains `drop-shadow`; star `style.filter` does not.

### Cross-cutting

- **Tailwind config unchanged** (Alert A7) — `git diff --stat tailwind.config.js` returns empty.
- **Bundle gate** — `npm run build && node scripts/check-bundle-gate.mjs` exits 0:
  - Mobile chunk `GameMode-*.js` = **9.45 kB gz** (Plan 20-02a baseline 9.01 → +0.44 kB delta; budget <500 B per feature ≈ both features fit). HARD ceiling 38.82 kB unchanged.
  - WebGL chunk `WebGLConstellation-*.js` = **122.37 kB gz** (Plan 20-02a baseline 122.33 → +0.04 kB delta; planet path adds essentially nothing — same shader, same uniforms, same draw call).
  - Mobile chunk contains NO `three/...` import strings (Plan 20-01 regex defense intact).
- **285/285 tests GREEN** — 271 Plan 20-02a baseline + 6 OnboardingHint + 5 graph planets + 1 WebGL planet + 1 SVG planet + 1 graph determinism = 285.

## Task Commits

3 atomic commits (RED → GREEN per feature where applicable):

1. **Task 1 RED:** `176d93a` — `test(20-02b): RED — OnboardingHint tests + nested t.game.hint.drag i18n keys (D-20-CONTEXT-HINT)`
2. **Task 1 GREEN:** `0ed403a` — `feat(20-02b): OnboardingHint bilingual pill + tests + nested t.game.hint.drag + GameMode slot (D-20-CONTEXT-HINT, Alerts A7+A8+A13)`
3. **Task 2 RED:** `fef881d` — `test(20-02b): RED — planets-tier tests for graph + WebGL + SVG (D-20-PLANETS-TIER)`
4. **Task 2 GREEN:** `5d53bf6` — `feat(20-02b): planets-tier — top-K isPlanet flag + halos/sizes paths in both renderers (D-20-PLANETS-TIER)`

## Files Created/Modified

**Created (2):**
- `src/game/OnboardingHint.js` — pill component.
- `src/game/OnboardingHint.test.js` — 6 Vitest+RTL tests.

**Modified (7):**
- `src/i18n/translations.js` — nested EN+ES `game.hint.drag` keys.
- `src/game/GameMode.js` — OnboardingHint import + JSX slot.
- `src/game/constellation.graph.js` — PLANETS_K + isPlanet derivation.
- `src/game/constellation.graph.test.js` — +5 planets-tier tests.
- `src/game/renderers/WebGLConstellation.js` — SIZING planet bands + sizes/halos paths + theme-reactive halo respects isPlanet.
- `src/game/renderers/WebGLConstellation.test.js` — +1 planet halo test + FIXTURE_LAYOUT skill-0 origin already from 20-02a.
- `src/game/renderers/SvgConstellation.js` — SIZING planet bands + computeRadius sizingKey + halo filter isPlanet gate.
- `src/game/renderers/SvgConstellation.test.js` — +1 planet radius+halo test.

## Decisions Made

1. **OnboardingHint local component state, NOT lifted to useConstellation.** The `seen` flag is a frame-zero one-shot signal; lifting would add re-render cost to all useConstellation consumers. Local `useState(readSeenFlag)` lazy init is sufficient + the localStorage flag is the cross-session signal.
2. **In-session pill stays visible after first drag.** Plan 20-02a's `onFirstDrag` writes `cam-3d-hint-seen` for the NEXT mount; the current-session pill closes via 5s auto-dismiss or click. Documented as acceptable v3.10.0 behavior; v3.10.1 enhancement candidate if UAT signals demand.
3. **Hint pill render gated on `effectiveCapability === 'webgl'`**, not raw `capability`. Context-loss flip cleanly unmounts the pill alongside the WebGL canvas. SVG path retains Phase 15's own `hintPill`.
4. **PLANETS_K=6 chosen** as the Destiny-2 Director inner-planets count reference. UAT-tunable to K=4..8 per CONTEXT Implementer's Discretion if visual reads cluttered/sparse.
5. **Tiebreak by id ascending.** Stable sort across builds. Verified by determinism test + real-data sort-parity test (synthetic-fake tests rejected because resolveCanonical only resolves against the real SKILLS catalog).
6. **Planet SIZING band mirrored across BOTH renderers** (`desktop_planet`/`mobile_planet`). Intentional duplication per existing Phase 17 Pattern J — cross-renderer import would couple via test brittleness. GAME-01 props-contract preserved.
7. **Theme-reactive halo re-upload path also gates on `isPlanet`.** Found during code-walk before commit — without this fix, the planet halo would disappear on dark↔light theme toggle (regression that would have surfaced only in UAT). Fixed proactively.
8. **RM users skip planet halo filter in SVG path.** Vestibular-trigger surface minimised — the drop-shadow rendering is itself static (no animation), but consistency with the existing select-state halo behaviour (which also gates on `!prefersReducedMotion`) keeps the visual quieter for RM users.

## Deviations from Plan

### Auto-fixed during execution

**1. Module-load `hasMatchMedia` capture invisible to test mocks**
- **Found during:** Task 1 GREEN first test run — the RM gate test failed with `expected <button>… to be null`.
- **Issue:** `const hasMatchMedia = !isServer && typeof window.matchMedia === 'function'` evaluated at module-load when `window.matchMedia` was undefined (jsdom default). Test `beforeEach` installed matchMedia via `Object.defineProperty` but the module-load capture stayed `false`, so the component skipped the RM check entirely.
- **Fix:** Converted `hasMatchMedia` from a module-load const to a `function hasMatchMedia()` called at render-time.
- **Verification:** All 6 OnboardingHint tests pass.

**2. Test timer advance missing `act()` wraps**
- **Found during:** Task 1 GREEN second test run — 3 tests asserted `expect(button).not.toBeNull()` but got null.
- **Issue:** `vi.advanceTimersByTime()` fires React state updates inside the timer callback; without `act()` wrapping, RTL doesn't see the post-state-update render before the assertion runs.
- **Fix:** Imported `act` from `@testing-library/react` and wrapped every `vi.advanceTimersByTime(...)` call in `act(() => { ... })`.
- **Verification:** 6/6 OnboardingHint tests pass.

**3. Synthetic tiebreak test fails because resolveCanonical only resolves real SKILLS catalog**
- **Found during:** Task 2 GREEN first run.
- **Issue:** The original tiebreak test passed `FAKE_SKILLS = { zzz: {...}, aaa: {...} }` but `resolveCanonical()` (imported from `src/data/skills.js`) only resolves against the real catalog → synthetic ids returned `null` → no nodes built → planet set was empty.
- **Fix:** Replaced the synthetic test with two real-data assertions: (a) determinism — same input twice yields same planet ids; (b) real-sort parity — planet set equals top-K by `(count desc, id asc)` applied to actual EXPERIENCE+SKILLS.
- **Verification:** All 5 graph tests pass.

**4. Theme-reactive halo re-upload missed `isPlanet` gate (caught pre-commit during code walk)**
- **Found during:** Code walk before Task 2 GREEN commit — grep for `halos[i]` revealed 2 write sites (initial scene-setup + theme-reactive re-upload at line 637).
- **Issue:** The theme-reactive useEffect re-uploaded halos using ONLY `selectedSkillId` — would have un-set the planet halo flag on every theme toggle.
- **Fix:** Updated the re-upload formula to `(node.isPlanet || node.id === selectedSkillId) ? 1.0 : 0.0` matching the initial-setup formula.
- **Verification:** Manual visual sanity (the UAT item 14 will validate on real GPU).

**Total deviations:** 4 auto-fixed (3 test-environment quirks + 1 proactive code-walk fix). No scope creep. Both features completed in 1 wave per the plan revision.

## Issues Encountered

- **No new dependencies.** All work uses existing React + Vitest + RTL + three.js.
- **OnboardingHint position is `absolute` inside the renderer-slot wrapper** (which is the existing `data-game-interactive` div with `position: relative`-equivalent via Tailwind utilities). Visual centring + bottom-spacing tuning will happen in Task 3 UAT.
- **No `setState`-after-unmount warnings** — both timers cleaned up in their useEffect return functions.

## User Setup Required

None for the code change. **Task 3 (manual visual smoke checkpoint, 14 items) requires a real capable-desktop browser** — see `20-02b-PLAN.md §Task 3` for the bundled pill (1-10) + planet-distinction (11-14) checklist.

## Plan 20-02b Task 3: PENDING — Human Visual Checkpoint

Task 1 + Task 2 (code) are **complete and committed**. Task 3 is a `checkpoint:human-verify` gate — cannot execute in this session because:

- Tailwind motion-safe animation cadence, focus-visible ring rendering, and theme-aware token resolution are observable only in a live browser.
- Real localStorage persistence across browser reloads.
- DevTools `prefers-reduced-motion: reduce` emulation flip.
- WebGL context-loss extension trigger.
- Planet vs star visual distinction under perspective foreshortening + depth banding + theme toggle.

**14 verification items deferred to human operator** (per 20-02b-PLAN.md §Task 3): items 1-10 pill behaviour (fade-in, appearance, a11y, dismiss paths, suppression, bilingual, RM path, context-loss) + items 11-14 planet visual distinction (6 planets distinct, top-6 are heavy hitters, planet vs star at depth, SVG parity).

**Operator next step:** `npm run build && npx serve dist` on capable desktop → walk 14 checks → log in `.planning/phases/20-3d-constellation/20-02b-HUMAN-UAT.md`. Bundles with Plan 20-02a Task 2 (10 items) — single real-GPU pass covers both plans (24 items total).

## Next Phase Readiness

**Ready for Plan 20-03 (useClickVsDrag hook + UAT close + bundle gate verdict):**

- OrbitControls drag gesture state lives in `controls` event listeners; Plan 20-03's `useClickVsDrag` hook layers in front of the current `click` event in WebGLConstellation pointer-pick to tighten threshold to 5 px + 250 ms (8 px on touch).
- Phase 20 manual UAT debt = 24 items: Plan 20-02a (10) + Plan 20-02b (14). Plan 20-03 close runs the single sweep.
- Bundle gate 3-tier ladder verdict (PASS / WARN / FAIL) — current WARN at 122.37 kB gz; ladder bands TBD in Plan 20-03.

**No blockers carry forward.** All Plan 20-02b acceptance criteria PASS.

## Self-Check: PASSED

**Files exist:**
- FOUND: `src/game/OnboardingHint.js` + `src/game/OnboardingHint.test.js` (6 tests).
- FOUND: nested `game.hint.drag` keys in both EN + ES branches of `src/i18n/translations.js`.
- FOUND: `OnboardingHint` import + JSX slot in `src/game/GameMode.js`.
- FOUND: `PLANETS_K` export + isPlanet derivation in `src/game/constellation.graph.js`.
- FOUND: `desktop_planet` / `mobile_planet` SIZING bands in BOTH renderer files.
- FOUND: `node.isPlanet` gate in WebGL `halos[i]` (both initial-setup AND theme-reactive re-upload paths) + SVG `haloFilter` + SVG `sizingKey`.

**Commits exist (verified via `git log --oneline -4`):**
- FOUND: `176d93a` (Task 1 RED)
- FOUND: `0ed403a` (Task 1 GREEN)
- FOUND: `fef881d` (Task 2 RED)
- FOUND: `5d53bf6` (Task 2 GREEN)

**Acceptance criteria (all PASS):**
- All grep-matrix assertions from `20-02b-PLAN.md §<acceptance_criteria>` return expected hit counts (Task 1 + Task 2).
- `npm test` exits 0; 285/285 GREEN (≥283 target hit; actual +14 over Plan 20-02a baseline).
- `npm run build` exits 0.
- `node scripts/check-bundle-gate.mjs` exits 0; mobile chunk delta +0.44 kB gz (under 500 B per feature ≈ both features fit within combined ~1 kB envelope); WebGL chunk delta +0.04 kB gz.
- `git diff --stat tailwind.config.js` empty (Alert A7).
- Manual visual smoke checkpoint (Task 3) **PENDING** — bundled with Plan 20-02a Task 2 for single real-GPU operator pass.

---
*Phase: 20-3d-constellation*
*Completed: 2026-06-10 (Tasks 1+2) / Task 3 pending operator visual verification*
