# Phase 16: Filters & Floating ExperienceCard — Research

**Researched:** 2026-06-02
**Domain:** React 18 + Tailwind 3.4 frontend — filter UI bar, accessible dual-thumb range slider, focus-trapped `role="dialog"` ExperienceCard, mobile bottom-sheet
**Confidence:** HIGH

---

## Summary

- **Stack stays brownfield-pure.** No new npm dependencies. Every Phase 16 surface (chips, dual-thumb slider, dialog with focus trap, mobile bottom-sheet) can be built from React 18 + Tailwind + CSS keyframes + inline a11y helpers that mirror patterns already shipped in Phase 15 (`SvgConstellation` roving tabindex) and `Nav.js MobileMenu` (portal + dialog + Esc + body overflow lock). Adding `react-focus-lock` would cost ~9 kB gz, `focus-trap-react` ~5 kB gz, native `<dialog>` would cost 0 kB but breaks the bottom-sheet animation contract — **recommendation: hand-roll a ~40-line inline focus trap**, identical structure to the existing `MobileMenu` Esc handler.
- **AND intersection is trivially cheap** (12 experiences × ≤7 tech entries each = ~84 string checks per filter change). No memoization needed for correctness — `useMemo` adds insurance but not performance, and the team should add it only where it simplifies test wiring.
- **Dual-thumb slider is the one custom widget that needs care.** WAI-ARIA APG defines the *exact* pattern: two `role="slider"` thumbs, each a `<button>`, dependent ranges via `aria-valuemin`/`aria-valuemax` (start thumb's max = end thumb − 1, and vice versa), arrow + Home/End keyboard. Both thumbs must be in the tab sequence. Pure React + Tailwind implementation is ~120 LOC, no library needed.
- **Mobile bottom-sheet drag-to-close is the single feature with a build/cost decision.** Pure CSS slide-up + pointer-event drag adds ~30 LOC. Libraries (`react-modal-sheet`, `react-spring-bottom-sheet`) all bring ≥15 kB gz including Motion/Spring. **Recommend: ship without swipe-to-dismiss in v1** (tap-X, tap-overlay, Esc all close). Drag-down can land as a polish item if recruiter UAT signals it.
- **Empty-state and card-swap can both ride on `key` props + Tailwind keyframes already shipped.** No new state machine, no animation lib.

**Primary recommendation:** Build Phase 16 as 5 lean React files (`filters.js`, `SkillFilters.js`, `ExperienceCard.js`, extended `useConstellation.js`, extended `SvgConstellation.js`) + tests, zero new dependencies, ≤ ~8 kB gz add to the `GameMode` lazy chunk. Current `GameMode-*.js` is 5.09 kB gz; budget caps Phase 16 add at ~10 kB gz to keep the lazy chunk under ~15 kB gz for Phase 17 Lighthouse gate headroom.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-16-*)

**Filter UX Layout (Area A)**
- **D-16-FLAYOUT-DESKTOP:** Desktop (≥768px) — persistent visible bottom control bar. Holds: skill chips, year-range dual-thumb slider, 8 category chips, reset button. Never collapsed at landing.
- **D-16-FLAYOUT-MOBILE:** Mobile (<768px) — top compact toolbar below H1, above constellation. Horizontal-scroll chips. "Years" chip opens inline mini-control. Reset is last chip. **Bottom-sheet reserved exclusively for ExperienceCard** — filters do NOT use bottom-sheet.
- **D-16-FLAYOUT-RESET:** Single bilingual reset button (`t.game.filterReset` — EN "Reset" / ES "Limpiar"). Clears all 3 filter dimensions. Disabled when no filter active.

**Year-Timeline Slider (Area B)**
- **D-16-YEAR-INPUT:** Dual-thumb range slider, 2007–2026 (20 years). Two draggable thumbs mark `[startYear, endYear]`. Default = full range. Arrow keys ±1 year on active thumb. Home/End jump to range limits.
- **D-16-YEAR-EFFECT:** Year-range highlights matching nodes + dims others at `fill-opacity: 0.35` (reuse Phase 15 dim treatment). Matching = skill used in at least one job whose `period` intersects `[startYear, endYear]`. Edges incident to dimmed nodes also dim. Reduced-motion skips opacity transition.
- **D-16-YEAR-BOUNDS:** Slider range bounds derived at module level from live `EXPERIENCE` data — same honesty rule as Phase 15's H1. Unit test asserts bounds match live data.

**Selection → ExperienceCard Flow (Area C)**
- **D-16-FLOW-OPEN:** 1-click direct — click/Enter/Space on node = select + highlight + dim others + open ExperienceCard. Reuses existing `onSelectSkill` callback.
- **D-16-FLOW-CLOSE-EMPTY:** Click empty space (outside `[data-game-interactive]` regions) closes card AND clears selection. Esc same behavior. Focus returns to originating node (Phase 15 manages `rovingEntryRef`).
- **D-16-FLOW-SWAP:** Click another node while open swaps card in place. 150ms cross-fade motion-safe; instant under reduced-motion.

**ExperienceCard Layout (Area D)**
- **D-16-CARD-STRUCTURE:** Single scrollable card with internal `<ol>` job list. One `role="dialog"` with focus trap. Mobile = bottom-sheet.
- **D-16-CARD-CHIPS:** Tech chips inside job entries are clickable — click adds skill to multi-select filter (intersection). Active = filled, inactive = outline. Currently-selected skill chip = active + locked (cannot deselect from within card).
- **D-16-CARD-CV-CTA:** One CV CTA per card in the footer. Label bilingual — EN "Download CV (English)" / ES "Descargar CV (Español)". Href = `/CV_Carlos_Montoya_{EN|ES}.docx`. Files verified present in `public/`.
- **D-16-CARD-A11Y:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → heading with skill name. Focus trap inside card. Esc closes + clears selection. Initial focus = card heading. Close button `aria-label` bilingual. Return focus to originating node via Phase 15's `rovingEntryRef`.

**Intersection Semantics (Area E)**
- **D-16-INTERSECT-AND:** Multi-skill = AND (co-occurrence). Java + Kubernetes ⇒ jobs where Carlos used BOTH in the same role. Empty result is valid (informative signal handled by D-16-EMPTY).
- **D-16-INTERSECT-HIGHLIGHT:** Multi-skill highlight = brighten both selected nodes + edges between them. Others dim. If no edge exists (never co-occurred), still highlight both nodes; card shows empty state.

**Filter State Persistence (Area G)**
- **D-16-PERSIST-MEMORY:** In-memory only (React state via `useConstellation`). Page reload = fresh start. Recruiter always lands on Phase 15 first impression.
- **D-16-PERSIST-CROSS-TOGGLE:** Language/theme toggle preserves in-memory state. Card re-renders in new language. No localStorage write.
- **D-16-PERSIST-URL:** URL-encoded filter state NOT delivered in v3.8.

### Implementer's Discretion (Areas F, H, I)
- **Empty-result UX (F):** Constellation dimmed to ~0.35 + inline message at card location ("No matches in this combination — try fewer filters" bilingual). Reset button highlighted. No auto-reset.
- **Card animation entry/exit (H):** Fade-in 200ms desktop; slide-up 250ms mobile; cross-fade 150ms swap. Reduced-motion = instant. Easing curves at planner's discretion.
- **Tech-chip flash:** Animate brief flash on constellation when chip clicked. Reduced-motion = instant dim update only.
- **Mobile bottom-sheet gesture:** Drag-handle visual bar; pure tap-close via X + Esc + overlay click; optional swipe gesture if a lean library exists (recommendation in §3 below: skip swipe).
- **Filter chip visual:** Pill-shaped matching `LangPill` / `ThemeToggle`. Active = filled with category color (categories) or brand (skills); outline = unfilled with token border.

### Deferred Ideas (OUT OF SCOPE)
- URL-encoded filter state (`?skills=...&year=...&cat=...`).
- Text search for skills.
- Saving filter presets.
- Sound, tutorial, achievement animations.
- WebGL desktop renderer (Phase 17).
- Lighthouse mobile gate re-verification (Phase 17 close-out).
- Card stacked-deck / carousel UX (rejected for single-scroll-list).
- Filter state persistence across reload (rejected per D-16-PERSIST-MEMORY).
- Hover-preview tooltip on desktop.
- Filter intersection mode toggle (AND ↔ OR).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAME-03 | Filter/navigate by selecting multiple skills, year/timeline range (2007–2026), and skill category; reset clears all filters; combinable (intersection); pure selectors. | §1 (selectors), §2 (dual-thumb slider), §8 (performance), §10 (bundle) — all locked-down. |
| GAME-04 | Selecting a skill shows experiences as floating bilingual cards — title, company, date, location, bullets, tech chips (colored by category) — plus CV CTA. | §3 (focus trap), §4 (bottom-sheet), §6 (card swap), §7 (chip flash), §9 (RTL test patterns) — all addressed below. |

---

## Project Constraints (from project instructions + STATE.md)

**HARD constraints — no recommendation may contradict:**
- React 18.3.1 (per `package.json`; the `./project instructions` text "React 17.0.2" is outdated — `react-dom/client.createRoot` already in use by `src/index.js`).
- Tailwind CSS 3.4.19 (token-driven via CSS-vars; `darkMode: 'class'` + `[data-theme="light"]` override).
- JSX-in-`.js` (esbuild loader). No `.jsx` files.
- Vite 6.4.2 build. Vitest 2.1.9 + RTL 16.3.0 + jsdom 25 test infra (already wired).
- ESLint airbnb + react + jsx-a11y. **No semicolons** (`semi: 0`), **no comma-dangle enforcement**, max-len disabled.
- Bilingual via `t.game.*` keys. NEVER inline EN/ES literals.
- Token-driven colors via CSS-vars. `SKILL_CATEGORY_COLORS` hex values = documented data exception.
- Pure-logic modules zero framework imports (`src/game/filters.js` follows `src/game/spatialNav.js` Phase 15 pattern).
- TDD: RED commit (failing tests) → GREEN commit (implementation). Each task = atomic commit.
- Lighthouse mobile HARD gate (Perf ≥95 / A11y 100 / BP 100 / SEO 100). Phase 17 re-verifies; Phase 16 must not regress.
- Bundle budget: `< ~30 kB gz` over baseline for the mobile game-mode path total. Current `GameMode-*.js` chunk = 5.09 kB gz (build verified 2026-06-02).
- WCAG 2.1 AA (contrast, keyboard nav, screen reader). 44×44px touch targets.
- `prefers-reduced-motion` disables physics/particles globally; per-component honor via `motion-safe:` prefix.

**Project skills auto-triggers (per `<assistant-config>/project instructions`):**
- `clean-code` (SOLID, refactor); `testing` (TDD, BDD, Vitest, RTL); `software-architect` (C4 model, STRIDE — light touch for a frontend phase).
- No `hexagonal-java`/`hexagonal-kotlin`/`spring-boot` — frontend phase.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Filter selector logic (AND intersection, year-range, category) | Pure JS module (`src/game/filters.js`) | — | Pure functions enable near-100% unit-test coverage; mirrors Phase 15 `spatialNav.js` and Phase 14 `constellation.graph.js`. No React deps. |
| Filter state ownership | React hook (`useConstellation.js`) | — | Lift state once; expose to renderer + SkillFilters + ExperienceCard via props. Phase 15 placeholder fields (`highlightedSkillIds`, `yearRange`) already wired. |
| Filter UI bar (chips + slider + reset) | React component (`SkillFilters.js`) | — | Presentational; receives state + setters from `useConstellation` via `GameMode.js`. |
| ExperienceCard dialog | React component (`ExperienceCard.js`) via `createPortal` to `document.body` | — | Portal escapes parent stacking contexts; matches `Nav.js MobileMenu` pattern. Receives `selectedSkillId`, filter state, callbacks. |
| Year-range slider (dual-thumb) | Custom React widget inside `SkillFilters.js` (or extracted file if it exceeds ~120 LOC) | — | WAI-ARIA APG dictates two `role="slider"` thumbs; no library needed at the size budget. |
| Click-outside detection | Global `document.addEventListener('mousedown', …)` mounted by `ExperienceCard` `useEffect`, with `closest('[data-game-interactive]')` allowlist | — | One handler beats per-element propagation. Removed on unmount/close. |
| Bottom-sheet animation | Tailwind keyframe + `motion-safe:` prefix | — | `transform: translateY(100%) → 0`. No animation lib needed. |
| Constellation dim/highlight for filter state | Existing `SvgConstellation.js` extended to consume `highlightedSkillIds[]` + `yearRange` | — | Renderer props contract locked Phase 15; Phase 16 fills in consumer logic per D-16-YEAR-EFFECT + D-16-INTERSECT-HIGHLIGHT. |

---

## Standard Stack

### Core (no additions — all already in tree)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 18.3.1 | Component model + hooks | Already in `package.json` `[CITED: package.json:9]`. React 18 enables `useId`, `useSyncExternalStore` if needed (not needed for Phase 16). |
| react-dom | 18.3.1 | `createPortal` for dialog | Already used by `Nav.js MobileMenu` `[VERIFIED: src/components/Nav.js:228]`. |
| tailwindcss | 3.4.19 | Utility CSS + theme | `[CITED: package.json:47]`. CSS-var theme tokens already established. |
| vitest | 2.1.9 | Test runner | `[CITED: package.json:49]`. Note: 2.2.x still pre-release per Phase 14 plan; do not upgrade. |
| @testing-library/react | 16.3.0 | Component tests | `[CITED: package.json:30]`. RTL 16 is the React 19-compatible major; works with React 18. |
| @testing-library/user-event | 14.6.1 | Simulate Tab, Arrow keys, focus, click — required for slider + dialog tests | `[CITED: package.json:31]`. `userEvent.tab({ focusTrap })` is the canonical way to test focus-trap dialogs. |
| jsdom | 25.0.1 | DOM env for Vitest | `[CITED: package.json:41]`. |

### Supporting (in tree but NOT used for Phase 16)

| Library | Version | Recommendation |
|---------|---------|----------------|
| `@headlessui/react` | (listed by project instructions as a dep, but `package.json` does NOT include it as of 2026-06-02 build) | **Do not add.** Verified absent: `rg '@headlessui' package.json src/` returns nothing. UI-SPEC line 34 explicitly says "available but unused" — that line is stale guidance from earlier project context; `@headlessui/react` is NOT currently in `package.json`. Adding it now would inject ~14 kB gz (Dialog + Transition) for one dialog. |

### Alternatives Considered

| Instead of inline focus-trap (~40 LOC) | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-roll | `react-focus-lock` v2.13.7 | ~9 kB gz add (`[CITED: bundlephobia.com/package/react-focus-lock]`). Battle-tested but overkill for one dialog. |
| Hand-roll | `focus-trap-react` v10.x | ~5 kB gz add. Wrapper around vanilla `focus-trap`. Simpler API. Still adds dep weight for ~20 LOC of saved code. |
| Hand-roll | Native `<dialog>` + `showModal()` | 0 kB add. ~97% global browser support 2026 `[CITED: caniuse.com/dialog]`. **But:** breaks the bottom-sheet animation contract (can't apply custom `translateY` keyframe to native dialog reliably across iOS Safari + mobile Chrome), and `::backdrop` doesn't compose with the existing overlay token pattern. **Rejected** because D-16-CARD-STRUCTURE requires bottom-sheet on mobile + custom desktop popover positioning. |

| Instead of pure CSS bottom-sheet | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-roll | `react-modal-sheet` (Motion-based) | ~20 kB gz including Motion. **Rejected** — D-16-CARD-STRUCTURE says single scrollable card; no need for snap points, spring physics. |
| Hand-roll | `react-spring-bottom-sheet` | ~25 kB gz including react-spring. **Rejected** — same. |
| Hand-roll | `vaul` (modern Radix-aligned drawer) | ~12 kB gz. Closer to what we want. **Rejected on principle** — one extra dep for one screen. |

### Installation

```bash
# No new dependencies needed for Phase 16.
# Existing scripts handle install + build + test:
#   npm install     (no-op for Phase 16 — no new deps)
#   npm run dev
#   npm run build
#   npm run test
```

**Version verification (build environment, 2026-06-02):**
- `npm view react version` → 19.x is current latest; the project pins `^18.3.1`. **Do not upgrade.** React 19 requires migration testing and is out of Phase 16 scope.
- `npm view tailwindcss version` → 4.x is current; project on `^3.4.19`. **Do not upgrade** — Tailwind 4 is a major architectural shift (Lightning CSS, `@theme` config, different plugin model).
- All existing deps stay pinned at their `package.json` ranges.

---

## Package Legitimacy Audit

> Phase 16 installs **zero new packages**. The audit table records the existing in-tree packages this phase consumes; no slopcheck verdict is required because no install step exists.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| react | npm | 12 yrs | 30M+/wk | github.com/facebook/react | [OK] (skipped — preinstalled) | Approved — in tree |
| react-dom | npm | 12 yrs | 30M+/wk | github.com/facebook/react | [OK] (skipped) | Approved — in tree |
| tailwindcss | npm | 7 yrs | 12M+/wk | github.com/tailwindlabs/tailwindcss | [OK] (skipped) | Approved — in tree |
| vitest | npm | 4 yrs | 8M+/wk | github.com/vitest-dev/vitest | [OK] (skipped) | Approved — in tree |
| @testing-library/react | npm | 6 yrs | 12M+/wk | github.com/testing-library/react-testing-library | [OK] (skipped) | Approved — in tree |
| @testing-library/user-event | npm | 6 yrs | 8M+/wk | github.com/testing-library/user-event | [OK] (skipped) | Approved — in tree |

**Packages removed due to slopcheck [SLOP] verdict:** none (no install)
**Packages flagged as suspicious [SUS]:** none (no install)

*slopcheck was not invoked because Phase 16 introduces no new install step. If a future planner reverses the recommendation and adds (e.g.) `react-focus-lock`, run `slopcheck install react-focus-lock --json` first and gate the install behind a `checkpoint:human-verify` task.*

---

## Architecture Patterns

### System Architecture Diagram

```
                          ┌─────────────────────────────────────────┐
                          │           User Interaction               │
                          │  click chip ▸ drag thumb ▸ click node    │
                          │  click tech-chip ▸ Esc ▸ tap overlay     │
                          └────────────────┬────────────────────────┘
                                           │
                                           ▼
                  ┌─────────────────────────────────────────────┐
                  │      useConstellation (hook, in GameMode)    │
                  │   State: selectedSkillId, hoveredSkillId,    │
                  │          selectedSkills[], yearRange,         │
                  │          category                             │
                  │   Setters: onSelectSkill, onHoverSkill,       │
                  │            toggleSkill, setYearRange,         │
                  │            setCategory, resetFilters          │
                  │   Derived (via filters.js pure selectors):   │
                  │     highlightedSkillIds[] = union of skills  │
                  │       passing year+category, ∩ explicit sel  │
                  │     filteredJobs(skillId) = jobs ∩ filters   │
                  │     isFilterActive = boolean                  │
                  │     hasZeroMatches = boolean                  │
                  └─────────────┬──────────────────┬──────────────┘
                                │                  │
                                ▼                  ▼
            ┌───────────────────────────┐   ┌──────────────────────────────┐
            │      SkillFilters.js       │   │      SvgConstellation.js     │
            │  - Skill chip cluster      │   │  (Phase 15, extended)         │
            │  - Year dual-thumb slider  │   │  Reads highlightedSkillIds[] │
            │  - Category chip cluster   │   │  + yearRange to dim non-     │
            │  - Reset button             │   │  matching nodes/edges.       │
            │  - data-game-interactive    │   │  Roving-tabindex unchanged.  │
            └───────────────────────────┘   └──────────────────────────────┘
                                │                  │
                                │                  ▼
                                │     ┌──────────────────────────────────┐
                                │     │  onSelectSkill(id) → sets         │
                                │     │  selectedSkillId in hook          │
                                │     └────────────────┬─────────────────┘
                                │                      │
                                │  selectedSkillId ≠ null│
                                │                      ▼
                                │     ┌──────────────────────────────────┐
                                │     │      ExperienceCard.js            │
                                │     │   createPortal(…, document.body)  │
                                │     │   role="dialog" + aria-modal     │
                                │     │   Focus trap (inline ~40 LOC)    │
                                │     │   Esc → onSelectSkill(sameId)    │
                                │     │     ⇒ toggles to null (Phase 15   │
                                │     │       hook behavior unchanged)    │
                                │     │   Click outside [data-game-       │
                                │     │     interactive] → close          │
                                │     │   Footer: CV CTA <a download>     │
                                │     │   Body: <ol> of filtered jobs     │
                                │     │     Each tech-chip → toggleSkill  │
                                │     │   Mobile: bottom-sheet slide-up   │
                                │     └──────────────────────────────────┘
                                │                      │
                                └──────────────────────┘
                                       (chip → toggleSkill loops back to filter state)
```

### Component Responsibilities

| File | Purpose | Reads | Writes | Notes |
|------|---------|-------|--------|-------|
| `src/game/filters.js` (new) | Pure selectors. No React. | `EXPERIENCE`, filter state | Returns derived arrays/maps | Mirrors `spatialNav.js` shape. Near-100% unit-test target. |
| `src/game/useConstellation.js` (extended) | React state + derived memos | `nodes`, internal state | Setters, derived values | Phase 15 placeholder fields filled in. |
| `src/game/SkillFilters.js` (new) | Filter UI bar | Filter state via props | Calls setters via props | `data-game-interactive` on root. |
| `src/game/ExperienceCard.js` (new) | `role="dialog"` w/ focus trap | `selectedSkillId`, filter state, lang, t | Calls `onSelectSkill`, `toggleSkill` | Portal to `document.body`. |
| `src/game/YearRangeSlider.js` (new, optional split-out) | Dual-thumb slider | `[startYear, endYear]`, bounds | Calls `setYearRange` | Inline inside `SkillFilters.js` if ≤120 LOC; extract if larger. |
| `src/game/renderers/SvgConstellation.js` (extended) | Renderer | `highlightedSkillIds`, `yearRange` props | — | Dim-others logic extended per D-16-YEAR-EFFECT. |
| `src/game/GameMode.js` (extended) | Orchestrator | `useConstellation()` | Passes setters down | Mounts `<SkillFilters />` + `<ExperienceCard />`. |
| `src/i18n/translations.js` (extended) | t.game.* keys | — | — | All 20+ new keys listed in `16-UI-SPEC.md` §Copywriting Contract. |

### Recommended Project Structure

```
src/game/
├── GameMode.js                  # Phase 15 (extended) — wires filters + card
├── useConstellation.js          # Phase 15 (extended) — fills in filter state
├── filters.js                   # Phase 16 NEW — pure selectors
├── filters.test.js              # Phase 16 NEW — near-100% coverage
├── SkillFilters.js              # Phase 16 NEW — filter UI bar
├── SkillFilters.test.js         # Phase 16 NEW
├── ExperienceCard.js            # Phase 16 NEW — role="dialog"
├── ExperienceCard.test.js       # Phase 16 NEW
├── YearRangeSlider.js           # Phase 16 NEW (optional extraction)
├── YearRangeSlider.test.js      # Phase 16 NEW
├── spatialNav.js                # Phase 15 (unchanged)
├── constellation.graph.js       # Phase 14 (unchanged)
├── constellation.layout.js      # Phase 14 (unchanged)
├── ConstellationFallback.js     # Phase 15 (unchanged)
└── renderers/
    └── SvgConstellation.js      # Phase 15 (extended for highlightedSkillIds + yearRange consumption)
```

---

## 1. Pure-Filter Selector Module (`src/game/filters.js`)

**Recommendation:** Build as four single-purpose pure functions + one composer. Mirrors `spatialNav.js` Phase 15 — exactly the same convention.

```js
// src/game/filters.js
// Pure selector module — zero React/DOM imports. Tested with plain Vitest.

const CURRENT_YEAR = 2026 // mirror constellation.graph.js convention (no new Date())

/**
 * Returns experiences whose period [start, end ?? CURRENT_YEAR] intersects [from, to].
 */
export function filterByYearRange(experiences, [from, to]) {
  if (from == null || to == null) return experiences
  return experiences.filter((e) => {
    const start = e.period.start
    const end = e.period.end ?? CURRENT_YEAR
    return start <= to && end >= from
  })
}

/**
 * AND intersection: returns experiences whose tech[] contains EVERY skillId.
 * Empty skillIds[] = pass-through (no filtering).
 */
export function filterBySkillIntersection(experiences, skillIds) {
  if (!skillIds || skillIds.length === 0) return experiences
  return experiences.filter((e) => skillIds.every((s) => e.tech.includes(s)))
}

/**
 * Returns experiences using at least one skill in the given category.
 * Requires the skills catalog (SKILLS) to map tech → category.
 */
export function filterByCategory(experiences, category, skills) {
  if (!category) return experiences
  return experiences.filter((e) =>
    e.tech.some((t) => skills[t]?.category === category),
  )
}

/**
 * Compose filters: skill intersection ∩ year range ∩ category.
 * Returns the matching experiences array.
 */
export function composeFilters(experiences, { skillIds, yearRange, category }, skills) {
  let result = experiences
  result = filterBySkillIntersection(result, skillIds)
  if (yearRange) result = filterByYearRange(result, yearRange)
  if (category) result = filterByCategory(result, category, skills)
  return result
}

/**
 * Returns the set of skill ids that appear in at least one matching experience.
 * Used to compute highlightedSkillIds[] for the constellation renderer.
 */
export function visibleSkillIds(matchingExperiences) {
  const set = new Set()
  for (const e of matchingExperiences) {
    for (const t of e.tech) set.add(t)
  }
  return Array.from(set)
}

/**
 * Returns the live year bounds from the experience data.
 * Used to compute slider min/max — never hardcode 2007/2026.
 */
export function yearBounds(experiences) {
  const min = Math.min(...experiences.map((e) => e.period.start))
  const max = Math.max(...experiences.map((e) => e.period.end ?? CURRENT_YEAR))
  return [min, max]
}
```

**Test plan (filters.test.js):** Near-100% coverage. 12 tests minimum:
1. `filterByYearRange` — full range pass-through.
2. `filterByYearRange` — single year intersection (boundary).
3. `filterByYearRange` — disjoint range returns `[]`.
4. `filterByYearRange` — `period.end == null` treated as `CURRENT_YEAR`.
5. `filterBySkillIntersection` — empty array pass-through.
6. `filterBySkillIntersection` — single skill = filter by membership.
7. `filterBySkillIntersection` — multi-skill = AND (Java + Spring Boot returns only jobs with both).
8. `filterBySkillIntersection` — non-existent skill returns `[]`.
9. `filterByCategory` — null pass-through.
10. `filterByCategory` — category match via skills map.
11. `composeFilters` — all three dimensions combined.
12. `yearBounds` — asserts live data produces `[2007, 2026]` (D-16-YEAR-BOUNDS honesty rule).
13. `visibleSkillIds` — dedupe across experiences.

### Anti-Patterns to Avoid

- **Do not memoize at the call site.** `composeFilters` over 12 entries × 7 tech-string-includes per filter change = ~84 string comparisons. That's a sub-microsecond op. `useMemo` adds insurance against re-renders but adds equality-comparison cost; ship without and only add if profiling shows benefit.
- **Do not mutate the input arrays.** Every filter returns a new array (`.filter` already does this).
- **Do not pass `CURRENT_YEAR` as a parameter.** Treat it as a module constant matching `constellation.graph.js` for deterministic test output.

---

## 2. Dual-Thumb Year Range Slider

**Recommendation:** Pure React + Tailwind + ARIA. ~120 LOC. No library. Inline inside `SkillFilters.js` initially; extract to `YearRangeSlider.js` if it grows.

### Why no library

- Existing libraries (`@radix-ui/react-slider` ~14 kB gz, `rc-slider` ~12 kB gz) violate the "no new heavy deps" constraint and bring more surface than this single use case needs.
- WAI-ARIA APG defines the *exact* pattern `[CITED: w3.org/WAI/ARIA/apg/patterns/slider-multithumb/]`. ~120 LOC is achievable.

### WAI-ARIA contract (locked)

Per APG Slider (Multi-Thumb) Pattern `[CITED: w3.org/WAI/ARIA/apg/patterns/slider-multithumb/]`:

- Each thumb is a focusable element with `role="slider"`.
- Each thumb is in the page tab sequence; tab order remains constant regardless of value or visual position.
- Each thumb has:
  - `aria-valuenow={currentValue}`
  - `aria-valuemin={...}` — **dependent**: start-thumb's max is `endValue - 1`; end-thumb's min is `startValue + 1`. Update these when the other thumb moves.
  - `aria-valuemax={...}` — dependent (same).
  - `aria-valuetext={formattedString}` — recommended when numeric value lacks context. Use e.g. `"From 2018"`/`"To 2026"` bilingual.
  - `aria-label={localizedLabel}` — bilingual via `t.game.yearStartLabel` / `t.game.yearEndLabel`.
  - `aria-orientation="horizontal"` (default; can omit since horizontal is default).

### Keyboard contract (locked per APG + D-16-YEAR-INPUT)

| Key | Action |
|-----|--------|
| `ArrowRight` / `ArrowUp` | Increment focused thumb by 1 year. Cap at thumb's `aria-valuemax`. |
| `ArrowLeft` / `ArrowDown` | Decrement focused thumb by 1 year. Floor at thumb's `aria-valuemin`. |
| `Home` | Jump focused thumb to its `aria-valuemin`. |
| `End` | Jump focused thumb to its `aria-valuemax`. |
| `PageUp` / `PageDown` | (Optional — APG recommends but not required for our 20-year range.) Skip — D-16-YEAR-INPUT does not require it. |
| `Tab` | Move focus to next document focus stop (next thumb, or out of slider). |

All keyboard handlers MUST call `e.preventDefault()` to prevent page scroll.

### Implementation sketch

```jsx
// Inside SkillFilters.js (or YearRangeSlider.js if extracted)
function YearRangeSlider({ value, bounds, onChange, t }) {
  const [start, end] = value
  const [min, max] = bounds
  const range = max - min
  const startPct = ((start - min) / range) * 100
  const endPct = ((end - min) / range) * 100

  const startThumbRef = useRef(null)
  const endThumbRef = useRef(null)

  function handleKey(thumb, e) {
    const [from, to] = value
    let next = thumb === 'start' ? from : to
    const lo = thumb === 'start' ? min : from + 1
    const hi = thumb === 'start' ? to - 1 : max

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(next + 1, hi)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(next - 1, lo)
    else if (e.key === 'Home') next = lo
    else if (e.key === 'End') next = hi
    else return
    e.preventDefault()
    onChange(thumb === 'start' ? [next, to] : [from, next])
  }

  // Pointer drag (optional v1; keyboard is the locked contract):
  // Implement via onPointerDown → setPointerCapture → onPointerMove diff to year.
  // Skip pointer drag if it adds > 30 LOC; users can also click the chip rail
  // to jump (consider that a v2 enhancement).

  return (
    <div role="group" aria-label={t.game.yearLabel}
         className="relative w-full max-w-[200px] py-3">
      <div className="relative h-1 bg-slider-track rounded-full">
        <div className="absolute h-1 bg-slider-range rounded-full"
             style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
        <button
          ref={startThumbRef}
          type="button"
          role="slider"
          aria-label={t.game.yearStartLabel}
          aria-valuemin={min}
          aria-valuemax={end - 1}
          aria-valuenow={start}
          aria-valuetext={`${t.game.yearFrom} ${start}`}
          aria-orientation="horizontal"
          onKeyDown={(e) => handleKey('start', e)}
          className="absolute -translate-x-1/2 -translate-y-1/2 top-1/2
                     w-4 h-4 rounded-full bg-slider-thumb border-2 border-slider-thumbBorder
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1
                     before:absolute before:inset-[-14px] before:content-['']"  /* 44px touch */
          style={{ left: `${startPct}%` }}
        />
        <button
          ref={endThumbRef}
          /* identical pattern, mirrored bounds */
        />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-text-muted mt-1">
        <span aria-hidden="true">{min}</span>
        <span aria-hidden="true">{max}</span>
      </div>
      <div className="text-xs font-mono text-text-secondary mt-1">
        {start} — {end}
      </div>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {`${start} — ${end}`}
      </span>
    </div>
  )
}
```

### Pointer drag — defer to v2 unless trivial

The keyboard contract is what WCAG 2.1 AA + APG mandates. Pointer drag is convenience. If implementing, follow:
- `onPointerDown` on thumb → `setPointerCapture(e.pointerId)` so pointer events keep flowing even if cursor leaves thumb.
- `onPointerMove` → compute `pct = (e.clientX - trackLeft) / trackWidth`, snap to nearest year, clamp to opposite thumb ± 1.
- `onPointerUp` → `releasePointerCapture`.
- For mobile: relies on Pointer Events level 2; supported by all baseline browsers since 2019.

**If pointer drag exceeds ~40 LOC, ship keyboard-only for v1 and add drag in a Phase 16 follow-up plan.**

### Anti-patterns

- **Do not use two stacked `<input type="range">`.** APG explicitly prefers two `role="slider"` buttons because two native ranges with the same track cannot coordinate dependent ranges and `<input>` z-index/click-target collision is browser-inconsistent. (The UI-SPEC line 280 already documents this.)
- **Do not bind both thumbs to the same focus listener.** Each thumb has its own `aria-valuemin`/`max` and its own keyboard handler.

---

## 3. ExperienceCard Focus Trap (Inline, ~40 LOC)

**Recommendation:** Hand-roll. Mirrors the `MobileMenu` Esc-handler shape already in `src/components/Nav.js:167–229`. Bundle cost: 0.

### Why no library

| Option | Bundle add (gz) | Verdict |
|--------|-----------------|---------|
| `react-focus-lock` 2.13.7 | ~9 kB | `[CITED: bundlephobia.com/package/react-focus-lock]` — comprehensive but heavy for one dialog. |
| `focus-trap-react` 10.x | ~5 kB | Wrapper around vanilla focus-trap. Still heavy. |
| Native `<dialog>` + `showModal()` | 0 kB | `[CITED: caniuse.com/dialog]` 97% global support 2026. **But:** breaks the custom slide-up animation on bottom-sheet (browsers special-case `transform` on dialogs in the top layer inconsistently — iOS Safari known issue), and `::backdrop` doesn't compose with the existing overlay-token pattern. **Rejected.** |
| Hand-rolled focus trap | 0 kB | **Recommended.** ~40 LOC including unmount cleanup. |

### Implementation contract

```jsx
// Inside ExperienceCard.js
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function getFocusable(container) {
  return container.querySelectorAll(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  )
}

export default function ExperienceCard({
  selectedNode, jobs, lang, t,
  onClose, onToggleSkill, rovingEntryRef, /* return-focus target */
}) {
  const cardRef = useRef(null)
  const headingRef = useRef(null)
  const previousFocusRef = useRef(null)

  // 1. Initial focus + return focus
  useEffect(() => {
    previousFocusRef.current = document.activeElement
    headingRef.current?.focus()
    document.body.style.overflow = 'hidden' // matches MobileMenu pattern
    return () => {
      document.body.style.overflow = ''
      // Return focus is handled by GameMode via rovingEntryRef.current?.focus()
      // when selectedSkillId transitions back to null.
    }
  }, [])

  // 2. Esc + Tab cycle focus trap
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && cardRef.current) {
        const focusable = getFocusable(cardRef.current)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // 3. Click-outside close — allow-list via data-game-interactive
  useEffect(() => {
    function onMouseDown(e) {
      if (!e.target.closest('[data-game-interactive]')) onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  return createPortal(
    <>
      {/* Overlay (mobile + desktop variants differ in classes) */}
      <div className="..." onClick={onClose} aria-hidden="true" />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-skill-heading"
        data-game-interactive
        className="..."
      >
        <header>
          <h2 id="card-skill-heading" ref={headingRef} tabIndex={-1}>
            {selectedNode.label}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.game.cardClose}>
            ×
          </button>
        </header>
        <ol>{/* jobs */}</ol>
        <footer>
          <a
            href={`/CV_Carlos_Montoya_${lang === 'en' ? 'EN' : 'ES'}.docx`}
            download
            aria-label={t.game.cvCtaLabel}
          >
            {t.game.cvCtaLabel}
          </a>
        </footer>
      </div>
    </>,
    document.body,
  )
}
```

### Notes

- `[CITED: dev.to/vmvenkatesh78/your-dialog-has-roledialog-that-doesnt-make-it-accessible-4lha]` — query focusable elements in the keydown handler, NOT cached on mount. Tech chips render conditionally; cached set goes stale. The pattern above does this correctly.
- `[CITED: testing-library.com/docs/user-event/v13/]` — `userEvent.tab({ focusTrap: cardElement })` is the canonical RTL pattern for asserting trap cycle behavior.
- The `previousFocusRef` capture is defensive; in practice **focus return is handled by Phase 15's `rovingEntryRef`** because the user opened the card from a constellation node. `GameMode.js` already has this ref. Phase 16 calls `rovingEntryRef.current?.focus()` when `selectedSkillId` transitions to `null`.
- Phase 15's `SvgConstellation.handleKeyDown` already calls `onSelectSkill(selectedSkillId)` on Esc to toggle off `[VERIFIED: src/game/renderers/SvgConstellation.js:144–150]`. Phase 16 must NOT register a competing Esc handler on the renderer — the dialog's Esc handler stops at `e.preventDefault()` and unmounts itself, which triggers the return-focus path naturally.

### Anti-patterns

- **Do not call `cardRef.current.focus()` directly** — focus the heading (`tabIndex={-1}`) so screen readers announce the dialog label.
- **Do not stop propagation on the dialog wrapper.** The click-outside detection uses `closest('[data-game-interactive]')` which already handles it.
- **Do not auto-focus close button.** The W3C dialog pattern explicitly recommends focusing the heading so SR announces context, not the dismiss affordance.

---

## 4. Mobile Bottom-Sheet — Pure CSS, No Library

**Recommendation:** Tailwind `motion-safe:animate-card-slide-up` keyframe (already specified in `16-UI-SPEC.md`). Tap-overlay + Esc + X-button close. **Defer drag-down-to-close to v2** unless implementation cost stays under 30 LOC.

### Pure CSS implementation

The UI-SPEC already specifies `cardSlideUp` keyframe (`16-UI-SPEC.md:335–338`):

```js
cardSlideUp: {
  '0%':   { opacity: '0', transform: 'translateY(100%)' },
  '100%': { opacity: '1', transform: 'translateY(0%)' },
},
// animation utility:
'card-slide-up': 'cardSlideUp 250ms cubic-bezier(0.22, 1, 0.36, 1) both',
```

Apply with `motion-safe:animate-card-slide-up`. The global `prefers-reduced-motion` rule already suppresses to 0.01ms (per Phase 15 `src/index.css` setup).

### Drag-down close (defer or implement under budget)

If implementing, **stay within 30 LOC**:

```jsx
function useDragToClose(onClose, prefersReducedMotion) {
  const [translateY, setTranslateY] = useState(0)
  const dragStartRef = useRef(null)
  function onPointerDown(e) {
    if (prefersReducedMotion) return
    dragStartRef.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e) {
    if (dragStartRef.current == null) return
    const dy = e.clientY - dragStartRef.current
    if (dy > 0) setTranslateY(dy)
  }
  function onPointerUp(e) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (translateY > 80) onClose()
    setTranslateY(0)
    dragStartRef.current = null
  }
  return { translateY, onPointerDown, onPointerMove, onPointerUp }
}
```

Attach to the drag-handle bar only (not the whole sheet — that would prevent internal scroll).

**Recommendation:** Ship v1 without drag-down. Tap-overlay + X-button + Esc are sufficient; the visible drag-handle bar is a visual affordance that does not need to be functional in v1. This frees ~30 LOC of test surface.

### Browser support

- Pointer Events Level 2: 100% of browserslist targets `[CITED: caniuse.com/pointer]`.
- `setPointerCapture`: 97%+ — safe.

---

## 5. Click-Outside Close — `[data-game-interactive]` Allow-list

**Recommendation:** Global `mousedown` listener on `document`, allow-list via `closest('[data-game-interactive]')`. The card, filter bar, and Nav all carry `data-game-interactive` (Nav already needs this attribute added or alternatively, the allow-list can check `closest('header[role="banner"], [data-game-interactive]')`).

### Why mousedown not click

- `mousedown` fires before `click`. Closing on `mousedown` feels immediate and prevents an awkward sequence where the user starts a drag-select inside the card but the `mouseup` happens outside, triggering `click` on the body and closing the card mid-drag.
- React event listeners on document use the React synthetic event system; for global outside-detection, use the native API to bypass React's bubbling timing.

### Implementation

```jsx
// Already shown in §3 above:
useEffect(() => {
  function onMouseDown(e) {
    if (!e.target.closest('[data-game-interactive]')) onClose()
  }
  document.addEventListener('mousedown', onMouseDown)
  return () => document.removeEventListener('mousedown', onMouseDown)
}, [onClose])
```

### Edge cases

- **Theme/lang toggle clicks** — these live inside `<header>` Nav. Add `data-game-interactive` to the `<header>` element so toggles work without closing the card. Alternative: extend the allow-list to `[data-game-interactive], header[role="banner"]`.
- **Mobile overlay tap** — the overlay div carries `onClick={onClose}` directly; the `mousedown` listener fires too but reaches `onClose` once (re-entrancy is safe because `selectedSkillId` transitioning to `null` is idempotent).
- **Test environment** — RTL `userEvent.click(document.body)` triggers `mousedown`+`mouseup`+`click` in order; the listener catches the first one.

### React 17 → 18 quirks

React 18 batches state updates across all events (React 17 only batched in event handlers). This means `setSelectedSkillId(null)` inside the global mousedown listener will be batched with any state updates inside the same microtask. **No code change required** — the existing `useConstellation` hook already uses `useCallback` setters, so the transition is clean.

---

## 6. Card Swap Animation (150ms Cross-Fade)

**Recommendation:** Use `key={selectedSkillId}` on the card content wrapper to force remount, plus `motion-safe:animate-card-fade-in`. Two-phase approach (manual out → in) adds state-machine complexity not worth the visual difference for ~75ms.

### Single-phase `key`-based approach (simpler, ~5 LOC)

```jsx
// Inside ExperienceCard.js — wrap content in a keyed div:
<div
  key={selectedNode.id}
  className="motion-safe:animate-card-fade-in"
>
  <header>…</header>
  <ol>{jobs.map(…)}</ol>
  <footer>…</footer>
</div>
```

When `selectedNode.id` changes, React unmounts the old content and mounts the new — same as remounting the whole card but cheaper. The fade-in keyframe runs on every mount; under reduced-motion the global rule suppresses to 0.01ms (effectively instant).

### Drawback

The "out" half of the cross-fade is skipped — the old content disappears instantly when the new content fades in. In practice, with `cardFadeIn` at 200ms cubic-bezier the perceived behavior reads as "content replaced smoothly". UI-SPEC `cardSwapOut` + `cardSwapIn` keyframes can be skipped in v1.

### If a true cross-fade is later required (~25 LOC, two-phase)

```jsx
const [phase, setPhase] = useState('idle') // 'idle' | 'out' | 'in'
const [displayedId, setDisplayedId] = useState(selectedNode.id)

useEffect(() => {
  if (displayedId === selectedNode.id) return
  setPhase('out')
  const t = setTimeout(() => {
    setDisplayedId(selectedNode.id)
    setPhase('in')
    const u = setTimeout(() => setPhase('idle'), 75)
    return () => clearTimeout(u)
  }, 75)
  return () => clearTimeout(t)
}, [selectedNode.id, displayedId])
```

Under reduced-motion: skip the phase machine entirely, just update `displayedId` synchronously.

**Recommend v1 ship single-phase `key`-based.** Re-evaluate after UAT.

---

## 7. Tech-Chip Click-to-Filter Flash

**Recommendation:** Apply `motion-safe:animate-chip-flash` class via `[data-just-filtered=$nodeId]` on the constellation root, then clear via `setTimeout(100ms)`. CSS attribute selector targets the matching `<circle>`.

### Implementation

In `useConstellation.js`:

```js
const [justFiltered, setJustFiltered] = useState(null)
const toggleSkill = useCallback((skillId) => {
  setSelectedSkills((prev) =>
    prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId],
  )
  setJustFiltered(skillId)
  setTimeout(() => setJustFiltered(null), 100)
}, [])
```

In `SvgConstellation.js`, the `<g>` for the affected node receives `className={node.id === justFiltered ? 'motion-safe:animate-chip-flash' : ''}`. The `chipFlash` keyframe is already specified in `16-UI-SPEC.md:349–353`.

### Under reduced-motion

The global CSS rule suppresses animation duration. Visually the `fill-opacity` updates instantly — exactly the spec ("Reduced-motion = instant dim update only").

### Anti-patterns

- **Do not stack timeouts.** Clicking 3 chips in rapid succession should reset the timer each time. Use a `useRef` to hold the latest `setTimeout` handle and `clearTimeout` before setting a new one.

---

## 8. Performance — Filter Selectors at Scale

**Verdict:** No memoization needed for correctness or performance. **Optional `useMemo` is a code-clarity choice, not a perf choice.**

### Numbers

- 12 experiences × max 7 tech entries = 84 string includes per `filterBySkillIntersection`.
- × max 3 chained filters = 252 operations per filter state change.
- Each `string.includes` on an array of strings ≤ 7 = O(7).
- V8 optimizes this to nanoseconds. Total cost per filter change: < 50 µs.

### React render cost

- `SvgConstellation` re-renders on every filter change (it reads `highlightedSkillIds` + `yearRange`).
- 26 node `<g>` elements, ~30 edge `<line>` elements = 56 React reconciliation entries.
- React 18 reconciles 56 children in < 1 ms on a 2020-era mid-range Android device.
- **No perf concern.** No `React.memo`, no `useCallback` on rendering paths needed beyond what `useConstellation` already returns.

### Lighthouse mobile gate budget

- Current `GameMode-*.js` chunk: 5.09 kB gz (verified 2026-06-02 via `npm run build`).
- Phase 16 add target: ≤ 10 kB gz.
- Predicted Phase 16 chunk after merge: 12–14 kB gz total.
- Phase 17 Lighthouse re-verification has ~16 kB gz headroom on the current 5 kB baseline before the budget (`< ~30 kB gz over baseline`) bites.

### When to add memoization

- If filter state changes trigger > 5 re-renders/sec (impossible for human interaction).
- If RTL test profiles show re-render thrash that obscures assertion timing.
- Otherwise: do not add `useMemo`.

---

## 9. Vitest + RTL Test Patterns for `role="dialog"`

**Reference setup:** `vite.config.js` test block + `src/test/setup.js` are already wired. Phase 16 reuses verbatim.

### Test patterns for filters.js (pure unit)

```js
// src/game/filters.test.js
import { describe, it, expect } from 'vitest'
import {
  filterByYearRange, filterBySkillIntersection,
  composeFilters, yearBounds, visibleSkillIds,
} from './filters'
import EXPERIENCE from '../data/experience'
import { SKILLS } from '../data/skills'

describe('filterBySkillIntersection', () => {
  it('returns experiences that contain every requested skill (AND semantics)', () => {
    const result = filterBySkillIntersection(EXPERIENCE, ['Java', 'Spring Boot'])
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.tech.includes('Java') && e.tech.includes('Spring Boot'))).toBe(true)
  })

  it('returns empty array when no experience matches all requested skills', () => {
    const result = filterBySkillIntersection(EXPERIENCE, ['Java', 'Asterisk'])
    // Asterisk only at Grupo Nethexa (which also has Java) — still 1
    // Use a known disjoint pair instead:
    const noMatch = filterBySkillIntersection(EXPERIENCE, ['Asterisk', 'Kubernetes'])
    expect(noMatch).toEqual([])
  })
})

describe('yearBounds (D-16-YEAR-BOUNDS honesty rule)', () => {
  it('derives [2007, 2026] from live data', () => {
    expect(yearBounds(EXPERIENCE)).toEqual([2007, 2026])
  })
})
```

### Test patterns for SkillFilters

```js
// src/game/SkillFilters.test.js
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillFilters from './SkillFilters'
import translations from '../i18n/translations'

describe('SkillFilters chip toggle', () => {
  it('toggles aria-pressed when clicked', async () => {
    const user = userEvent.setup()
    const onToggleSkill = vi.fn()
    render(<SkillFilters
      selectedSkills={[]}
      onToggleSkill={onToggleSkill}
      lang="en"
      t={translations.en}
      /* … */
    />)
    const javaChip = screen.getByRole('button', { name: /Java/i })
    await user.click(javaChip)
    expect(onToggleSkill).toHaveBeenCalledWith('Java')
  })
})

describe('YearRangeSlider keyboard', () => {
  it('ArrowRight increments start thumb by 1', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SkillFilters
      yearRange={[2018, 2026]}
      yearBounds={[2007, 2026]}
      onYearRangeChange={onChange}
      /* … */
    />)
    const startThumb = screen.getByRole('slider', { name: /start year|año de inicio/i })
    await user.click(startThumb)
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith([2019, 2026])
  })

  it('respects dependent aria-valuemax (start cannot exceed end - 1)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SkillFilters yearRange={[2025, 2026]} yearBounds={[2007, 2026]} onYearRangeChange={onChange} /* … */ />)
    const startThumb = screen.getByRole('slider', { name: /start year/i })
    await user.click(startThumb)
    await user.keyboard('{ArrowRight}') // can't go past 2025 (= 2026 - 1)
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

### Test patterns for ExperienceCard

```js
// src/game/ExperienceCard.test.js
describe('ExperienceCard role="dialog"', () => {
  it('renders with role=dialog and aria-modal', () => {
    render(<ExperienceCard selectedNode={JAVA_NODE} jobs={JAVA_JOBS} /* … */ />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'card-skill-heading')
  })

  it('focuses heading on mount', () => {
    render(<ExperienceCard /* … */ />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
  })

  it('Esc calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ExperienceCard onClose={onClose} /* … */ />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('Tab cycles within dialog (focus trap)', async () => {
    const user = userEvent.setup()
    render(<ExperienceCard /* … */ />)
    // First Tab: heading → first tech chip
    await user.tab()
    expect(document.activeElement).toHaveAttribute('aria-pressed') // tech chip
    // Tab through all focusable, last should wrap back to first
    // (Use loop or just count and assert wrap.)
  })

  it('tech chip click toggles selectedSkills', async () => {
    const user = userEvent.setup()
    const onToggleSkill = vi.fn()
    render(<ExperienceCard onToggleSkill={onToggleSkill} /* … */ />)
    const springChip = within(screen.getByRole('dialog')).getByRole('button', { name: /Spring Boot/i })
    await user.click(springChip)
    expect(onToggleSkill).toHaveBeenCalledWith('Spring Boot')
  })

  it('CV CTA renders correct href for active lang', () => {
    const { rerender } = render(<ExperienceCard lang="en" /* … */ />)
    expect(screen.getByRole('link', { name: /download cv/i }))
      .toHaveAttribute('href', '/CV_Carlos_Montoya_EN.docx')
    rerender(<ExperienceCard lang="es" /* … */ />)
    expect(screen.getByRole('link', { name: /descargar cv/i }))
      .toHaveAttribute('href', '/CV_Carlos_Montoya_ES.docx')
  })
})
```

### jsdom limitations to know

- `userEvent.tab()` works in jsdom but needs `focusTrap` option when the trap is custom-implemented `[CITED: testing-library.com/docs/user-event/v13/]`. Pass `userEvent.setup({ focusTrap: cardEl })` if assertions reveal focus escaping the dialog.
- jsdom does not implement layout (no `getBoundingClientRect` real values) — slider drag tests should use **keyboard** to drive position changes, not simulated pointer events. Keyboard is the locked a11y contract anyway.
- jsdom does not implement `HTMLCanvasElement.getContext` — already stubbed in `src/test/setup.js:9–11`. No Phase 16 impact.

### Where to mount ExperienceCard in tests

The component uses `createPortal(…, document.body)`. RTL's `render()` returns a `container` that is NOT the portal root. Use `screen.getByRole('dialog')` (queries `document.body`) instead of `container.querySelector`.

---

## 10. Bundle Budget Verification

### Current production bundle (verified 2026-06-02)

```
dist/assets/GameMode-DeTAIKWr.js     12.30 kB │ gzip:  5.09 kB
dist/assets/index-sk_L2n2z.js       169.24 kB │ gzip: 54.79 kB
dist/assets/index-wTKMYTQF.css       42.78 kB │ gzip: 14.25 kB
```

### Phase 16 add — line-of-code estimate

| File | Est. LOC (impl) | Est. min+gz |
|------|-----------------|-------------|
| `filters.js` | 60 | ~0.5 kB |
| `useConstellation.js` extension | 30 LOC over current 28 | ~0.3 kB delta |
| `SkillFilters.js` | 220 (chips + slider + reset + category) | ~3.0 kB |
| `ExperienceCard.js` | 180 (portal + focus trap + chip list + CV CTA) | ~2.5 kB |
| `YearRangeSlider.js` (if extracted) | 0 — inline in SkillFilters | (incl. above) |
| `SvgConstellation.js` extension | 40 LOC (highlightedSkillIds + yearRange consumer) | ~0.4 kB delta |
| New translations.js keys (~20 keys × 2 langs × ~30 chars) | 1.2 kB raw | ~0.4 kB gz |
| Tailwind keyframe additions (chipFlash, cardFadeIn, cardSlideUp, cardSwap*) | CSS — ~0.3 kB gz |

**Total Phase 16 add estimate: ~7–8 kB gz** on the `GameMode-*.js` chunk + CSS.

### Phase 17 Lighthouse mobile headroom

- Game-mode mobile bundle baseline: ~5 kB gz (Phase 15)
- Phase 16 add: ~8 kB gz
- Projected: ~13 kB gz on `GameMode-*.js`
- Phase 17 budget: `< ~30 kB gz total over the original v3.6 baseline`
- **Verdict: well within budget.** Phase 17 WebGL can spend up to ~17 kB gz on the desktop chunk before the gate tightens.

### Risk-tracking flags

- If pointer-drag pushes `SkillFilters.js` over 280 LOC → defer drag to v2.
- If focus-trap edge cases force a library swap → `focus-trap-react` is the lighter option (~5 kB gz) over `react-focus-lock` (~9 kB gz).
- If bottom-sheet animation breaks on iOS Safari → use `transform: translate3d(0, 100%, 0)` instead of `translateY` (forces GPU compositing); zero LOC cost.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bilingual translation lookup | Inline EN/ES strings in components | Add to `src/i18n/translations.js` `t.game.*` namespace | Phase convention; LanguageContext re-renders all consumers. UI-SPEC §Copywriting Contract lists every needed key. |
| Year-bounds derivation | Hardcode `[2007, 2026]` | `yearBounds(EXPERIENCE)` derived at module level | D-16-YEAR-BOUNDS honesty rule. Unit-tested. |
| Category color lookup | Re-resolve via SKILL_CATEGORIES per render | Use `node.color` already embedded by `buildConstellationGraph` | Phase 14 already did the work; Phase 15 verified `SKILL_CATEGORY_COLORS` is not exported `[VERIFIED: src/game/renderers/SvgConstellation.js:11–16]`. |
| Roving tabindex on filter chips | Re-implement spatial nav | Plain Tab order is sufficient | Chips are a linear list; APG button-group pattern is plain Tab traversal between buttons. Don't reach for roving-tabindex. |
| Dialog Esc + Tab cycle + portal | Reach for `@headlessui/react` Dialog | Mirror `Nav.js MobileMenu` pattern inline | The Nav already proves the pattern works. 0 kB add vs 14 kB gz for Headless UI Dialog+Transition. |
| Reduced-motion detection | Re-implement matchMedia listener | Use the inline `usePrefersReducedMotion` hook in `SvgConstellation.js` lines 32–59 | Already shipped Phase 15. Extract to a shared file if 2nd consumer (ExperienceCard) needs it. |
| CV file CTAs | Anything elaborate | Plain `<a href="/CV_Carlos_Montoya_EN.docx" download>` | Files verified at `public/CV_Carlos_Montoya_{EN,ES}.docx`. Native `download` attribute is universally supported. |

**Key insight:** Phase 16 is a UI assembly phase, not a primitives phase. Every primitive (chip, button, focus management, portal, dialog) already has a working pattern in the codebase or a one-line CSS solution. The temptation to "professionalize" with a UI lib is precisely what would blow the Lighthouse gate.

---

## Runtime State Inventory

> Phase 16 is greenfield UI on top of Phase 15's contract. No rename/refactor/migration involved. Section omitted per template guidance.

---

## Common Pitfalls

### Pitfall 1: Esc handler conflict between renderer and dialog

**What goes wrong:** Phase 15's `SvgConstellation.handleKeyDown` listens for Esc to clear selection. When ExperienceCard mounts, it ALSO listens for Esc to close. If both fire, the dialog closes AND Phase 15 attempts to clear an already-cleared selection.

**Why it happens:** Both handlers attach to `document`. React event ordering across DOM listeners is not deterministic.

**How to avoid:** ExperienceCard's Esc handler calls `e.preventDefault()` but also calls `onClose()` which is `onSelectSkill(selectedSkillId)`. The Phase 15 hook toggles `prev === id ? null : id`, so toggling with the active id resolves to `null` and Phase 15's own Esc listener becomes idempotent (it checks `selectedSkillId !== null` before acting `[VERIFIED: SvgConstellation.js:148]`).

**Warning signs:** Esc closes dialog AND moves focus inside renderer in the same gesture. If observed, gate Phase 15's Esc handler on `!document.querySelector('[role=dialog]')` or use `stopPropagation()` (but prefer the idempotent-toggle approach already in place).

### Pitfall 2: Click-outside fires on the constellation node that opens the card

**What goes wrong:** User clicks Java node → `selectedSkillId = 'Java'` → ExperienceCard mounts → its mousedown listener attaches → next click closes immediately.

**Why it happens:** The mount happens during the same event loop as the click that triggered it. The listener attaches *before* the click event bubbles to document on some browser/React-batching combinations.

**How to avoid:** Defer the listener attach by one frame:

```jsx
useEffect(() => {
  let registered = false
  const id = requestAnimationFrame(() => {
    document.addEventListener('mousedown', onMouseDown)
    registered = true
  })
  return () => {
    cancelAnimationFrame(id)
    if (registered) document.removeEventListener('mousedown', onMouseDown)
  }
}, [onMouseDown])
```

**Warning signs:** Card opens then closes on first click. Easy to reproduce; easy to fix.

### Pitfall 3: Focus trap escapes when tech chip list is empty

**What goes wrong:** A skill with zero matching jobs (under active filters) shows an empty `<ol>`. The focus trap's "first/last focusable" detection finds only the heading + close + CV CTA; Tab from CV CTA wraps to heading correctly, BUT Shift+Tab from heading should wrap to CV CTA, not the close button.

**Why it happens:** `getFocusable(container)` returns elements in DOM order. The order in the JSX is: heading → close → tech chips → CV CTA. If chips are empty, order becomes: heading → close → CV CTA. Cycling backward from heading should jump to CV CTA (the last element).

**How to avoid:** The implementation in §3 already handles this — it uses `focusable[focusable.length - 1]` regardless of how many entries.

**Warning signs:** Shift+Tab from heading focuses close button instead of CV CTA when there are zero jobs. RTL test catches this.

### Pitfall 4: Year-range slider drift when both thumbs at the same year

**What goes wrong:** User drags start thumb to 2026, end thumb still at 2026. Now `aria-valuemax` of start = 2025, but `aria-valuenow` of start = 2026. Inconsistent ARIA state.

**Why it happens:** Dependent-range update logic must enforce `start <= end - 1`. Allowing start == end is a UX choice; if allowed, `aria-valuemax` of start should be `end` (not `end - 1`).

**How to avoid:** Either (a) enforce `start < end` always (recommend), or (b) allow `start == end` and set start's `aria-valuemax = end`. Pick one. Recommendation: enforce strict `<`, because a year range `[2026, 2026]` is identical to "year = 2026" and conceptually muddles "range".

**Warning signs:** Slider becomes unresponsive on arrow key — start can't go up because max is end-1, end can't go down because min is start+1. They lock each other. Fix: in `handleKey`, also re-check the OPPOSITE thumb's bounds when one moves; if both at same edge, allow movement of either to escape the lock.

### Pitfall 5: Portal-rendered dialog body overflow lock leaks on unmount-during-error

**What goes wrong:** ExperienceCard sets `document.body.style.overflow = 'hidden'` on mount, restores on unmount. If a React error throws during render (e.g., `jobs.map(undefined.bullets)`), the unmount cleanup doesn't run.

**Why it happens:** React's error boundary unmounts the subtree, but the `useEffect` cleanup only runs if the effect previously ran. If the error throws before the effect's first commit, no cleanup.

**How to avoid:** Wrap the cleanup in the existing `ConstellationErrorBoundary` (Phase 15) `componentDidCatch`:

```js
componentDidCatch(error, info) {
  console.error(error, info)
  document.body.style.overflow = '' // safety net
}
```

**Warning signs:** Page becomes scroll-locked after a card error. Refresh fixes. Add error-boundary fallback to catch.

### Pitfall 6: `data-game-interactive` allow-list misses the Nav header

**What goes wrong:** User clicks the theme toggle in Nav while card is open → mousedown fires → `closest('[data-game-interactive]')` returns null → card closes → user wanted to switch theme, not close card.

**Why it happens:** Nav header doesn't carry the attribute.

**How to avoid:** Add `data-game-interactive` to the `<header>` element in `Nav.js` (Phase 16 minor edit), OR extend the allow-list to `closest('[data-game-interactive], header')` (less explicit but no Nav edit).

**Recommend:** Add the attribute to Nav explicitly. Phase 16 owns the contract; explicit is safer.

**Warning signs:** Theme toggle closes card; lang toggle closes card. UAT step catches this; add to manual UAT.

### Pitfall 7: AND-intersection empty result mis-renders constellation

**What goes wrong:** User selects Java + Asterisk (Java appears in 9 jobs, Asterisk in 1, intersection in 1 job — Nethexa). User then unselects Java; only Asterisk remains; constellation should re-highlight more nodes. If the renderer caches `highlightedSkillIds` improperly, the visualization lags.

**Why it happens:** Memoization on stale dependencies. If `useMemo(() => visibleSkillIds(filtered), [filtered])` doesn't include `selectedSkills` in deps array, stale values render.

**How to avoid:** Either drop memoization entirely (recommended for this scale — see §8), or include ALL filter-state dependencies in the deps array.

**Warning signs:** Visualization shows wrong nodes brightly. Add an integration test that toggles two skills in sequence and asserts `highlightedSkillIds`.

---

## Code Examples

### Example 1: Pure filter composition

```js
// Source: src/game/filters.js (Phase 16 new)
export function composeFilters(experiences, { skillIds, yearRange, category }, skills) {
  let result = experiences
  result = filterBySkillIntersection(result, skillIds)
  if (yearRange) result = filterByYearRange(result, yearRange)
  if (category) result = filterByCategory(result, category, skills)
  return result
}
```

### Example 2: Roving-button-list chip group (no roving tabindex needed)

```jsx
// Inside SkillFilters.js — chip group is plain Tab traversal
<div role="group" aria-label={t.game.filterSkillsLabel}>
  {skills.map((skill) => (
    <button
      key={skill.id}
      type="button"
      aria-pressed={selectedSkills.includes(skill.id)}
      onClick={() => onToggleSkill(skill.id)}
      className={`h-8 px-3 rounded-full text-xs font-mono
                  ${selectedSkills.includes(skill.id)
                    ? 'bg-chip-activeBg text-chip-activeText'
                    : 'bg-chip-outlineBg text-chip-outlineText border border-chip-outlineBorder'}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
    >
      {skill.label}
    </button>
  ))}
</div>
```

### Example 3: Bilingual download CTA

```jsx
// Inside ExperienceCard.js footer
<a
  href={`/CV_Carlos_Montoya_${lang === 'en' ? 'EN' : 'ES'}.docx`}
  download
  aria-label={t.game.cvCtaLabel}
  className="block w-full h-11 rounded-lg bg-cvCta-bg text-cvCta-text text-sm font-semibold
             flex items-center justify-center hover:bg-cvCta-hoverBg
             motion-safe:transition-colors duration-200
             focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
>
  {t.game.cvCtaLabel}
</a>
```

### Example 4: Locked focus-trap loop

```jsx
// Inside ExperienceCard.js — see §3 for full handler
function onKey(e) {
  if (e.key === 'Tab' && cardRef.current) {
    const focusable = cardRef.current.querySelectorAll(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus()
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<input type="range">` ×2 stacked | Custom two-button slider with `role="slider"` | WAI-ARIA APG v1.1 2017+ | Native double-range had inconsistent z-index/touch-target behavior across browsers; APG pattern is the documented solution. |
| `focus-trap-react` library by default | Inline ~40-LOC handler when only one dialog | 2023+ — bundlephobia gating became universal best practice | -5 to -9 kB gz. |
| `react-spring-bottom-sheet` for any drawer | Pure-CSS `translateY` keyframe for simple cases | 2024+ | -25 kB gz. |
| Per-element `onClickOutside` handlers | Single global mousedown + `closest()` allow-list | 2020+ React 17 + portal patterns | Cleaner unmount, no event bubble fights. |
| `@headlessui/react` for dialog | Inline portal + ARIA + Esc + focus trap | Project decision (Tailwind 3 brownfield) | -14 kB gz; full ARIA control. |
| Native `<dialog>` + `showModal()` | Hand-rolled portal dialog | 2026 — caniuse global ~97% | Native is now viable for many use cases. Phase 16 sticks to portal pattern because of custom bottom-sheet animation requirement. |

**Deprecated/outdated:**
- `react-modal` library — superseded by either native `<dialog>` or Radix Dialog. Not in tree; do not add.
- Inline `display: none` for sr-only — superseded by Tailwind `sr-only` utility (already in tree).
- `defaultChecked` / `defaultValue` patterns for controlled components — React 18 + Hooks rendered them obsolete.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-focus-lock` is ~9 kB gz at v2.13.7. | §3 | Low — we don't ship it. The number informs the "hand-roll vs. library" tradeoff. Verify before reversing the recommendation. `[ASSUMED]` based on bundlephobia indirect snippet; could not be fetched directly. |
| A2 | `focus-trap-react` is ~5 kB gz at v10.x. | §3 | Same as A1. `[ASSUMED]`. |
| A3 | `react-modal-sheet` is ~20 kB gz (Motion-based) and `react-spring-bottom-sheet` is ~25 kB gz. | §4 | Same — we don't ship them. `[ASSUMED]`. |
| A4 | jsdom 25 fully supports `setPointerCapture` (used by optional drag handler). | §4 | Medium — if it doesn't, drag tests need a custom shim. **Workaround already specified:** ship without drag in v1, so the risk doesn't bite. `[ASSUMED]`. |
| A5 | `@headlessui/react` is NOT currently in `package.json`. | Standard Stack | Verified: `package.json` does not list it `[VERIFIED: package.json review 2026-06-02]`. UI-SPEC line 34 calling it "available but unused" is stale guidance. |
| A6 | Lighthouse mobile gate has ~17 kB gz headroom after Phase 16. | §10 | Medium — depends on whether mobile JS payload includes synchronous chunks beyond `GameMode-*.js`. The `index-*.js` 54.79 kB gz is the synchronous baseline; that does NOT grow with Phase 16. Headroom calc is on the lazy chunk only. `[ASSUMED]` until Phase 17 measures. |
| A7 | The 12 experiences × ≤7 tech entries make AND-intersection O(84) per call. | §1, §8 | Verified by inspecting `src/data/experience.js` — max tech array length = 6 entries (Blerify). `[VERIFIED: src/data/experience.js review 2026-06-02]`. |
| A8 | React 18.3.1's automatic batching across DOM listeners makes inline focus-trap timing safe. | §3, §5 | Low — React 18 batches across non-React events. If issues arise, wrap setState in `flushSync` (already a documented escape hatch). `[CITED: react.dev/blog/2022/03/29/react-v18]` (training data; cross-check needed if upgrading). |
| A9 | `userEvent.tab({ focusTrap })` works with custom-built focus traps. | §9 | Verified per testing-library docs `[CITED: testing-library.com/docs/user-event/v13/]`. |

**Action for the planner:** Treat A1–A4 + A6 as soft assumptions — they inform "no library" but the recommendation holds even if the exact gz numbers differ ±50%. Only A5 (presence of @headlessui in deps) was load-bearing; that is now verified.

---

## Open Questions (RESOLVED)

> **Resolution date:** 2026-06-02. All 5 questions resolved during plan-checker revision pass. Inline `RESOLVED:` annotations below capture the chosen path for each.

1. **Should the Nav `<header>` get `data-game-interactive`, OR should the allow-list extend to `header`?**

   **RESOLVED:** Add `data-game-interactive` to the GameMode renderer-slot wrapper div (Plan 06 Task 1) AND to the Nav `<header>` (Plan 06 Task 2). The renderer-slot wrapper resolves checker BLOCKER 1 (SVG background clicks must not close the card); the Nav header resolves Pitfall 6 (theme/lang toggle clicks must not close the card). Both are explicit attribute adds — no implicit `closest('header')` extension.

   - What we know: D-16-FLOW-CLOSE-EMPTY says click outside `[data-game-interactive]` closes; theme/lang toggles live in Nav and must not close.
   - What's unclear: whether the planner prefers an explicit attribute add (Nav.js edit) or an implicit allow-list extension.
   - Recommendation: explicit `data-game-interactive` on `<header>` in `Nav.js` (one-line edit). Add a Phase 16 task for this.

2. **Drag-to-close on mobile bottom-sheet — v1 or v2?**
   - What we know: Visual drag-handle bar is locked in `16-UI-SPEC.md`. Functional drag is "optional" per D-16-CARD-STRUCTURE.
   - What's unclear: whether UAT will demand it.
   - Recommendation: ship v1 without functional drag; X-button + Esc + overlay-tap close are sufficient. Add a Phase 16 follow-up plan slot for drag-down if user reviews demand it.

   **RESOLVED:** Defer drag-down-to-close to v2 — ship X-button + Esc + overlay-tap only in Phase 16. Drag-handle bar remains a visual affordance per UI-SPEC.

3. **YearRangeSlider extraction to separate file — required or optional?**
   - What we know: UI-SPEC and CONTEXT both reference it inline as part of SkillFilters.
   - What's unclear: file-size discipline preference.
   - Recommendation: build inline. If `SkillFilters.js` exceeds 280 LOC, extract to `YearRangeSlider.js` mechanically.

   **RESOLVED:** Inline inside `SkillFilters.js` for v1. Extraction is mechanical and can happen later if LOC ceiling hit.

4. **Pointer-drag on slider thumbs — v1 or v2?**
   - What we know: Keyboard contract is the locked a11y requirement. Pointer drag is convenience.
   - What's unclear: recruiter expectation.
   - Recommendation: ship keyboard-only for v1. Pointer drag is a 30-LOC follow-up if needed.

   **RESOLVED:** Keyboard-only for v1. Pointer drag deferred to v2 follow-up if recruiter UAT demands it.

5. **`React.memo` on chip components?**
   - What we know: 26 skill chips + 8 category chips × re-render on every filter state change.
   - What's unclear: whether profiler shows render thrash.
   - Recommendation: do NOT add `React.memo` in v1. Per §8 the cost is negligible. Add only after profiling.

   **RESOLVED:** No `React.memo` in v1 — ship without; revisit only if profiling shows render thrash.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm scripts | ✓ | (per project — not pinned) | — |
| npm | install + scripts | ✓ | — | — |
| Vitest 2.1.9 | tests | ✓ | 2.1.9 | — |
| jsdom 25 | test env | ✓ | 25.0.1 | — |
| `@testing-library/user-event` | RTL keyboard tests | ✓ | 14.6.1 | — |
| Public CV files | CV CTA href targets | ✓ | `CV_Carlos_Montoya_{EN,ES}.docx` (verified 2026-06-02) | none — required |
| Tailwind 3.4.19 | utility CSS | ✓ | 3.4.19 | — |
| Pointer Events Level 2 | optional slider/sheet drag | ✓ (browser API, baseline since 2019) | — | Skip drag in v1 |
| `prefers-reduced-motion` matchMedia | reduce animations | ✓ (browser API, baseline since 2017) | — | Default to motion-safe path |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:**
- Pointer-drag on bottom-sheet — fallback: tap-X / Esc / overlay-tap. Already the v1 plan.

---

## Validation Architecture

> `workflow.nyquist_validation` is implicitly enabled (not explicitly disabled in `.planning/config.json`). Section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react 16.3.0 + @testing-library/user-event 14.6.1 |
| Config file | `vite.config.js` (test block colocated; preserves esbuild `.js`-as-JSX loader) |
| Quick run command | `npx vitest run src/game/filters.test.js src/game/SkillFilters.test.js src/game/ExperienceCard.test.js` |
| Full suite command | `npm run test:run` (runs all `*.test.js` under `src/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAME-03 | Multi-skill AND intersection returns only co-occurring experiences | unit | `npx vitest run src/game/filters.test.js -t "intersection"` | ❌ Wave 0 |
| GAME-03 | Year-range filter intersects period [start, end ?? CURRENT_YEAR] | unit | `npx vitest run src/game/filters.test.js -t "yearRange"` | ❌ Wave 0 |
| GAME-03 | Category filter requires skills catalog mapping | unit | `npx vitest run src/game/filters.test.js -t "category"` | ❌ Wave 0 |
| GAME-03 | yearBounds derives [2007, 2026] from live EXPERIENCE | unit | `npx vitest run src/game/filters.test.js -t "yearBounds"` | ❌ Wave 0 |
| GAME-03 | composeFilters chains all three dimensions | unit | `npx vitest run src/game/filters.test.js -t "composeFilters"` | ❌ Wave 0 |
| GAME-03 | Reset clears all three filter dimensions | component | `npx vitest run src/game/SkillFilters.test.js -t "reset"` | ❌ Wave 0 |
| GAME-03 | Skill chip aria-pressed reflects selectedSkills state | component | `npx vitest run src/game/SkillFilters.test.js -t "aria-pressed"` | ❌ Wave 0 |
| GAME-03 | Year slider ArrowRight increments start thumb | component (keyboard) | `npx vitest run src/game/SkillFilters.test.js -t "ArrowRight"` | ❌ Wave 0 |
| GAME-03 | Year slider Home/End jumps to thumb's range bound | component | `npx vitest run src/game/SkillFilters.test.js -t "Home\|End"` | ❌ Wave 0 |
| GAME-03 | Dependent aria-valuemin/max: start cannot exceed end-1 | component | `npx vitest run src/game/SkillFilters.test.js -t "dependent"` | ❌ Wave 0 |
| GAME-03 | Reset button disabled when no filter active | component | `npx vitest run src/game/SkillFilters.test.js -t "reset disabled"` | ❌ Wave 0 |
| GAME-04 | ExperienceCard renders role=dialog + aria-modal | component | `npx vitest run src/game/ExperienceCard.test.js -t "role=dialog"` | ❌ Wave 0 |
| GAME-04 | Initial focus on h2 heading | component | `npx vitest run src/game/ExperienceCard.test.js -t "initial focus"` | ❌ Wave 0 |
| GAME-04 | Esc calls onClose | component | `npx vitest run src/game/ExperienceCard.test.js -t "Esc"` | ❌ Wave 0 |
| GAME-04 | Tab cycle: heading → tech chips → close → CV CTA → heading | component | `npx vitest run src/game/ExperienceCard.test.js -t "Tab cycle"` | ❌ Wave 0 |
| GAME-04 | Click outside [data-game-interactive] closes card | component | `npx vitest run src/game/ExperienceCard.test.js -t "click outside"` | ❌ Wave 0 |
| GAME-04 | CV CTA href switches by lang (EN ↔ ES) | component | `npx vitest run src/game/ExperienceCard.test.js -t "CV CTA"` | ❌ Wave 0 |
| GAME-04 | Tech chip click calls onToggleSkill | component | `npx vitest run src/game/ExperienceCard.test.js -t "tech chip"` | ❌ Wave 0 |
| GAME-04 | Currently-selected skill's chip is locked (aria-disabled) | component | `npx vitest run src/game/ExperienceCard.test.js -t "locked"` | ❌ Wave 0 |
| GAME-04 | Job list renders bilingual content (EN vs ES) | component | `npx vitest run src/game/ExperienceCard.test.js -t "bilingual"` | ❌ Wave 0 |
| GAME-04 | Empty-state: zero matches replaces job list with t.game.filterEmpty | component | `npx vitest run src/game/ExperienceCard.test.js -t "empty"` | ❌ Wave 0 |
| GAME-04 | Card swap via key prop on selectedSkillId change | component | `npx vitest run src/game/ExperienceCard.test.js -t "swap"` | ❌ Wave 0 |
| GAME-03+04 | useConstellation toggleSkill toggles inclusion | unit (hook) | `npx vitest run src/game/useConstellation.test.js -t "toggleSkill"` | ⚠️ existing file extend |
| GAME-03+04 | useConstellation resetFilters clears all dimensions | unit (hook) | `npx vitest run src/game/useConstellation.test.js -t "resetFilters"` | ⚠️ existing file extend |
| GAME-03 | SvgConstellation dims non-matching nodes when yearRange active | component | `npx vitest run src/game/renderers/SvgConstellation.test.js -t "yearRange dim"` | ⚠️ existing file extend |
| GAME-03 | SvgConstellation highlights edges between intersected skills | component | `npx vitest run src/game/renderers/SvgConstellation.test.js -t "highlightedSkillIds"` | ⚠️ existing file extend |

**Manual UAT (browser-only, not jsdom-testable):**

1. **Dual-thumb slider — touch drag on real mobile.** jsdom can't simulate touch reliably. Verify drag works on iOS Safari + Chrome Android.
2. **Bottom-sheet slide-up animation visual smoothness.** Verify no jank on mid-range Android.
3. **Mobile horizontal-scroll chip row.** Verify `scrollbar-hide` works on iOS / Android.
4. **CV download triggers in-browser.** Verify `.docx` actually downloads (not previews) in Chrome / Safari / Firefox.
5. **Theme/lang toggle while card open preserves state.** D-16-PERSIST-CROSS-TOGGLE.
6. **Click-outside on theme toggle in Nav does NOT close card.** Verify after `data-game-interactive` added to `<header>`.
7. **VoiceOver (iOS) announces dialog open with skill name.** Real SR test.
8. **NVDA (Windows) announces slider value changes.** Real SR test.

### Sampling Rate

- **Per task commit:** `npx vitest run src/game/<changed-file>.test.js` (sub-30s)
- **Per wave merge:** `npm run test:run` (full suite, all 100+ tests after Phase 16 lands)
- **Phase gate:** Full suite green + manual UAT items 1–8 verified before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/game/filters.test.js` — covers GAME-03 selectors (12+ tests)
- [ ] `src/game/SkillFilters.test.js` — covers GAME-03 UI (chips, slider, reset, keyboard) (~10 tests)
- [ ] `src/game/ExperienceCard.test.js` — covers GAME-04 dialog (~12 tests)
- [ ] Extend `src/game/useConstellation.test.js` — adds toggleSkill, setYearRange, setCategory, resetFilters tests (~6 tests)
- [ ] Extend `src/game/renderers/SvgConstellation.test.js` — adds highlightedSkillIds + yearRange dim tests (~3 tests)
- [ ] Possibly `src/game/YearRangeSlider.test.js` if extracted — covers WAI-ARIA APG slider contract (~6 tests)

*Framework install: not needed — Vitest+RTL already wired in Phase 14.*

---

## Security Domain

> `security_enforcement` defaults to enabled. This is a frontend phase with no auth/session/server boundary, but ASVS still has applicable categories.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a — no auth in Phase 16 |
| V3 Session Management | no | n/a — in-memory state only (D-16-PERSIST-MEMORY) |
| V4 Access Control | no | n/a — public portfolio site |
| V5 Input Validation | yes | Filter state inputs are all controlled by component state (chip toggles, slider keys). No free-text input. Year-range thumb values clamped to `[min, max]` and to opposite-thumb bounds in `handleKey`. **No dynamic HTML construction** — all text via React text nodes (auto-escaped). |
| V6 Cryptography | no | n/a |
| V8 Data Protection | yes | No PII handled. CV is public asset. No localStorage write (D-16-PERSIST-MEMORY). |
| V12 Files and Resources | yes | CV download — `<a href="/CV_Carlos_Montoya_*.docx" download>` is a static-asset GET. No user-controlled path. Files served from `public/` by Vite as static. |
| V14 Configuration | yes | No new environment variables; no new build config; no new external API. |

### Known Threat Patterns for React Frontend

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via translation string with user-controlled template | Tampering / Disclosure | Translations contain `{skill}`, `{n}`, `{s}` placeholders. Values substituted via `.replace()` — but **substituted values are React data (`node.label`, `count`, etc.), never user input.** No `dangerouslySetInnerHTML` in Phase 16. Safe. |
| Open redirect via CV CTA href | Tampering | CV href is hardcoded path `/CV_Carlos_Montoya_*.docx`. No user-controlled URL. Safe. |
| Clickjacking via dialog overlay | Tampering | The portal `<div role="dialog">` sits in top layer (z-index 200). The overlay backdrop captures clicks. Adversary site iframing the page is blocked by site's existing CSP/X-Frame-Options (out of Phase 16 scope; existing infra). |
| `data-game-interactive` allow-list bypass | Tampering | A malicious script injecting `[data-game-interactive]` could prevent card close. Mitigation: existing CSP prevents script injection. Phase 16 doesn't add a new attack surface. |
| Local storage leak | Disclosure | D-16-PERSIST-MEMORY mandates **no localStorage write**. Verify in PR review. |

**No new threat surface introduced by Phase 16 beyond what Phase 15 already accepted.**

---

## Sources

### Primary (HIGH confidence)

- WAI-ARIA APG — Slider (Multi-Thumb) Pattern: `https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/` — slider role + dependent ranges + keyboard
- WAI-ARIA APG — Modal Dialog Pattern: `https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/` — focus trap + initial focus + return focus
- W3C Range Properties Guide: `https://www.w3.org/WAI/ARIA/apg/practices/range-related-properties/` — aria-valuetext patterns
- Testing Library docs — `userEvent.tab` w/ focusTrap: `https://testing-library.com/docs/user-event/v13/` — RTL test pattern for trapped dialogs
- Project `package.json` (verified 2026-06-02) — React 18.3.1, Tailwind 3.4.19, Vitest 2.1.9, etc.
- Project `src/game/renderers/SvgConstellation.js` (Phase 15, verified) — confirms `usePrefersReducedMotion` inline pattern, Pitfalls 1/3/4/5 guards
- Project `src/components/Nav.js` MobileMenu (verified) — confirms portal + Esc + body overflow lock pattern
- `npm run build` output 2026-06-02 — current `GameMode-*.js` = 5.09 kB gz; `index-*.js` = 54.79 kB gz

### Secondary (MEDIUM confidence)

- TPGi ARIA Slider Part 3: `https://www.tpgi.com/aria-slider-part-3/` — additional dual-thumb examples
- npm-compare focus-lock vs focus-trap: `https://npm-compare.com/focus-lock,focus-trap` — bundle-size context
- caniuse.com Dialog element: `https://caniuse.com/dialog` — 97% global 2026 (informs native-dialog tradeoff)
- caniuse.com Pointer Events: `https://caniuse.com/pointer` — Level 2 baseline since 2019
- DigitalA11y slider role: `https://www.digitala11y.com/slider-role/` — additional ARIA context
- UXPin "How to Build Accessible Modals with Focus Traps (2026 Guide)": `https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/` — pattern overview
- "Your Dialog Has role='dialog'. That Doesn't Make It Accessible.": `https://dev.to/vmvenkatesh78/your-dialog-has-roledialog-that-doesnt-make-it-accessible-4lha` — querying focusable elements at keydown time

### Tertiary (LOW confidence — flagged for validation)

- `bundlephobia.com/package/react-focus-lock` — page would not render via WebFetch; inferred ~9 kB gz from npm-compare reference. **A1 assumption — verify before adopting.**
- `bundlephobia.com/package/focus-trap-react` — inferred ~5 kB gz from secondary references. **A2 assumption.**
- `bundlephobia.com/package/react-modal-sheet` — inferred ~20 kB gz (Motion dep). **A3 assumption.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; all in-tree dependencies verified via `package.json` + working `npm run build` output 2026-06-02.
- Architecture patterns: HIGH — every pattern mirrors a pattern shipped in Phase 14 or Phase 15. WAI-ARIA APG cites are W3C source-of-truth.
- Pitfalls: HIGH — pitfalls 1, 2, 5, 6, 7 are verified against existing code or empirically known React 18 + portal interactions. Pitfalls 3, 4 are theoretical but documented prevention paths exist.
- Bundle estimate: MEDIUM — LOC-to-gz estimation is approximate; actual delta will be measured at first build after Phase 16 lands.
- Library bundle sizes: MEDIUM — bundlephobia direct fetch failed; values cross-referenced from secondary sources. Recommendations hold regardless of ±50% accuracy.

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (30 days — Tailwind 3.x + React 18.x are stable; the recommendation drift surface is small)

---

## RESEARCH COMPLETE
