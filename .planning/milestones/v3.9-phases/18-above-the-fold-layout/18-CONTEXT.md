# Phase 18: Above-the-fold layout - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning
**Source:** v3.9 REQUIREMENTS.md POLISH-01 + first real post-v3.8 session UX bug ("scroll required to see constellation") + this discussion (4 áreas, 7 single-question turns).

<domain>
## Phase Boundary

Phase 18 reorganizes the game-mode layout so the constellation is **visible above the fold without scroll** on desktop ≥1024px, tablet ~768px, and mobile ~390px. Does NOT redesign any component — only repositions + resizes existing v3.8 elements (SkillFilters, H1+sub-copy, renderer slot). No new UI components, no new translation keys.

Maps to **POLISH-01**.

**Delivers:**
- `src/game/GameMode.js` restructured — `section` becomes `flex flex-col`; H1 compacted (text-xl / text-2xl); sub-copy moved into the sr-only `ConstellationFallback` (SEO + a11y preserved); renderer slot becomes `flex-1 min-h-0` and fills remaining viewport; SkillFilters lifted out of the normal flow into a `position: fixed bottom-0` bar.
- `src/game/SkillFilters.js` updated — root container className changes from `w-full max-w-3xl bg-ink-900/80 ... rounded-b-xl` (in-flow) to `fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-sm border-t border-ink-600 ... z-30` (out-of-flow). Internal flex layout unchanged. `data-game-interactive` attribute preserved.
- Layout-impact test(s) in `src/game/GameMode.test.js` (extend) — assert renderer slot has `flex-1` class; H1 has `text-xl md:text-2xl` (not `text-4xl`); SkillFilters root has `fixed bottom-0` positioning. RTL `getByTestId('renderer-slot')` height assertion (DOM-level — exact px depends on viewport, planner may use a JSDOM viewport stub).
- ExperienceCard bottom-sheet compatibility check — `ExperienceCard.js` mobile bottom-sheet currently positions itself `fixed bottom-0`; with SkillFilters now also `fixed bottom-0`, the card must overlay the bar (higher z-index, e.g. `z-50` vs bar `z-30`). Verify no regression.

**Does NOT deliver:**
- Constellation motion changes (Phase 19 — POLISH-02).
- New SkillFilters internal UX (chip clustering, slider redesign, etc. — stays as Phase 16 shipped).
- Nav top bar redesign (Nav stays as-is — already auto-hides via sticky, not in v3.9 scope).
- Hero photo / dev-view changes — only game-mode layout.

</domain>

<decisions>
## Implementation Decisions

### Layout — bottom fixed bar (Area A — locked)
- **D-18-BAR-POS:** SkillFilters becomes `position: fixed bottom-0 left-0 right-0` with `bg-ink-900/95 backdrop-blur-sm border-t border-ink-600 z-30`. Classic game-UI pattern. Same position on mobile + desktop (no breakpoint variant). Removes the bar from normal flow → constellation no longer competes with filters for vertical space. ExperienceCard bottom-sheet keeps higher z-index (z-50) so it overlays the filter bar when open. `data-game-interactive` attribute preserved (Phase 16 click-outside contract intact).

### H1 + sub-copy compaction (Area B — locked)
- **D-18-H1-SIZE:** H1 reduces from `text-2xl md:text-4xl` (32/36px) to `text-xl md:text-2xl` (20/24px). Vertical claim drops from ~120-150px to ~50px including margins. `mb-3` margin between H1 and sub-copy unchanged but sub-copy itself moves off the rendered region.
- **D-18-SUBCOPY-RELOC:** Sub-copy (`t.game.subCopy`) removed from the visible above-the-fold region. It moves into the existing `ConstellationFallback` sr-only block (already in DOM for SEO + screen readers) — SR users still hear it, crawlers/ATS still index it, recruiters don't see it eating vertical space. Container margin `mb-8 md:mb-12` → `mb-4` (16px instead of 32-48px).

### Renderer slot sizing (Area C — locked)
- **D-18-SLOT-H:** Renderer-slot wrapper (`<div data-game-interactive data-testid="renderer-slot">`) gains `flex-1 min-h-0` so it fills all remaining viewport space inside the `section min-h-screen flex flex-col`. SvgConstellation + WebGLConstellation already accept any container — they fit the slot. No fixed px height, no `vh` units. Adaptive across viewports automatically.
- **D-18-SLOT-WIDTH:** Existing `w-full max-w-3xl` constraint **preserved** (constellation width capped at 768px center-aligned on wide desktops — matches Phase 15 design vocabulary). Only height changes.

### Stacking order (Area D — auto-resolved)
- **D-18-STACKING:** With D-18-BAR-POS = bottom fixed, filters no longer compete with constellation for vertical space. Single stacking order across all viewports (H1 → renderer slot fills rest; filter bar floats over bottom edge as fixed). No per-viewport branching. Mobile + desktop use identical DOM order.

### Compatibility (Implementer's Discretion — planner finalizes)
- **D-18-Z-INDEX-MAP (implementer's discretion):** Stacking order top-to-bottom = base (constellation z-auto) < filter bar (z-30) < ExperienceCard (z-50) < Nav (existing z-40). Verify no clash with Nav's existing portal/sticky behavior. Planner picks final z-index values + may centralize them into Tailwind config tokens.
- **D-18-BOTTOM-PADDING (implementer's discretion):** When filter bar is `fixed bottom-0`, the renderer slot extends behind it (no scroll, just visual overlap). The constellation's bottom 60-80px is occluded by the bar. Two paths: (a) add `pb-20` to the slot so the constellation visually fits above the bar; (b) accept the overlap — the constellation is decorative and overlapping with a semi-transparent bar is fine. Planner picks based on actual rendered output. Recommendation: (a) `pb-20` desktop / `pb-24` mobile (bars have different heights).
- **D-18-FOCUS-MGMT (implementer's discretion):** With filter bar fixed, keyboard Tab order may surprise users — focus jumps from H1 to bar (visually at bottom) to renderer slot. Planner verifies that Tab order matches reading order; may add `tabindex` shifts or use CSS `order` to keep DOM order = visual order without affecting positioning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### v3.9 milestone
- `.planning/ROADMAP.md` §"Phase 18" — goal + 5 success criteria.
- `.planning/REQUIREMENTS.md` — POLISH-01 (above-the-fold) + carry-forward constraints (Lighthouse mobile gate, mobile chunk gz, AA contrast).
- `.planning/PROJECT.md` §"Current Milestone: v3.9 Game Mode Polish" — scope discipline.

### Phase 15/16/17 carry-forward
- `.planning/phases/15-accessible-constellation-seo-fallback/15-CONTEXT.md` — D-15-LAND-COPY (H1 derivation from live data — preserve), D-15-KB-ACTIVATE (roving tabindex on renderer — preserve), ConstellationFallback contract (sr-only DOM list).
- `.planning/phases/15-accessible-constellation-seo-fallback/15-UI-SPEC.md` — design tokens, focus ring contract, AA contrast pairs.
- `.planning/phases/16-filters-floating-experiencecard/16-CONTEXT.md` — D-16-FLAYOUT-DESKTOP (filter bar persistent, was top — Phase 18 moves to bottom), D-16-FLAYOUT-MOBILE (filter top toolbar — Phase 18 unifies with desktop bottom), D-16-CARD-STRUCTURE (mobile bottom-sheet — verify z-index doesn't clash), D-16-CLICK-OUTSIDE-RENDERER (data-game-interactive — preserve).
- `.planning/phases/16-filters-floating-experiencecard/16-UI-SPEC.md` — chip tokens, slider styling, animation budget.
- `.planning/phases/17-webgl-desktop-renderer-lighthouse-gate/17-CONTEXT.md` — D-17-CLICK-OUTSIDE-RENDERER (renderer-slot wrapper has data-game-interactive — preserve through restructure).

### Existing code to follow / modify
- `src/game/GameMode.js` (156 LOC) — restructure `section` from current `flex flex-col items-center px-6 pt-12 pb-8` + in-flow children → keep section attrs but lift SkillFilters out of flow + add `flex-1 min-h-0` to renderer slot wrapper.
- `src/game/SkillFilters.js` (234 LOC) — line 207 root container className change ONLY (positioning + bg + border). Internal chip/slider/reset layout untouched.
- `src/game/ExperienceCard.js` — verify z-index ≥50 in mobile bottom-sheet class so it overlays the new fixed filter bar.
- `src/game/GameMode.test.js` (18 it() blocks) — extend with layout-positioning assertions.
- `src/components/Nav.js` — verify existing z-index doesn't conflict; no changes expected.

### Constraints (carry-forward — must not regress)
- Lighthouse mobile HARD gate: Perf ≥95 / A11y 100 / BP 100 / SEO 100 — re-verify on phase close.
- 253 tests GREEN baseline — no regressions.
- Mobile chunk gz ≤ 38.82 kB ceiling (current 8.91 kB) — layout-only changes should add ~0 kB.
- AA contrast in dark + light themes for all repositioned surfaces.
- Bilingual EN+ES — no new translation keys (sub-copy reuses existing `t.game.subCopy`).
- Phase 16 D-16-CLICK-OUTSIDE-RENDERER `data-game-interactive` allow-list — preserve on both bar and renderer slot.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `section` already has `min-h-screen flex flex-col items-center` — only need to add `flex-1 min-h-0` to a child and lift SkillFilters out of flow.
- ConstellationFallback already mounts as sr-only outside renderer slot (`GameMode.js:174`) — adding sub-copy text inside it is additive, no SR regression.
- `data-game-interactive` attribute pattern from Phase 16 — preserve on filter bar's new root + renderer slot wrapper (both already have it; just keep through restructure).
- `bg-ink-900/95 backdrop-blur-sm` is the existing Nav backdrop pattern — reuse for the filter bar (consistent visual language).

### Established Patterns
- JSX in `.js` (esbuild loader). No PropTypes. No semicolons.
- Tailwind utility classes — `fixed`, `bottom-0`, `left-0`, `right-0`, `z-30`, `flex-1`, `min-h-0`, `pb-20`, `pb-24` all standard utilities, no new tokens needed.
- `motion-safe:` prefix not required for layout (pure structural change, no animation).
- Colocated `.test.js` files per Phase 14/15/16/17 convention.
- bilingual via `t.game.*` keys only — no inline literals.

### Integration Points
- Nav stays sticky-top (z-40 existing). Filter bar z-30 means Nav overlays bar on the rare overlap (shouldn't happen — Nav is top, bar is bottom). No clash.
- ExperienceCard mobile bottom-sheet currently `fixed bottom-0` (Phase 16) — needs `z-50` to overlay filter bar (Phase 16 may already do this; planner verifies).
- WebGLConstellation + SvgConstellation both accept any container size — flex-1 slot just provides the box, they fit.
- FpsCounter (dev-only, Phase 17) is positioned `fixed bottom-right` — may clash with filter bar at right edge. Planner may move to `top-right` or accept overlap (dev-only, no prod impact).

</code_context>

<specifics>
## Specific Ideas

- Filter bar className target: `fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-sm border-t border-ink-600 px-4 py-3 flex flex-wrap items-center gap-3 z-30 data-[game-interactive]:true` (keep existing internal flex+gap; just change outer positioning).
- H1 className: `text-xl md:text-2xl font-bold text-text-primary leading-tight mb-1`.
- Container around H1: drop `mb-8 md:mb-12 max-w-2xl` → `mb-4 max-w-2xl` (or remove the container entirely and put H1 + spacing directly on section).
- Renderer slot wrapper className: `w-full max-w-3xl relative flex-1 min-h-0 pb-20 md:pb-24` (pb gives constellation visual breathing room above the fixed bar).
- ConstellationFallback receives sub-copy text via a new prop or via an inline `<p className="sr-only">{t.game.subCopy}</p>` injected at top of its existing `<ol>` block.
- Phase 16 SkillFilters `<YearRangeSlider>` is `max-w-[220px]` — survives bottom-bar repositioning unchanged.
- Filter bar `data-game-interactive` attribute already present (Phase 16 line 206) — just travels with the className change.

</specifics>

<deferred>
## Deferred Ideas

- **Collapsible/icon filter bar (Area A option 2)** — discoverability trade-off rejected; keep filters always-visible.
- **Right sidebar layout md+ (Area A option 3)** — adds responsive complexity; bottom-fixed wins on simplicity + game-UI feel.
- **Hide H1 entirely on mobile (Area B option 2)** — text-xl mobile + sub-copy in sr-only achieves the same vertical claim without losing visible identity.
- **Single-line "19 years · 26 skills" compression (Area B option 3)** — loses bilingual flexibility (currently 3-part template); revisit if `text-xl` still feels too heavy in UAT.
- **Fixed aspect-ratio slot (Area C option 2)** — leaves vertical whitespace on tall viewports; flex-1 fills better.
- **Mobile-specific DOM reorder (Area D option 1/2)** — bottom-fixed bar makes per-viewport stacking unnecessary; single DOM order wins.
- **Nav auto-hide on game-mode landing (Area D option 3)** — out of v3.9 scope; would touch Nav component (not in Phase 18 files_modified).
- **ExperienceCard fullscreen on mobile (Area D card variant)** — Phase 16 contract; v3.10+ candidate if UAT shows friction.
- **Centralize z-index scale into Tailwind config** — nice cleanup, defer to a "tech-debt" milestone.

</deferred>

---

*Phase: 18-above-the-fold-layout*
*Context gathered: 2026-06-08 via /gsd:discuss-phase 18 (default mode, 4 areas discussed across 7 single-question turns; 3 Implementer's Discretion zones marked for planner — z-index map, bottom padding offset, focus management).*
