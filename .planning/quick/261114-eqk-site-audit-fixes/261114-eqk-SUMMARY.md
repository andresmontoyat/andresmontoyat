---
status: complete
plan: 261114-eqk
branch: fix/site-audit
---

# Site audit fixes - Summary

8 commits on `fix/site-audit` (not pushed): 11e84fe deps, 32ebaea fonts, ccc9b7f security, ec53e63 hero lead, 0521fcc perf, 7090c8f pager, 0d81fd3 a11y, 23ddce8 tap targets.

## Results
- vitest: 722/722 (68 files) after every commit.
- Lighthouse mobile (local preview, 3 runs): /en/ 0.96/0.96/0.96, /es/ 0.96/0.96/0.96; A11y 1, SEO 1, BP 0.96 (local-only: /_vercel/insights 404; main also scores 0.96). Desktop /en/ and /es/: perf 1, A11y 1, SEO 1, BP 0.96.
- Hero lead worst-case contrast over photo: dark 5.95 (390) / 6.89 (1440); light 11.79 / 12.53.
- CSP (enforcing variant injected via Playwright): 0 securitypolicyviolation events on /en/ and /es/.
- Tap targets at 390: logo, Expand, date toggles, View Live all >= 24px. Skip link is first Tab stop. Pager hidden below md.

## Decisions / deviations
- Astro 7.4.x requires Node >=22.23.4; installed 22.23.2 cannot build. Builds/Lighthouse run on Node 24.22.1; engines.node raised to >=22.23.4.
- Inter weights: shipped 400/800 only, bold/semibold remapped to extrabold. Self-hosting 600/700 cost ~0.3s LCP (perf 0.97 -> 0.94), so rejected. Press Start 2P preload likewise dropped.
- Item 4: LCP element is the hero photo (already no opacity entrance). Perf commit instead defers ga-init.js (render-blocking) and the lead lost its opacity entrance in the lead commit.
- Inline scripts (island runtime, details-dismiss, analytics) allowed by sha256 in CSP; `scripts/csp-hashes.mjs` regenerates them after upgrades. `/_vercel/insights` removed from connect-src (invalid CSP source; covered by 'self').
- Footer GitHub badge text 'gh' -> 'git' so visible text is contained in its aria-label.
