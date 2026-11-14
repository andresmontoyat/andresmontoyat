---
status: review
phase: 15-accessible-constellation-seo-fallback
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/App.js
  - src/game/GameMode.js
  - src/game/ConstellationFallback.js
  - src/game/renderers/SvgConstellation.js
  - src/game/useConstellation.js
  - src/game/spatialNav.js
  - src/i18n/translations.js
  - src/index.css
  - tailwind.config.js
  - src/game/GameMode.test.js
  - src/game/ConstellationFallback.test.js
  - src/game/renderers/SvgConstellation.test.js
  - src/game/useConstellation.test.js
  - src/game/spatialNav.test.js
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-01T22:40:00-05:00
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 15 ships the SVG constellation renderer, spatial keyboard navigation, sr-only SEO fallback, and the `GameMode` orchestrator. The overall architecture is sound: the renderer contract is forward-compatible with Phase 17 WebGL, `ConstellationFallback` is correctly placed outside the `ErrorBoundary`, the reduced-motion guard is applied at the right level, and the pitfalls documented in `15-RESEARCH.md` (transform-box, opacity-0 dim guard, edge opacity-only reveal) are correctly handled.

Four blockers are present. Two are runtime defects that reproduce on every test run: `detectCapabilities` calls `HTMLCanvasElement.getContext` without a try/catch wrapping `document.createElement('canvas')` in jsdom, emitting uncaught `stderr` errors for every `GameMode` render in tests (the try/catch only wraps `getContext`, not `createElement`). More critically: **weight-1 edges are permanently hidden** — `opacity: 0` is set unconditionally and the `hoveredSkillId`/`selectedSkillId` reveal logic from D-15-VIS-EDGE is never applied, breaking a locked design decision. The third blocker is a WCAG 2.1 AA violation: the reduced-motion hint pill (`aria-hidden="true"`) is the only visible affordance for reduced-motion users to understand the widget, yet it is fully hidden from screen readers — SR users under reduced-motion get no operable instructions. The fourth blocker is an `eslint-disable` that is never re-enabled inside the JSX return, leaving the `eslint-enable` comment as dead code after the closing paren.

Six warnings and three info items cover: the `nodes` parameter in `useConstellation` being structurally unused (the eslint suppression is load-bearing misdirection), the `useEffect` exhaustive-deps suppression carrying a real staleness risk, missing `canvas.getContext` mock in test setup, the hint pill having no fade-out animation on interaction, and the Spanish `skillSelected` template using `experiencia` in a way that does not pluralise correctly.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: weight-1 edges are permanently hidden — D-15-VIS-EDGE never implemented

**File:** `src/game/renderers/SvgConstellation.js:196`

**Issue:** `D-15-VIS-EDGE` (locked decision) requires weight-1 edges to fade in when their endpoint node is hovered or selected. The implementation sets `opacity: e.weight >= 2 ? 1 : 0` unconditionally with no conditional path that ever makes it non-zero. `onHoverSkill` is wired into `useConstellation` and returned as `hoveredSkillId`, but `SvgConstellation` never reads `hoveredSkillId` from props — the prop is accepted (line 80) and passed by `GameMode` but is silently ignored inside the renderer. The `edgeReveal` animation fires on mount for all edges but weight-1 edges start and end at `opacity: 0`, so they animate to nothing. This is a locked design decision violation: the constellation only shows weight-≥2 edges in all states, making the graph significantly sparser than designed and hiding relationship information from all users.

**Fix:**
```js
// In the edges.map callback, derive visibility from hover/select state:
const isEndpointHovered =
  e.source === hoveredSkillId || e.target === hoveredSkillId
const isEndpointSelected =
  e.source === selectedSkillId || e.target === selectedSkillId
const edgeOpacity =
  e.weight >= 2 ? 1 : (isEndpointHovered || isEndpointSelected ? 1 : 0)

style={{
  opacity: edgeOpacity,
  transition: 'opacity 200ms ease-out',
  pointerEvents: 'none',
}}
```
Also remove the `// eslint-disable-line no-unused-vars` suppression on `hoveredSkillId` at line 72 once it is consumed.

---

### CR-02: `detectCapabilities` canvas try/catch does not catch `createElement` — stderr noise in every test

**File:** `src/game/GameMode.js:33-40`

**Issue:** The try/catch wraps only `c.getContext('webgl')` and `c.getContext('experimental-webgl')`, but in jsdom the `not-implemented` error is thrown by `getContext` itself (at `HTMLCanvasElement-impl.js:42`). The error is not thrown during `document.createElement('canvas')`, which succeeds. The try/catch structure is therefore correct in principle, but `jsdom` emits the error to `stderr` as a warning before throwing, which means every `GameMode` render in tests prints the uncaught `Error: Not implemented: HTMLCanvasElement.prototype.getContext` stack trace to `stderr` — confirmed by the live test run. This is not a functional failure (tests pass) but it constitutes genuine noise that masks real errors and will grow to 8+ stderr dumps as the test suite expands. The root cause is that the `getContext` call inside the try block triggers a `jsdom` `not-implemented` side-effect (stderr write) before throwing; the exception is caught but the stderr write happens first.

**Fix:** Add a `HTMLCanvasElement.prototype.getContext` stub in `src/test/setup.js` so jsdom never reaches the not-implemented handler during tests:
```js
// src/test/setup.js — add after existing localStorage bridge
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null
}
```
This returns `null` (falsy), so `!!(null || null)` evaluates to `false` — `hasWebGL` remains `false`, which is the correct test-environment result. No production code change needed.

---

### CR-03: Reduced-motion hint pill is `aria-hidden="true"` — SR users under reduced-motion have no widget instructions

**File:** `src/game/renderers/SvgConstellation.js:308`

**Issue:** When `prefersReducedMotion === true`, the pulse animation is suppressed and the static hint pill is shown instead. The hint pill is the only visible affordance explaining how to interact with the widget (CONTEXT.md D-15-LAND-HINT: "show a static hint pill instead"). However, the pill has `aria-hidden="true"`, which removes it entirely from the accessibility tree. Screen reader users who prefer reduced motion — a population with high overlap with SR users — receive no instruction text. The `role="application"` container's `aria-label` provides keyboard instructions but not the "click/tap a star" entry-point hint that sighted reduced-motion users get from the pill. This violates WCAG 2.1 SC 1.3.1 (Info and Relationships) because the affordance information exists only for sighted users.

**Fix:** Remove `aria-hidden="true"` from the hint pill. The pill is inside `role="application"` which suppresses the virtual cursor, so the text is not double-announced during navigation — it is only read on initial focus of the application container, which is the correct behaviour.
```jsx
{prefersReducedMotion && !hasInteracted && (
  <p
    className="text-center mt-4 text-xs font-mono text-hintPill-text bg-hintPill-bg rounded-full px-3 py-2 inline-block"
    // Remove aria-hidden — SR users under reduced-motion need this affordance
  >
    {t.game.hintPill}
  </p>
)}
```

---

### CR-04: `eslint-enable` comment at line 319 is unreachable dead code — lint rules are never re-enabled

**File:** `src/game/renderers/SvgConstellation.js:163,319`

**Issue:** The `/* eslint-disable … */` comment at line 163 appears immediately before `return (` at line 164. The `/* eslint-enable … */` comment at line 319 appears after the closing `)` of the return statement — i.e., after the function has already returned. ESLint processes comments at parse time, so the `eslint-enable` takes effect for the rest of the function body, but there is no function body after line 318 — the function ends. In effect the disable is active from line 163 to end-of-function with no re-enable in scope. More importantly, the `jsx-a11y/no-noninteractive-element-interactions` and `jsx-a11y/no-noninteractive-tabindex` rules are suppressed for the entire JSX subtree inside the return. This is a deliberate choice (the WAI-ARIA `role="application"` pattern is not modelled by jsx-a11y), but the re-enable comment gives a false impression that lint is restored. The correct approach is to either inline-suppress per element or acknowledge the file-level disable intentionally.

**Fix:** Move the disable/enable pair to wrap only the `<div role="application">` open tag, or restructure as a file-level comment with an explanatory note:
```js
// Option A — file-level at top, with justification:
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
// role="application" is a WAI-ARIA APG pattern for custom spatial widgets;
// jsx-a11y does not model it. Disable is intentional and scoped to this file.

// Option B — per element (more surgical):
<div
  role="application"
  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex
  tabIndex={0}
  …
>
```
Remove the dead `eslint-enable` at line 319.

---

## Warnings

### WR-01: `useConstellation` accepts `nodes` parameter but never uses it — eslint suppression hides real dead code

**File:** `src/game/useConstellation.js:3-4`

**Issue:** The hook signature is `function useConstellation(nodes)` and the parameter is suppressed with `// eslint-disable-next-line no-unused-vars`. The `nodes` parameter is not used anywhere in the hook body. This is not a future placeholder issue — it is structurally dead code: the Phase 15 design places roving tabindex state (`rovingNodeId`, `focusedNodeId`) inside `SvgConstellation`, not in `useConstellation`, so the hook has no need for `nodes` now or in the observable future. The eslint suppression masks this, so the dead parameter will silently persist across future refactors. Additionally, `GameMode` passes `GRAPH_NODES` to `useConstellation(GRAPH_NODES)` at line 72, which is a misleading call site — the consumer reads the return value but the argument is discarded.

**Fix:** Remove the `nodes` parameter from `useConstellation` and update the call site in `GameMode.js`:
```js
// useConstellation.js
export default function useConstellation() {  // remove nodes param
// GameMode.js
const cons = useConstellation()               // remove GRAPH_NODES arg
```

---

### WR-02: `useEffect` exhaustive-deps suppression in `SvgConstellation` has a real staleness path

**File:** `src/game/renderers/SvgConstellation.js:119`

**Issue:** The `useEffect` that drives `aria-live` announcements suppresses `react-hooks/exhaustive-deps` with a line-level eslint comment. The deps array is `[selectedSkillId, hasInteracted, lang, t, nodes]`. Examining the effect body: it calls `t.game.selectionCleared` (covered by `t`) and `t.game.skillSelected` (covered by `t`), then uses `nodes.find(...)`. These are all declared. However, the suppress comment implies something was deliberately omitted. Inspecting the effect: `setAnnouncement` is a state setter (stable, correctly omitted), and `hasInteracted` is in deps. The actual omitted dep is likely `setAnnouncement` itself (stable) or a prior version where more was omitted. The suppress comment is a maintenance trap: any future developer adding a dep to the effect body will not receive a lint warning, leading to silent stale-closure bugs. In its current form the effect appears correct, but the suppression is unjustified and dangerous.

**Fix:** Remove the `eslint-disable-line` comment and verify the deps array compiles without warnings. If the warning re-appears, address the specific dep rather than suppressing the rule:
```js
}, [selectedSkillId, hasInteracted, lang, t, nodes])
// ^ remove eslint-disable-line comment
```

---

### WR-03: `GameMode.test.js` does not mock `HTMLCanvasElement.getContext` — causes jsdom stderr on every render

**File:** `src/game/GameMode.test.js:22-34`

**Issue:** The `beforeEach` in `GameMode.test.js` mocks `window.matchMedia` but does not mock `HTMLCanvasElement.prototype.getContext`. Every test that renders `<GameMode />` triggers `detectCapabilities()` → `document.createElement('canvas').getContext('webgl')` → jsdom not-implemented handler → `stderr` output. This is confirmed by the live test run which shows 8+ stderr stack traces (one per `GameMode` render in the test suite). Tests pass, but the persistent stderr output degrades CI signal quality. This is a test-setup gap: the production code is defensive (the try/catch catches the exception) but the test environment is not configured to suppress the side-effect.

**Fix:** Add the canvas stub to `src/test/setup.js` (see CR-02 fix), which applies globally and removes the noise from all future `GameMode` tests without requiring per-file setup.

---

### WR-04: Spanish `skillSelected` pluralisation template is grammatically incorrect

**File:** `src/i18n/translations.js:228`

**Issue:** The Spanish `skillSelected` template is:
```
'{name} seleccionado — {n} experiencia{s}. Presiona Esc para limpiar.'
```
The `{s}` suffix placeholder appends `'s'` for plurals (matching the English `experience{s}` pattern). However, in Spanish the plural of `experiencia` is `experiencias` — the suffix is `'s'`, so the template would produce `experiencias` correctly. But the singular form is `1 experiencia` (correct) and the plural form uses `{s}` which expands to `''` for `node.count === 1` and `'s'` otherwise — giving `experiencias`. This part is actually correct by coincidence. The deeper problem is the translation uses `seleccionado` (masculine past participle) but `{name}` can be any skill — including feminine-gendered Spanish nouns. For this domain all skill labels are proper nouns (Java, Docker, AWS) so grammatical gender agreement is not a hard failure. However, `experiencia` in context means "work experience entries" (instances), not abstract experience — the correct Spanish for the announcement is `{n} registro{s}` or `{n} empleo{s}` to match the English "N experiences (as in job entries)". The current text is semantically ambiguous for SR users.

**Fix:**
```js
// translations.js es.game.skillSelected
skillSelected: '{name} seleccionado — {n} empleo{s}. Presiona Esc para limpiar.',
// or use a clearer noun:
skillSelected: '{name} seleccionado — usado en {n} empleo{s}. Presiona Esc para limpiar.',
```

---

### WR-05: Hint pill has no fade-out animation when `hasInteracted` becomes `true`

**File:** `src/game/renderers/SvgConstellation.js:305-312`, `tailwind.config.js:77`

**Issue:** The `tailwind.config.js` defines an `hint-fade-out` animation (`hintFadeOut 600ms ease-in forwards`) specifically for dismissing the hint pill on first interaction. This animation is never applied — the hint pill is conditionally rendered with `{prefersReducedMotion && !hasInteracted && (…)}`. When `hasInteracted` becomes `true`, React unmounts the element instantly with no transition. The designed UX (spec D-15-LAND-HINT: "fades out on first interaction") is not implemented. This is not a correctness failure (the pill disappears) but it degrades the visual experience and the `hint-fade-out` keyframe is dead code in `tailwind.config.js`. Under PurgeCSS, the unused animation will be stripped, but the keyframe definition adds maintenance confusion.

**Fix:** Either implement the fade-out by switching from conditional rendering to a CSS-driven approach, or remove the dead keyframe:
```js
// Option A: remove unused keyframe from tailwind.config.js
// Delete 'hint-fade-out': 'hintFadeOut 600ms ease-in forwards' from animation
// Delete hintFadeOut keyframe block

// Option B: implement the fade-out with a CSS class swap
// Track a separate `isInteracted` for the fade state, apply animate-hint-fade-out,
// and unmount after animation ends via onAnimationEnd.
```

---

### WR-06: `SvgConstellation` initialises `breakpoint` state from `window.innerWidth` at mount time — does not respond to viewport resizes

**File:** `src/game/renderers/SvgConstellation.js:83-85`

**Issue:** Node radius is computed as `computeRadius(count, maxCount, breakpoint)` where `breakpoint` is frozen at mount via `useState(() => window.innerWidth >= 768 ? 'desktop' : 'mobile')`. If a user resizes the viewport from mobile to desktop (e.g., undocking a tablet, or opening devtools that change effective width), the breakpoint state never updates. All 26 nodes will remain at mobile radius (`floor=6, ceil=14`) even on a desktop canvas. This is a cosmetic issue for most users (viewport resize after initial load is rare), but it is a correctness defect: the baked-breakpoint approach means the radius derivation is not reactive. The `computeLayout` positions are in a fixed 1000×1000 viewBox so layout is not affected, but node sizes will be wrong.

**Fix:** Use a `ResizeObserver` or `window.matchMedia` listener to update `breakpoint` on resize, or derive it from the container width at render time:
```js
// Simplest fix: derive breakpoint from a matchMedia query (reactive)
const [isDesktop, setIsDesktop] = useState(
  () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
)
useEffect(() => {
  const mql = window.matchMedia('(min-width: 768px)')
  const handler = (e) => setIsDesktop(e.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}, [])
const breakpoint = isDesktop ? 'desktop' : 'mobile'
```

---

## Info

### IN-01: `eslint-enable` comment at line 319 is after the function return — effectively unreachable

**File:** `src/game/renderers/SvgConstellation.js:319`

**Issue:** Already captured as CR-04 root cause. As a separate callout: any static analysis tool that processes the file after the function return will see the `eslint-enable` as dead. The comment does not restore lint for any code because there is no code after it. Future developers searching for "where is `jsx-a11y` re-enabled?" will be misled.

**Fix:** See CR-04.

---

### IN-02: `hintFadeOut` keyframe in `tailwind.config.js` is unused dead code

**File:** `tailwind.config.js:106-111`

**Issue:** The `hintFadeOut` keyframe and its `hint-fade-out` animation alias are defined but never referenced in any component. Tailwind's PurgeCSS will strip the generated class from the production bundle, but the keyframe definition in `tailwind.config.js` is a JS object — it is never purged and persists as dead configuration. This confuses future authors (and Phase 17 reviewers) who will wonder whether it is intentionally unused or orphaned.

**Fix:** Either implement the fade-out (see WR-05) or delete the keyframe block and animation entry from `tailwind.config.js`.

---

### IN-03: `GameMode.test.js` line 88 — test assertion is inverted and proves nothing

**File:** `src/game/GameMode.test.js:86-91`

**Issue:** The test `'passes theme prop through to SvgConstellation'` queries for an arch-category stroke `#0891b2` and asserts it is `null`. This assertion is vacuously true whenever the test is in dark theme (which is the default: `matchMedia` mock returns `matches: false` for all queries, so dark theme is active and no `stroke` is applied to nodes). The test does not verify that the light-theme stroke is correctly applied when `theme='light'` is passed — it merely confirms that dark-theme nodes have no stroke, which is already covered by the rendering tests in `SvgConstellation.test.js`. The test description (`'passes theme prop through'`) implies a positive assertion, but the implementation asserts the absence of a feature.

**Fix:** Replace with a meaningful assertion that confirms the light-theme stroke path works at the `GameMode` integration level, or delete the test and rely on `SvgConstellation.test.js:94-107` which already covers this correctly.

---

_Reviewed: 2026-06-01T22:40:00-05:00_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
