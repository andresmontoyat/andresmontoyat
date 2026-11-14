# 261114-n0w Career git log: Summary

The home Experience section is now an interactive git log. A commit graph sits on the left, with side-branch curves and `HEAD → main`. A typed terminal sits on the right. A server-rendered List view is the default when scripting is off. Everything is bilingual, and `grep`/`git blame` highlight the matching skill-deck cards.

## Commits
- 5f123cc feat(experience): career log data model and command logic
- 6b5f0b7 feat(experience): interactive git log section with list view
- 675a154 feat(skills): highlight cards from the career log
- a0e4210 fix(experience): keep the HEAD ref visible on narrow graph rows

## Files
- src/data/career-log.json, src/scripts/career-log-logic.js (+ test), src/scripts/career-log.js
- src/components/astro/CareerLog.astro (+ CareerLog.test.ts); src/pages/{en,es}/index.astro
- src/scripts/skill-deck-logic.js (matchesTech + test), src/scripts/skill-decks.js, src/components/astro/Skill.astro

## Verification
- vitest: 75 files / 836 tests pass (40 logic, 18 CareerLog, 2 matchesTech new)
- build + CSP dist check: OK, no hashes added
- CareerLog JS: 12.9 KB raw / 5.3 KB gz
- Playwright (production preview, CSP injected; 1440/390, dark/light, en/es, reduced motion, no-JS): 79/79
- Lighthouse mobile (perf/a11y/BP/SEO): en 0.96/0.95/0.95, es 0.96 x3; a11y 1, SEO 1, CLS ~0. BP 0.96 because the Vercel analytics snippet and `/_vercel/insights` give local-only errors

## Deviations
- Clicking the terminal focuses the input only with a fine pointer, so the keyboard doesn't pop up on touch.
- `git show` shows the first 3 bullets. The List view shows all of them.
- The reverse link (deck card → grep) and a committed Playwright spec were left out. The repo's Playwright config runs on the dev server, so the browser pass lives in the scratchpad instead.
