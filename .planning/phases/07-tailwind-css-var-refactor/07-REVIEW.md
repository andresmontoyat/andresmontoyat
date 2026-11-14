---
phase: 07-tailwind-css-var-refactor
reviewed: 2026-05-15T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - scripts/og-template.html
  - src/components/Experience.js
  - src/components/Hero.js
  - src/index.css
  - tailwind.config.js
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: fixed
fixed_at: 2026-05-15T16:05:00Z
fixed_scope: critical+warning
fixes_applied:
  - id: WR-01
    commit: 24b44d1
    files: [src/index.css, tailwind.config.js]
    summary: bg-hero-gradient -> var(--bg-hero-gradient) with :root + [data-theme="light"] overrides
  - id: WR-02
    commit: 5ba6132
    files: [src/index.css, tailwind.config.js]
    summary: bg-brand-gradient + bg-card-gradient -> CSS vars; light uses WCAG-AA pair #2563EB / #047857
  - id: WR-03
    commit: dfbee63
    files: [src/index.css, tailwind.config.js]
    summary: shadow-brand/-lg/card -> CSS vars; light overrides use brand-on-light chroma + lower card alpha
  - id: WR-04
    commit: 02b476f
    files: [src/index.css]
    summary: '[data-theme="light"] { color-scheme: light } added so UA chrome flips with theme'
  - id: WR-05
    commit: 66d5c7c
    files: [src/components/Experience.js]
    summary: dropped /50 opacity suffix on hover:border-brand (Tailwind v2 PostCSS7-compat cannot synthesize alpha from CSS-var color)
fixes_skipped:
  - id: IN-01
    reason: out of scope (Info-only; severity_scope = critical+warning)
  - id: IN-02
    reason: out of scope (Info-only; severity_scope = critical+warning)
  - id: IN-03
    reason: out of scope (Info-only; severity_scope = critical+warning)
  - id: IN-04
    reason: out of scope (Info-only; severity_scope = critical+warning)
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-15
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 7's stated goal is that every brand/surface/accent token flips on theme change because `tailwind.config.js` now resolves color tokens through CSS variables. The `colors.*` section delivers on that promise cleanly, and the `Hero` pulsing-dot shadow + `Experience` timeline-dot ring/halo were correctly migrated to `var(--color-*)` arbitrary values — those two missed-surface BLOCKERs are genuinely closed.

However, the refactor stopped at `theme.extend.colors`. `theme.extend.backgroundImage` (`hero-gradient`, `brand-gradient`, `card-gradient`) and `theme.extend.boxShadow` (`brand`, `brand-lg`, `card`) still bake hardcoded `#3B82F6`, `#10B981`, `#12121F`, `#0D0D1A`, and matching `rgba(...)` literals directly into the generated CSS. These utilities are used across `App.js`, `Hero.js`, `Nav.js`, `Projects.js`, and `Claude.js` and will NOT flip in light mode — they are pinned to dark-mode chroma. This directly contradicts the phase truth "Clicking sun/moon flips every section." The verification report's grep-based audit missed it because it only scanned `theme.extend.colors`.

A few smaller issues round out the report: an `:root` `color-scheme: dark` declaration that prevents the UA from rendering native form controls / scrollbars in light style when light mode is active, a hover state in `Experience` that uses opacity-suffix syntax (`hover:border-brand/50`) which is unreliable for CSS-var-backed colors without Tailwind's `<alpha-value>` plumbing, and several inline keyed maps in `Experience.js` that use array index as React key. Quality items only — none are security or data-loss risks.

---

## Warnings

### WR-01: `bg-hero-gradient` uses hardcoded hex — does not flip in light mode

**File:** `tailwind.config.js:47`
**Issue:**
The Phase 7 truth is that every visible surface flips on theme toggle. `theme.extend.backgroundImage['hero-gradient']` is defined with literal hex (`#12121F`, `#0D0D1A`) and literal `rgba(59,130,246,0.15)`. Tailwind bakes these into the compiled CSS at build time, so they are NOT theme-aware. This utility is applied to the root `<div>` in `App.js:33` AND to the Hero `<section>` in `Hero.js:58` — the two largest visible surfaces in the app. In light mode the page-level background gradient and the Hero section background remain dark-blue → black, even though the user toggled to light. The phase 7 verification report ("All 8 sections flip cleanly") is a false positive for this surface; the human gate likely missed it because the photo + overlay (`--hero-overlay`) sits on top of the gradient and visually masks it.

**Fix:**
Move the gradient into a CSS variable defined per theme (same pattern already used successfully for `--hero-overlay`), then reference it from Tailwind:

```js
// tailwind.config.js
backgroundImage: {
  'hero-gradient': 'var(--bg-hero-gradient)',
  'brand-gradient': 'var(--bg-brand-gradient)',
  'card-gradient': 'var(--bg-card-gradient)',
},
```

```css
/* src/index.css */
:root {
  --bg-hero-gradient: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.15), transparent),
                      linear-gradient(180deg, #12121F 0%, #0D0D1A 100%);
}
[data-theme="light"] {
  --bg-hero-gradient: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.10), transparent),
                      linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%);
}
```

### WR-02: `bg-brand-gradient` uses hardcoded hex — does not flip in light mode

**File:** `tailwind.config.js:48`
**Issue:**
Same root cause as WR-01. `linear-gradient(135deg, #3B82F6 0%, #10B981 100%)` is baked at build time. Light mode requires `#2563EB` (brand) and `#047857` (accent) for WCAG AA — those values are already defined in `[data-theme="light"]` precisely because the bare `#3B82F6` / `#10B981` pair fails contrast on white. `bg-brand-gradient` is used in 6 places across `Hero.js` (text gradient + CTA button), `Nav.js` (active state), `Projects.js`, and `Claude.js` — in light mode the gradient stays at the dark-mode chroma, which means the CTA button text gradient and Nav-active pill will be the lighter `#3B82F6`/`#10B981` pair, not the AA-darkened pair. The WCAG AA guarantee documented in `07-VERIFICATION.md` row 4 does not hold for these utility classes.

**Fix:**
Wire `brand-gradient` (and `card-gradient`) to a `var(--bg-brand-gradient)` defined in both `:root` and `[data-theme="light"]` with the AA-darkened hex pair for light mode. See WR-01 fix block.

### WR-03: `shadow-brand`, `shadow-brand-lg`, `shadow-card` are not theme-aware

**File:** `tailwind.config.js:51-54`
**Issue:**
`boxShadow.brand` = `'0 20px 40px -20px rgba(59,130,246,0.35)'` and the `lg` variant use literal indigo-replacement rgba. `boxShadow.card` uses `rgba(13,13,26,0.6)` — pure ink-950 with 60% alpha, which is correct for dark mode but produces a near-black halo around cards in light mode (where the card sits on `#FAFAFA`). `shadow-brand` is applied to the Hero CTA (`Hero.js:132`) and to the Claude section CTA (`Claude.js:86`). In light mode these shadows stay at dark-mode hex, so the chroma mismatch between shadow and the AA-darkened `--color-brand` (#2563EB) becomes visible.

**Fix:**
Same pattern — move shadow definitions to CSS vars:

```js
boxShadow: {
  brand:     'var(--shadow-brand)',
  'brand-lg':'var(--shadow-brand-lg)',
  card:      'var(--shadow-card)',
},
```

```css
:root {
  --shadow-brand:    0 20px 40px -20px rgba(59,130,246,0.35);
  --shadow-brand-lg: 0 25px 50px -20px rgba(59,130,246,0.55);
  --shadow-card:     0 4px 24px rgba(13,13,26,0.6);
}
[data-theme="light"] {
  --shadow-brand:    0 20px 40px -20px rgba(37,99,235,0.30);
  --shadow-brand-lg: 0 25px 50px -20px rgba(37,99,235,0.45);
  --shadow-card:     0 4px 24px rgba(13,13,26,0.12);
}
```

### WR-04: `html { color-scheme: dark }` is hard-pinned — breaks native UI in light mode

**File:** `src/index.css:89`
**Issue:**
`color-scheme: dark` is declared unconditionally inside `html`. This is the CSS property the UA reads to decide whether to draw scrollbars, form controls, autofill backgrounds, and the page-default background in dark or light style. When the user toggles to light mode via the `[data-theme="light"]` attribute, this declaration is NOT overridden, so:
- Browser scrollbars stay dark.
- `<input>` autofill yellow stays in dark-mode tint.
- The pre-paint background (before React mounts and before CSS vars resolve) flashes dark.

The fix is one line and is part of every theme-toggle setup that uses CSS vars.

**Fix:**
```css
html {
  scroll-behavior: smooth;
  color-scheme: dark;
}
[data-theme="light"] {
  color-scheme: light;
}
```
(Place the override inside the same block where `--color-ink-950` is redefined, or as a sibling rule — both work.)

### WR-05: `hover:border-brand/50` opacity-suffix on CSS-var color is unreliable

**File:** `src/components/Experience.js:58`
**Issue:**
`hover:border-brand/50` asks Tailwind to apply `border-color: var(--color-brand) with 50% alpha`. Tailwind implements this by rewriting the color to `rgb(<r> <g> <b> / 0.5)` — which requires the color to be declared as a space-separated triplet (e.g. `--color-brand: 59 130 246`) and the Tailwind config to read it via `rgb(var(--color-brand) / <alpha-value>)`. The current `tailwind.config.js` uses `var(--color-brand)` directly resolving to `#3B82F6`. With that shape, the `/50` opacity suffix silently produces `border-color: #3B82F680` only on browsers that accept the 8-digit hex form (most do, but it's an undocumented Tailwind behavior depending on version) — and worse, on the light-mode value `#2563EB` it should produce `#2563EB80`. Quick local test will tell which way it falls in this CRA + Tailwind v2 (PostCSS7-compat) build; if Tailwind v2 cannot synthesize an 8-digit hex from `var(...)`, the border simply will not show on hover. Either way the value is fragile under a theme swap.

**Fix:**
Either (a) drop the `/50` opacity suffix and use a dedicated CSS var, or (b) restructure tokens to channel-triplet form. Option (a) is one line:

```jsx
// Experience.js:58
className="bg-ink-500 border border-ink-400 rounded-xl p-6 hover:border-brand transition-colors duration-200"
```

If you want a transparent hover border on purpose, define `--color-brand-50: rgba(59,130,246,0.5)` (light: `rgba(37,99,235,0.5)`) and reference it through a Tailwind extension like `brand-50: 'var(--color-brand-50)'`.

---

## Info

### IN-01: React keys use array index in two timeline loops

**File:** `src/components/Experience.js:93`
**Issue:**
`{job.bullets[lang].map((b, j) => <li key={j}>…</li>)}` — `j` is the array index. The project instructions notes that `react/no-array-index-key` is disabled in this codebase, so this is a tolerated style; calling it out so future refactors that allow reordering bullets (or filtering them) don't introduce a subtle reconciliation bug.
**Fix:** If bullets are stable, leave as-is. If they ever change order, switch to a content-based key (`key={b.slice(0, 32)}` or a hash) — or accept array index and document why.

### IN-02: Light-mode `--color-text-muted` 4.74:1 on `--color-ink-700` is marginal AA

**File:** `src/index.css:78`
**Issue:**
Comment claims `#646478` is `5.78:1 on white, 4.74:1 on surface-raised — WCAG AA`. WCAG 2.1 AA for normal text requires ≥ 4.5:1 — `4.74:1` is over the threshold by 0.24, which is technically passing but inside the contrast checker's rounding margin. `text-text-muted` on `bg-ink-700` is used in `Experience.js:61` for the company chip. Consider darkening to `#5F5F73` (~5.0:1 on `#E8E8F0`) to leave headroom.
**Fix:**
```css
[data-theme="light"] {
  --color-text-muted: #5F5F73; /* 5.0:1 on #E8E8F0, 6.4:1 on white */
}
```

### IN-03: Legacy `--color-surface-*` aliases live in `:root` but have no Tailwind consumer

**File:** `src/index.css:17-20, 57-60`
**Issue:**
The four `--color-surface-{deepest,deep,mid,raised}` aliases are declared in both `:root` and `[data-theme="light"]` "for Phase 5 backward compat." A grep across `src/` and `scripts/` shows the only consumer is `body { background-color: var(--color-surface-deepest) }` at `index.css:93`. No `.surface-*` Tailwind utility, no inline `var(--color-surface-*)` reference anywhere else. The aliases are technically harmless but they're 8 lines of dead surface area that obscure the canonical token graph.
**Fix:**
Either delete the four `surface-*` aliases and change the body declaration to `background-color: var(--color-ink-950)`, or document in `07-CONTEXT.md` that the aliases are intentionally retained for an upcoming phase. Dead tokens age into confusion.

### IN-04: `og-template.html` font-face paths resolve via `../node_modules` — fragile under monorepo or deploy

**File:** `scripts/og-template.html:12,19,26,33,40`
**Issue:**
Out of CSS-var scope per the phase decision, but worth noting: each `@font-face` `src: url('../node_modules/@fontsource/inter/files/inter-latin-XXX-normal.woff2')` is a relative path that only resolves when the template is rendered from `scripts/`. If `scripts/generate-og-image.js` is ever moved, or if the project becomes a workspace member (hoisted `node_modules`), the relative `../node_modules/...` URL breaks silently — Playwright will render the page with the system font fallback (`system-ui, sans-serif`) and the OG image will visually drift from the locked design. The current behavior is fine; just a tripwire for future restructures.
**Fix:**
At render time, inject the resolved absolute path into the template, or pre-bundle the woff2 files into `scripts/` so the template carries its own copy. No change required for Phase 7.

---

## Notes on scope

- `scripts/og-template.html` was confirmed out of the CSS-var pipeline per locked decision (d) — none of the hex literals there are flagged as bugs. IN-04 is purely a fragility note about font path resolution, unrelated to the color-token refactor.
- The Hero `style={{ filter: 'var(--hero-photo-filter)' }}` and overlay `style={{ background: 'var(--hero-overlay)' }}` patterns are correct and theme-aware — they fix a real cross-theme issue and are the model the gradient/shadow utilities in `tailwind.config.js` should follow.
- The `Experience.js:56` timeline-dot shadow (`shadow-[0_0_0_3px_var(--color-ink-950),0_0_8px_var(--color-brand-muted)]`) is correctly theme-aware on both layers — Phase 5 BLOCKER genuinely closed.
- Performance issues are out of scope for v1 reviews and were not evaluated.

---

_Reviewed: 2026-05-15_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
