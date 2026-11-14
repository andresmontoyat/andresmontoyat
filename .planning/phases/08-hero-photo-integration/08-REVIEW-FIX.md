---
phase: 08-hero-photo-integration
fixed_at: 2026-05-16T16:47:30Z
review_path: .planning/phases/08-hero-photo-integration/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-05-16T16:47:30Z
**Source review:** .planning/phases/08-hero-photo-integration/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (Critical + Warning)
- Fixed: 6
- Skipped: 0

The Phase 8 review identified zero critical and six warning findings, all clustered on two themes: (1) LCP preload / render asset divergence on high-DPR mobile (WR-01/02/03/05/06 in `index.html` + `src/components/Hero.js`) and (2) light-mode hero overlay legibility (WR-04 in `src/index.css`). All six warnings were fixed in atomic commits. Five Info findings (IN-01 through IN-05) are out of scope per `severity_scope: critical+warning` and are left for the developer's discretion.

## Fixed Issues

### WR-01: Preload `imagesrcset` and `<picture>` source media query select different assets on high-DPR mobile

**Files modified:** `src/components/Hero.js`
**Commit:** cf7033d
**Applied fix:** Replaced the `<picture>` wrapper + two `<source>` elements (one media-pinned to `(max-width: 640px)`, one default) with a single `<img>` that carries `srcSet="/me-800.webp 800w, /me-1600.webp 1600w"` and `sizes="100vw"`. The preload `<link>` in `index.html` already advertises the same `imagesrcset` and `imagesizes`, so browsers now resolve the same width-descriptor candidate at preload time and at render time — eliminating the double-fetch on high-DPR mobile. Kept `src="/me-1600.webp"` as the non-srcSet fallback and moved `z-0` onto the `<img>` itself (the wrapper had been carrying it).

### WR-02: `imagesizes` conditional collapses to a constant

**Files modified:** `index.html`
**Commit:** 747f99f
**Applied fix:** Replaced `imagesizes="(max-width: 640px) 100vw, 100vw"` with `imagesizes="100vw"`. The hero photo is full-bleed at every breakpoint, so a single `100vw` slot accurately expresses the intent and removes the dead media-query branch.

### WR-03: Preload `<link>` is missing `type="image/webp"`

**Files modified:** `index.html`
**Commit:** 4976d5f
**Applied fix:** Added `type="image/webp"` between `as="image"` and `href` on the preload `<link>`. This makes Lighthouse / PageSpeed score the preload as a properly typed resource hint and guards against fetching the WebP on the (vanishingly rare) browsers that lack WebP support.

### WR-04: Light-mode hero overlay leaves dark H1 / badge text on a near-raw photo region

**Files modified:** `src/index.css`
**Commit:** ebb98a2
**Applied fix:** Strengthened the light-mode hero overlay top alpha from `0.3` to `0.7` (and floor `0.85` to `0.95`) so the top 0-25% of the hero — where the status badge and the first H1 line render — sits on a strong white wash rather than near-raw photo pixels. Flipped `--hero-h1-shadow` from `0 2px 8px rgba(0,0,0,0.25)` (dark blur, no contrast lift under dark text) to `0 1px 2px rgba(255,255,255,0.8)` (tight light halo, lifts dark text over any residual photo luminance). Both edits live inside the existing `[data-theme="light"]` block that Phase 7 fixes established for theme-aware vars — no new vars, no new selectors.

### WR-05: Hero photo `alt` duplicates H1 content and drifts from canonical name

**Files modified:** `src/components/Hero.js`
**Commit:** f5d21ae
**Applied fix:** Changed `alt="Carlos Andres Montoya"` to `alt=""`. The headline already announces Carlos via `aria-label="${t.hero.h1a} ${t.hero.h1b} ${t.hero.h1c}"` and the photo functions as a full-bleed background, so treating it as decorative is the cleaner a11y model. This also sidesteps the spelling drift (`Carlos Andres Montoya` vs. the canonical `Carlos Andrés Montoya Tobón` used in title / OG / meta tags).

### WR-06: `loading="eager"` is redundant and risks fighting `fetchPriority="high"` semantics

**Files modified:** `src/components/Hero.js`
**Commit:** 72a53d6
**Applied fix:** Removed `loading="eager"` from the hero `<img>`. The eager default already applies (the attribute is only meaningful when overriding `loading="lazy"`), and `fetchPriority="high"` is the canonical load-order hint. The preload `<link>` continues to warm the resource ahead of the parser reaching the `<img>`.

## Skipped Issues

None — all six warnings were fixed.

---

_Fixed: 2026-05-16T16:47:30Z_
_Fixer: gsd-code-fixer_
_Iteration: 1_
