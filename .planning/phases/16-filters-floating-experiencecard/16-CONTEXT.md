# Phase 16: Filters & Floating ExperienceCard - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Approved design spec (`docs/superpowers/specs/2026-05-29-game-mode-design.md`) + Phase 15 renderer contract (already wired with `onSelectSkill` / `highlightedSkillIds` / `yearRange` plug points) + this session's discussion (6 areas: filter layout, year slider, selection→card flow, card layout, intersection semantics, persistence).

<domain>
## Phase Boundary

Phase 16 ships **the filter UI** (skill chips, year-timeline slider, category chips, reset) and **the floating bilingual ExperienceCard** with CV CTA — plugging into Phase 15's renderer contract. The constellation rendering, capability detect, ARIA contract, and sr-only fallback all stay as Phase 15 shipped them.

Maps to REQs **GAME-03** (filters + intersection) and **GAME-04** (ExperienceCard + CV CTA).

**Delivers:**
- `src/game/SkillFilters.js` — bottom control bar / top toolbar component holding skill chips, year-range dual-thumb slider, category chips, reset button. Persistent visible on desktop ≥768px; top compact toolbar (horizontal scroll chips + Year chip mini-control) on mobile.
- `src/game/ExperienceCard.js` — `role="dialog"` floating component with focus trap, Esc closes, returns focus to originating node. Single scrollable card with internal vertical list of N job entries. Desktop = anchored near node; mobile = bottom-sheet.
- `src/game/useConstellation.js` — extended with selector logic for: skill filtering (AND co-occurrence), year-range filtering (period intersection), category filtering, multi-skill highlight, empty-state computation. Pure selectors only (no side effects).
- `src/game/filters.js` (or co-located helper) — pure filter selectors: `filterByYearRange(experiences, [startYear, endYear])`, `filterBySkillIntersection(experiences, skillIds[])`, `filterByCategory(experiences, category)`, `composeFilters(experiences, filterState)`.
- `src/game/renderers/SvgConstellation.js` updates — read `highlightedSkillIds` to apply dim-others styling beyond just the selected node; honor `yearRange` filter for node dimming.
- `src/game/GameMode.js` updates — render `<SkillFilters />` + `<ExperienceCard />` alongside the existing renderer slot; wire `useConstellation` filter state through.
- Extended `t.game.*` translation keys: filter labels, year range labels, category labels (reuse Phase 14 `SKILL_CATEGORIES[k][lang]`), reset button, "no matches" empty state, ExperienceCard heading template, CV CTA label, close button.
- `CV_Carlos_Montoya_{EN,ES}.docx` — already in `public/` (verified). CV CTA link respects active `lang`.
- Component tests (Vitest + RTL): filter selectors (pure unit, near-100%), SkillFilters (chip toggle, year slider, reset, keyboard a11y), ExperienceCard (open/close/focus trap/Esc/swap behavior), tech-chip click-to-filter, intersection semantics, empty-state.

**Does NOT deliver:**
- WebGL desktop renderer (Phase 17).
- Lighthouse mobile gate re-verification (Phase 17 close-out).
- URL-encoded filter state (`?skills=...&year=...`) — spec non-goal for v3.8.
- Filter state persistence across page reload (in-memory only; see D-16-PERSIST).

</domain>

<decisions>
## Implementation Decisions

### Filter UX Layout (Area A)
- **D-16-FLAYOUT-DESKTOP:** Desktop (≥768px) ships a **persistent visible bottom control bar**, never collapsed at landing. Vertical cost ~60px is acceptable — recruiter sees filters exist without discovery. Bar holds: multi-skill chip cluster, year-range dual-thumb slider, 8 category chips, reset button. Bilingual labels via `t.game.*`. AA contrast in both themes.
- **D-16-FLAYOUT-MOBILE:** Mobile (<768px) ships a **top compact toolbar** below the H1, above the constellation. Horizontal-scroll chip row for categories. Skill multi-select chips appear inline. A dedicated "Years" chip opens an inline mini-control with the dual-thumb slider when tapped. Reset button is the last chip in the row. The mobile bottom-sheet is reserved exclusively for ExperienceCard — filters do NOT live in a bottom sheet (avoids two-mode surface confusion).
- **D-16-FLAYOUT-RESET:** Reset is a single button labeled bilingually (`t.game.filterReset` — EN: "Reset" / ES: "Limpiar"). Clears all 3 filter dimensions in one action (skills, year range, category). Disabled when no filter is active. Keyboard-accessible same as any chip.

### Year-Timeline Slider (Area B)
- **D-16-YEAR-INPUT:** **Dual-thumb range slider** on a single track spanning 2007–2026 (20 years). Two draggable thumbs mark `[startYear, endYear]`. Default = full range (no filter active). Labels show selected range (e.g., "2018 — 2026"). Bilingual title via `t.game.yearLabel` (EN: "Years" / ES: "Años"). Keyboard-accessible: arrow keys move active thumb ±1 year, Home/End jump to range limits.
- **D-16-YEAR-EFFECT:** Year-range filter **highlights matching nodes + dims others** (`fillOpacity: 0.35` on non-matching nodes, reuse Phase 15 active-state dim treatment). Matching definition: a skill is matched if it was used in at least one job whose `period` intersects `[startYear, endYear]`. Edges incident to dimmed nodes also dim. Reduced-motion path skips opacity transition.
- **D-16-YEAR-BOUNDS:** Slider range bounds derived at module level from live data — `2007 = min(EXPERIENCE.map(e => e.period.start))` and `2026 = max(EXPERIENCE.map(e => e.period.end ?? CURRENT_YEAR))`. Same derivation pattern as Phase 15's H1 (D-15-LAND-COPY). Add a unit test asserting the bounds match live data.

### Selection → ExperienceCard Flow (Area C)
- **D-16-FLOW-OPEN:** **1-click direct**. Click/Enter/Space on a skill node → same action does: select skill + highlight node + dim others + open ExperienceCard. No two-step flow. Recruiter sees jobs instantly on first interaction. Reuses Phase 15's `onSelectSkill` callback unchanged.
- **D-16-FLOW-CLOSE-EMPTY:** Clicking empty space (anywhere outside a node, outside the card, outside the filter bar) closes the card AND clears the skill selection (selection halo gone, dim-others gone). Reuse Phase 15's existing Esc behavior — Esc also closes card and clears selection. Focus returns to the originating node per Phase 15's ARIA contract.
- **D-16-FLOW-SWAP:** Clicking another skill node while a card is open **swaps the card**. Selection moves to the new node, card content updates in place, halo moves. No close-then-open two-step. Smooth swap animation (cross-fade, ~150ms) under motion-safe; instant swap under reduced-motion.

### ExperienceCard Layout (Area D)
- **D-16-CARD-STRUCTURE:** **Single scrollable card with internal job list**. The card is one `role="dialog"` with focus trap. Inside, a `<header>` with skill name + `<button>` close (X), then a vertically scrollable `<ol>` of job entries. Each `<li>` renders one job: title, company, date display string, location, bullets list (`bullets[lang]`), tech chips colored by category. Avoids stacked-deck or carousel complexity (Java has 11 jobs — too many for carousel; single scrollable list is most reliable). Mobile = bottom-sheet (drag-down to close).
- **D-16-CARD-CHIPS:** Tech chips inside each job entry are **clickable** — click adds that skill to the multi-select filter (intersection). Powerful exploration affordance — "show me other jobs using Java AND Spring Boot". Active-filtered chips show a visual selected state (filled vs outline). The currently-selected skill (whose card is open) renders its own chip as "active and locked" (cannot click-to-remove from card view; user must close card to deselect). Keyboard-accessible chips with focus ring matching Phase 15 pattern.
- **D-16-CARD-CV-CTA:** **CV CTA per card** (not per job entry — one CTA in the card footer). Label bilingual: EN "Download CV (English)" / ES "Descargar CV (Español)". Href = `/CV_Carlos_Montoya_{EN|ES}.docx` based on active `lang`. Files already exist in `public/`. Click triggers browser download (no preview modal — direct .docx download).
- **D-16-CARD-A11Y:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to a heading with the skill name. Focus trap inside card (Tab cycles within card; Shift+Tab cycles backward). Esc closes card + clears selection. Initial focus = card heading. Close button has `aria-label="Close" / "Cerrar"`. Returning focus = the node that opened the card (Phase 15 already manages roving entry ref).

### Intersection Semantics (Area E)
- **D-16-INTERSECT-AND:** Multi-skill selection = **AND semantics (co-occurrence)**. When user selects Java + Kubernetes, the ExperienceCard shows ONLY jobs where Carlos used BOTH Java AND Kubernetes in the same role. Most precise meaning of "intersection". Strong recruiter signal: "where did Carlos combine these". Empty result is a valid outcome (no jobs combined them — informative signal handled by D-16-EMPTY).
- **D-16-INTERSECT-HIGHLIGHT:** The constellation highlight for multi-skill selection brightens both selected nodes + the edges connecting them. Other nodes dim. If selected skills never co-occurred (no edge between them) the visualization still highlights both nodes but the ExperienceCard shows the empty state.

### Filter State Persistence (Area G)
- **D-16-PERSIST-MEMORY:** Filter state is **in-memory only** (React state via `useConstellation`). Page reload = fresh start (filters reset, no card open). Recruiter always lands on the Phase 15 "stars on dark sky" first impression — never a pre-filtered view that demands context.
- **D-16-PERSIST-CROSS-TOGGLE:** Language toggle and theme toggle **preserve in-memory state** — filters and selected skill remain across re-renders. Card content re-renders in the new language. No localStorage write.
- **D-16-PERSIST-URL:** URL-encoded filter state is **NOT delivered in v3.8** (spec non-goal). Future enhancement could add `?skills=java,k8s&year=2018-2026` deep-links.

### Implementer's Discretion (Areas F, H, I deferred to planner)
- **Empty-result UX (F):** When filter combo yields zero matching skills/experiences, render the constellation with all nodes dimmed to ~0.35 + show an inline message at the card location ("No matches in this combination — try fewer filters" / bilingual). Reset button highlighted as the suggested next action. Do not auto-reset — give user control.
- **Card animation entry/exit (H):** Fade-in 200ms on desktop (anchored popover); slide-up from bottom 250ms on mobile (bottom-sheet). Reduced-motion = instant render. Card swap = 150ms cross-fade. Planner picks exact easing curves.
- **Tech-chip click-to-filter feedback (H, beyond D-16-CARD-CHIPS):** Animate a brief flash on the constellation when a tech chip is clicked, indicating the new filter applied. Reduced-motion = instant dim update only.
- **Mobile bottom-sheet gesture (D-16-CARD-STRUCTURE detail):** Drag-down-to-close handled by a small drag-handle bar at the top of the bottom-sheet. Optional swipe gesture if planner finds a lean library; otherwise pure tap-close via the X button + Esc + click outside.
- **Filter chip visual treatment:** Pill-shaped chips matching the existing `LangPill` / `ThemeToggle` pattern. Active state = filled with category color (for category chips) or brand color (for skill chips). Outline state = unfilled with border in token color. Planner picks exact px / tokens within Phase 15's design system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design (source of truth)
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §UX/Layout — Phase 16 implements the bottom control bar (desktop) and top toolbar (mobile) sections.
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §"What `useConstellation` returns" — filter state shape (`selectedSkills[]`, `yearRange`, `category`) and pure selector contract.
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §Accessibility — ExperienceCard `role="dialog"` + focus trap + Esc + return focus contract.

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 16" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — GAME-03 (filters + intersection), GAME-04 (cards + CV CTA).
- `.planning/PROJECT.md` — Lighthouse mobile HARD gate must hold (re-verified Phase 17). Bundle budget < ~30 kB gz over baseline still applies.

### Prior phase carry-forward
- `.planning/phases/15-accessible-constellation-seo-fallback/15-CONTEXT.md` — D-15-* decisions (visual style, ARIA, keyboard nav, sr-only fallback policy).
- `.planning/phases/15-accessible-constellation-seo-fallback/15-UI-SPEC.md` — design tokens (constellation CSS-vars, focus ring, AA contrast pairs), animation budget, ARIA contract.
- `.planning/phases/15-accessible-constellation-seo-fallback/15-01-SUMMARY.md`, `15-02-SUMMARY.md`, `15-03-SUMMARY.md` — Phase 15 outputs: renderer props contract (`{ nodes, edges, highlightedSkillIds, selectedSkillId, yearRange, theme, lang, onSelectSkill, onHoverSkill }`), `useConstellation` hook current shape, GameMode wiring.
- `.planning/phases/14-foundation-data-layer-viewmode-toggle-test-infra/14-01-SUMMARY.md` — `buildConstellationGraph(experience, skills)` shape; `SKILL_CATEGORIES` + `SKILL_CATEGORY_COLORS` (8 categories, bilingual labels in `SKILL_CATEGORIES[k][lang]`).

### Existing code to follow / extend
- `src/game/renderers/SvgConstellation.js` (Phase 15) — extend dim-others logic to honor `highlightedSkillIds[]` and year-range matching; current implementation only dims for `selectedSkillId`.
- `src/game/useConstellation.js` (Phase 15) — extend to hold `filterState: { selectedSkills, yearRange, category }`. Phase 15 already wired the placeholder fields; Phase 16 fills them in.
- `src/game/GameMode.js` (Phase 15) — add `<SkillFilters />` above renderer slot (desktop bottom bar location decided in layout pass) and `<ExperienceCard />` rendered when `selectedSkillId !== null`.
- `src/data/experience.js` — read `period.start` / `period.end` for year-range filtering; `tech[]` array for skill membership and intersection logic.
- `src/data/skills.js` — `SKILLS` catalog + `SKILL_CATEGORIES` + `SKILL_CATEGORY_COLORS`. Categories drive the 8 category chips.
- `src/i18n/translations.js` — extend `t.game.*` additively with filter + card keys in both EN + ES.
- `src/components/_shared/ThemeToggle.js`, `src/components/_shared/ViewModeToggle.js`, `src/components/Nav.js` — chip + button + dialog patterns (focus ring, 44px touch target, portal pattern for dialog).
- `src/components/Experience.js` — bilingual job rendering pattern; ExperienceCard job entries mirror this list structure.
- `public/CV_Carlos_Montoya_EN.docx`, `public/CV_Carlos_Montoya_ES.docx` — CV CTA download targets (verified present 2026-06-01).

### Test infrastructure (Phase 14)
- `vite.config.js` `test:` block, `src/test/setup.js` — Vitest 2.1.9 + RTL + jsdom + canvas mock (added Phase 15). Reuse for Phase 16 component tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 15's `SvgConstellation` already accepts `highlightedSkillIds` and `yearRange` as props (placeholder pass-through) — Phase 16 fills in the consumer logic for dim-others against these props.
- `useConstellation` hook already owns `selectedSkillId` + `hoveredSkillId` + toggle behavior (D-15-KB-ACTIVATE). Phase 16 extends with `filterState`.
- Bilingual category labels live in `SKILL_CATEGORIES[k][lang]` (Phase 14 data). Phase 16's category chips render from this map — no new translations needed for category names.
- `createPortal` + dialog pattern exists in `src/components/Nav.js` (MobileMenu) — ExperienceCard's `role="dialog"` should mirror this structure.
- `sr-only` Tailwind utility, `motion-safe:` Tailwind variant, focus-visible ring pattern, 44px touch targets — all established conventions; reuse, don't invent.

### Established Patterns
- JSX in `.js` files (esbuild loader). No `.jsx`.
- Bilingual via `t.game.*` keys — never inline EN/ES literals.
- Token-driven colors via CSS-vars + Tailwind utilities. `SKILL_CATEGORY_COLORS` hex values are the documented data exception.
- Pure-logic modules with zero framework imports (`src/game/filters.js` follows this pattern — same as `src/game/spatialNav.js` from Phase 15).
- Tests written for pure-logic modules first (TDD); component tests use Vitest + RTL setup from Phase 14.
- No new heavy dependencies — prefer CSS keyframes/transitions for animations; reuse Phase 15's halo + dim treatment.

### Integration Points
- `src/App.js` — no change. `<GameMode />` already mounts; Phase 16 happens inside.
- `src/i18n/translations.js` — add `t.game.filterReset`, `t.game.yearLabel`, `t.game.filterEmpty`, `t.game.cardClose`, `t.game.cardHeading` (template with `{skill}`), `t.game.cvCtaLabel`, `t.game.cardJobsCount` (template with `{n}`), etc. — bilingual.
- `src/index.css` — possibly add filter-bar background token + chip-active/outline tokens per theme if existing constellation tokens don't cover.
- `tailwind.config.js` — possibly add keyframes for card slide-up / cross-fade if not covered by existing `motion-safe:` utilities.

</code_context>

<specifics>
## Specific Ideas

- Year range bounds derived from live `EXPERIENCE` data, NOT hardcoded `[2007, 2026]`. Unit test asserts the bounds match what the data produces (same honesty rule as Phase 15's H1).
- Multi-skill AND intersection: pure selector `filterBySkillIntersection(experiences, skillIds)` returns `experiences.filter(exp => skillIds.every(s => exp.tech.includes(s)))`. Linear scan over 12 experiences × up to 26 skills — trivial cost, no memoization needed.
- ExperienceCard close-flow: clicking empty space (anywhere outside `[data-game-interactive]` regions) closes the card AND clears selection. Implement via a global click listener attached when card open, removed on close. Avoids per-element handler bloat.
- Card swap on node click while open: animate 150ms cross-fade (motion-safe) — opacity 1 → 0 (current content) interleaved with new content opacity 0 → 1. Under reduced-motion, instant swap. Pure CSS, no animation library.
- ExperienceCard focus trap: tab cycles through `card heading → CV CTA → job entries (any focusable inside, e.g., tech chips) → close button → back to heading`. Initial focus = heading on open. Use the existing focus-trap pattern from `src/components/Nav.js` MobileMenu, or a small inline focus-trap helper.
- Tech chip click adds skill to filter — if the skill is already selected, click removes it (toggle). Visual state: filled chip = active filter, outline chip = inactive.
- Mobile bottom-sheet: position fixed bottom, full width, rounded top corners, drag handle bar at top. `transform: translateY(100%)` → `translateY(0)` slide-up on open. Tap outside (overlay) or drag-down OR X button closes.
- Reset button: disabled when no filter is active (visual + `aria-disabled="true"`). Enabled state has brand-color focus ring.

</specifics>

<deferred>
## Deferred Ideas

- **URL-encoded filter state** — `?skills=java,k8s&year=2018-2026&cat=cloud` for shareable filtered views. Spec non-goal v3.8. Phase 19+ candidate.
- **Text search for skills** — explicitly deferred in spec D-v3.8 non-goals.
- **Sharing filter state via URL beyond `?mode=`** — spec non-goal.
- **Saving filter presets** ("My Java + Cloud journey") — out of scope.
- **Sound, tutorial, achievement animations** — spec non-goal.
- **WebGL desktop renderer** — Phase 17.
- **Lighthouse mobile gate re-verification** — Phase 17 close-out.
- **Card stacked-deck / carousel UX** — alternative considered but rejected for single-scroll-list simplicity. Could revisit if user feedback shows the list feels overwhelming for high-count skills (Java=11 jobs).
- **Filter state persistence across reload (localStorage)** — considered but rejected (D-16-PERSIST-MEMORY). Phase 19+ candidate if recruiter feedback shows resume value.
- **Hover-preview tooltip on desktop** — alternative considered for selection flow but rejected (D-16-FLOW-OPEN — 1-click direct).
- **Filter intersection mode toggle (AND ↔ OR switch)** — out of scope; AND is locked per D-16-INTERSECT-AND.

</deferred>

---

*Phase: 16-filters-floating-experiencecard*
*Context gathered: 2026-06-01 via /gsd:discuss-phase 16 (default mode, 6 areas discussed across 9 single-question turns).*
