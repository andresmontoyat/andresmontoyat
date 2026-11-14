---
phase: 08-hero-photo-integration
verified: 2026-05-12
status: passed
score: 5/5 success criteria fully verified by code
human_verified: pending  # Phase 10 owns visual + Lighthouse audit
re_verification: false
human_verification:
  - test: "Visual focal-point sanity — face stays in frame at iPhone 14 (390×844), Pixel 7 (393×873), iPad (768×1024), and 1440px+ desktop"
    expected: "object-position: center 30% keeps Carlos's face/upper-body visible; no head-crop at any viewport"
    why_human: "Visual cropping verification requires opening the browser at each breakpoint; code-level we only confirmed object-position token; CONTEXT decision-e mitigation requires Phase 10 visual sweep"
  - test: "Lighthouse mobile audit — Performance ≥ 95, LCP ≤ 2.5s, CLS = 0"
    expected: "Mobile Perf ≥ 95 (no regression from v3.4 baseline 98); LCP ≤ 2.5s on Slow-4G; CLS 0"
    why_human: "Requires running Lighthouse against a built/served site with throttling — code-level we verified payload (140 KB + 49 KB) is well under budget, preload link present, fetchPriority/loading/decoding set, absolute inset-0 prevents CLS — but only a real audit confirms scores"
  - test: "Light-mode photo legibility — confirm brightness(0.85) does not wash Carlos's face into a light overlay"
    expected: "Photo readable + cinematic in light mode; gradient overlay does not blow out face"
    why_human: "Subjective visual judgment; code-level we verified the CSS-var override values match CONTEXT decision-l verbatim, but the rendered look needs human eyes"
  - test: "Photo 404 fallback — temporarily rename public/me-1600.webp and verify bg-hero-gradient shows through"
    expected: "Section gracefully degrades to the v3.5 gradient treatment; no broken-image icon visible; layout intact"
    why_human: "Requires mutating file state and visually inspecting browser fallback — CONTEXT decision-j claims zero-JS layered fallback, which the layered DOM confirms structurally"
  - test: "drop-shadow + char-reveal animation GPU paint cost"
    expected: "No GPU paint thrashing during char-reveal at 60fps"
    why_human: "Requires DevTools performance profiler trace; mitigation path (fall back to text-shadow on h1a/h1c) is documented for Phase 10"
---

# Phase 8: Hero Photo Integration — Verification Report

**Phase Goal:** A visitor opening the site immediately sees Carlos's face as a cinematic full-bleed Hero background, with the existing headline + CTAs layered cleanly on top, in both dark and light themes — without regressing Lighthouse Performance below 95 mobile.

**Verified:** 2026-05-12
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (5 ROADMAP Success Criteria)

| # | Success Criterion | Status | Evidence |
|---|-------------------|--------|----------|
| 1 | `me.jpg` served from `public/me.jpg` (moved from root); no broken `public/` refs | ✓ VERIFIED | `public/me-1600.webp` (143,610 B) and `public/me-800.webp` (50,432 B) present at `public/`. Raw `me.jpg` gitignored at `.gitignore:33` (`git check-ignore -v me.jpg` exits 0). `dist/me-{800,1600}.webp` confirmed in build output; `dist/me.jpg` absent. The `<picture>` element in `Hero.js:60-72` references `/me-800.webp` and `/me-1600.webp` (resolves to `public/`), and preload link in `index.html:7-14` matches. The CONTEXT scope captures Variant C interpretation: the source `me.jpg` lives in repo root (gitignored) and the deployed assets are the WebPs in `public/`. |
| 2 | Hero renders photo as full-bleed bg with `filter: grayscale(0.2) brightness(0.35)` + gradient overlay; photo visible but doesn't compete with text | ✓ VERIFIED | `Hero.js:60-72` renders `<picture className="absolute inset-0 z-0">` with mobile + desktop `<source>` and a fallback `<img>` carrying `style={{ objectPosition: 'center 30%', filter: 'var(--hero-photo-filter)' }}`. Overlay `<div>` at `Hero.js:73-77` with `aria-hidden="true"`, `absolute inset-0 z-0 pointer-events-none`, `background: 'var(--hero-overlay)'`. CSS vars at `index.css:41-43` set dark-mode values exactly to CONTEXT decision-l: `grayscale(0.2) brightness(0.35)` and `linear-gradient(180deg, rgba(13, 13, 26, 0.4) 0%, rgba(13, 13, 26, 0.95) 75%)`. Content wrapper at `Hero.js:79` is `relative z-10` — properly layered above photo + overlay. |
| 3 | Existing Hero elements preserved: status badge w/ pulsing dot, char-reveal h1, role line, EN+ES CV CTAs, 4-stat grid | ✓ VERIFIED | `Hero.js:80-86` status badge with `animate-pulse2 shadow-[0_0_12px_var(--color-brand)]` dot. `Hero.js:88-117` char-reveal h1 with 3 spans (h1a white slide-up, h1b gradient char-reveal via `bg-clip-text text-transparent`, h1c white slide-up) and animation delays 150/300/500ms preserved. `Hero.js:119-124` role/lead paragraph. `Hero.js:126-150` flex container with 3 CTAs: `#contact` primary brand-gradient, `CV_Carlos_Montoya_EN.docx` download, `CV_Carlos_Montoya_ES.docx` download. `Hero.js:152-160` 4-stat grid (`years`, `team`, `companies`, `industries`) with `Stat` sub-component. All 8 animation stagger delays (0/150/300/500/650/800/950ms) preserved verbatim. |
| 4 | Headline text-shadow for legibility at all 4 breakpoints (iPhone 14, Pixel 7, iPad, 1440px+) | ✓ VERIFIED (code) / ⚠ HUMAN_NEEDED (visual) | `Hero.js:88-92` h1 element carries `style={{ filter: 'drop-shadow(var(--hero-h1-shadow))' }}` — CONTEXT decision-f honored: `drop-shadow` filter (not `text-shadow`) because h1b uses `bg-clip-text text-transparent` and `text-shadow` does not render on transparent text. The CSS var `--hero-h1-shadow` is theme-aware: dark = `0 2px 16px rgba(0, 0, 0, 0.55)` (`index.css:43`), light = `0 2px 8px rgba(0, 0, 0, 0.25)` (`index.css:84`). The Tailwind class `text-4xl sm:text-5xl lg:text-6xl` already covers responsive sizing. Visual breakpoint sweep deferred to Phase 10 per CONTEXT verification plan. |
| 5 | Image loads efficiently; Lighthouse Perf ≥ 95 mobile; no CLS | ✓ VERIFIED (code) / ⚠ HUMAN_NEEDED (Lighthouse) | Preload link at `index.html:7-14`: `rel="preload" as="image" href="/me-1600.webp" imagesrcset="/me-800.webp 800w, /me-1600.webp 1600w" imagesizes="(max-width: 640px) 100vw, 100vw" fetchpriority="high"`. `<img>` carries `fetchPriority="high" loading="eager" decoding="async"` at `Hero.js:66-68`. CLS prevention: `<picture>` is `absolute inset-0 z-0` and `<img>` is `absolute inset-0 w-full h-full object-cover` — pre-reserved space, no layout shift. Payload: 140 KB desktop + 49 KB mobile (well under 300/100 KB budget). Actual Lighthouse measurement deferred to Phase 10. |

**Score:** 5/5 truths verified by code.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `public/me-1600.webp` | Desktop WebP, ≤300 KB, 1600w | ✓ VERIFIED | 143,610 B (140.2 KB); `file(1)` confirms `RIFF Web/P VP8 1600x1202 YUV` |
| `public/me-800.webp` | Mobile WebP, ≤100 KB, 800w | ✓ VERIFIED | 50,432 B (49.3 KB); `file(1)` confirms `RIFF Web/P VP8 800x601 YUV` |
| `scripts/process-hero-photo.js` | Sharp pipeline, EXIF-stripped, re-runnable | ✓ VERIFIED | 77 lines; sharp 0.34 API; omits `.withMetadata()` for default-strip behavior (documented in inline comment lines 40-43); shebang + `npm run hero:process` script |
| `src/components/Hero.js` | `<picture>` + overlay + drop-shadow h1 + backdrop-blur stat-grid | ✓ VERIFIED | 164 lines; `<picture>` at 60-72; overlay div 73-77; h1 drop-shadow at 91; stat-grid `backdrop-blur-sm` at 153 |
| `src/index.css` | 3 new hero vars in `:root` + `[data-theme="light"]` | ✓ VERIFIED | Lines 41-43 (`:root`) and 82-84 (`[data-theme="light"]`); values match CONTEXT decision-l verbatim |
| `index.html` | preload link with imagesrcset + fetchpriority | ✓ VERIFIED | Lines 7-14; placed between `<meta name="viewport">` and `<meta name="theme-color">` |
| `.gitignore` | raw `me.jpg` ignored | ✓ VERIFIED | Lines 32-34 ignore `me.jpg` and `me.png`; `git check-ignore -v me.jpg` exits 0 |
| `package.json` | `sharp` devDep + `hero:process` script | ✓ VERIFIED | `sharp ^0.34.5` at line 36; `hero:process` script at line 21 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Hero.js` (`<picture>`) | `/me-{800,1600}.webp` | `<source srcSet=>` | ✓ WIRED | Lines 61-64; resolves to `public/` at runtime |
| `index.html` (preload) | `/me-{800,1600}.webp` | `imagesrcset` | ✓ WIRED | Line 11; parallel-fetches mobile asset alongside JS bundle |
| `Hero.js` h1 | `--hero-h1-shadow` | inline `style.filter` | ✓ WIRED | Line 91 reads `var(--hero-h1-shadow)`; defined at `index.css:43` (dark) + 84 (light) |
| `Hero.js` `<img>` | `--hero-photo-filter` | inline `style.filter` | ✓ WIRED | Line 70 reads `var(--hero-photo-filter)`; defined at `index.css:41` + 82 |
| `Hero.js` overlay `<div>` | `--hero-overlay` | inline `style.background` | ✓ WIRED | Line 76 reads `var(--hero-overlay)`; defined at `index.css:42` + 83 |
| `App.js` | `Hero` component | default import | ✓ WIRED | `App.js:6` imports, `App.js:36` renders `<Hero />` |
| `App.js` wrapper | `bg-grid-subtle` | className | ✓ WIRED | `App.js:32` retains `bg-hero-gradient bg-grid-subtle` on the app shell — Concern 1 honored (removed from Hero, kept at app level) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `Hero.js` `<img src>` | `/me-1600.webp` | Static file in `public/` (built into `dist/`) | Yes — 143,610-byte VP8 WebP confirmed on disk | ✓ FLOWING |
| `Hero.js` mobile `<source>` | `/me-800.webp` | Static file in `public/` | Yes — 50,432-byte VP8 WebP | ✓ FLOWING |
| `Hero.js` CSS-var filters | `--hero-*` tokens | `index.css` `:root` + `[data-theme="light"]` | Yes — concrete CSS values in both blocks | ✓ FLOWING |
| `Hero.js` translations | `t.hero.*`, `t.stats.*` | `LanguageContext` | Yes — pre-existing pattern, unchanged in Phase 8 | ✓ FLOWING |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | No TODO / FIXME / XXX / HACK / PLACEHOLDER | — | Clean |
| (none) | — | No `--no-verify` commits in range `6030823..640d76d` | — | Clean |
| (none) | — | No commented-out code in modified files | — | Clean |

8 commits in range (7 task + 1 docs), all Conventional-Commit prefixed, no hook-skipping.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HERO-01 | 08-01 | Integrate `me.jpg` into Hero via Variant C overlay full-bleed: WebP pipeline, `<picture>`, theme-aware filter/overlay/h1-shadow, preserve existing Hero elements, responsive across 4 breakpoints | ✓ SATISFIED | All 5 ROADMAP Success Criteria verified above; CONTEXT decisions a, e, f, j, l honored + auto-decided gray areas b/c/d/g/h/i/k/m all implemented |

### Locked Decisions Audit (13 — a through m)

| Decision | Locked Value | Verified |
|----------|--------------|----------|
| a — image optimization | sharp pipeline, 2 WebPs at 800/1600w q=82, EXIF stripped | ✓ Confirmed: 143 KB + 50 KB outputs, sharp 0.34.5 dep, EXIF stripped (default in sharp 0.33+) |
| b — pipeline | `scripts/process-hero-photo.js` + `npm run hero:process`, one-shot, deterministic | ✓ Script exists; npm script wired at package.json:21; idempotent (sharp deterministic at fixed quality) |
| c — responsive `<picture>` | mobile-first `<source media="(max-width:640px)">` + default desktop | ✓ Hero.js:61-62 |
| d — loading strategy | `fetchpriority="high"` + `loading="eager"` + `decoding="async"` on `<img>`; preload `<link>` in `<head>` with `imagesrcset` | ✓ Hero.js:66-68 + index.html:7-14 |
| e — object-position | uniform `center 30%` across viewports | ✓ Hero.js:70 inline style |
| f — h1 legibility | `drop-shadow` filter (not text-shadow) on entire `<h1>` via `--hero-h1-shadow` | ✓ Hero.js:91 |
| g — old hero-gradient + bg-grid-subtle | keep `bg-hero-gradient` as fallback; remove `bg-grid-subtle` div from Hero | ✓ `bg-hero-gradient` still on `<section>` at Hero.js:58; `bg-grid-subtle` count=0 in Hero.js; retained on App.js:32 wrapper |
| h — stat-grid + CTAs visibility | `backdrop-blur-sm` on stat-grid container | ✓ Hero.js:153 |
| i — mobile layout | `object-fit: cover` + `object-position: center 30%` for iPhone/iPad | ✓ Tailwind `object-cover` at Hero.js:69 |
| j — fallback strategy | layered DOM, zero-JS: `bg-hero-gradient` bottommost on section | ✓ Hero.js:58 retains `bg-hero-gradient` |
| k — alt text | hardcoded `"Carlos Andres Montoya"` (name doesn't translate) | ✓ Hero.js:65 |
| l — light mode | 3 CSS vars in `:root` + `[data-theme="light"]` with specific values | ✓ index.css:41-43 + 82-84 match exactly |
| m — EXIF strip | sharp `.withMetadata({exif:false})` (note: per SUMMARY, replaced with default-strip behavior in sharp 0.33+) | ✓ Documented in script lines 40-43; intent (no EXIF) preserved via sharp default behavior |

All 13 decisions honored. Decision-m note: the SUMMARY documents an in-flight fix — `.withMetadata({ exif: false })` threw `Expected object for exif but received false of type boolean` in sharp 0.34.5; the fix omits the call entirely because sharp 0.33+ strips metadata by default. Inline comment at `scripts/process-hero-photo.js:40-43` documents the rationale. Intent (EXIF-free outputs) preserved.

### Performance Budget Check

| Asset | Size | Budget | Headroom |
|-------|------|--------|----------|
| `public/me-1600.webp` | 140.2 KB | ≤ 300 KB | 47% under |
| `public/me-800.webp` | 49.3 KB | ≤ 100 KB | 50% under |
| Combined photo payload | 189.5 KB | — | well within Lighthouse mobile budget |

### Human Verification Required

5 items deferred to Phase 10 per CONTEXT verification plan (Phase 8 does not have an internal verification gate; Phase 7 paid the Phase 5 debt; Phase 10 owns the real-browser UAT sweep). See frontmatter `human_verification` block above.

### Gaps Summary

**None.** All 5 ROADMAP Success Criteria are satisfied by code-level evidence. The artifacts exist, are substantive, are wired, and the data they reference flows (static WebPs on disk, CSS-var tokens defined in both theme blocks, preload link present, translations untouched). 13 locked CONTEXT decisions are honored. Anti-pattern scan is clean. WebP payload is well under budget. The remaining items (visual sweep, Lighthouse audit) are explicitly handed to Phase 10 by both the CONTEXT verification plan and the SUMMARY hand-off section — not a Phase 8 gap.

---

*Verified: 2026-05-12*
*Verifier: gsd-verifier*
