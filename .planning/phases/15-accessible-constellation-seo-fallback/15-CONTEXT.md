# Phase 15: Accessible Constellation & SEO Fallback - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Approved design spec (`docs/superpowers/specs/2026-05-29-game-mode-design.md`) + Phase 14 CONTEXT carry-forward + this session's discussion (3 areas: visual style, initial landing, keyboard nav).

<domain>
## Phase Boundary

Phase 15 ships the **gate-safe SVG/DOM constellation render** + the **renderer port contract** that a WebGL adapter will plug into later (Phase 17), plus the **SEO/SR sr-only experience fallback** that ensures crawlers / ATS / screen readers always get the full career content regardless of render path.

Maps to REQs **GAME-01** (renderer contract + SVG/DOM path), **GAME-02** (first visual render of the graph built in Phase 14), **GAME-06** (a11y + SEO).

**Delivers:**
- `src/game/GameMode.jsx` — orchestrator that detects capability (viewport, WebGL support, `prefers-reduced-motion`, `navigator.connection?.saveData`) and chooses a renderer. In Phase 15 only `SvgConstellation` exists; the capability logic is in place but always resolves to SVG/DOM until the WebGL adapter ships (Phase 17).
- `src/game/renderers/SvgConstellation.jsx` — pure React + SVG renderer behind the shared props contract: `{ nodes, edges, highlightedSkillIds, selectedSkillId, yearRange, theme, lang, onSelectSkill, onHoverSkill }`. Paints nodes (category-colored), edges (weight ≥2 always visible; weight=1 shown on hover/select), keyboard-navigable, reduced-motion-safe.
- `src/game/useConstellation.js` — hook holding selection/hover state + pure selectors. Filter state plumbed through but real filter UI is Phase 16; for now `selectedSkills/yearRange/category` default to empty so the contract is exercised end-to-end.
- `src/game/ConstellationFallback.jsx` (or sr-only block inside `GameMode`) — DOM-present semantic experience list for SEO/ATS/SR (full bilingual text of all 12 experiences). Always in the DOM regardless of render path.
- Updated `App.js` — replaces the Phase 14 placeholder game-mode subtree with `<GameMode />`. Dev mode unchanged.
- Component tests (Vitest + RTL): renderer renders nodes/edges from a fixture graph; keyboard nav (roving tabindex + arrow keys); aria-label content; sr-only fallback presence; reduced-motion path skips reveal animation.

**Does NOT deliver:**
- WebGL desktop renderer (Phase 17).
- Filter UI — multi-skill / year-timeline / category chips (Phase 16).
- Floating bilingual ExperienceCard + CV CTA (Phase 16).
- Lighthouse mobile gate re-verification (Phase 17 close-out).

</domain>

<decisions>
## Implementation Decisions

### Visual Style (Area 1)
- **D-15-VIS-CHAR:** Visual character = **stars on dark sky** — bright pinpoint category-colored nodes, thin glowing edges, subtle outer halo on the active subgraph. Reduced-motion drops the halo + ambient effects.
- **D-15-VIS-SIZE:** Node size = **`√count`** (square-root of jobs using the skill). Java (count=11) ≈ 3.3× Jenkins (count=1). Balanced hierarchy — rare skills stay clickable, dominant skills clearly bigger. Planner picks the px range (suggested floor ~6px radius mobile / 10px desktop, ceiling derived to keep largest node ~3.3× floor).
- **D-15-VIS-EDGE:** Edge visibility = **hide weight-1 by default; show weight ≥2 always; on node hover/select, fade in that node's weight-1 edges**. Stroke width ∝ weight (planner picks the px scale).
- **D-15-VIS-ACTIVE:** Active-state distinction = **halo (outer glow) + brightness bump on the active node + connected edges; non-active nodes drop to opacity 0.35**. Reduced-motion: skip halo, keep brightness + dim.
- **D-15-VIS-COLOR:** Node fill uses the 8 category colors locked in Phase 14 (`SKILL_CATEGORY_COLORS`). Edges = neutral mid-tone (planner picks token; same in both themes via CSS-var). AA contrast must hold for nodes/edges/labels in BOTH dark and light themes.

### Initial Landing State (Area 2)
- **D-15-LAND-PAINT:** First paint = **animated reveal**. Nodes fade-in + scale-up in waves over ~800ms (biggest first to teach the hierarchy), then edges draw in over ~400ms. Total reveal ~1.2s. Reduced-motion = no animation; full constellation paints instantly at final state.
- **D-15-LAND-HINT:** Resting hint = **subtle pulse on the biggest node** (Java) — opacity 1.0↔0.7, 2s loop — as a "start here" cue. Stops on first user interaction (hover OR keyboard focus moves OR click). Reduced-motion fallback: no pulse, show a static hint pill instead ("Click a star · Toca una estrella") below the constellation that fades out on first interaction.
- **D-15-LAND-COPY:** Bilingual H1 above the constellation:
  - EN: **"19 years. 27 skills. One constellation."**
  - ES: **"19 años. 27 skills. Una constelación."**
  - Sub-copy:
    - EN: **"Click a star to explore where Carlos used it."**
    - ES: **"Haz clic en una estrella para explorar dónde la usó Carlos."**
  - **MANDATORY:** the numbers `19` (years) and `27` (skills) MUST be derived at render time from data — `19 = max(period.end ?? CURRENT_YEAR) - min(period.start)` across all experiences, and `27 = canonical-skill-count` from `skills.js` after alias normalization. Do NOT hardcode the integers — they're an evolving truth (Coderio ticks forward, future jobs add skills). Add a unit test asserting the derivation matches the live data.
- **D-15-LAND-ATS:** The H1/sub-copy block ABOVE the constellation also doubles as the document `<h1>` for SEO. Place this in the DOM ahead of the constellation SVG, regardless of render path.

### Keyboard Navigation (Area 3)
- **D-15-KB-PATTERN:** **Single tabstop + roving tabindex.** The constellation as a whole is ONE tab stop in document flow. Inside the constellation, exactly one node has `tabindex=0` (the "active" node — starts at Java); all others have `tabindex=-1`. WAI-ARIA roving-tabindex pattern (the same one listbox / menu / toolbar / radiogroup widgets use). Recruiter Tab-scan keeps reasonable cadence (one stop, not 27).
- **D-15-KB-CONTAINER:** The constellation wrapper exposes `role="application"` (or `role="grid"` if simpler) with an `aria-label` that explains it's a keyboard-navigable skill explorer — bilingual via `t.game.constellationLabel`. Planner confirms role choice during research.
- **D-15-KB-ARROWS:** Arrow keys traverse **spatially** — `→` jumps focus to the nearest node to the right of the current focus (using baked layout x/y coords), `←/↑/↓` analogous. Matches the visual model; sighted-keyboard users get a "go right" that actually goes right. Implementation: compute nearest node in arrow vector at focus time (cheap; ~27 nodes).
- **D-15-KB-ACTIVATE:** `Enter` AND `Space` both activate the focused skill (= same as click — sets `selectedSkillId`, opens the experience card in Phase 16; in Phase 15 just toggles highlight + announces "Skill selected, X experiences" via an `aria-live` region).
- **D-15-KB-ESC:** `Esc` clears selection and returns focus to the constellation root (or, when an ExperienceCard is open in Phase 16, closes the card and returns focus to the originating node — but card is Phase 16).
- **D-15-KB-LABEL:** Per-node `aria-label` format = **`{skill name}, {category in active lang}, used in {count} jobs`**. Bilingual via the active `lang`. The visual encodes category-as-color and count-as-size; the aria-label decodes both for SR users. Example: EN "Java, languages, used in 11 jobs." / ES "Java, lenguajes, usado en 11 trabajos." Planner picks exact phrasing in `translations.js`.
- **D-15-KB-ANNOUNCE:** Selection changes emit a polite `aria-live` announcement (e.g., "Java selected — 11 experiences. Press Esc to clear."), bilingual.

### SEO / sr-only Fallback (NOT deeply discussed — implementer's discretion within these guardrails)
- **D-15-SEO-DEFAULTS:** sr-only fallback ships per the spec defaults: full bilingual text of all 12 experiences in the DOM regardless of render path, ordered chronologically (most recent first to match the existing Experience.js order), inside a `section` with `aria-labelledby`. Active language is the one announced first (semantic `lang` attribute on the inner blocks). Use the `sr-only` Tailwind utility (existing in the codebase) — not `visibility:hidden`/`display:none` (would hide from SR). Planner confirms via research whether to render both languages always (max crawl + slight DOM weight) or active-lang only (cleaner). Default if no research signal: **active-lang only** (the language toggle re-renders both code paths anyway).

### Implementer's Discretion
- Exact px values for node radius range, halo blur radius, edge stroke widths, pulse opacity timing curve.
- SVG vs SVG-in-React-component-tree implementation choice (planner picks).
- Whether the orchestrator uses React.lazy for the eventual WebGL adapter (Phase 17) or a simple conditional import — Phase 17's concern, but the contract must not preclude lazy loading.
- Animation library — prefer CSS keyframes / transitions over a JS animation lib to keep bundle lean; if Framer Motion or similar is added, document why.
- Internal shape of `useConstellation` (selection state location, memoization). The exported props contract is what's load-bearing.
- Exact `role` for the constellation container (`application` vs `grid` vs `list` + custom keyboard handling) — planner researches WAI-ARIA APG patterns and picks the closest match.
- Pulse vs subtle hover-glow-loop on the biggest node — same intent, planner picks the cheaper implementation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design (source of truth)
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` — full v3.8 architecture; Phase 15 implements §Architecture (renderer contract), §UX/Layout (mobile-SVG path), §Adaptive Strategy, §Performance Budget, §Accessibility, §Error Handling.
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` §232 — Open Questions still relevant (sr-only single vs both languages).

### Roadmap / requirements
- `.planning/ROADMAP.md` §"Phase 15" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — GAME-01 (contract + SVG/DOM), GAME-02 (render), GAME-06 (a11y + SEO).
- `.planning/PROJECT.md` — Active requirements; Lighthouse mobile HARD gate (perf ≥95 / a11y 100 / BP 100 / SEO 100) must hold.

### Prior phase carry-forward
- `.planning/phases/14-foundation-data-layer-viewmode-toggle-test-infra/14-CONTEXT.md` — Decisions D1–D8 (node=skill, baked positions, 8 category colors, game default, ViewMode contract).
- `.planning/phases/14-foundation-data-layer-viewmode-toggle-test-infra/14-01-SUMMARY.md` — exposes `buildConstellationGraph`, `computeLayout`, `SKILL_CATEGORIES`, `SKILL_CATEGORY_COLORS`.
- `.planning/phases/14-foundation-data-layer-viewmode-toggle-test-infra/14-02-SUMMARY.md` — `ViewModeContext` + Game/Dev toggle live; current game subtree is a placeholder shell that this phase replaces.

### Existing code to follow / extend
- `src/game/constellation.graph.js` (Phase 14) — `buildConstellationGraph(experience, skills)` returns `{ nodes, edges }` consumed as the renderer's input.
- `src/game/constellation.layout.js` (Phase 14) — `computeLayout(nodes)` returns deterministic `{ id: { x, y } }` map; the renderer reads these positions.
- `src/data/skills.js`, `src/data/experience.js` (Phase 14) — data inputs.
- `src/context/ViewModeContext.js`, `src/components/_shared/ViewModeToggle.js` (Phase 14) — already wired; no changes needed for the toggle itself.
- `src/i18n/translations.js` — extend the `game.*` namespace with new keys (constellation aria-label, node-aria template, hint pill, h1/sub-copy keys, sr-only section heading).
- `src/i18n/LanguageContext.js`, `src/i18n/ThemeContext.js` — read via existing hooks (`useLanguage()`, `useTheme()`).
- `src/index.css` — token map (CSS-vars per theme). New SVG needs to read brand/category colors via tokens, not raw hex; reduced-motion `@media` already wired.
- `tailwind.config.js` — extend keyframes for the reveal/pulse animations; honor the `motion-safe:` prefix convention.

### Reusable patterns
- `src/components/_shared/ThemeToggle.js`, `src/components/_shared/ViewModeToggle.js` — focus-visible ring pattern + 44px touch target (same applies to interactive constellation root).
- `src/components/Experience.js` — bilingual text rendering pattern + chronological order convention.
- `src/components/Nav.js` — `createPortal` + MobileMenu pattern (any modal/dialog Phase 16 ships uses this).

### Test infra (Phase 14)
- `vite.config.js` `test:` block, `src/test/setup.js` — Vitest 2.1.9 + RTL + jsdom already wired; reuse for Phase 15 component tests.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildConstellationGraph` + `computeLayout` (Phase 14) — graph + positions ready, just consume.
- `SKILL_CATEGORIES` / `SKILL_CATEGORY_COLORS` — 8 category colors locked, semantic data values (not styling tokens).
- `useViewMode()` hook — branches the page; constellation only mounts when `viewMode === 'game'`.
- `useLanguage()` / `useTheme()` hooks — bilingual + theme-aware out of the box.
- `motion-safe:` Tailwind variant + `prefers-reduced-motion` CSS in `index.css` — established convention; reuse, do not invent.
- `sr-only` Tailwind utility — already in use; no need to redefine.

### Established Patterns
- JSX in `.js` files (esbuild loader handles it); no `.jsx`, no separate vitest config.
- Bilingual text via `t.namespace.key` strings — never inline EN/ES literals in components.
- Token-driven colors via CSS-vars + Tailwind utilities — no raw hex in styling (data values like `SKILL_CATEGORY_COLORS` are the exception; documented).
- Components co-located by feature (`src/game/`, `src/context/`, `src/components/_shared/`).
- Pure-data + pure-derivation modules with zero framework imports (`src/data/*`, `src/game/constellation.{graph,layout}.js`).
- Tests written first (TDD) for pure-logic modules; component tests use the existing Vitest+RTL setup.

### Integration Points
- `src/App.js` — `MainContent` inner component already branches on `viewMode`. Replace the current placeholder block with `<GameMode />`.
- `src/i18n/translations.js` — add `game.constellationLabel`, `game.h1`, `game.subCopy`, `game.nodeAriaTemplate`, `game.skillSelectedAnnouncement`, `game.hintPill`, `game.fallbackSectionHeading` (or similar) in both EN and ES blocks.

</code_context>

<specifics>
## Specific Ideas

- ASCII visual reference for the locked look: bright nodes (`✦`), active subgraph glowing (`✪`), edges (`─` weight 1, `═` weight ≥2), non-active dim (`·`). See selected option previews in `15-DISCUSSION-LOG.md`.
- Reveal sequencing: biggest nodes first (size √count, ordered descending) → satisfying "this is alive" effect. Stagger ~30ms per node so total ≈ 800ms across ~27 nodes.
- Pulse on Java (biggest) acts as the "start here" cue. Stops on FIRST interaction (hover OR focus moves into constellation OR click).
- Spatial arrow nav uses Euclidean distance projected onto the arrow vector — implementation can be a simple "find min distance among nodes where `(target.x - focus.x) * vec.x + (target.y - focus.y) * vec.y > 0`".
- Per-node aria-label is parameterized by category-in-active-language. The 8 category labels already exist in `SKILL_CATEGORIES[k][lang]` from Phase 14 — reuse, don't redefine.
- 19 years derivation: `currentMaxYear - minStartYear` from the period field. 27 skills derivation: `Object.keys(SKILLS).length` from `src/data/skills.js`. Both are derived at render time, kept honest by a unit test.

</specifics>

<deferred>
## Deferred Ideas

- **SEO/sr-only fallback bilingual policy** (both-langs vs active-lang only) — not discussed; defaulted to active-lang only with implementer's discretion. Planner may research and revisit if there's an SEO/ATS signal favoring both-langs.
- **Filter UI** (multi-skill chips, year-timeline slider, category chips, reset) — **Phase 16**.
- **Floating ExperienceCard + CV CTA** (clicking a skill node opens a bilingual dialog/popover with that skill's jobs + CV download link) — **Phase 16**. Phase 15's `Enter`-on-node behavior is "set selection + announce"; the visible UI is Phase 16.
- **WebGL desktop renderer** + `three.js` / `react-three-fiber` library choice + desktop breakpoint + lazy-chunk loading — **Phase 17**. Phase 15's `GameMode` orchestrator must not preclude this.
- **Lighthouse mobile gate re-verification** against the new render — **Phase 17** close-out (and informs whether SVG path needs perf tuning).
- **Text search for skills** — explicitly deferred in spec D-v3.8 non-goals.
- **Sharing filter state via URL** (beyond `?mode=`) — spec non-goal.
- **Sound, tutorial, achievement animations** — spec non-goal.

</deferred>

---

*Phase: 15-accessible-constellation-seo-fallback*
*Context gathered: 2026-06-01 via /gsd:discuss-phase 15 (default mode, 3 areas discussed in 4+3+3 = 10 single-question turns).*
