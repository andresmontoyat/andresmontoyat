---
phase: 08-hero-photo-integration
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - index.html
  - scripts/process-hero-photo.js
  - src/components/Hero.js
  - src/index.css
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: fixed
fixed_at: 2026-05-16T16:47:30Z
fix_report: 08-REVIEW-FIX.md
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-15
**Depth:** standard
**Files Reviewed:** 4
**Status:** fixed (see `08-REVIEW-FIX.md` — all 6 warnings addressed; 5 Info findings deferred)

## Summary

Phase 8 wires `me.jpg` through a sharp pipeline into responsive WebP assets, preloads the hero image for LCP, and renders it as a full-bleed background behind the hero copy with a CSS-var-driven filter and overlay per theme. The pipeline is correct (EXIF stripped by omitting `.withMetadata()` in sharp 0.34; outputs `me-1600.webp` at 140 KB and `me-800.webp` at 49 KB — well under the 300/100 KB budgets) and the source path is hardcoded with no user-controlled input, so the privacy and security objectives hold.

The principal defects are around the LCP preload contract and light-mode legibility:

1. **Preload vs `<picture>` mismatch.** The preload's `imagesrcset` advertises both `800w` and `1600w` candidates against `imagesizes="100vw"`, so on a 1× mobile viewport the browser may select `me-800.webp` for preload while a 2×/3× mobile viewport selects `me-1600.webp`. The runtime `<picture>` element, however, uses `media="(max-width: 640px)"` to hard-pin mobile to `me-800.webp` regardless of DPR. On a high-DPR mobile this produces two distinct fetches (preload of `me-1600.webp` plus picture render of `me-800.webp`), defeating the LCP optimization and wasting ~140 KB on the constrained network the optimization was designed to protect.
2. **Light-mode hero overlay is too transparent at the top.** Light mode sets text-primary to near-black (`#0D0D1A`) and only tints the top of the photo with `rgba(250,250,250,0.3)` — the status badge and the first H1 line sit on a near-raw photo region, and the h1 `drop-shadow(rgba(0,0,0,0.25))` is dark-on-dark there, providing no contrast lift.
3. **`imagesizes` conditional is dead.** `(max-width: 640px) 100vw, 100vw` collapses to `100vw`.
4. **`<picture>` lacks responsive width descriptors.** Each `<source>` carries a single `srcSet` URL with no `w` descriptors, so the browser cannot DPR-scale within a source. Combined with item 1, this is the root cause of the preload/picture asset divergence.

In addition, the photo `<img>` is announced as content (`alt="Carlos Andres Montoya"`) while the H1 also names the subject, producing a duplicate announcement and a spelling drift from "Carlos Andrés Montoya Tobón" used elsewhere on the site.

No critical (security / data-loss / crash) issues were found.

## Warnings

### WR-01: Preload `imagesrcset` and `<picture>` source media query select different assets on high-DPR mobile

**File:** `index.html:7-14`, `src/components/Hero.js:60-72`

**Issue:** The preload tag advertises responsive candidates:
```html
imagesrcset="/me-800.webp 800w, /me-1600.webp 1600w"
imagesizes="(max-width: 640px) 100vw, 100vw"
```
With `100vw` on a 375 px viewport at DPR 3, the effective pixel target is 1125 px, so the preload resolver picks `/me-1600.webp`. The render-time `<picture>` element, however, uses a media-based selector that ignores DPR:
```jsx
<source media="(max-width: 640px)" srcSet="/me-800.webp" type="image/webp" />
<source srcSet="/me-1600.webp" type="image/webp" />
```
This pins the same mobile viewport to `/me-800.webp`. Net result on a typical iPhone: the LCP preload fetches the 140 KB desktop asset, then the picture element fetches the 49 KB mobile asset for actual display. Two fetches, ~190 KB instead of the intended 49 KB, and the preload does not warm the image that ends up painting LCP.

**Fix:** Make the two selectors agree. Easiest path is to drive both off DPR with `w` descriptors and let the browser choose:
```jsx
{/* Hero.js */}
<img
  src="/me-1600.webp"
  srcSet="/me-800.webp 800w, /me-1600.webp 1600w"
  sizes="100vw"
  alt=""
  fetchPriority="high"
  loading="eager"
  decoding="async"
  className="absolute inset-0 w-full h-full object-cover"
  style={{ objectPosition: 'center 30%', filter: 'var(--hero-photo-filter)' }}
/>
```
(drop the `<picture>` wrapper and matching `<source>` elements since both candidates are WebP). Then keep the preload as-is — the resolver will preload the same asset the renderer picks. Alternatively, keep `<picture>` but switch the mobile `<source>` to also expose both candidates with `w` descriptors so DPR-driven selection is consistent.

---

### WR-02: `imagesizes` conditional collapses to a constant

**File:** `index.html:12`

**Issue:** `imagesizes="(max-width: 640px) 100vw, 100vw"` — both branches resolve to `100vw`, so the media query is dead. This is harmless at runtime but signals that the responsive-image intent (mobile gets a different displayed size) was not actually expressed.

**Fix:** Either simplify or make the breakpoint meaningful. Given the hero is full-bleed at every breakpoint:
```html
imagesizes="100vw"
```

---

### WR-03: Preload `<link>` is missing `type="image/webp"`

**File:** `index.html:7-14`

**Issue:** The preload omits `type`, so browsers that do not support WebP (vanishingly rare today, but the explicit-type guard is the documented best practice for `as=image` preloads with image-format-specific candidates) will still issue the preload and either fail or fetch wastefully. More importantly, omitting `type` reduces the resource-hint specificity that Lighthouse/PageSpeed inspect when grading preload usage.

**Fix:**
```html
<link
  rel="preload"
  as="image"
  type="image/webp"
  href="/me-1600.webp"
  imagesrcset="/me-800.webp 800w, /me-1600.webp 1600w"
  imagesizes="100vw"
  fetchpriority="high"
/>
```

---

### WR-04: Light-mode hero overlay leaves dark H1 / badge text on a near-raw photo region

**File:** `src/index.css:81-85`, `src/components/Hero.js:80-117`

**Issue:** In light mode, `--color-text-primary` is `#0D0D1A` (near-black) and the hero overlay is `linear-gradient(180deg, rgba(250,250,250,0.3) 0%, rgba(250,250,250,0.85) 75%)`. The top 0–25 % of the section — exactly where the status badge and the first H1 line render — is overlaid with only 30 % white tint. The photo is filtered at `brightness(0.85)`, which is still close to full luminance, so the badge text (`text-text-secondary` = `#525269`) and `h1a` (`text-text-primary` = `#0D0D1A`) sit on essentially raw photo pixels. The H1's compensating shadow is `0 2px 8px rgba(0,0,0,0.25)` — a dark shadow under dark text — and contributes nothing to legibility in light mode. Real WCAG AA contrast against the photo is not guaranteed and is sensitive to the photo content.

**Fix:** Either lift the light-mode overlay floor so the top of the hero has a stronger white wash:
```css
[data-theme="light"] {
  --hero-overlay: linear-gradient(180deg, rgba(250,250,250,0.7) 0%, rgba(250,250,250,0.95) 75%);
  --hero-h1-shadow: 0 1px 2px rgba(255,255,255,0.8);  /* light shadow for dark text on photo */
}
```
or invert the shadow direction (light halo around dark text) and verify against an actual photo screenshot with the WCAG sampler.

---

### WR-05: Hero photo `alt` duplicates H1 content and drifts from canonical name

**File:** `src/components/Hero.js:65`

**Issue:** The photo carries `alt="Carlos Andres Montoya"` while the adjacent `<h1>` exposes `aria-label="${t.hero.h1a} ${t.hero.h1b} ${t.hero.h1c}"` which announces the same person. Screen-reader users get the name twice in a row. The alt text also omits the diacritic and the second surname used elsewhere on the site (`Carlos Andrés Montoya Tobón` in `index.html` title / OG tags), so even when announced it conflicts with the site's canonical spelling.

The photo functions as decorative background here — the headline already identifies Carlos and the photo is positioned full-bleed at `z-0`. Treating it as decorative is the cleaner accessibility model.

**Fix:**
```jsx
<img
  src="/me-1600.webp"
  alt=""               /* decorative background; identity is in the H1 */
  role="presentation"
  fetchPriority="high"
  loading="eager"
  decoding="async"
  ...
/>
```
If the photo must remain content (e.g., for image-search SEO), at minimum align the spelling with the rest of the site: `alt="Carlos Andrés Montoya Tobón"`.

---

### WR-06: `loading="eager"` is redundant and risks fighting `fetchPriority="high"` semantics

**File:** `src/components/Hero.js:67`

**Issue:** `loading="eager"` is the default for `<img>` outside the lazy-loading semantic and is only meaningful when overriding `loading="lazy"`. Combined with `fetchPriority="high"` on the same element, the explicit `eager` does nothing and obscures intent — the priority hint is the load-order signal, not `loading`. More importantly, when paired with the preload tag in `index.html`, the browser already promotes this image; the redundancy makes future readers think a lazy-default is being overridden.

**Fix:** Drop `loading="eager"`:
```jsx
<img
  src="/me-1600.webp"
  alt=""
  fetchPriority="high"
  decoding="async"
  ...
/>
```

## Info

### IN-01: Sharp re-runs are not guaranteed byte-identical across machines

**File:** `scripts/process-hero-photo.js:8-11`

**Issue:** The header docstring claims "Sharp is deterministic at fixed quality + width, so re-runs produce byte-identical output for the same source." libwebp's lossy encoder uses SIMD paths and (depending on `sharp.concurrency()`) multi-threaded tile encoding whose ordering may vary across CPUs / sharp builds, producing bit-different output for the same input. Outputs are visually identical, but the byte-identical claim is overstated and will create spurious diffs in CI verifications that hash the file.

**Fix:** Soften the claim or pin determinism explicitly:
```js
// Re-runs on the same machine + sharp version typically produce byte-identical
// output, but small encoder differences can appear across CPUs/sharp versions.
// Verify visually, not by SHA.
```
If byte-stability matters, call `sharp.concurrency(1)` at the top of the script.

---

### IN-02: `bg-hero-gradient` on the section is occluded by the full-bleed photo

**File:** `src/components/Hero.js:58`

**Issue:** The `<section>` carries `bg-hero-gradient`, but the immediately-following `<picture>` is `absolute inset-0` with an opaque `object-cover` `<img>` — the section background is never visible. This is dead style now that the photo replaces the gradient backdrop.

**Fix:** Either drop `bg-hero-gradient` from the section class list, or keep it intentionally as a fallback for the (now impossible) case where the WebP fails to load and document that intent in a sibling comment.

---

### IN-03: `<picture>` wrapper carries `absolute inset-0 z-0` but `<picture>` defaults to inline display

**File:** `src/components/Hero.js:60`

**Issue:** `<picture>` is `display: inline` by default; applying `absolute inset-0` does position it, but the inner `<img>` is itself `absolute inset-0 w-full h-full` and positions against the nearest positioned ancestor (the section), making the picture's own positioning a no-op. Either the wrapper positioning or the img positioning is redundant.

**Fix:** If keeping `<picture>` (see WR-01 for the alternative), drop positioning from the wrapper and let the `<img>` carry it:
```jsx
<picture>
  <source media="(max-width: 640px)" srcSet="/me-800.webp" type="image/webp" />
  <source srcSet="/me-1600.webp" type="image/webp" />
  <img className="absolute inset-0 z-0 w-full h-full object-cover" ... />
</picture>
```

---

### IN-04: `useCharReveal` does not re-evaluate `prefers-reduced-motion` mid-animation

**File:** `src/components/Hero.js:8-32`

**Issue:** The reduce-motion check is read once when the effect runs. If the user toggles the OS setting after mount, the timers keep firing. Low-likelihood scenario but worth a `matchMedia` listener if the project's a11y bar prefers live response.

**Fix:** Subscribe to the media query change:
```js
const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
const onChange = () => { if (mq.matches) { timersRef.current.forEach(clearTimeout); setText(target) } }
mq.addEventListener('change', onChange)
// remember to remove in cleanup
```

---

### IN-05: `min-h-screen` on the hero uses static viewport height; mobile URL bar can cause overscroll

**File:** `src/components/Hero.js:58`

**Issue:** Tailwind's `min-h-screen` resolves to `min-height: 100vh`. On mobile browsers with collapsible URL bars, `100vh` is the largest possible viewport, producing a section taller than the visible area at rest and a layout jiggle as the bar collapses. The `100dvh` (dynamic viewport) unit is now broadly supported and is the canonical fix. Out-of-scope for Phase 8 if pre-existing, but worth noting since the hero photo amplifies the perceived shift.

**Fix:** Add an arbitrary-value utility or a custom CSS rule:
```jsx
<section className="relative min-h-screen [min-height:100dvh] flex items-center ..." />
```

---

_Reviewed: 2026-05-15_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
