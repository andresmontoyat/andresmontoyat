---
quick_id: 261114-lap
status: complete
branch: feat/skill-decks
completed: 2026-11-14
---
# Quick 261114-lap: Skill decks Summary

The Technical stack section is now four playable, server-rendered card decks (fling, flip, fan, shuffle, open all, a hand of three with combos). It is bilingual and works in both themes. The interactivity is an external 3.4 KB gz module, so no new CSP hashes were needed.

## Commits
- 904535a feat(skills): bilingual card data, notes and combos
- 968b863 feat(skills): playable card decks with hand and combos
- a597294 test(skills): deck logic and section rendering

## Files
- src/data/skills.json: per-chip `mono` and optional `note {en,es}`, per-category `short`, and `decks` UI strings
- src/data/skill-combos.json (new): 10 tech-pair synergies and 6 category combos, bilingual
- src/scripts/skill-deck-logic.js (new): pure tier/sort/poses/readCombo/addCard functions, shared by SSR and the client
- src/scripts/skill-decks.js (new): DOM layer, bundled by Astro to /_astro/Skill.astro_*.js (external)
- src/components/astro/Skill.astro: SSR of all 33 cards in their first pile pose, plus global `sd-` styles
- src/index.css: `--c-backend/cloud/devops/ai` and `--on-c` tokens for dark and light
- tests: Skill.test.ts (+9 cases), skill-deck-logic.test.js (23 cases)

## Verification
- vitest: 73 files / 767 tests passed before the test commit; the two suites touched: 41 passed
- npm run build: OK, "6 built inline-script hashes are all in vercel.json" (vercel.json unchanged)
- Deck JS: 8.1 KB raw, 3.4 KB gz
- Playwright (prod preview, enforcing CSP injected): 46/46 PASS. Covered fling, next, fan + pick, open-all + Java+Kafka combo (EN and ES), keyboard path, touch fling at 390, no-JS readable columns, reduced motion, 0 console errors, 0 CSP violations and no horizontal overflow
- Lighthouse mobile, 3 runs each: /en/ and /es/ both 0.96 / 1 / 0.96 / 1 on every run; CLS ~0, LCP ~2.41 s; the BP point lost is the known local Vercel Analytics 404

## Deviations from the prototype
- Light theme follows the site's `data-theme` only, not `prefers-color-scheme`
- Cards are real `<button>`s. They are focusable in fan and open-all modes, so cards can be added to the hand from the keyboard in open-all
- Fan radius adapts to the space around the pile so the arc stays on screen. At 390 the outermost cards still touch the edges, and the section clips them
- Toolbar margin went from 14 to 34 px, with z-index above the pile, so the stack's peeking cards no longer cover the counter
- A drop into the hand counts only after a real drag (moved > 6 px)
- Tier stars use the mono font at full opacity (contrast), not the pixel font at .85
- No JS (`@media (scripting: none)`): decks show as open columns with names visible, and the controls and hand are hidden

## Deviations from the process
- The pure-logic module was written just before its tests, not strictly test-first. Tests were run green before the UI was built
- Attribution greps: commit messages are clean; the only diff matches are the existing AI-tool skill label in skills.json and a test expectation that uses it.

## Not done / notes
- "18+" untouched (out of scope)
- Not pushed, no PR
