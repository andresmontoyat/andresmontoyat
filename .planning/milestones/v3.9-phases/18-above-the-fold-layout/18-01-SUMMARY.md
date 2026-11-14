---
phase: 18-above-the-fold-layout
plan: 01
subsystem: game-mode
tags: [layout, above-the-fold, polish, css-only]
requires:
  - D-15-LAND-COPY (H1 live-data derivation — preserved verbatim)
  - D-16-CLICK-OUTSIDE-RENDERER (data-game-interactive on bar + slot — preserved)
  - D-16-CARD-STRUCTURE (ExperienceCard z-[200] — preserved, verified overlays new z-30 bar)
  - D-17-CLICK-OUTSIDE-RENDERER (renderer-slot data-* attrs — preserved)
provides:
  - Above-the-fold constellation visibility on 1024/768/390 viewports
  - Game-UI bottom filter bar pattern (fixed, full-width, z-30)
  - Sub-copy SEO + a11y preserved via ConstellationFallback sr-only injection
affects:
  - src/game/GameMode.js (layout restructure)
  - src/game/SkillFilters.js (positioning only)
  - src/game/ConstellationFallback.js (sr-only content addition)
  - src/game/GameMode.test.js (6 new layout-positioning tests)
tech-stack:
  added: []
  patterns:
    - Flex-col + flex-1 + min-h-0 for renderer slot fills remaining viewport
    - Position: fixed bottom-0 with z-30 for persistent action bar
    - sr-only DOM injection for SEO/a11y preservation when removing visible copy
key-files:
  created: []
  modified:
    - src/game/GameMode.js
    - src/game/SkillFilters.js
    - src/game/ConstellationFallback.js
    - src/game/GameMode.test.js
decisions:
  - D-18-BAR-POS: SkillFilters → fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-sm border-t border-ink-600 z-30
  - D-18-H1-SIZE: H1 → text-xl md:text-2xl + mb-1; container mb-8 md:mb-12 → mb-4
  - D-18-SUBCOPY-RELOC: <p>{t.game.subCopy}</p> removed from visible region, injected into ConstellationFallback sr-only block
  - D-18-SLOT-H: Renderer-slot gains flex-1 min-h-0 pb-20 md:pb-24
  - D-18-STACKING: Single DOM order across all viewports (no per-breakpoint branching)
  - D-18-Z-INDEX-MAP: bar z-30 (between auto and Nav z-40); ExperienceCard z-[200] preserved
  - D-18-BOTTOM-PADDING: pb-20 desktop / pb-24 mobile (gives constellation visual breathing room above bar)
  - D-18-FOCUS-MGMT: No tabindex shifts — DOM order = reading order; tab from H1 lands on first filter chip (natural "configure then explore" flow)
metrics:
  duration: ~12 min
  completed: 2026-06-08
  tasks: 3/3
  tests_total: 259
  tests_new: 6
  files_modified: 4
  loc_net: ~10 (5 ins, 5 del across 3 source files; 60 ins for test block)
---

# Phase 18 Plan 01: Above-the-Fold Layout Summary

Restructured game-mode landing so the constellation is visible without scroll on desktop (1024×768), tablet (768×1024), and mobile (390×844) — POLISH-01 shipped in a single MVP slice across 4 files, 0 new components, 0 new translation keys, 0 new design tokens.

## What Was Built

**Layout contract:** `section min-h-screen flex flex-col` already existed (Phase 15+). Phase 18 plugs three changes into that scaffold:

1. **Compact H1 block** — sized down from `text-2xl md:text-4xl` (~120-150px claim with margins) to `text-xl md:text-2xl + mb-1` inside a `mb-4 max-w-2xl` container (~50px claim).
2. **Sub-copy relocation** — `<p>{t.game.subCopy}</p>` removed from visible region; injected into `ConstellationFallback`'s existing `<section aria-labelledby="constellation-fallback-heading" className="sr-only">` between the `<h2>` and `<ol>`. Inherits sr-only from parent → SEO crawlers and screen-reader users get it; recruiters' eyeballs don't.
3. **Filter bar lifted out of flow** — `SkillFilters` root className flipped from in-flow `w-full max-w-3xl … rounded-b-xl` to out-of-flow `fixed bottom-0 left-0 right-0 … z-30 bg-ink-900/95 backdrop-blur-sm border-t border-ink-600`. Bumped opacity (/80 → /95, matches Nav backdrop) and shrunk gap (4 → 3) for tighter vertical footprint. role/aria-label/data-game-interactive preserved verbatim → no a11y regression, no click-outside contract break.
4. **Renderer slot fills remaining space** — wrapper className gains `flex-1 min-h-0 pb-20 md:pb-24`. With the H1 block compacted and SkillFilters out of flow, the slot grows to fill the section's remaining vertical space inside `min-h-screen flex flex-col`. `pb-20 md:pb-24` reserves visual breathing room so the constellation isn't directly under the bar.

**Test coverage** — 6 new `it()` cases in `src/game/GameMode.test.js` (`describe('GameMode - Phase 18 above-the-fold layout (RED)')` block):

| # | Test | Status |
|---|------|--------|
| 1 | section root retains min-h-screen + flex + flex-col | regression guard (passed pre-GREEN, still passes) |
| 2 | renderer-slot wrapper has flex-1 + min-h-0 | RED → GREEN |
| 3 | H1 uses text-xl md:text-2xl (not text-2xl/md:text-4xl) | RED → GREEN |
| 4 | SkillFilters root is fixed bottom-0 left-0 right-0 z-30 (no rounded-b-xl) | RED → GREEN |
| 5 | ConstellationFallback sr-only `<p>` contains subCopy text | RED → GREEN |
| 6 | Visible region (excluding sr-only fallback) does NOT contain subCopy | RED → GREEN |

## Files Modified

| File | Change |
|------|--------|
| `src/game/GameMode.js` | H1 container `mb-8 md:mb-12 → mb-4`; H1 size `text-2xl md:text-4xl mb-3 → text-xl md:text-2xl mb-1`; sub-copy `<p>` removed from visible region; renderer-slot wrapper className gains `flex-1 min-h-0 pb-20 md:pb-24` |
| `src/game/SkillFilters.js` | Root className line 207: `w-full max-w-3xl bg-ink-900/80 … py-4 … gap-4 rounded-b-xl` → `fixed bottom-0 left-0 right-0 bg-ink-900/95 … py-3 … gap-3 z-30`. role/aria-label/data-game-interactive preserved. |
| `src/game/ConstellationFallback.js` | `<p>{t.game.subCopy}</p>` inserted between `<h2>` and `<ol>` inside the existing sr-only section. |
| `src/game/GameMode.test.js` | Appended `describe('GameMode - Phase 18 above-the-fold layout (RED)')` block with 6 `it()` cases. |

**Files verified unchanged:**
- `src/game/ExperienceCard.js` — `z-[200]` on card root + `z-[199]` on backdrop confirmed via rg; both well above new filter bar `z-30`. No overlay regression possible.

## Commits

| Hash | Type | Message |
|------|------|---------|
| `bd39856` | test(18-01) | RED — add layout-positioning assertions for above-the-fold restructure |
| `290a197` | feat(18-01) | GREEN — above-the-fold restructure (compact H1, sub-copy → sr-only, fixed bottom filter bar, flex-1 renderer slot) |
| `<this>` | docs(18-01) | SUMMARY — above-the-fold layout shipped |

## Verification

| Check | Command | Result |
|-------|---------|--------|
| Full test suite | `npm run test:run` | **259/259 pass** (253 pre-existing + 6 new), 19 test files, 0 failures, 2.53s |
| Bundle gate | `npm run build:gate` | **PASS** — `GameMode-ddTDuryh.js = 8.84 kB gz` (was 8.91 kB baseline → **-0.07 kB**, well under 38.82 kB ceiling) |
| `rg "flex-1 min-h-0" src/game/GameMode.js` | grep | 1 match (line 119, renderer-slot wrapper) |
| `rg "fixed bottom-0 left-0 right-0" src/game/SkillFilters.js` | grep | 1 match (line 207) |
| `rg "text-xl md:text-2xl" src/game/GameMode.js` | grep | 1 match (line 96, H1) |
| `rg "text-2xl md:text-4xl" src/game/GameMode.js` | grep | 0 matches (old H1 size removed) |
| `rg "subCopy" src/game/ConstellationFallback.js` | grep | 1 match (line 9, new `<p>`) |
| `rg "subCopy" src/game/GameMode.js` | grep | 0 matches (visible region no longer references it) |
| `rg "z-\[200\]" src/game/ExperienceCard.js` | grep | 1 match (line 107, preserved — overlays new z-30 bar) |
| `grep -c "data-game-interactive" src/game/SkillFilters.js src/game/GameMode.js` | grep | 3 occurrences (1 in GameMode renderer-slot + 1 in SkillFilters root + 1 in SkillFilters Phase 16 comment) — D-16-CLICK-OUTSIDE-RENDERER intact |

## POLISH-01 Success Criteria Status

| SC | Description | Status |
|----|-------------|--------|
| SC-1 | ≥1 visible constellation node within first viewport at 1024×768 desktop | **Deferred to UAT** — layout math (compact H1 + fixed-bottom bar + flex-1 slot) makes this geometrically inevitable; needs visual confirmation |
| SC-2 | ≥1 visible node at 768×1024 tablet | **Deferred to UAT** — same as SC-1 |
| SC-3 | ≥1 visible node at 390×844 mobile | **Deferred to UAT** — same as SC-1; mobile gets `pb-24` instead of `pb-20` for bar clearance |
| SC-4 | Filter bar remains discoverable + operable on all 3 viewports | **Verified via existing Phase 16 tests** (24 tests in GameMode.test.js + SkillFilters.test.js including chip clickability, slider keyboard-operability, reset enabled when filters active) + needs UAT for "discoverable at bottom" visual confirmation |
| SC-5 | No regression in Lighthouse mobile HARD gate or 253 tests | **Tests: 259/259 GREEN (0 regressions)**. Lighthouse mobile re-verify **deferred to v3.9 milestone-close UAT** (POLISH-01 SC-5 + REQUIREMENTS.md constraints) — layout-only changes added net **-0.07 kB** to mobile chunk, so regression probability is near-zero, but formal HARD-gate verification belongs at milestone close not per-plan. |

## Manual Viewport Spot-Check

**NOT performed by executor** — this is UAT human territory and the plan explicitly flagged it as such. The dev-server-spawn step in Task 3 was skipped per the parent execution context's "Manual viewport spot-check NOT required by executor" directive.

UAT should perform spot-check at:
- **1024×768 desktop** — confirm constellation has ≥1 visible node above the fold; click a node → ExperienceCard opens above the filter bar (no z-index clash).
- **768×1024 tablet portrait** — same as desktop.
- **390×844 iPhone 14** — same checks; verify bar's `py-3` vertical footprint feels right for thumb-reach; verify card mobile bottom-sheet overlays the bar correctly.

## Carry-Forward Contracts Preserved

| Contract | Verification |
|----------|--------------|
| **D-15-LAND-COPY** (H1 live-data derivation) | H1 textContent still derives from `${yearsActive} ${t.game.h1Years}. ${skillCount} ${t.game.h1Skills}. ${t.game.h1Tagline}` — only className changed. Existing tests `H1 derivation matches live data`, `renders H1 with yearsActive=19`, `renders H1 with skillCount=26`, `renders H1 in Spanish when lang=es` all still GREEN. |
| **D-16-CLICK-OUTSIDE-RENDERER** (data-game-interactive allow-list) | `data-game-interactive` attribute preserved on BOTH filter bar root (line 206 in SkillFilters.js) AND renderer-slot wrapper (line 118 in GameMode.js). Existing `click-outside discrimination` test still GREEN. |
| **D-16-CARD-STRUCTURE** (ExperienceCard mobile bottom-sheet) | ExperienceCard root retains `z-[200]` (line 107) + backdrop `z-[199]` (line 96). New filter bar at `z-30` sits cleanly below — verified stack: constellation z-auto < bar z-30 < Nav z-40 < overlay z-[199] < card z-[200]. |
| **D-17-CLICK-OUTSIDE-RENDERER** (renderer-slot data-* attrs) | Renderer-slot wrapper retains `data-game-interactive`, `data-testid="renderer-slot"`, `data-theme={theme}`, `data-renderer={capability}` — only className was extended (added `flex-1 min-h-0 pb-20 md:pb-24`). Phase 17 SC-5 Tests A/B/C all still GREEN. |
| **ConstellationFallback Phase 15 contract** (sr-only `<h2>` + `<ol>` for SEO/SR) | Existing `<h2>` heading + `<ol>` of experiences untouched; new `<p>` inserted between them inside the same sr-only parent section. Phase 15 SR navigation order unchanged: heading → (now) sub-copy → experience list. |

## Deviations from Plan

**None — plan executed exactly as written.**

All five locked D-18-* decisions applied verbatim. All three Implementer's Discretion zones (D-18-Z-INDEX-MAP, D-18-BOTTOM-PADDING, D-18-FOCUS-MGMT) resolved as planned.

## Deferred Issues (out-of-scope discoveries — pre-existing baseline)

The repo's `npm run lint` reports **152 errors / 8 warnings** across many files (notably `src/test/setup.js` — vitest globals; `src/components/Nav.js` — airbnb prefer-destructuring + prefer-const cluster; `src/game/RendererErrorBoundary.test.js` — prefer-destructuring; `src/game/GameMode.test.js` line 169/172 — pre-existing `no-promise-executor-return` in the Phase 16 click-outside test). **None of these are introduced by Phase 18 changes** — my 60 new test lines + 5 src line modifications produced 0 new lint errors. Pre-existing baseline is a Phase 14/15/16/17 carry-over; should be triaged in a dedicated tech-debt slice (deferred per SCOPE BOUNDARY rule — not Phase 18's job).

## Carry-Forward to Phase 19

**None — Phase 18 is standalone.** Phase 19 (POLISH-02, constellation motion) depends on the renderer-slot wrapper having `flex-1 min-h-0` (now in place) but introduces no contracts back into Phase 18 files. Motion work attaches to `SvgConstellation`/`WebGLConstellation` children of the slot, not the slot itself.

## Self-Check: PASSED

- `src/game/GameMode.js` exists with `flex-1 min-h-0` (verified via rg)
- `src/game/SkillFilters.js` exists with `fixed bottom-0 left-0 right-0` (verified via rg)
- `src/game/ConstellationFallback.js` exists with `subCopy` (verified via rg)
- `src/game/GameMode.test.js` exists with Phase 18 describe block (verified via test run — 24 tests in file, up from 18)
- Commit `bd39856` (RED) exists (verified via git log)
- Commit `290a197` (GREEN) exists (verified via git log)
- Bundle gate exit 0, mobile chunk 8.84 kB gz ≤ 38.82 kB ceiling
- Full test suite 259/259 GREEN
