---
phase: 14-foundation-data-layer-viewmode-toggle-test-infra
verified: 2026-05-30T13:35:00Z
status: passed
human_verified: 2026-06-01T09:20:00Z
human_verified_via: 14-HUMAN-UAT.md (4/4 pass)
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Toggle visibility and placement on mobile"
    expected: "ViewModeToggle is visible in the mobile nav menu (MobileMenu), is reachable by tap, and the 44px touch target is observable in-browser"
    why_human: "MobileMenu renders via createPortal; grep confirms the component is rendered at Nav.js line 198 but portal visibility and tap-target size require a real browser"
  - test: "Game mode is default landing in browser (no prior localStorage)"
    expected: "Loading the site in an Incognito window shows the game placeholder heading, not the hero/about/dev sections"
    why_human: "Context reads localStorage on init; a real browser load with cleared storage is the only reliable confirmation that DEFAULT_MODE='game' governs the actual first impression"
  - test: "?mode=dev deep-link overrides default in browser"
    expected: "Visiting /?mode=dev shows the full dev portfolio; visiting /?mode=game (or no param) shows the game placeholder"
    why_human: "readInitialMode reads window.location.search; unit tests cover the logic but only a real browser confirms the URL param is read before React hydration"
  - test: "Toggle persistence survives reload"
    expected: "Clicking Dev, reloading, and checking the active segment — it stays Dev; clicking Game, reloading — stays Game"
    why_human: "localStorage write + re-read across page loads requires a live browser session; component tests mock localStorage"
---

# Phase 14: Foundation — Data Layer, ViewMode Toggle & Test Infra — Verification Report

**Phase Goal:** The pure data and state foundation for game mode exists and is tested — a curated skill catalog with categories, a derived skill graph (nodes/edges/year ranges) from real experience data, a baked deterministic layout, and a persisted one-click game/dev view toggle.
**Verified:** 2026-05-30T13:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `skills.js` maps every `tech[]` skill to category + color + aliases; GCP/Google Cloud normalized to one node; GKE separate | VERIFIED | `src/data/skills.js` lines 26-27: `'Google Cloud': { category: 'cloud', aliases: ['GCP'] }`, `GKE: { category: 'cloud', aliases: [] }`. All 26 canonical skills cover every string in all 12 `tech[]` arrays. `resolveCanonical('GCP')` returns `'Google Cloud'` via the alias reverse-map. |
| 2 | `constellation.graph.js` derives nodes (category, color, count, year range, experienceIdx) + co-occurrence edges (weight = shared jobs); each experience has numeric `period { start, end\|null }` | VERIFIED | `src/game/constellation.graph.js` exports `buildConstellationGraph(experience, skills)` returning `{ nodes, edges }`. Node shape matches spec. `CURRENT_YEAR=2026` constant for `period.end===null`. All 12 `experience.js` entries carry `period: { start, end }` confirmed by `rg -c "period:" src/data/experience.js` returning 12. 16 graph tests pass including GCP/Google Cloud merge and GKE-separate assertions. |
| 3 | Layout positions baked deterministically at build time; no d3-force in client bundle | VERIFIED | `src/game/constellation.layout.js` exports `computeLayout(nodes)` using pure radial/centroid math — no d3-force import, no DOM, no RNG. Confirmed by: (a) no React/DOM imports in the module (rg returns nothing); (b) determinism layout test passes (same input → identical coordinates); (c) 6 layout tests green. |
| 4 | One-click game/dev toggle; game = default landing; persists in `localStorage` `cam-viewmode`; `?mode=` deep-link works; survives reload | VERIFIED (code) | `src/context/ViewModeContext.js`: `STORAGE_KEY='cam-viewmode'`, `DEFAULT_MODE='game'`, `VALID_MODES=['game','dev']`, `readInitialMode()` reads `?mode=` first then localStorage, both validated against allowlist. `useEffect` persists on change. 13 context tests green covering default, persistence, toggle, validation, ?mode= precedence, invalid-param fallback, and storage-throw safety. Browser-level confirmation requires human testing (see human_verification). |
| 5 | `npm test` runs Vitest + RTL suite; pure graph/filter logic unit-tested near-100%; ViewMode toggle + persistence has passing component test | VERIFIED | `npm run test:run` exits 0: **57 tests across 6 files, all green**. Breakdown: setup smoke (2), skills (12), constellation.graph (16), constellation.layout (6), ViewModeContext (13), ViewModeToggle (8). Coverage reported 100% on `constellation.graph.js`, 97.82% on `constellation.layout.js`. Vitest 2.1.9 configured inside `vite.config.js` (no separate vitest.config). |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/data/skills.js` | SKILL_CATEGORIES (8 cats + colors) + canonical catalog + resolveCanonical() | VERIFIED | 63 lines, named exports `SKILL_CATEGORIES`, `SKILLS`, `resolveCanonical`. 8 categories with exact colors from spec. GCP alias wired. |
| `src/game/constellation.graph.js` | Pure `buildConstellationGraph` — nodes + weighted edges | VERIFIED | 79 lines, exports `buildConstellationGraph` and `CURRENT_YEAR`. Zero React/DOM imports confirmed. |
| `src/game/constellation.layout.js` | Deterministic `computeLayout` — radial, category-clustered, no d3-force | VERIFIED | 79 lines, exports `computeLayout`. Pure math. No external deps beyond what is in file. |
| `src/data/experience.js` | 12 entries each with `period: { start, end\|null }` | VERIFIED | 237 lines. `rg -c "period:"` returns 12. Coderio entry: `period: { start: 2026, end: null }`. All existing `date`/`title`/`bullets`/`tech` fields unchanged. |
| `vite.config.js` | Vitest `test:` block (jsdom, globals, setupFiles); esbuild JSX loader intact | VERIFIED | Lines 20-23: `esbuild: { loader: 'jsx', include: /src\/.*\.js$/ }`. Lines 37-52: `test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.js'], coverage: { provider: 'v8' } }`. No separate vitest.config file. |
| `src/test/setup.js` | RTL/jest-dom matchers + localStorage bridge | VERIFIED | File exists. SUMMARY confirms `@testing-library/jest-dom/vitest` import + localStorage bridge for Node.js 26 compatibility. All 57 tests rely on it successfully. |
| `src/context/ViewModeContext.js` | `game\|dev` state, cam-viewmode localStorage, ?mode= precedence, typeof window guard, Provider + useViewMode hook | VERIFIED | 57 lines. Exports `ViewModeProvider`, `useViewMode`. STORAGE_KEY, DEFAULT_MODE, VALID_MODES defined. `readInitialMode()` has typeof window guard + try/catch. ?mode= reads `window.location.search` and validates against VALID_MODES before assignment. |
| `src/components/_shared/ViewModeToggle.js` | Segmented Game/Dev pill, aria-pressed, 44px targets, bilingual labels, tokens-only | VERIFIED | 41 lines. Two `<button type="button">` with `aria-pressed`. Segments carry `min-h-[44px] min-w-[44px]`. Labels from `t.nav.modeGame`/`t.nav.modeDev`. `rg "#[0-9a-fA-F]{3,6}"` returns nothing — tokens only. |
| `src/App.js` | ViewModeProvider wired; MainContent branches by viewMode; crawlable game placeholder | VERIFIED | Line 5 imports `ViewModeProvider, useViewMode`. Line 77 wraps with `<ViewModeProvider>` inside `<LanguageProvider>`. `MainContent` component (lines 33-71) calls `useViewMode()` and renders `<h1>{t.game.loadingTitle}</h1>` + `<p>{t.game.loadingBody}</p>` as real DOM text — no aria-hidden on the placeholder section. The `aria-hidden` at line 18 is on the Suspense `SectionFallback` skeleton, unrelated to the game placeholder. |
| `src/components/Nav.js` | ViewModeToggle in desktop cluster AND MobileMenu | VERIFIED | `rg -c "ViewModeToggle" Nav.js` returns 3: line 6 (import), line 32 (desktop cluster `hidden md:flex`), line 198 (MobileMenu flex row). |
| `src/i18n/translations.js` | Bilingual toggle + placeholder + game namespace copy keys | VERIFIED | `rg "modeGame" translations.js` returns 2 lines (EN line 15, ES line 193). `viewModeToGame`, `viewModeToDev`, `game.loadingTitle`, `game.loadingBody` confirmed present in both EN and ES blocks. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `constellation.graph.js` | `experience.js` + `skills.js` | `import EXPERIENCE` + `resolveCanonical` | VERIFIED | Line 1: `import { SKILL_CATEGORIES, resolveCanonical } from '../data/skills.js'`. Graph function receives `experience` as parameter (caller imports EXPERIENCE). |
| `constellation.layout.js` | `constellation.graph.js` | consumes derived nodes | VERIFIED | Layout is a pure function that accepts the `nodes` array output by `buildConstellationGraph` — no direct import needed; tested end-to-end in `constellation.layout.test.js`. |
| `vite.config.js` | `src/test/setup.js` | `test.setupFiles` | VERIFIED | vite.config.js line 45: `setupFiles: ['./src/test/setup.js']`. |
| `ViewModeToggle.js` | `ViewModeContext.js` | `useViewMode()` hook | VERIFIED | ViewModeToggle.js line 2: `import { useViewMode } from '../../context/ViewModeContext'`. Used at line 6. |
| `App.js` | `ViewModeContext.js` | `ViewModeProvider` wrap + `useViewMode` in MainContent | VERIFIED | App.js line 5 imports both. Line 34 calls `useViewMode()` inside `MainContent`. Line 77 wraps tree with `<ViewModeProvider>`. |
| `Nav.js` | `ViewModeToggle.js` | import + render in both control clusters | VERIFIED | Nav.js line 6 imports. Rendered at lines 32 and 198 (desktop + MobileMenu). |
| `ViewModeToggle.js` | `translations.js` | `t.nav.*` bilingual labels | VERIFIED | ViewModeToggle.js uses `t.nav.modeGame`, `t.nav.modeDev`, `t.nav.viewModeToDev`, `t.nav.viewModeToGame`. All keys confirmed in translations.js EN + ES. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `constellation.graph.js` | `nodeMap`, `edgeMap` | `experience.tech[]` + `skills.js` catalog (all first-party static data) | Yes — derives from real career data via `resolveCanonical` | FLOWING |
| `ViewModeContext.js` | `viewMode` state | `readInitialMode()` reads localStorage / URL param | Yes — real browser storage + URL; test-confirmed with 13 tests | FLOWING |
| `App.js` `MainContent` | `viewMode` | `useViewMode()` from ViewModeContext | Yes — live context value; renders real translation strings | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run test:run` exits 0 | `npm run test:run` | 57 passed (57), exit 0, 6 test files | PASS |
| No React/DOM in pure game modules | `rg "from 'react'\|document\.\|window\." src/game/*.js` | No matches | PASS |
| 12 period fields in experience.js | `rg -c "period:" src/data/experience.js` | 12 | PASS |
| No separate vitest.config | `fd vitest.config` | No results | PASS |
| No raw hex in ViewModeToggle | `rg "#[0-9a-fA-F]{3,6}" src/components/_shared/ViewModeToggle.js` | No matches | PASS |
| ViewModeToggle in Nav 3 times | `rg -c "ViewModeToggle" src/components/Nav.js` | 3 | PASS |
| VALID_MODES allowlist used | `rg -c "VALID_MODES" src/context/ViewModeContext.js` | 4 (definition + 3 usage sites) | PASS |
| Game placeholder not aria-hidden | `rg "aria-hidden" src/App.js` | Only line 18 (SectionFallback, not game placeholder) | PASS |

---

### Probe Execution

No `scripts/*/tests/probe-*.sh` files declared or found for this phase. Behavioral spot-checks above serve as the automated verification layer.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GAME-02 | 14-01-PLAN.md | Constellation nodes derived from `experience.js` `tech[]` + `skills.js` category map (GCP/Google Cloud normalization) | SATISFIED | `skills.js` + `constellation.graph.js` fully implement derivation; 12 + 16 tests green; GCP→Google Cloud and GKE-separate confirmed in code and tests |
| GAME-05 | 14-02-PLAN.md | Game/dev toggle with one click; game default; persists in `cam-viewmode`; `?mode=` deep-link | SATISFIED | `ViewModeContext.js`, `ViewModeToggle.js`, App/Nav wiring all present and tested; 13 + 8 component tests green; browser-level confirmation deferred to human UAT |
| TEST-01 | 14-01 + 14-02-PLAN.md | Vitest + RTL setup; pure graph logic near-100%; ViewMode toggle + persistence component test | SATISFIED | 57 tests across 6 files, all green; 100% graph coverage; 13 context tests + 8 toggle tests explicitly cover persistence and `?mode=` |

No orphaned requirements. All 3 IDs mapped to phase plans and verified.

---

### Anti-Patterns Found

No blockers. Full scan of all phase-modified files:

| File | Pattern | Severity | Finding |
|------|---------|----------|---------|
| `src/App.js` line 18 | `aria-hidden="true"` | Info | On `SectionFallback` (Suspense loading skeleton div), NOT on the game placeholder. The game `<section>` at lines 39-47 has no aria-hidden. Non-issue. |
| All phase files | TBD / FIXME / XXX | — | Zero debt markers found across all 11 phase-modified files |
| `src/App.js` game placeholder | Placeholder content | Info | `MainContent` renders `t.game.loadingTitle` + `t.game.loadingBody` as real DOM text — intentional per plan (Phase 15 replaces with constellation renderer). Documented as known stub in SUMMARY. |

---

### Human Verification Required

#### 1. Mobile toggle visibility and 44px touch target

**Test:** Open the portfolio on a mobile viewport (or Chrome DevTools mobile emulation). Open the hamburger menu. Verify the Game/Dev pill is present inside the MobileMenu drawer, is tappable, and switching segments works.
**Expected:** Both segments are visible in the mobile menu, tapping toggles correctly, touch target feels adequate.
**Why human:** MobileMenu renders via `createPortal` to `document.body`; only a real browser confirms the portal renders and is interactive at mobile viewport.

#### 2. Game mode is the default landing (no prior localStorage)

**Test:** Open the portfolio in an Incognito / Private window (no prior localStorage). Observe the initial content.
**Expected:** The page shows the game-mode placeholder heading ("Game mode is loading" / "El modo juego está cargando") and body text — not the Hero/About/Skill/Experience dev sections.
**Why human:** `DEFAULT_MODE='game'` and `readInitialMode()` are unit-tested, but only a real browser load confirms the initial React render uses the game branch with a clean storage state.

#### 3. ?mode= deep-link sets initial mode in browser

**Test:** Navigate to `<site-url>/?mode=dev`. Observe the landing content. Then navigate to `<site-url>/?mode=game`.
**Expected:** `?mode=dev` loads the full dev portfolio (Hero visible). `?mode=game` loads the game placeholder. An invalid `?mode=hacker` should fall back to the stored/default mode.
**Why human:** `readInitialMode` reads `window.location.search` on first render; component tests mock location but a real browser confirms query-param-driven routing end-to-end.

#### 4. Toggle persistence survives page reload

**Test:** In a normal (non-Incognito) browser tab: (a) click Dev, (b) reload the page — confirm Dev is still active; (c) click Game, (d) reload — confirm Game is still active. Inspect `localStorage` to see `cam-viewmode` value.
**Expected:** The chosen mode persists across reloads. `localStorage.getItem('cam-viewmode')` returns `'dev'` or `'game'` accordingly.
**Why human:** Component tests mock `localStorage`; cross-page-load persistence requires a live browser session.

---

### Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria are verified in the codebase with substantive, wired, and data-flowing implementations. 57 automated tests pass. The 4 human verification items above are standard browser-layer checks (localStorage cross-reload, portal rendering, URL param on real navigation) that cannot be asserted programmatically without running a browser. They confirm the already-verified logic works end-to-end in a real environment, not a gap in the implementation.

---

_Verified: 2026-05-30T13:35:00Z_
_Verifier: gsd-verifier_
