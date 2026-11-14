---
quick_id: 261114-hio
type: quick
branch: fix/site-audit-2
---
# Site audit follow-ups (2026-11-14)

Owner approved all recommendations from the production audit. One commit per item, on `fix/site-audit-2` (off main 289f37f).

## Task 1 — CSP hashes match production
- Add the production Vercel Analytics inline hash `sha256-86z015raVynkAZPYwBhv1h6VajgaxBEo4MY2eXKkJYU=` to `script-src` in `vercel.json`.
- Make `scripts/csp-hashes.mjs` hash a production build (`astro build` output in `dist/`, what Vercel serves) instead of whatever differs locally; document how to verify against the live site (fetch inline scripts from production and compare). Remove hashes no longer present in a production build only if verified.
- Verify: production-mode build, Playwright with the policy injected as enforcing → 0 violations on /en/ and /es/.
- Commit: `fix(security): csp hashes from the production build`

## Task 2 — Personal data
- Remove the phone number from the page and from the Person structured data (`src/data/contact.json`, `src/layouts/BaseLayout.astro`, Contact component, tests). Email and LinkedIn stay.
- Delete `public/Profile.pdf` (unlinked). Check nothing references it.
- Commit: `fix(privacy): drop phone number and unlinked Profile.pdf`

## Task 3 — Recruiter first impression
- Pixel font (Press Start 2P) only on section titles (h1/h2) and small eyebrow labels; body copy, intros, card text, metadata in Inter. Audit every `font-pixel` use; intros like Projects `font-pixel text-[11px]` become Inter text-base. Pixel font has no accented glyphs: any font-pixel text containing á é í ó ú ñ must render correctly (switch to Inter or confirm glyphs).
- Experience cards: show at most 6 tech tags, then a "+N" chip; do NOT delete data from `experience.json` (the game and CV read it). Keep order (first = most relevant).
- Commit: `feat(ui): pixel font for titles only, cap experience tags at 6`

## Task 4 — Theme follows the system
- First visit with no stored choice: follow `prefers-color-scheme` (inline/external theme-init script in BaseLayout / public/js/theme-init.js, and ThemeToggle initial state). A stored choice still wins. No flash, no hydration warning.
- Tests for ThemeToggle/theme-init.
- Commit: `feat(theme): default to the system color scheme`

## Verification
- `npx vitest run` green (722 baseline + new tests).
- Production build + `astro preview` + Playwright: no console errors, CSP enforcing injected → 0 violations, theme default light when emulating light scheme and dark when dark, no phone in HTML, hero/sections screenshots at 390 and 1440 in both themes, reviewed visually.
- Lighthouse mobile /en/ and /es/: Perf ≥ 0.95, A11y = 1, SEO = 1 (BP 0.96 locally is the known analytics 404).
- Node: Astro 7.4 needs ≥22.23.4 → use `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. Lockfile changes only via `npx npm@11`.
- No AI attribution: both greps empty (`git log main..HEAD --format='%B' | grep -inE 'claude|anthropic|co-authored'`, `git diff main..HEAD | grep -inE '^\+.*(claude|anthropic)'`; existing Claude.astro file headers are fine).
