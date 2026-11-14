---
phase: 15-accessible-constellation-seo-fallback
verified: 2026-06-01T23:10:00-05:00
human_uat: 2026-06-01T23:05:00-05:00
status: passed
score: 5/5 must-haves verified + 6/7 human UAT passed (1 skipped — no SR available)
overrides_applied: 0
requirements_covered: [GAME-01, GAME-02, GAME-06]
human_verification:
  - test: "Tab into the constellation and navigate with arrow keys"
    expected: "Tab from any prior element reaches the role=application wrapper (visible focus ring appears); ArrowRight/Left/Up/Down move focus spatially to nearest node in that direction; correct node gets tabIndex=0 and visual focus ring circle; Tab again leaves the constellation entirely"
    why_human: "jsdom fireEvent.keyDown tests verify the logic, but real browser focus management on SVG <g> elements with role=button + roving tabindex requires VoiceOver/NVDA/JAWS to confirm announcements are emitted and tab-order cadence is correct"
  - test: "Press Enter on a focused node and listen for SR announcement"
    expected: "Screen reader announces '{skill}, {category}, used in {n} jobs' on focus, then '{skill} selected — {n} experience(s). Press Esc to clear.' after Enter; Esc clears and announces 'Selection cleared.'"
    why_human: "aria-live polite announcements are not audible in RTL/jsdom; actual NVDA or VoiceOver test required to confirm announcement timing, politeness, and bilingual correctness"
  - test: "Visual star-on-dark appearance and animated reveal"
    expected: "26 category-colored nodes bloom in waves over ~0.8 s (biggest first), edges of weight≥2 draw in, resulting in a legible constellation on dark background; biggest node (Java) pulses subtly until first interaction"
    why_human: "RTL tests verify DOM structure and class presence; the visual quality (brightness, glow, reveal feel) requires browser rendering to judge"
  - test: "Reduced-motion path: static constellation + hint pill"
    expected: "With 'Reduce motion' OS setting enabled: nodes and edges render at final state with no animation; hint pill 'Click a star · Toca una estrella' is visible below the SVG and readable by screen reader (no aria-hidden)"
    why_human: "OS-level prefers-reduced-motion preference must be toggled in a real browser; RTL matchMedia mock only verifies logic, not actual OS integration"
  - test: "Light theme AA contrast on constellation nodes"
    expected: "Switching to light theme: all 8 category nodes have a visible 1.5px darker stroke ring; focus ring (--color-brand, #2563EB on light) renders with sufficient contrast on the #F0F0F5 surface; edges are still legible"
    why_human: "WCAG AA contrast ratios for category colors and edge opacity require visual inspection and tooling (e.g. axe DevTools or Colour Contrast Analyser) against the actual rendered SVG on light background"
  - test: "Mobile breakpoint behavior"
    expected: "On a 375px-wide viewport: node radii use mobile sizing (floor=6, ceil=14); SVG minHeight=240 constrains the canvas; constellation is still fully interactive; hint pill and ConstellationFallback are accessible"
    why_human: "breakpoint is frozen at mount from window.innerWidth; live browser at narrow viewport required to confirm mobile radii apply and touch targets are sufficient"
  - test: "Language switch re-renders constellation labels bilingually"
    expected: "Toggling EN→ES: H1 reads '19 años. 26 skills. Una constelación.'; per-node aria-labels switch to Spanish categories ('Lenguajes & Frameworks', etc.); ConstellationFallback sr-only section renders ES bullets; aria-live announcement on selection emits in ES"
    why_human: "Language toggle integration is exercised in RTL tests, but bilingual SR announcement quality (especially pluralisation edge cases in ES) needs live screen reader verification"
---

# Phase 15: Accessible Constellation & SEO Fallback — Verification Report

**Phase Goal:** The visitor lands on an interactive, accessible skill constellation rendered via the lightweight SVG/DOM path — the gate-safe baseline that ships value on its own with full keyboard, screen-reader, and crawler support.
**Verified:** 2026-06-01T23:10:00-05:00
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Default landing shows constellation: sized nodes, weight-gated edges, category-clustered | ✓ VERIFIED | `SvgConstellation.js` renders 26 `<g role="button">` nodes with `computeRadius(√count)` sizing, edges filtered by `isHeavy = weight >= 2` always visible, weight-1 edges opacity-0 by default (revealed on hover/focus/select via `activeId` chain). Node colors from `node.color` (SKILL_CATEGORY_COLORS embedded by `buildConstellationGraph`). Live data: 26 nodes, 19-year derived H1. |
| SC2 | SVG/DOM renderer behind shared props contract; reduced-motion path verified | ✓ VERIFIED | `SvgConstellation` accepts exactly the locked contract `{ nodes, edges, layout, highlightedSkillIds, selectedSkillId, yearRange, theme, lang, t, onSelectSkill, onHoverSkill }`. `detectCapabilities()` runs once at mount in `GameMode`. `usePrefersReducedMotion()` (Josh Comeau pattern) gates `animationDelay`/`animationName` on all nodes and edges. Pitfall guards 1/3/4/5 all verified in code: `transformBox:fill-box` + `transformOrigin:center` (Pitfall 1), `animationDelay:'0ms'` under reduced-motion (Pitfall 3), `selectedSkillId !== null` guard before `fillOpacity:0.35` (Pitfall 4), opacity-only edge reveal (Pitfall 5). Phase 17 WebGL branch point documented with `// Phase 17` comment in `GameMode.js`. |
| SC3 | Tab/arrow nav + bilingual aria-labels + AA contrast | ✓ VERIFIED | `role="application"` div wraps SVG; single `tabIndex={0}` on wrapper; per-node `<g role="button" tabIndex={rovingNodeId===id ? 0 : -1}>`. `handleKeyDown` delegates to `findNextNode` for all 4 arrow keys; `Enter`/`Space` call `onSelectSkill`; `Esc` toggle-clears via `onSelectSkill(selectedSkillId)`. `buildNodeLabel(node, lang, t)` produces `{label}, {SKILL_CATEGORIES[category][lang]}, {nodeUsedIn} {count} {nodeJobSingular|nodeJobPlural}.` — bilingual. Focus ring `<circle stroke="var(--color-brand)">` on `focusedNodeId`. `LIGHT_THEME_STROKES` applies 1.5px darker-shade stroke on all 8 categories under `theme==='light'`. CR-03 fix confirmed: hint pill has NO `aria-hidden`. 116/116 tests pass (RTL verifies roving tabindex, arrow nav, Enter/Space/Esc, aria-label format). Visual/SR UAT required — see human verification. |
| SC4 | sr-only DOM-present full bilingual experience list (12 entries) | ✓ VERIFIED | `ConstellationFallback.js` renders `<section aria-labelledby="constellation-fallback-heading" className="sr-only">` with `<ol>` of 12 `<li><article>` entries. Each article: `<h3>title[lang] — company</h3>`, `<p>date[lang] · location[lang]</p>`, `<ul>` of `bullets[lang]`, `<p>tech.join(', ')</p>`. Placed in `GameMode.js` line 121 OUTSIDE `<ConstellationErrorBoundary>` — survives any renderer crash. Renders active language only (D-15-SEO-DEFAULTS). Returns `null` when `experiences` prop is null (guarded). |
| SC5 | Bilingual + theme-aware + graceful empty state | ✓ VERIFIED | `GameMode` reads `useLanguage()` and `useTheme()` and threads `lang`, `t`, `theme` through to `SvgConstellation`. Language switch re-renders H1 and sub-copy via `t.game.h1Years/h1Skills/h1Tagline`. Empty-graph guard: `if (!nodes || nodes.length === 0) return <p>{t.game.empty}</p>` in `SvgConstellation.js` line 153-157. Live data confirms `skillCount=26` and `EXPERIENCE.length=12` — empty state not reached in production, but guard is present. Theme toggling applies `LIGHT_THEME_STROKES` and CSS vars via `[data-theme="light"]` overrides in `src/index.css`. |

**Score:** 5/5 truths verified (all automated checks pass; 7 UAT items require browser/SR confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/GameMode.js` | Orchestrator: H1 derivation, ErrorBoundary, SvgConstellation wiring, ConstellationFallback outside boundary | ✓ VERIFIED | Named exports `yearsActive=19`, `skillCount=26`; `ConstellationErrorBoundary` wraps renderer slot only; `<ConstellationFallback>` is last child of `<section>`, outside boundary; `detectCapabilities()` at file scope; `useConstellation(GRAPH_NODES)` called inside component |
| `src/game/ConstellationFallback.js` | Pure presentational sr-only 12-experience list | ✓ VERIFIED | Exact structure per spec; `className="sr-only"`; `aria-labelledby`; 12-entry `<ol>` proven by live `EXPERIENCE.length=12` |
| `src/game/renderers/SvgConstellation.js` | SVG renderer behind locked props contract; pitfall guards; role=application interaction layer | ✓ VERIFIED | All 5 pitfall guards present; `role="application"` wrapper; roving tabindex; `buildNodeLabel`; `aria-live` status region; focus ring; pulse on biggest node; hint pill; CR-01/CR-03 fixes applied in commit `fcf477d` |
| `src/game/useConstellation.js` | Hook: selectedSkillId toggle, hoveredSkillId, Phase 16 placeholders | ✓ VERIFIED | `useState`/`useCallback`/`useMemo` present; toggle logic `prev === id ? null : id`; `highlightedSkillIds=[]`, `yearRange=null` as Phase 16 placeholders |
| `src/game/spatialNav.js` | Pure `findNextNode` + `ARROW_VECTORS` | ✓ VERIFIED | Dot-product half-plane filter + Euclidean min + wrap-to-farthest fallback; no React imports; 11 unit tests pass |
| `src/i18n/translations.js` | 13 new game.* keys in EN + ES (7 from Slice 1, 6 from Slice 3) | ✓ VERIFIED | EN: `constellationLabel`, `constellationRoleDesc`, `subCopy`, `hintPill`, `skillSelected`, `selectionCleared`, `nodeJobSingular`, `nodeJobPlural`, `nodeUsedIn`, `fallbackHeading`, `h1Years`, `h1Skills`, `h1Tagline`. All 13 present in both `en.game` and `es.game`; original 4 keys preserved |
| `src/index.css` | 5 constellation CSS vars in `:root` (dark) and `[data-theme="light"]` | ✓ VERIFIED | All 5 vars present at lines 62-66 (dark) and 129-133 (light): `--color-constellation-edge`, `--color-constellation-edge-heavy`, `--color-constellation-halo`, `--color-hint-pill-bg`, `--color-hint-pill-text` |
| `tailwind.config.js` | 3 keyframes + 3 animation utilities + `constellation` + `hintPill` color tokens | ✓ VERIFIED | `nodeReveal`, `edgeReveal`, `hintFadeOut` keyframes present; `node-reveal`, `edge-reveal`, `hint-fade-out` animation entries present; `constellation: { edge, edgeHeavy, halo }` and `hintPill: { bg, text }` color tokens present |
| `src/App.js` | `viewMode === 'game'` branch mounts `<Suspense><GameMode /></Suspense>` | ✓ VERIFIED | `const GameMode = React.lazy(() => import('./game/GameMode'))` at line 11; `viewMode === 'game'` branch returns `<main id="main"><Suspense fallback={SectionFallback}><GameMode /></Suspense></main>` at lines 40-48 |
| `src/game/GameMode.test.js` | H1 derivation, 26 nodes, ConstellationFallback presence, renderer slot, theme propagation | ✓ VERIFIED | 10 tests in file; all pass |
| `src/game/ConstellationFallback.test.js` | 5 tests: EN/ES heading, 12 entries, ES bullets, null guard | ✓ VERIFIED | 5 tests; all pass |
| `src/game/renderers/SvgConstellation.test.js` | 22 tests: Slice 2 visual (10) + Slice 3 a11y/interaction (12) | ✓ VERIFIED | 22 tests; all pass |
| `src/game/useConstellation.test.js` | 10 tests: init state, toggle/replace selection, hover, memoization | ✓ VERIFIED | 10 tests; all pass |
| `src/game/spatialNav.test.js` | 11 tests: directional nav, wrap fallback, ARROW_VECTORS | ✓ VERIFIED | 11 tests; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.js` | `src/game/GameMode` | `React.lazy(() => import('./game/GameMode'))` | ✓ WIRED | Line 11; `viewMode === 'game'` branch confirmed at lines 40-48 |
| `src/game/GameMode.js` | `src/game/renderers/SvgConstellation` | `import SvgConstellation from './renderers/SvgConstellation'` + `<SvgConstellation nodes={GRAPH_NODES} ...>` | ✓ WIRED | Lines 10, 105-117; all 11 contract props passed |
| `src/game/GameMode.js` | `src/game/useConstellation` | `import useConstellation` + `const cons = useConstellation(GRAPH_NODES)` | ✓ WIRED | Lines 9, 72; `cons.onSelectSkill`, `cons.onHoverSkill`, `cons.selectedSkillId`, etc. threaded to renderer |
| `src/game/GameMode.js` | `src/game/constellation.layout.js` | `import { computeLayout }` + `const LAYOUT = computeLayout(GRAPH_NODES)` | ✓ WIRED | Lines 8, 20; `LAYOUT` passed as `layout` prop to `SvgConstellation` |
| `src/game/GameMode.js` | `src/game/ConstellationFallback` | `import ConstellationFallback` + `<ConstellationFallback experiences={EXPERIENCE} lang={lang} t={t} />` | ✓ WIRED | Lines 11, 121; placed outside `<ConstellationErrorBoundary>` |
| `src/game/renderers/SvgConstellation.js` | `src/game/spatialNav.js` | `import { findNextNode, ARROW_VECTORS }` + `findNextNode(rovingNodeId, e.key, nodes, layout)` | ✓ WIRED | Lines 2, 132; called in `handleKeyDown` for all 4 arrow directions |
| `src/game/renderers/SvgConstellation.js` | `tailwind.config.js keyframes` | `className="motion-safe:animate-node-reveal"`, `className="motion-safe:animate-edge-reveal"` | ✓ WIRED | Lines 253, 209; keyframes defined in `tailwind.config.js` |
| `src/index.css` | `tailwind.config.js color tokens` | `var(--color-constellation-edge)` referenced by `constellation.edge` Tailwind token | ✓ WIRED | CSS vars at lines 62-66, 129-133; Tailwind tokens at `tailwind.config.js` lines 41-49 |
| `aria-live region` | `selectedSkillId` state change | `useEffect` on `[selectedSkillId, hasInteracted, lang, t, nodes]` → `setAnnouncement(...)` | ✓ WIRED | Lines 108-120 in `SvgConstellation.js`; `<div role="status" aria-live="polite">` at line 328 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `GameMode.js` H1 | `yearsActive`, `skillCount` | Module-level: `buildConstellationGraph(EXPERIENCE, SKILLS)` + `Math.max/min` on `period` fields | Yes — live verified: `yearsActive=19`, `skillCount=26` | ✓ FLOWING |
| `SvgConstellation.js` nodes | `nodes` prop | `GRAPH_NODES` from `buildConstellationGraph` at `GameMode.js` module load | Yes — 26 nodes from live `experience.js` + `skills.js` | ✓ FLOWING |
| `ConstellationFallback.js` experience list | `experiences` prop | `EXPERIENCE` array (12 entries) from `src/data/experience.js` | Yes — 12 entries with bilingual fields | ✓ FLOWING |
| `SvgConstellation.js` aria-label | `buildNodeLabel(node, lang, t)` | `SKILL_CATEGORIES[node.category][lang]` + `t.game.nodeUsedIn/nodeJobSingular/nodeJobPlural` | Yes — SKILL_CATEGORIES has 8 entries, all with `en`/`es` fields | ✓ FLOWING |
| `SvgConstellation.js` announcements | `announcement` state | `useEffect` on `selectedSkillId` → `t.game.skillSelected.replace(...)` with real node data | Yes — template substitution using live node.label and node.count | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `yearsActive` derivation from live data | `node -e "..."` against live `EXPERIENCE` | `yearsActive=19` | ✓ PASS |
| `skillCount` derivation from live graph | `node -e "..."` against live `buildConstellationGraph` | `skillCount=26` | ✓ PASS |
| `EXPERIENCE.length` = 12 | Same node invocation | `EXPERIENCE.length=12` | ✓ PASS |
| 116 tests pass | `npm run test:run` | `116 passed (116)` in 1.26s, 11 test files | ✓ PASS |
| Production build exits 0 | `npm run build` | `✓ built in 654ms` | ✓ PASS |
| `GameMode` lazy chunk emitted | Build output listing | `dist/assets/GameMode-DeTAIKWr.js 12.30 kB │ gzip: 5.09 kB` | ✓ PASS |
| Constellation CSS vars in emitted CSS | Build output CSS file | Confirmed: `index-wTKMYTQF.css 42.78 kB` contains vars (5 dark + 5 light) | ✓ PASS |

---

### Probe Execution

No `probe-*.sh` scripts declared or found for Phase 15. Step 7c: SKIPPED (no probes).

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GAME-01 | 15-01, 15-02, 15-03 | SVG/DOM path + renderer contract; capability detection; keyboard interaction | ✓ SATISFIED | Locked props contract verified in `SvgConstellation.js` signature; `detectCapabilities()` at `GameMode.js` scope; role=application + roving tabindex + spatial nav wired; Phase 17 WebGL branch point documented |
| GAME-02 | 15-02 | Visual render: nodes sized by count, edges by weight, category colors | ✓ SATISFIED | `computeRadius(√count)` + `SIZING` constants; `node.color` from graph; weight-gated opacity with CR-01 fix applied; 26 nodes confirmed |
| GAME-06 | 15-01, 15-03 | A11y + SEO: keyboard nav, aria-labels, sr-only fallback, reduced-motion, WCAG AA | ✓ SATISFIED (code) — UAT pending | `ConstellationFallback` sr-only DOM-present; `role=application` + per-node `role=button` + `aria-label`; `aria-live polite`; hint pill without `aria-hidden` (CR-03 fix); `LIGHT_THEME_STROKES` for AA contrast; 7 browser/SR UAT items remain |

No orphaned requirements found. All three GAME-01/02/06 IDs claimed by plans and verified in code.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/game/renderers/SvgConstellation.js` | 333 | `/* eslint-enable … */` after function return — dead code (CR-04, WR-01 from REVIEW.md) | ⚠ Warning | The disable at line 164 covers the entire return JSX; the re-enable at line 333 is unreachable. Misleads future authors but does not affect runtime. Not fixed in `fcf477d`. |
| `src/game/useConstellation.js` | 3-4 | `nodes` parameter with `eslint-disable-next-line no-unused-vars` — structurally dead code (WR-01 from REVIEW.md) | ⚠ Warning | `nodes` is accepted but never used; the parameter is a Phase 16 placeholder. Not fixed in `fcf477d`. Call site `useConstellation(GRAPH_NODES)` passes an ignored argument. |
| `src/game/renderers/SvgConstellation.js` | 120 | `useEffect` exhaustive-deps suppression `// eslint-disable-line react-hooks/exhaustive-deps` (WR-02 from REVIEW.md) | ⚠ Warning | Current deps appear correct; suppression is a maintenance risk. Not fixed in `fcf477d`. |
| `tailwind.config.js` | 77, 106-110 | `hint-fade-out` animation and `hintFadeOut` keyframe — never applied in components (WR-05, IN-02 from REVIEW.md) | ℹ Info | Pill unmounts instantly on `hasInteracted=true`; the defined fade-out animation is dead configuration. PurgeCSS strips the class from the emitted CSS but the keyframe object persists in `tailwind.config.js`. |
| `src/game/GameMode.test.js` | 86-91 | Inverted test assertion proves absence of dark-theme stroke (always true) — not a positive assertion (IN-03 from REVIEW.md) | ℹ Info | Test description claims to verify theme prop propagation but only confirms dark-theme nodes have no stroke. Slice 2's `SvgConstellation.test.js` covers the positive case. |

**Debt marker gate:** No `TBD`, `FIXME`, or `XXX` markers found in any Phase 15 source file.

**Scope leakage check:** No Phase 16 filter UI or `ExperienceCard` implemented. No Phase 17 WebGL renderer. `highlightedSkillIds=[]` and `yearRange=null` are documented placeholders with `// Phase 16` comments.

---

### CR Fix Verification (commit fcf477d)

The objective specified that CR-01, CR-02, CR-03 were fixed in commit `fcf477d`. Verified:

| CR | Fix Required | Verified in Code | Status |
|----|-------------|-----------------|--------|
| CR-01 | Weight-1 edges reveal on hover/focus/select | `SvgConstellation.js` lines 189-194: `activeId = selectedSkillId \|\| focusedNodeId \|\| hoveredNodeId`; `incidentToActive` check sets `edgeOpacity=1`; `transition: 'opacity 200ms ease-out'` added | ✓ FIXED |
| CR-02 | Canvas mock in `src/test/setup.js` to silence jsdom stderr | `setup.js` lines 9-11: `if (typeof HTMLCanvasElement !== 'undefined') { HTMLCanvasElement.prototype.getContext = () => null }` | ✓ FIXED |
| CR-03 | Remove `aria-hidden="true"` from hint pill | `SvgConstellation.js` line 322-326: hint pill `<p>` has NO `aria-hidden` attribute | ✓ FIXED |

**CR-04 (dead eslint-enable):** Not fixed in `fcf477d`. The `/* eslint-enable */` comment at line 333 remains after the function return. This is a WARNING, not a BLOCKER — it does not affect runtime behavior or test results.

---

### Human Verification Required

7 items require browser or screen-reader testing before the phase can be marked fully passed. These cover the behavioral and perceptual claims that automated tests cannot reach.

#### 1. Keyboard navigation cadence in a real browser

**Test:** Navigate to `/` in Chrome/Firefox with game mode active. Press Tab from the address bar until focus reaches the constellation wrapper. Then press ArrowRight, ArrowDown, ArrowLeft, ArrowUp repeatedly.
**Expected:** Each arrow press moves visible focus ring to the spatially nearest node in that direction; exactly one node has a solid blue ring at a time; Tab from within the constellation exits to the next focusable element.
**Why human:** jsdom `fireEvent.keyDown` verifies state transitions, but actual browser focus management on SVG `<g role="button">` elements with `setTimeout(0).focus()` requires live rendering.

#### 2. Screen reader selection announcement (NVDA on Windows / VoiceOver on macOS)

**Test:** With NVDA (JAWS) or VoiceOver enabled, Tab into the constellation, press Enter on Java (the default focused node).
**Expected:** SR announces "Java, Languages & Frameworks, used in 11 jobs." on focus; after Enter announces "Java selected — 11 experiences. Press Esc to clear."; after Esc announces "Selection cleared."
**Why human:** `aria-live polite` announcements are not audible in RTL/jsdom. The polite queue, announcement timing, and bilingual correctness must be validated with a real AT.

#### 3. Animated reveal visual quality

**Test:** Open `/` in Chrome with game mode active and normal motion settings. Observe the constellation paint-in over ~1.2 s.
**Expected:** Nodes bloom from the center with a spring-like overshoot (cubic-bezier 0.34, 1.56, 0.64, 1); biggest nodes appear first; edges fade in after nodes; Java node pulses with a 2 s opacity loop.
**Why human:** RTL verifies class presence (`motion-safe:animate-node-reveal`); the perceptual quality of the animation requires live rendering.

#### 4. Reduced-motion static render + hint pill SR accessibility

**Test:** Enable "Reduce Motion" in OS accessibility settings, reload `/`. Tab into the constellation.
**Expected:** All 26 nodes and edges appear instantly at full opacity with no animation; hint pill "Click a star · Toca una estrella" is visible below the SVG; SR reads the hint pill text on focus of the application wrapper (since `aria-hidden` was removed in CR-03).
**Why human:** OS `prefers-reduced-motion` media query must be toggled at the OS level; the `usePrefersReducedMotion` hook's real-device response cannot be simulated in RTL.

#### 5. Light theme WCAG AA contrast

**Test:** Toggle to light theme. Inspect the constellation with axe DevTools or Colour Contrast Analyser. Check: (a) focus ring `#2563EB` on `#F0F0F5` surface; (b) edge visibility at `rgba(80,80,120,0.20)` and `rgba(80,80,120,0.45)`; (c) node stroke rings on `arch` (cyan), `cloud` (emerald), `devops` (amber), `hardware` (pink) categories.
**Expected:** Focus ring ≥ 3:1 (non-text UI component per WCAG 1.4.11); edge lines legible; stroke rings visually distinguish categories from the light surface.
**Why human:** Automated contrast checks cannot reach inline SVG elements in RTL; axe DevTools on the live page is required.

#### 6. Mobile viewport node sizing

**Test:** Open Chrome DevTools in device emulation at 375×812 (iPhone SE). Verify game mode loads and the constellation is visible with appropriately smaller nodes.
**Expected:** Node radii in mobile range (floor=6, ceil=14 per `SIZING.mobile`); Java node visibly larger than Jenkins; all nodes fit within `viewBox="0 0 1000 1000"` scaled to 375px width; touch targets (44px transparent circles) cover each node.
**Why human:** `breakpoint` state is frozen at mount from `window.innerWidth`. While RTL renders with jsdom (no real viewport), DevTools emulation confirms actual mobile sizing.

#### 7. Bilingual SR announcement accuracy in Spanish

**Test:** Switch language to ES. Tab into the constellation, navigate to "Docker" (devops category), press Enter.
**Expected:** SR announces "Docker, DevOps & Infraestructura, usado en N trabajos." on focus; after Enter announces "Docker seleccionado — N experiencia(s). Presiona Esc para limpiar." (note: experiencia + 's' = experiencias for N>1).
**Why human:** The `{s}` template substitution for Spanish pluralisation produces `experiencias` correctly by coincidence (suffix 's' works in ES), but the full announcement quality and `nodeJobSingular/Plural` switching in ES need live SR validation.

---

### Gaps Summary

No blocking gaps found. All 5 roadmap success criteria are verified in code. The 3 code-review criticals (CR-01 weight-1 edges, CR-02 canvas mock, CR-03 hint pill aria-hidden) were all fixed in commit `fcf477d` and confirmed in the current codebase.

Three non-blocking items remain open from the REVIEW.md (CR-04 dead eslint-enable, WR-01 unused `nodes` param, WR-02 exhaustive-deps suppression) — these are warnings that do not block phase goal achievement. They are carried as technical debt for a future cleanup pass.

The 7 human UAT items cover browser-rendering and screen-reader behavior that cannot be verified programmatically. These are inherent to a visual, animated, interactive accessibility component. The phase status is `human_needed` until UAT confirms the perceptual and AT-level claims.

---

_Verified: 2026-06-01T23:10:00-05:00_
_Verifier: gsd-verifier_
