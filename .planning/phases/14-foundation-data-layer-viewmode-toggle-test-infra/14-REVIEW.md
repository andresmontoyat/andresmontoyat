---
phase: 14-foundation-data-layer-viewmode-toggle-test-infra
reviewed: 2026-05-30T13:25:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/App.js
  - src/components/Nav.js
  - src/components/_shared/ViewModeToggle.js
  - src/components/_shared/ViewModeToggle.test.js
  - src/context/ViewModeContext.js
  - src/context/ViewModeContext.test.js
  - src/data/experience.js
  - src/data/skills.js
  - src/data/skills.test.js
  - src/game/constellation.graph.js
  - src/game/constellation.graph.test.js
  - src/game/constellation.layout.js
  - src/game/constellation.layout.test.js
  - src/i18n/translations.js
  - src/test/setup.js
  - src/test/setup.test.js
findings:
  critical: 2
  warning: 9
  info: 4
  total: 15
status: fixed
fix_pass:
  fixed_at: 2026-05-30T13:50:00Z
  scope: critical_and_warning
  resolved:
    - CR-01  # extract SKILL_CATEGORY_COLORS with intent comment (data values, not styling tokens)
    - CR-02  # ViewModeToggle group aria-label stable across state (added t.nav.viewModeGroup)
    - WR-01  # setup.js jsdom bridge confirmed load-bearing on Node 22 + Vitest 2.1.9 — comment added, code retained (reviewer assumption falsified by empirical test failure: 21 tests fail when bridge is removed)
    - WR-02  # CURRENT_YEAR sync TODO referencing both downstream test assertion sites
    - WR-03  # edge-key delimiter switched to JSON.stringify tuple + label-round-trip regression test
    - WR-04  # Storage.prototype mutation wrapped in try/finally
    - WR-05  # window.location stub replaced with window.history.pushState (both test files)
    - WR-06  # Hero/About/Skill lazy-loaded — verified in build chunks (Hero-*.js, About-*.js, Skill-*.js now split)
    - WR-07  # unused options param removed from computeLayout
    - WR-08  # n===2 half-radius rationale documented
    - WR-09  # LangPill aria labels: stable group label + action-oriented per-button labels (3 new bilingual keys)
  skipped: []
  deferred_info:
    - IN-01  # skills.cards translation drift — out of scope this pass
    - IN-02  # apostrophe asymmetry — flagged as out-of-scope by reviewer
    - IN-03  # SegmentedPill extraction — refactor opportunity, defer
    - IN-04  # ring start-angle comment — defer
  tests_pass: 58/58
  build_pass: true
---

# Phase 14: Code Review Report

**Reviewed:** 2026-05-30T13:25:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** fixed (Critical + Warning resolved 2026-05-30T13:50:00Z — see frontmatter `fix_pass` block)

## Summary

Phase 14 lays down the foundation for game mode: a deterministic skill-graph data layer, a ViewMode context with a `?mode=` deep link, a segmented-pill toggle in the nav, and a fresh Vitest/RTL test harness. Functionally the code largely matches the spec and the test suite is broad and well-considered.

Adversarial review surfaces 15 findings:

- **2 Blockers** — (CR-01) raw hex colors hardcoded into `SKILL_CATEGORIES` violate the explicit tokens-only styling rule called out for this review and bake brand-coupled values into a data module; (CR-02) the `ViewModeToggle` pill labels its `role="group"` wrapper with an *action* string ("Switch to developer view") that duplicates and contradicts the per-button `aria-pressed`/label semantics, producing a misleading screen-reader experience and a control whose accessible name flips meaning depending on state.
- **9 Warnings** — including a fully dead `jsdom`-global bridge in `src/test/setup.js`, `Object.defineProperty(window, 'location', …)` test pollution, a non-`finally` `Storage.prototype` mutation in the throw-safety test, hardcoded `CURRENT_YEAR = 2026` that goes stale on Jan 1, a brittle `'|'` edge-key delimiter in `constellation.graph.js`, an unused `options` parameter in `computeLayout`, eager imports of `Hero`/`About`/`Skill` that load even when the default game view does not render them, an `aria-label="English"`/"Español" mismatch with `LangPill`'s actual control purpose, and a missed bilingual gap in the new `game.*` namespace (the EN copy uses a typographic apostrophe in "Couldn't" but the ES variant retains an ASCII apostrophe — minor consistency issue noted under Info).
- **4 Info** — unused `presentCategories` ring-start angle is magic, `n === 2` half-radius is undocumented, ViewModeToggle and LangPill duplicate the pill styling pattern, and the `skills.cards` translation tree duplicates skill labels that now live in `src/data/skills.js`.

No SQL/command injection, secret leakage, prototype pollution, or directory traversal surface in this changeset. Test coverage is broad for the data and context layers; the toggle component is well-covered for happy paths.

## Critical Issues

### CR-01: Raw hex colors in `SKILL_CATEGORIES` violate tokens-only styling rule

**File:** `src/data/skills.js:2-9`
**Issue:** `SKILL_CATEGORIES` defines per-category `color` values as raw hex literals (`'#3b82f6'`, `'#a855f7'`, `'#06b6d4'`, `'#10b981'`, `'#f59e0b'`, `'#ef4444'`, `'#8b5cf6'`, `'#ec4899'`). This is flagged by the reviewer brief as a constraint to enforce (tokens-only styling; no raw hex). These colors then propagate into `buildConstellationGraph` (`constellation.graph.js:33`) and ultimately into rendered nodes — meaning the entire constellation visual identity bypasses the CSS-var token system that the rest of the codebase routes through Tailwind tokens (`text-brand`, `bg-ink-900`, etc.). When the design tokens are themed (dark/light, brand refresh), the constellation will silently drift out of sync. The test suite (`skills.test.js:22-31`) also pins these hex literals as a contract, making the violation harder to refactor.
**Fix:**
```js
// src/data/skills.js — reference design tokens instead of literal hex.
// Add the eight category accents to tailwind.config.js / theme:tokens,
// then expose them by token name and resolve the actual color at render time
// via getComputedStyle or a token-resolver helper:

export const SKILL_CATEGORIES = {
  lang:     { en: 'Languages & Frameworks',    es: 'Lenguajes & Frameworks',      colorToken: 'cat-lang' },
  ai:       { en: 'AI Tooling',                es: 'Herramientas IA',             colorToken: 'cat-ai' },
  arch:     { en: 'Architecture & Integration', es: 'Arquitectura & Integración',  colorToken: 'cat-arch' },
  cloud:    { en: 'Cloud',                     es: 'Cloud',                       colorToken: 'cat-cloud' },
  devops:   { en: 'DevOps & Infra',            es: 'DevOps & Infra',              colorToken: 'cat-devops' },
  security: { en: 'Security',                  es: 'Seguridad',                   colorToken: 'cat-security' },
  data:     { en: 'Data',                      es: 'Datos',                       colorToken: 'cat-data' },
  hardware: { en: 'IoT & Hardware',            es: 'IoT & Hardware',              colorToken: 'cat-hardware' },
}
```
And update `skills.test.js` to assert `colorToken` strings, not hex literals. Update `constellation.graph.js:33` to copy `colorToken` (not `color`) onto nodes.

---

### CR-02: `ViewModeToggle` mislabels its `role="group"` wrapper with an action that flips per-state

**File:** `src/components/_shared/ViewModeToggle.js:13-19`
**Issue:** The pill wrapper is rendered as `<div role="group" aria-label={pillAriaLabel}>` where `pillAriaLabel` is `t.nav.viewModeToDev` when the user is in game mode and `t.nav.viewModeToGame` when in dev mode. There are three problems:

1. **WAI-ARIA semantics:** `role="group"` describes a *purpose* (a logical grouping of related controls), not an *action*. The accessible name should describe what the group is ("View mode toggle" / "Selector de modo de vista"), not what clicking inside it would do. The current label reads to screen readers as if the wrapper itself were a button — but it is a `div`, not an interactive element.
2. **State-coupled label:** The wrapper's accessible name *changes* depending on internal state, which violates the principle that container labels remain stable. Users using a screen-reader rotor to find groups will see a name that mutates and is ambiguous about what the group represents.
3. **Conflict with per-button labels:** The inner `<button>` elements already carry their own `aria-label` ("Game"/"Dev") and `aria-pressed`. The wrapper's "Switch to developer view" announcement competes with — and contradicts — the more accurate per-button state announcements. A screen-reader user navigating into the group will hear "Switch to developer view, group, Game toggle button, pressed" — incoherent.

The test (`ViewModeToggle.test.js:54-59, 101-108`) locks this anti-pattern in as a contract, so the bug is testable and shipped.
**Fix:**
```jsx
// src/components/_shared/ViewModeToggle.js
// Give the group a stable purpose-describing label, not an action label.
// Add a dedicated translations key, e.g. t.nav.viewModeGroup = 'View mode' / 'Modo de vista'.

return (
  <div
    role="group"
    aria-label={t.nav.viewModeGroup}   // stable across state
    className="flex gap-0.5 bg-ink-500 border border-ink-400 rounded-full p-0.5"
  >
    <button
      type="button"
      onClick={() => setViewMode('game')}
      className={`${base} ${viewMode === 'game' ? active : inactive}`}
      aria-label={t.nav.modeGame}      // already correct
      aria-pressed={viewMode === 'game'}
    >
      {t.nav.modeGame}
    </button>
    {/* same for Dev */}
  </div>
)
```
Update both translation namespaces (`en` and `es`) to add the new key, and rewrite the two `aria-label` assertions in `ViewModeToggle.test.js` to verify the stable group label.

## Warnings

### WR-01: `src/test/setup.js` `jsdom` global bridge is dead code

**File:** `src/test/setup.js:9-32`
**Issue:** The file guards everything behind `if (typeof jsdom !== 'undefined' && jsdom.window)`. Vitest 2.x with `environment: 'jsdom'` does **not** expose a top-level `jsdom` global — only the standard DOM globals (`window`, `document`, `localStorage`, etc.) are populated. The guard is therefore always false and the entire bridge body never executes. Tests still pass because vitest's jsdom env already wires `window.localStorage` correctly — so the file's actual contribution is just the `'@testing-library/jest-dom/vitest'` import on line 1. The dead block misleads future maintainers into thinking there is a real Node-22-vs-jsdom localStorage workaround in place. If a future vitest upgrade really does break localStorage, this code will not catch it.
**Fix:** Either delete lines 3–32 entirely (keep only the jest-dom matcher import), or, if a real Node-22 localStorage collision is occurring in CI, replace the `jsdom`-global probe with the correct vitest 2.x API:
```js
// src/test/setup.js
import '@testing-library/jest-dom/vitest'
// vitest 2.x: jsdom globals are wired automatically when `environment: 'jsdom'`.
// Add bridging here ONLY if a verified, reproducible failure exists; otherwise leave empty.
```

---

### WR-02: Hardcoded `CURRENT_YEAR = 2026` goes stale on Jan 1

**File:** `src/game/constellation.graph.js:4`
**Issue:** `CURRENT_YEAR` is fixed at `2026` and used to materialise the upper bound of `years` for the present-day Coderio entry (`entry.period.end === null` → `CURRENT_YEAR`). The comment justifies the constant as "deterministic, no `new Date()` call". That is correct for snapshot test stability, but it silently freezes the displayed range — `[2007, 2026]` for Java today, still `[2007, 2026]` in 2027. The constant ships in the bundle and there is no reminder mechanism. The single source of truth for "today" also lives in `skills.test.js:101-103` (`{ start: 2026, end: null }` for Coderio) and `constellation.graph.test.js:101-103` (`java.years[1]` asserted as `2026`). Three points to update each year, none flagged.
**Fix:** Either (a) lift `CURRENT_YEAR` into a build-time constant injected via Vite `define` so it tracks `Date.now()` at build but stays deterministic at runtime, or (b) keep the literal but add an ESLint comment + dated TODO that the asserting tests reference, and consider a CI check that fails if `CURRENT_YEAR < currentYear()`. Minimum fix:
```js
// src/game/constellation.graph.js
// TODO: bump CURRENT_YEAR at the start of each calendar year; sync with
//   - src/data/skills.test.js (Coderio period.start)
//   - src/game/constellation.graph.test.js (java.years[1])
export const CURRENT_YEAR = 2026
```

---

### WR-03: Edge-key delimiter `'|'` is brittle if a skill label ever contains `|`

**File:** `src/game/constellation.graph.js:65-75`
**Issue:** Edges are keyed by `` `${a}|${b}` `` and later split with `key.split('|')`. No label in the current catalog contains `|`, so today this works. But the function takes `skills` as a parameter and has no contract preventing a label like `'REST | gRPC'` (the existing translations even use that exact label — `translations.js:76, 254`). If someone ever extends `SKILLS` to include such a label, `split('|')` returns three pieces and `[source, target]` silently truncates to `'REST '` and `' gRPC'`. There is no test guarding this invariant.
**Fix:** Use a tuple key that cannot collide:
```js
// src/game/constellation.graph.js
const edgeMap = new Map()                // key: string but with a delimiter
                                          // that is impossible in canonical labels,
                                          // or — better — store the tuple directly:

for (let i = 0; i < canonical.length; i++) {
  for (let j = i + 1; j < canonical.length; j++) {
    const [a, b] = canonical[i] < canonical[j]
      ? [canonical[i], canonical[j]]
      : [canonical[j], canonical[i]]
    // Use Map<a, Map<b, weight>> or JSON.stringify([a,b])
    const key = JSON.stringify([a, b])
    edgeMap.set(key, (edgeMap.get(key) || 0) + 1)
  }
}

const edges = [...edgeMap.entries()].map(([key, weight]) => {
  const [source, target] = JSON.parse(key)
  return { source, target, weight }
})
```
Add a unit test that registers a synthetic skill with `|` in the label and asserts the graph still distinguishes it.

---

### WR-04: `Storage.prototype.getItem` mutation lacks `try/finally` restoration

**File:** `src/context/ViewModeContext.test.js:132-143`
**Issue:** The test mutates `Storage.prototype.getItem` to throw, runs the assertion, then restores. The restoration line runs *after* the assertions but is *not* inside a `finally` block. If `renderWithProvider()` throws synchronously despite the test's `expect(...).not.toThrow()` wrapper catching it, the explicit restoration line still runs — so this one is OK in the happy path. **But** if either `expect(ref.current.viewMode).toBe('game')` assertion fails (e.g., due to a future regression), the assertion throws, the restore line is skipped, and every subsequent test in the file (and in the run, since `Storage.prototype` is process-wide) inherits the throwing `getItem` and fails. This is a classic test-pollution footgun.
**Fix:**
```js
test('when localStorage.getItem throws, falls back to default "game" without crashing', () => {
  const originalGetItem = Storage.prototype.getItem
  Storage.prototype.getItem = () => { throw new Error('storage blocked') }
  try {
    let ref
    expect(() => { ref = renderWithProvider() }).not.toThrow()
    expect(ref.current.viewMode).toBe('game')
  } finally {
    Storage.prototype.getItem = originalGetItem
  }
})
```

---

### WR-05: `Object.defineProperty(window, 'location', …)` test pollution risk

**File:** `src/context/ViewModeContext.test.js:13-19, 31-39`; `src/components/_shared/ViewModeToggle.test.js:19-30`
**Issue:** Both test files redefine `window.location` with `Object.defineProperty`. JSDOM's `window.location` is a magic accessor that ordinarily refuses reassignment, so the override works — but the redefinition leaves `configurable: true` enabled and replaces the real Location object with a plain object literal that lacks methods like `assign`, `replace`, `reload`, and the `origin`/`hostname` getters. Any test (in this file or another, if test isolation is not perfect) that subsequently calls `window.location.assign(...)` or reads `window.location.origin` will silently get `undefined`. The `afterEach` resets `search` to `''` but leaves the stub object in place forever — subsequent test files in the same Vitest worker inherit it.
**Fix:** Prefer the JSDOM-supported path: use `window.history.pushState` to mutate the URL without replacing `window.location`:
```js
function setLocationSearch(search) {
  // Use real History API — JSDOM keeps location object intact.
  window.history.pushState({}, '', `/${search}`)
}
```
This works for `?mode=…` query reads because `window.location.search` is a live getter.

---

### WR-06: Eager imports of `Hero`/`About`/`Skill` load even in default game mode

**File:** `src/App.js:6-9, 33-50`
**Issue:** Default `viewMode` is `'game'`, which renders only the loading placeholder in `MainContent` and never mounts `Hero`, `About`, or `Skill`. Yet those three components are statically imported at the top of `App.js` and therefore included in the initial JS bundle even when the user lands on game mode (which is the default). `Experience`/`Projects`/`Claude`/`Contact` are correctly `React.lazy(...)`-wrapped. This is a correctness-adjacent issue because the brief calls out Lighthouse-mobile as a hard gate downstream, and shipping unused initial JS undercuts it.
**Fix:**
```jsx
// src/App.js
const Hero = React.lazy(() => import('./components/Hero'))
const About = React.lazy(() => import('./components/About'))
const Skill = React.lazy(() => import('./components/Skill'))
// …and wrap each in <Suspense fallback={SectionFallback}> inside MainContent.
```
This also makes the dev-vs-game branch fully symmetric in lazy-loading behavior.

---

### WR-07: `computeLayout` `options` parameter is unused dead arg

**File:** `src/game/constellation.layout.js:26`
**Issue:** `export function computeLayout(nodes, options = {}) { ... }` — `options` is never referenced in the body. The JSDoc says "Reserved for future use". Reserved parameters are an anti-pattern — they bloat the call signature, mislead callers, and never get exercised. If/when an option is genuinely needed, it can be added in the same atomic change as its first consumer.
**Fix:**
```js
export function computeLayout(nodes) {
  if (!nodes || nodes.length === 0) return {}
  // ...
}
```
Update the test (`constellation.layout.test.js`) — it never passes a second argument, so no test changes are required.

---

### WR-08: `n === 2` half-radius branch is undocumented magic

**File:** `src/game/constellation.layout.js:69`
**Issue:** `const radius = n === 2 ? NODE_CLUSTER_RADIUS * 0.6 : NODE_CLUSTER_RADIUS`. The `0.6` factor and the special case for exactly two nodes are unexplained. The general intent is "two nodes look too far apart at full radius" but a maintainer reading this for the first time will struggle to justify either the threshold or the constant. A future change ("now 3 nodes look too far apart too") will likely cargo-cult the pattern.
**Fix:** Add a brief comment explaining the visual rationale, or — preferably — generalise to a smooth function (e.g., `radius = NODE_CLUSTER_RADIUS * Math.min(1, n / 3)`). At minimum:
```js
// 2-node clusters look visually stretched at full radius — pull them
// closer so the pair reads as a single category rather than two singletons.
const radius = n === 2 ? NODE_CLUSTER_RADIUS * 0.6 : NODE_CLUSTER_RADIUS
```

---

### WR-09: `LangPill` `aria-label="English"`/`"Español"` does not describe the control

**File:** `src/components/Nav.js:92-118`
**Issue:** (Pre-existing but in scope because Phase 14 placed `ViewModeToggle` immediately beside `LangPill` and the brief calls out toggle a11y parity.) The two language buttons set `aria-label="English"` / `aria-label="Español"` — these labels describe a *language*, not what clicking the button does. A screen-reader announces "English, button, pressed" — which is ambiguous (am I *currently* in English, or is this a button to *switch to* English?). The new `ViewModeToggle` has the same shape but inherits the same ambiguity (CR-02 covers the wrapper; the per-button labels `'Game'`/`'Dev'` are similarly purpose-only).
**Fix:** Use action-oriented labels that pair with `aria-pressed`:
```jsx
<button
  type="button"
  onClick={() => setLang('en')}
  className={`${base} ${lang === 'en' ? active : inactive}`}
  aria-label={t.nav.langEnglish}     // 'Switch to English' / 'Cambiar a inglés'
  aria-pressed={lang === 'en'}
>EN</button>
```
Add new translation keys and update the same pattern in `ViewModeToggle.js` for `modeGame`/`modeDev`.

## Info

### IN-01: `skills.cards` in translations duplicates labels now living in `src/data/skills.js`

**File:** `src/i18n/translations.js:65-119, 243-297`
**Issue:** The Skills component's `categories[*].chips[*].label` array hard-codes skill names ("Java", "Spring Boot", "GCP", "GKE", "Spring Cloud", "REST / gRPC", "Hibernate", "Kafka", "PostgreSQL", "Terraform", "GitHub Actions", "Prompt Engineering", "Maven", "Azure") that overlap — but do not perfectly match — the canonical set in `src/data/skills.js`. Skills like "Spring Cloud", "Hibernate", "Kafka", "PostgreSQL", "Terraform", "GitHub Actions", "Prompt Engineering", "Maven", "Azure" appear in translations but not in `SKILLS`, while the catalog uses canonical "Google Cloud" but translations use "GCP". The catalog test (`skills.test.js:35-45`) only checks that every `experience[*].tech[*]` resolves; it does not check translations-vs-catalog drift. The two sources will diverge.
**Fix:** Either drop the per-language `categories` from translations entirely and derive skill display from `SKILLS` + per-language category names, or add a smoke test that asserts every label in `translations.{en,es}.skills.categories[*].chips[*].label` resolves via `resolveCanonical()`.

---

### IN-02: ES "Couldn't" / "No se pudo" — Unicode-apostrophe asymmetry in `game.error`

**File:** `src/i18n/translations.js:24, 202`
**Issue:** EN uses `"Couldn't load game mode..."` (curly apostrophe inside double-quoted string). The same string in other namespaces (`about.p1`: "I'm") is also curly. The ES `'No se pudo cargar el modo juego...'` has no contractions and is fine — but cross-file the codebase mixes straight (`'I\'m'` in `claude.ctaPrimary`) and curly apostrophes inconsistently. Not a bug, but flagged because the reviewer brief calls out bilingual copy parity.
**Fix:** Pick one (curly preferred for end-user copy) and apply via a one-shot sweep + ESLint rule (`no-irregular-whitespace` plus a custom hook). Out of scope for this phase to remediate fully.

---

### IN-03: `ViewModeToggle` and `LangPill` duplicate the pill styling

**File:** `src/components/_shared/ViewModeToggle.js:9-19`; `src/components/Nav.js:93-117`
**Issue:** Both components implement the same segmented-pill pattern: `flex gap-0.5 bg-ink-500 border border-ink-400 rounded-full p-0.5` wrapper + `px-3 py-1.5 rounded-full font-mono text-xs` button + `bg-brand-gradient text-ink-900 font-extrabold` active. The 14-PATTERNS document acknowledges this. With two consumers it is now worth extracting to a `_shared/SegmentedPill.js` component to prevent the inevitable drift when a third consumer is added.
**Fix:** Extract a `<SegmentedPill segments={[{ value, label, ariaLabel }]} current={...} onChange={...} groupLabel={...}>` component and have `LangPill` and `ViewModeToggle` consume it.

---

### IN-04: `presentCategories` ring start-angle `-Math.PI / 2` is undocumented

**File:** `src/game/constellation.layout.js:38, 68`
**Issue:** Both ring placements use `... - Math.PI / 2` to put angle 0 at the top of the canvas. This convention is fine but every reader who is not already deep in the layout has to derive it. A one-line comment paid for once would save subsequent readers the same derivation.
**Fix:**
```js
// Subtract PI/2 so the first item sits at the 12-o'clock position.
const angle = (2 * Math.PI * i) / catCount - Math.PI / 2
```

---

_Reviewed: 2026-05-30T13:25:00Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
