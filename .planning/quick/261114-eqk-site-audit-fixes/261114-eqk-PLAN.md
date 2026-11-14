---
phase: quick-261114-eqk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - vercel.json
  - src/layouts/BaseLayout.astro
  - public/js/theme-init.js
  - public/js/ga-init.js
  - src/components/astro/Hero.astro
  - src/components/react/SectionPager.jsx
  - src/index.css
  - src/components/react/Nav.jsx
  - src/components/react/Experience.jsx
  - src/components/astro/Contact.astro
  - src/components/astro/Projects.astro
  - package.json
  - package-lock.json
autonomous: true
requirements: [AUDIT-1, AUDIT-2, AUDIT-3, AUDIT-4, AUDIT-5, AUDIT-6, AUDIT-7, AUDIT-8, AUDIT-9]

must_haves:
  truths:
    - "Production responses carry CSP-Report-Only, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY, COOP, HSTS; existing Cache-Control blocks unchanged"
    - "Hero lead is Inter 16-18px, max ~60ch, text-text, contrast >= 4.5:1 in dark+light at 390 and 1440"
    - "Hero LCP element never starts at opacity 0; mobile Lighthouse perf >= 0.95 on /en/ and /es/"
    - "SectionPager covers no content at 390px"
    - "No faux bold: font-pixel uses weight 400; Inter weights used are shipped self-hosted or classes mapped to shipped weights"
    - "Skip link is first focusable and targets main#main; lang pills use aria-current; aria-labels contain visible text; global :focus-visible outline visible in both themes"
    - "Logo, Expand buttons, date toggles, View Live are >= 24px tall at 390px"
    - "astro >= 7.4.7 in lockfile"
  artifacts:
    - path: vercel.json
      contains: "Content-Security-Policy-Report-Only"
    - path: src/layouts/BaseLayout.astro
      contains: "id=\"main\""
  key_links:
    - from: vercel.json CSP
      to: BaseLayout inline/external scripts
      via: "script-src 'self' (externalized scripts) or sha256 hashes"
---

<objective>
Fix the 9 findings of the 2026-11-14 production audit on branch `fix/site-audit`, one atomic conventional commit per item (items 2+3 share one commit).
Output: 8 commits, all gates green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
Audit evidence + reusable scripts (audit.mjs, px.mjs, top.mjs, lighthouse json): /private/tmp/claude-501/-Users-andres-Library-Mobile-Documents-com-apple-CloudDocs-Development-repositories-nosync-codehunters-sites-andresmontoyat/a938a045-e050-48e6-9aa8-102c2cb46ecd/scratchpad/site-audit/
Node: prefix every command with PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH. Playwright: node_modules/playwright/index.js. Check .claude/skills/verify/SKILL.md if present and follow it.

HARD RULES: no AI attribution anywhere (no Co-Authored-By/tool trailers, no tool names in commits or docs, never add CLAUDE.md/.claude/.mcp.json/AGENTS.md to tracked files or .gitignore). Conventional commits. Do NOT push. Before finishing run:
git log main..HEAD --format='%B' | grep -inE 'claude|anthropic|co-authored'  (must be empty)
git diff main..HEAD | grep -inE '^\+.*(claude|anthropic)'  (must be empty)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Platform — astro bump, security headers, fonts (items 9, 1, 6)</name>
  <files>package.json, package-lock.json, vercel.json, src/layouts/BaseLayout.astro, public/js/theme-init.js, public/js/ga-init.js, src/index.css, src/components/astro/Hero.astro</files>
  <action>
Item 9 (commit `fix(deps): bump astro to 7.4.7+ for GHSA-mh32-jxcr-mh9f`): set astro to ^7.4.7 (or latest 7.x patch) and regenerate lockfile with `npx npm@11 install` (npm 10.9.8 crashes with edgesOut). Run `npx vitest run` and `npm run build` before committing.

Item 1 (commit `fix(security): add security headers in vercel.json`): add a headers entry for source "/(.*)" with Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' https://www.googletagmanager.com https://va.vercel-scripts.com; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com /_vercel/insights; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'. Prefer moving the inline theme script and GA bootstrap in BaseLayout.astro (~113-140) to public/js/theme-init.js and public/js/ga-init.js loaded via `is:inline src=` (theme script stays synchronous in head to avoid FOUC); if any inline script must remain, add its sha256 to script-src instead. Also: X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy "camera=(), microphone=(), geolocation=()", X-Frame-Options DENY, Cross-Origin-Opener-Policy same-origin, Strict-Transport-Security "max-age=63072000; includeSubDomains". Keep existing Cache-Control blocks byte-for-byte. Validate: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`. Since `astro preview` does not apply vercel.json headers, verify CSP by injecting the same policy as a meta/route header in a Playwright run (page.route adding the header) and assert zero `securitypolicyviolation` events and zero console errors on /en/ and /es/.

Item 6 (commit `fix(fonts): remove faux bold and ship used Inter weights`): set font-weight: 400 on every font-pixel usage (src/index.css ~263-269 and ~499 heading rules, Hero.astro:60 and any `font-pixel` combined with font-bold/extrabold/semibold — grep `font-pixel` across src). For Inter: grep used weights; either add self-hosted woff2 for 600/700 (same @font-face pattern as existing 400/800) or remap font-semibold/font-bold usages on Inter text to 400/800 — choose self-hosting if woff2 files obtainable via existing font source, else remap; document choice in commit body. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Press Start 2P file in BaseLayout head since hero uses it above the fold.
  </action>
  <verify><automated>PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH sh -c 'node -e "JSON.parse(require(\"fs\").readFileSync(\"vercel.json\",\"utf8\"))" && npx vitest run && npm run build && node -e "const v=require(\"./node_modules/astro/package.json\").version;const [a,b,c]=v.split(\".\").map(Number);if(a<7||(a==7&&(b<4||(b==4&&c<7))))process.exit(1)"'</automated></verify>
  <done>3 commits; astro >= 7.4.7; vercel.json valid with all 7 headers + original Cache-Control; no CSP violations from own scripts; no computed font-weight != 400 on font-pixel elements.</done>
</task>

<task type="auto">
  <name>Task 2: Hero — lead readability/contrast and LCP (items 2+3, 4)</name>
  <files>src/components/astro/Hero.astro, src/index.css</files>
  <action>
Items 2+3 (commit `fix(hero): readable lead paragraph with AA contrast`): Hero.astro:89 lead paragraph — replace `font-pixel text-[11px] sm:text-xs text-muted` with `font-sans text-base sm:text-lg leading-relaxed max-w-[60ch] text-text`. Re-measure contrast over the photo with the audit scripts (px.mjs) in dark and light at 390 and 1440; if any < 4.5:1, darken/lighten the hero overlay gradient (or add a scrim behind the text block) per theme until worst-case >= 4.5:1. Update Hero tests if they assert classes.

Item 4 (commit `perf(hero): render LCP element without opacity entrance`): identify the LCP element (from audit lighthouse json; likely the hero image or heading/lead). Remove `motion-safe:opacity-0 animate-slide-up` + delay from it; if an entrance is kept, use a transform-only keyframe (translateY only, no opacity) or none. Other non-LCP hero elements may keep their animation. Run Lighthouse mobile on /en/ and /es/ against `astro preview`; perf must be >= 0.95 (re-run up to 3x, take median). If still below, check LCP image has fetchpriority="high", no lazy loading, correct sizes.
  </action>
  <verify><automated>PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH sh -c 'npx vitest run && npm run build' ; then Playwright contrast script from scratchpad/site-audit at 390/1440 both themes >= 4.5 and Lighthouse mobile perf >= 0.95</automated></verify>
  <done>2 commits; contrast >= 4.5:1 in all 4 combos; LCP element computed opacity is 1 at first paint; Lighthouse mobile perf >= 0.95 /en/ and /es/.</done>
</task>

<task type="auto">
  <name>Task 3: Layout and a11y — pager, a11y fixes, tap targets (items 5, 7, 8)</name>
  <files>src/components/react/SectionPager.jsx, src/layouts/BaseLayout.astro, src/components/react/Nav.jsx, src/components/astro/Contact.astro, src/index.css, src/components/react/Experience.jsx, src/components/astro/Projects.astro</files>
  <action>
Item 5 (commit `fix(pager): hide section pager below md`): SectionPager.jsx ~138 add `hidden md:flex` (or equivalent) to its root; update its test. Verify with top.mjs at 390 that no content element (incl. Quick facts values) is covered.

Item 7 (commit `fix(a11y): skip link, aria-current, label names, focus ring`): BaseLayout — first body child an `<a href="#main" class="sr-only focus:not-sr-only ...">` with translated text ("Skip to content"/"Saltar al contenido") and wrap content in `<main id="main" tabindex="-1">` (reuse existing main if present, just add id). Nav.jsx:151,159 — replace aria-pressed with aria-current="true" (or "page") on the active pill; make aria-label start with/contain the visible text (or drop aria-label). Contact.astro cards — aria-label must include visible text, or remove aria-label. src/index.css — global `:focus-visible { outline: 2px solid var(--accent-token); outline-offset: 2px; }` using the accent token visible in both themes; remove the hero CTA override that yields #0B1020 on dark. Update Nav/Contact tests.

Item 8 (commit `fix(a11y): enlarge tap targets to 24px`): Nav.jsx logo link, Experience.jsx Expand buttons and date toggles, Projects.astro View Live — add `inline-flex items-center min-h-[24px]` (py padding acceptable) without changing visual style meaningfully. Measure with Playwright at 390 that each bounding box height >= 24.
  </action>
  <verify><automated>PATH=~/.nvm/versions/node/v22.23.2/bin:$PATH sh -c 'npx vitest run && npm run build' ; then astro preview + Playwright: Tab once focuses skip link, pager hidden at 390 with no covered elements, all 4 tap targets >= 24px, zero console errors; Lighthouse mobile /en/ /es/ A11y/BP/SEO = 1 and desktop a11y = 1</automated></verify>
  <done>3 commits; all checks pass.</done>
</task>

</tasks>

<threat_model>
| Threat ID | Category | Component | Disposition | Mitigation |
|-----------|----------|-----------|-------------|------------|
| T-q-01 | Tampering/XSS | site scripts | mitigate | CSP report-only with externalized/hashed scripts, object-src none |
| T-q-02 | Spoofing (clickjacking) | all pages | mitigate | X-Frame-Options DENY + frame-ancestors 'none' |
| T-q-03 | Info disclosure | referrer | mitigate | strict-origin-when-cross-origin |
| T-q-04 | Tampering | astro dependency | mitigate | bump to >= 7.4.7 (GHSA-mh32-jxcr-mh9f) |
</threat_model>

<verification>
- `npx vitest run` green (>= 722 tests).
- `node -e` JSON validation of vercel.json.
- Build + `astro preview` + Playwright: hero lead contrast >= 4.5 (dark/light x 390/1440), no element covered by pager at 390, tap targets >= 24px, skip link first focus, zero console errors incl. CSP violations.
- Lighthouse mobile /en/ and /es/: Perf >= 0.95, A11y/BP/SEO = 1; desktop A11y = 1.
- Attribution greps empty; 8 commits on fix/site-audit; not pushed.
</verification>

<success_criteria>All 9 audit items fixed, each in its own conventional commit (2+3 combined), all gates green.</success_criteria>

<output>Create .planning/quick/261114-eqk-site-audit-fixes/261114-eqk-SUMMARY.md</output>
