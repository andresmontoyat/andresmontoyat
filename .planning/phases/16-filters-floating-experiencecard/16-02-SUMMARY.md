---
phase: 16-filters-floating-experiencecard
plan: 02
subsystem: game-mode-filters
tags: [phase-16, pure-logic, tdd-green, i18n, design-tokens, keyframes]
requirements: [GAME-03, GAME-04]
dependency-graph:
  requires:
    - "src/game/filters.test.js (Wave 0 RED suite)"
    - "src/data/experience.js (period.start, period.end, tech[])"
    - "src/data/skills.js (SKILLS catalog + categories)"
    - "src/i18n/translations.js (existing t.game.* Phase 15 namespace)"
    - "src/index.css (existing :root + [data-theme='light'] token blocks)"
    - "tailwind.config.js (existing theme.extend.colors/keyframes/animation)"
  provides:
    - "src/game/filters.js — 6 pure named exports (filterByYearRange, filterBySkillIntersection, filterByCategory, composeFilters, visibleSkillIds, yearBounds)"
    - "t.game.* extended with 20 bilingual keys (filterBarLabel, filterReset, cardHeading, cvCtaLabel, filterEmpty, …)"
    - "Tailwind colors: chip, slider, card, cvCta (CSS-var backed)"
    - "Tailwind keyframes: cardFadeIn, cardSlideUp, cardSwapOut, cardSwapIn, chipFlash"
    - "Tailwind animation utilities (motion-safe-only): card-fade-in, card-slide-up, card-swap-out, card-swap-in, chip-flash"
    - ":root + [data-theme='light'] vars: 14 new --color-chip-*/--color-slider-*/--color-card-*/--color-cv-cta-* tokens"
    - ".scrollbar-hide utility (mobile filter toolbar)"
  affects:
    - "Wave 0 RED pure-logic suite (filters.test.js) — flipped 16/16 GREEN"
    - "Wave 2+ component consumers: SkillFilters, ExperienceCard, useConstellation, SvgConstellation extensions (will read tokens + keys from this plan)"
tech-stack:
  added: []
  patterns:
    - "Pure-function selector module (mirror of src/game/spatialNav.js — named exports only, zero React/DOM imports)"
    - "Module-level CURRENT_YEAR = 2026 constant (mirrors constellation.graph.js; D-16-YEAR-BOUNDS determinism rule)"
    - "Bilingual t.game.* additive extension (no rename, no delete of Phase 15 keys)"
    - "CSS-var backed Tailwind color tokens (theme-aware via :root + [data-theme='light'])"
    - "motion-safe-only animation utilities (commented mandate in tailwind.config.js)"
key-files:
  created:
    - "src/game/filters.js (72 lines, 6 named exports)"
    - ".planning/phases/16-filters-floating-experiencecard/16-02-SUMMARY.md"
  modified:
    - "src/i18n/translations.js (+42 lines: 20 keys × 2 langs + 2 comment lines)"
    - "tailwind.config.js (+53 lines: 4 color groups, 5 keyframes, 5 animation utilities, 3 comment lines)"
    - "src/index.css (+43 lines: :root +14 vars, [data-theme='light'] +14 vars, .scrollbar-hide utility, 2 comment headers)"
decisions:
  - "Implemented filterBySkillIntersection with .every() (D-16-INTERSECT-AND AND semantics — verified by RED test 'Asterisk + Kubernetes' returns [])"
  - "Module-level CURRENT_YEAR = 2026 instead of new Date().getFullYear() — preserves test determinism (D-16-YEAR-BOUNDS)"
  - "ES filterEmpty value matches UI-SPEC verbatim: 'Sin coincidencias — prueba menos filtros' (not 'usa')"
  - "Default-arg destructuring on filterByYearRange ([from, to] = []) — gracefully handles undefined argument without throwing on `[from, to]` destructure"
  - "Tailwind animation utilities marked motion-safe-only via inline comment — mirrors Phase 15 pulse2 mandate"
  - ".scrollbar-hide placed inside @layer utilities (not raw global CSS) — consistent with .animate-on-scroll precedent"
metrics:
  duration: "≈5 minutes"
  completed: "2026-06-02"
  tasks_completed: 3
  files_created: 1
  files_modified: 3
  loc_added: 210
  tests_flipped_green: 16
---

# Phase 16 Plan 02: Pure-Selector Logic + Design Tokens + Bilingual Copy Summary

Wave 1 GREEN delivery: shipped the pure-logic foundation (filters.js — 6 named exports, 16/16 tests green) plus the i18n + Tailwind + CSS-var surface that Waves 2-5 will consume. Pure-logic RED → GREEN cycle complete; component RED suites still RED by design (they wait for their own waves).

## What was built

### Task 1 — `src/game/filters.js` (NEW, 72 lines, pure selectors)

Mirrors `src/game/spatialNav.js`: named exports only, module-scope `const CURRENT_YEAR = 2026`, zero React/DOM imports. Six functions:

| Export | Signature | Semantics |
|--------|-----------|-----------|
| `filterByYearRange` | `(experiences, [from, to] = [])` | period intersect; null→pass-through; `period.end ?? CURRENT_YEAR` |
| `filterBySkillIntersection` | `(experiences, skillIds)` | AND via `.every` (D-16-INTERSECT-AND); empty→pass-through |
| `filterByCategory` | `(experiences, category, skills)` | any tech in given category; null→pass-through |
| `composeFilters` | `(experiences, { skillIds, yearRange, category }, skills)` | skill → year → category chain |
| `visibleSkillIds` | `(matchingExperiences)` | dedupe via Set across tech[] |
| `yearBounds` | `(experiences)` | `[min(period.start), max(period.end ?? CURRENT_YEAR)]` from live data |

### Task 2 — `src/i18n/translations.js` (+20 keys × 2 langs)

Added a "Phase 16 additions" block inside `t.game.*` for **both** `en` and `es`, preserving every Phase 15 key. Highlights:

- `filterReset` → `Reset` / `Limpiar` (D-16-FLAYOUT-RESET)
- `cvCtaLabel` → `Download CV (English)` / `Descargar CV (Español)` (D-16-CARD-CV-CTA)
- `filterEmpty` → `No matches — try fewer filters` / `Sin coincidencias — prueba menos filtros` (ES verbatim per UI-SPEC)
- `cardHeading: '{skill}'`, `cardJobsListLabel: 'Jobs using {skill}'`, `cardJobsCount: '{n} jobs'` — template patterns aligned with existing `SvgConstellation` `.replace('{name}', …)` substitution.

### Task 3 — `tailwind.config.js` + `src/index.css` (design-token surface)

**tailwind.config.js (+53 lines):**
- `theme.extend.colors`: `chip {activeBg, activeText, outlineBorder, outlineText}`, `slider {track, range, thumb, thumbBorder}`, `card {bg, border, overlay}`, `cvCta {bg, text, hoverBg}` — all reading from CSS vars.
- `theme.extend.keyframes`: `cardFadeIn`, `cardSlideUp`, `cardSwapOut`, `cardSwapIn`, `chipFlash` — GPU-composited (`opacity` + `transform`) only.
- `theme.extend.animation`: `card-fade-in`, `card-slide-up`, `card-swap-out`, `card-swap-in`, `chip-flash`. Inline comment mandates `motion-safe:` prefix.

**src/index.css (+43 lines):**
- `:root` (dark): 14 new vars — `--color-chip-active-bg` through `--color-cv-cta-hover-bg`; `--color-card-shadow` is the full multi-layer shadow value for dark backdrop.
- `[data-theme="light"]`: matching 14-var override block; `--color-card-shadow` and `--color-card-overlay-bg` tuned for light backdrop (lower alphas).
- `.scrollbar-hide` utility inside `@layer utilities` (mobile filter-toolbar horizontal scroll).
- No new `prefers-reduced-motion` block — the global Phase 15 rule already suppresses every new keyframe.

## Verification

| Check | Command | Result |
|-------|---------|--------|
| filters.test.js GREEN | `npx vitest run src/game/filters.test.js` | **16/16 passed** (was 0/16 RED) |
| Production build OK | `npm run build` | exits 0; `index-*.css` 44.33 kB / 14.48 kB gz; `GameMode-*.js` 12.30 kB / **5.09 kB gz** (≤ 6 kB Wave-5 budget) |
| EN/ES bilingual symmetry | `grep -c "filterReset\|cvCtaLabel\|cardHeading\|filterBarLabel" translations.js` | 2 each (en + es) |
| ES filterEmpty verbatim | `grep -c "Sin coincidencias — prueba menos filtros"` | 1 |
| filters.js purity | `grep "from 'react'\|@testing"` (excl. comments) | 0 matches |
| AND semantics | `grep -c "skillIds.every"` | 1 |
| CURRENT_YEAR determinism | `grep "new Date()" src/game/filters.js` | 0 |
| Phase 15 token preservation | `grep -c "constellation-edge" src/index.css` | 4 (untouched) |
| Phase 15 i18n preservation | `grep -c "constellationLabel" translations.js` | 2 |

## Component test suites still RED (expected)

Verification spec explicitly states: *"All 6 Phase 16 component test files (Plan 01) still RED — filters.js GREEN but other production code missing"*. Confirmed:

- `src/game/SkillFilters.test.js` — RED (no SkillFilters.js component yet; Wave 2)
- `src/game/ExperienceCard.test.js` — RED (no ExperienceCard.js component yet; Wave 3)
- `src/game/GameMode.test.js` (filter-bar + card + click-outside tests) — RED (Wave 5 wiring)
- `src/game/useConstellation.test.js` (toggleSkill/setYearRange/category/resetFilters/yearBounds/justFilteredId) — RED (Wave 2 hook extensions)
- `src/game/renderers/SvgConstellation.test.js` (dim-by-highlightedSkillIds, yearRange dim, edge dim, reduced-motion transition) — RED (Wave 4 renderer extensions)

These are the contract the next waves will satisfy.

## Deviations from Plan

None — plan executed exactly as written. One minor observation:

- The acceptance criterion for Task 3 mentioned `grep -c "constellation-node-fill" src/index.css ≥ 2`. That specific var name does not exist in the current `src/index.css` (Phase 15 ships `--color-constellation-edge`/`-edge-heavy`/`-halo` instead). The intent — *Phase 15 constellation tokens still present* — is satisfied: `grep -c "constellation-edge" src/index.css` returns 4. Treating as a checker-doc typo, not a deviation requiring action.

## project instructions compliance

- Coding-style: 2-space indent, LF line endings, no semicolons, no comma-dangle enforcement, max 8-10 lines per function (each filter is 3-6 lines), max 3 parameters (composeFilters uses a settings object as 2nd arg).
- Functions: `filter*` verbs, lowerCamelCase, named exports.
- Immutability: every selector returns a new array via `.filter` / `.from(new Set(...))` — zero mutation of inputs.
- Tests: TDD RED→GREEN gate respected — no implementation before failing tests existed.
- Bilingual: every new EN key has a real Spanish ES counterpart pulled verbatim from UI-SPEC.

## Commits

| Hash | Message |
|------|---------|
| `e6df3d5` | feat(16-02): add filters.js pure selectors (GREEN) |
| `deb543a` | feat(16-02): extend t.game.* with filter + card + CV CTA keys |
| `e2618b6` | feat(16-02): add Phase 16 tokens + keyframes + scrollbar-hide utility |

## Known Stubs

None. Every export shipped in `filters.js` returns real data derived from `EXPERIENCE` / `SKILLS`. Translation values are real Spanish, not placeholders. CSS tokens have concrete values (no `initial` / `unset` placeholders).

## Self-Check: PASSED

- All 4 source files present at expected paths (`src/game/filters.js`, `src/i18n/translations.js`, `tailwind.config.js`, `src/index.css`).
- SUMMARY.md present at `.planning/phases/16-filters-floating-experiencecard/16-02-SUMMARY.md`.
- All 3 task commits resolvable via `git log` on this worktree branch: `e6df3d5`, `deb543a`, `e2618b6`.
