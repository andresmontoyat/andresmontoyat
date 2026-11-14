---
quick_id: 261114-lap
type: quick
branch: feat/skill-decks
---
# Skill decks: the Technical stack section as playable card decks

The owner approved an interactive prototype (reference implementation, vanilla JS + CSS, Spanish only):
`<scratchpad>/demo/stack.html` (absolute path given to the executor). Port it to the site, bilingual, replacing the current Skill section.

## Behaviour to keep (from the prototype)
- Four decks side by side (backend, cloud, devops, ai), CORE cards first then by years.
- Top card: drag and fling in any direction (velocity-based, spins out, tucks under the pile); small throw returns.
- Click flips a card (back: category, CORE, note). 3D tilt + glare on hover; holo foil on CORE cards.
- Rarity tiers by years: common <6, rare 6-9, epic 10-14, legendary 15+ (stars + border treatments, legendary animated conic border).
- Per-deck toolbar: prev/next, counter "n/total", fan (arc spread above other decks; pick a card → it goes on top), shuffle.
- "Open all decks" button: solitaire columns with the name strip visible; clicking a card adds it to the hand.
- Hand: drop zone with 3 spots; combo panel shows name, synergy type, potential meter 1-5 and "what it builds" bullets. NO summed years.
- Keyboard: deck focusable; → fling, ← back, Enter flip, A fan, B shuffle, Esc closes fan. First deck nudge hint once.
- prefers-reduced-motion: no foil/glare/animations, instant moves.

## Implementation
- Data: chips stay in `src/data/skills.json` (single source; the game/CV may read it). Add per-chip optional `note: {en, es}` and per-chip `mono` monogram; add `src/data/skill-combos.json` with `synergy` (tech pairs) and `byCategory` combos, bilingual titles and builds. Copy notes/combos from the prototype (Spanish) and write English equivalents.
- `src/components/astro/Skill.astro`: server-renders ALL cards (names, years, tiers, notes) as real HTML so content is crawlable and readable without JS (no-JS fallback = static decks / readable list). UI strings bilingual via skills.json.
- Interactivity in an external module `public/js/skill-decks.js` (or an Astro-processed `<script>` that compiles to an external `/_astro/*.js` file — NOT inline, CSP is enforced: `script-src 'self'` + hashes; `npm run build` runs `scripts/csp-hashes.mjs --check-dist` and must pass without adding hashes). Read per-locale strings from data-attributes.
- Styles in the component (scoped) or `src/index.css`, using existing tokens (`--accent`, `--accent-2`, `--surface`, `--bg-2`, `--border`, `--text`, `--muted`); category colours as tokens for both themes (light values AA on light bg).
- Accessibility: decks are labelled groups; cards are buttons with accessible names; hand updates announced via `aria-live="polite"`; touch targets >= 24px; no keyboard trap. Pixel font only for titles/eyebrows (it has no accented glyphs).
- Mobile (390px): decks stack 1-2 per row, fling works with touch (`touch-action: none` only on the pile), open-all mode usable.
- Performance: no new dependencies; JS < 10 KB gz; no layout shift (CLS 0); Lighthouse mobile /en/ and /es/ perf >= 0.95, a11y/BP/SEO = 1 (BP 0.96 locally is the known Vercel Analytics 404).

## Tests
- `Skill.test.ts` (Container API): renders every chip name for EN/ES, tiers, CORE first per deck, combo data present, hand region with aria-live.
- Unit tests for pure logic extracted to a module importable by vitest (tier(), readCombo(): pair synergy beats category combo, potential within 1..5, no years sum).
- Playwright pass (production build + preview): fling changes counter, fan + pick, open-all + click adds to hand, combo text for Java+Kafka (EN and ES), keyboard path, 0 console errors and 0 CSP violations with the enforcing policy injected, screenshots 390 and 1440 both themes reviewed.

## Commits
1. `feat(skills): bilingual card data, notes and combos`
2. `feat(skills): playable card decks with hand and combos`
3. `test(skills): deck logic and section rendering`

## Out of scope
Changing "18+" years anywhere (career data starts 2007; owner to confirm separately).

## Rules
Node: `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`. No AI attribution anywhere (no trailers, no tool names in commits/docs, no assistant config files tracked); run the two attribution greps from the global git rules — both empty for new content. Do not push, do not open a PR. Do not commit PLAN/SUMMARY/STATE.
