---
phase: quick-261020-baq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/i18n/translations.js
  - src/components/astro/Hero.astro
  - src/components/astro/Hero.test.ts
  - src/pages/en/_index.test.ts
  - src/pages/es/_index.test.ts
  - src/layouts/BaseLayout.astro
  - scripts/generate-cv.mjs
  - scripts/og-template.html
  - public/CarlosMontoya_CV_EN.pdf
  - public/CarlosMontoya_CV_ES.pdf
  - public/og-image.png
autonomous: true
requirements: [QUICK-261020-baq]

must_haves:
  truths:
    - "Hero H1 reads 'Java Solution Architect & Tech Lead.' (EN) and 'Arquitecto de Soluciones Java y Tech Lead.' (ES)"
    - "Page <title>, meta description, JSON-LD jobTitle/description, CV title and OG card all say Java Solution Architect & Tech Lead"
    - "Hero stats show 11+ Years leading / Años liderando instead of 15+ Companies"
    - "H1 never clips and the page never scrolls horizontally at 320, 375 and 1440 px in EN and ES"
    - "No 'Senior Java', 'Ingeniero Java Backend' or '15+' remains in src/ or scripts/"
  artifacts:
    - path: "src/i18n/translations.js"
      contains: "Java Solution Architect & Tech Lead"
    - path: "src/components/astro/Hero.astro"
      contains: "leadingStat = statParts('11+')"
    - path: "src/layouts/BaseLayout.astro"
      contains: "\"jobTitle\": \"Java Solution Architect & Tech Lead\""
    - path: "scripts/generate-cv.mjs"
      contains: "Arquitecto de Soluciones Java y Tech Lead"
    - path: "public/og-image.png"
      provides: "Regenerated OG card with new role"
  key_links:
    - from: "src/components/astro/Hero.astro"
      to: "translations.js stats.leading"
      via: "t.stats.leading"
      pattern: "t\\.stats\\.leading"
---

<objective>
Make every title surface (hero H1, entry hook, lead, page meta, JSON-LD, CV, OG card) say "Java Solution Architect & Tech Lead", matching the About summary and experience.json already committed today. Replace the wrong "15+ Companies" hero stat with "11+ Years leading".

Output: updated copy + tests, regenerated CV PDFs and og-image.png, one atomic commit (not pushed).
</objective>

<execution_context>
</execution_context>

<context>
@<assistant-config>/skills/verify/SKILL.md

Environment: every npm/npx/node call MUST be prefixed `PATH=/opt/homebrew/bin:$PATH` (node >= 22).
Repo is Codehunters, but the user's rule still applies for this task: NO co-author trailer, NO AI attribution, never stage project instructions, <assistant-config>/, .mcp.json, AGENTS.md, never stage .planning/. Do NOT push.

Current locations (from grep):
- src/i18n/translations.js: EN meta.title L31, meta.description L32, entry.hook L37, hero.h1a/h1b/h1c L43-45, hero.lead L46, stats.companies L55. ES meta L92-93, entry.hook L98, hero.h1a/b/c L104-106, hero.lead L107, stats.companies L116.
- src/components/astro/Hero.astro: L29 `const companiesStat = statParts('15+')`; L172-175 uses companiesStat.target/template, fallback text `>15+</div>`, label `{t.stats.companies}`. aria-label on h1 = `${h1a} ${h1b} ${h1c}` (L61). h1b is the gradient nowrap "midLine" (L17).
- src/components/astro/Hero.test.ts: L30 and L35 aria-label assertions; L102 `>15+<`.
- src/pages/en/_index.test.ts L44 and src/pages/es/_index.test.ts L40: entry hook assertions (rendered HTML escapes & as &amp;).
- src/layouts/BaseLayout.astro: L93 jobTitle, L108 description (JSON-LD).
- scripts/generate-cv.mjs: L22 en title, L30 es title (STR object).
- scripts/og-template.html: L134 `.line1`, L135 `.line2`.
- Entry splash is skipped when sessionStorage `cam-entry-choice` is set to any truthy value before page scripts run.
- Playwright: import by absolute path `<repo>/node_modules/playwright/index.js` (CJS: default import then destructure `chromium`) when the script lives outside the repo (see verify skill).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite titles, stat and tests with the locked copy</name>
  <files>src/i18n/translations.js, src/components/astro/Hero.astro, src/components/astro/Hero.test.ts, src/pages/en/_index.test.ts, src/pages/es/_index.test.ts, src/layouts/BaseLayout.astro, scripts/generate-cv.mjs, scripts/og-template.html</files>
  <action>
Write these strings VERBATIM (locked; do not paraphrase, do not change copy to satisfy tests).

translations.js EN:
- meta.title = `Carlos Andrés Montoya Tobón · Java Solution Architect & Tech Lead`
- meta.description = `Carlos Andrés Montoya Tobón — Java Solution Architect and Tech Lead with 18+ years in backend engineering, 11+ of them leading teams. Java, Kotlin, Spring, microservices and cloud.`
- entry.hook = `Java Solution Architect & Tech Lead · 18+ years.`
- hero.h1a = `Java Solution`, hero.h1b = `Architect`, hero.h1c = `& Tech Lead.`
- hero.lead = `I design backend platforms that scale and lead the teams that ship them — clean hexagonal architecture, cloud-native, 18+ years, zero shortcuts.`
- stats: remove `companies`; add `leading: 'Years leading'` (keep key order years, team, leading, industries).

translations.js ES:
- meta.title = `Carlos Andrés Montoya Tobón · Arquitecto de Soluciones Java y Tech Lead`
- meta.description = `Carlos Andrés Montoya Tobón — Arquitecto de Soluciones Java y Tech Lead con +18 años en ingeniería backend, más de 11 liderando equipos. Java, Kotlin, Spring, microservicios y cloud.`
- entry.hook = `Arquitecto de Soluciones Java y Tech Lead · +18 años.`
- hero.h1a = `Arquitecto de`, hero.h1b = `Soluciones`, hero.h1c = `Java y Tech Lead.`
- hero.lead = `Diseño plataformas backend que escalan y lidero los equipos que las entregan — arquitectura hexagonal limpia, cloud-native, +18 años, cero atajos.`
- stats: remove `companies`; add `leading: 'Años liderando'`.
Use the existing quote style (single quotes); no string contains an apostrophe, so no escaping needed.

Hero.astro: rename `companiesStat = statParts('15+')` to `leadingStat = statParts('11+')`; update the two `companiesStat.` references to `leadingStat.`; fallback text `>15+</div>` to `>11+</div>`; label `{t.stats.companies}` to `{t.stats.leading}`. Leave the 18+, 45+, 8 stats untouched.

BaseLayout.astro JSON-LD: `"jobTitle": "Java Solution Architect & Tech Lead"`; `"description"` = the EN meta.description above, verbatim.

generate-cv.mjs STR: en.title `Java Solution Architect & Tech Lead`; es.title `Arquitecto de Soluciones Java y Tech Lead`.

og-template.html `.role`: line1 text `Java Solution Architect`, line2 text `&amp; Tech Lead`.

Tests (update assertions to new copy only):
- Hero.test.ts L30: `aria-label="Java Solution Architect &amp; Tech Lead."`; L35: `aria-label="Arquitecto de Soluciones Java y Tech Lead."`; L102: `>15+<` becomes `>11+<`.
- en/_index.test.ts L44: `Java Solution Architect &amp; Tech Lead · 18+ years.`
- es/_index.test.ts L40: `Arquitecto de Soluciones Java y Tech Lead · +18 años.`
- Fix any other test that fails on the old copy the same way (assert the new copy).

Then run `PATH=/opt/homebrew/bin:$PATH npx vitest run` until fully green, and `rg -n "Senior Java|Ingeniero Java Backend|15\+|stats\.companies" src scripts`; it must return nothing (report any unrelated remaining hit instead of touching it).
  </action>
  <verify>
    <automated>PATH=/opt/homebrew/bin:$PATH npx vitest run && ! rg -n "Senior Java|Ingeniero Java Backend|15\+|stats\.companies" src scripts</automated>
  </verify>
  <done>All locked strings present verbatim; full vitest suite passes; grep gate empty.</done>
</task>

<task type="auto">
  <name>Task 2: Regenerate CV + OG, build, and verify the hero under Playwright</name>
  <files>public/CarlosMontoya_CV_EN.pdf, public/CarlosMontoya_CV_ES.pdf, public/og-image.png</files>
  <action>
1. `PATH=/opt/homebrew/bin:$PATH npm run cv:gen`. Verify with pdftotext, joining lines so wrapped titles still match: for EN `pdftotext public/CarlosMontoya_CV_EN.pdf - | tr '\n' ' '` must contain `Java Solution Architect & Tech Lead` and not `Senior Java Backend`; for ES must contain `Arquitecto de Soluciones Java y Tech Lead` and not `Ingeniero Java Backend Senior`.
2. `PATH=/opt/homebrew/bin:$PATH npm run og:gen`; then Read public/og-image.png to eyeball that the role reads "Java Solution Architect / & Tech Lead" and nothing overflows.
3. `PATH=/opt/homebrew/bin:$PATH npm run build` must pass.
4. Free port 4173 (`lsof -ti:4173 | xargs kill -9`), start `PATH=/opt/homebrew/bin:$PATH npx astro preview --port 4173` in background, wait until `curl -sf http://localhost:4173/en/` succeeds.
5. Write a Playwright script in the scratchpad dir (import playwright by absolute repo path per the verify skill). For each lang in [en, es] and width in [320, 375, 1440] (height 800): new context, `addInitScript` setting `sessionStorage.setItem('cam-entry-choice', 'web')`, goto `http://localhost:4173/{lang}/`, wait 2500 ms for the reveal animation, then evaluate on the page's h1: assert `h1.scrollWidth <= h1.clientWidth`, `document.documentElement.scrollWidth <= window.innerWidth`, and `h1.getAttribute('aria-label')` equals `Java Solution Architect & Tech Lead.` (en) / `Arquitecto de Soluciones Java y Tech Lead.` (es). Print a PASS/FAIL table with the measured numbers; exit non-zero on any FAIL. At 375px save a hero screenshot (viewport, top of page) to `.planning/quick/261020-baq-align-hero-and-page-titles-with-solution/hero-375-en.png` and `hero-375-es.png`.
6. Kill the preview server afterwards (by the port's PID) regardless of outcome.
If any width clips, report it with numbers; do NOT change the locked copy — stop and report instead.
  </action>
  <verify>
    <automated>PATH=/opt/homebrew/bin:$PATH npm run build && pdftotext public/CarlosMontoya_CV_EN.pdf - | tr '\n' ' ' | grep -q "Java Solution Architect & Tech Lead" && pdftotext public/CarlosMontoya_CV_ES.pdf - | tr '\n' ' ' | grep -q "Arquitecto de Soluciones Java y Tech Lead" && ls .planning/quick/261020-baq-align-hero-and-page-titles-with-solution/hero-375-en.png .planning/quick/261020-baq-align-hero-and-page-titles-with-solution/hero-375-es.png</automated>
  </verify>
  <done>CV PDFs and og-image.png regenerated with new title; build green; all 6 Playwright checks PASS; two screenshots saved; preview server stopped.</done>
</task>

<task type="auto">
  <name>Task 3: One atomic commit (no push)</name>
  <files>(git only)</files>
  <action>
Stage by explicit path only: src/i18n/translations.js, src/components/astro/Hero.astro, src/components/astro/Hero.test.ts, src/pages/en/_index.test.ts, src/pages/es/_index.test.ts, src/layouts/BaseLayout.astro, scripts/generate-cv.mjs, scripts/og-template.html, public/CarlosMontoya_CV_EN.pdf, public/CarlosMontoya_CV_ES.pdf, public/og-image.png (plus any other test file fixed in Task 1). Never `git add -A`/`.`; never stage .planning/, project instructions, <assistant-config>/, .mcp.json, AGENTS.md.
Commit message: `feat(hero): lead with Solution Architect & Tech Lead` with a short body (titles aligned across hero/meta/JSON-LD/CV/OG; 15+ Companies stat replaced with 11+ Years leading). NO Co-Authored-By trailer, no AI mention. Do NOT push.
Then check: `git log -1 --format=%B | grep -inE '<attribution-patterns>'` and `git show HEAD | grep -inE '^\+.*(<attribution-patterns>)'` both empty; `git show --stat HEAD` lists no .planning paths.
  </action>
  <verify>
    <automated>! git log -1 --format=%B | grep -inE '<attribution-patterns>' && ! git show --stat --format= HEAD | grep -E '\.planning|CLAUDE\.md|\<assistant-config>/|\.mcp\.json|AGENTS\.md'</automated>
  </verify>
  <done>Single commit on main containing exactly the source/test/asset changes; attribution checks empty; not pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| repo → public git history | commit content/metadata becomes public |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-baq-01 | Information disclosure | git commit | mitigate | explicit-path staging; attribution/private-file grep gates in Task 3 |
| T-baq-02 | Tampering | static copy | accept | static strings only, no user input, no new deps |
</threat_model>

<verification>
- vitest full suite green; build green
- grep gate for old titles / 15+ empty in src and scripts
- CV pdftotext checks pass for EN and ES
- Playwright: 6/6 (en/es x 320/375/1440) no h1 clip, no horizontal scroll, aria-label matches
</verification>

<success_criteria>
All title surfaces say Java Solution Architect & Tech Lead (EN) / Arquitecto de Soluciones Java y Tech Lead (ES); hero stat shows 11+ Years leading; one clean local commit.
</success_criteria>

<output>
Create `.planning/quick/261020-baq-align-hero-and-page-titles-with-solution/261020-baq-SUMMARY.md` when done (not committed).
</output>
