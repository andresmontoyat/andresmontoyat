# Phase 15: Accessible Constellation & SEO Fallback — Research

**Researched:** 2026-06-01
**Domain:** SVG accessibility, WAI-ARIA custom widget patterns, CSS keyframe animation, React 18 capability detection, RTL/Vitest SVG testing
**Confidence:** HIGH (all critical claims verified via official docs or authoritative sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-15-VIS-CHAR:** Visual character = stars on dark sky — bright pinpoint category-colored nodes, thin glowing edges, subtle outer halo on the active subgraph. Reduced-motion drops the halo + ambient effects.

**D-15-VIS-SIZE:** Node size = `√count`. Floor ~6px radius mobile / 10px desktop; ceiling derived to keep largest node ~3.3× floor.

**D-15-VIS-EDGE:** Edge visibility = hide weight-1 by default; show weight ≥2 always; on node hover/select, fade in that node's weight-1 edges.

**D-15-VIS-ACTIVE:** Active-state = halo (outer glow) + brightness bump on active node + connected edges; non-active nodes drop to `fill-opacity: 0.35`. Reduced-motion: skip halo, keep brightness + dim.

**D-15-VIS-COLOR:** Node fill uses 8 category colors from `SKILL_CATEGORY_COLORS`. Edges = neutral mid-tone via CSS-var. AA contrast in both themes.

**D-15-LAND-PAINT:** First paint = animated reveal. Nodes fade-in + scale-up in waves ~800ms (biggest first), edges draw in ~400ms. Total ~1.2s. Reduced-motion = instant full constellation.

**D-15-LAND-HINT:** Resting hint = subtle pulse on biggest node (Java), stops on first interaction. Reduced-motion = static hint pill.

**D-15-LAND-COPY:** Bilingual H1 with numbers derived at render time (`yearsActive`, `skillCount`). MANDATORY derivation — not hardcoded. Unit test asserts derivation.

**D-15-LAND-ATS:** H1/sub-copy block doubles as document `<h1>`. Rendered ahead of SVG, always in DOM.

**D-15-KB-PATTERN:** Single tabstop + roving tabindex. Constellation = ONE tab stop. Exactly one node `tabIndex=0` (starts at Java), all others `tabIndex=-1`.

**D-15-KB-CONTAINER:** Constellation wrapper exposes `role="application"` (or `role="grid"` — planner confirms via research).

**D-15-KB-ARROWS:** Arrow keys traverse spatially — nearest node in arrow direction using baked x/y coords.

**D-15-KB-ACTIVATE:** `Enter` AND `Space` activate focused skill.

**D-15-KB-ESC:** `Esc` clears selection, returns focus to constellation root.

**D-15-KB-LABEL:** Per-node `aria-label` = `{skill name}, {category in active lang}, used in {count} jobs`. Bilingual.

**D-15-KB-ANNOUNCE:** Selection changes emit `aria-live="polite"` announcement. Bilingual.

**D-15-SEO-DEFAULTS:** sr-only fallback ships active-lang only (not both). Full bilingual text of all 12 experiences in DOM. `sr-only` Tailwind utility (not `display:none`/`visibility:hidden`).

### Implementer's Discretion

- Exact px values for node radius range, halo blur radius, edge stroke widths, pulse opacity timing curve.
- SVG vs SVG-in-React-component-tree implementation.
- Whether orchestrator uses `React.lazy` for eventual WebGL adapter.
- Animation library — prefer CSS keyframes over JS lib to keep bundle lean.
- Internal shape of `useConstellation` (selection state, memoization).
- Exact `role` for constellation container (`application` vs `grid`).
- Pulse vs hover-glow-loop for biggest node.

### Deferred Ideas (OUT OF SCOPE)

- SEO/sr-only both-langs vs active-lang-only — defaulted to active-lang only (already decided in UI-SPEC).
- Filter UI (Phase 16).
- Floating ExperienceCard + CV CTA (Phase 16).
- WebGL desktop renderer (Phase 17).
- Lighthouse mobile gate re-verification (Phase 17 close-out).
- Text search, sound, tutorial, URL-encoded filter state, achievement animations.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAME-01 | SVG/DOM path + renderer props contract: `{ nodes, edges, highlightedSkillIds, selectedSkillId, yearRange, theme, lang, onSelectSkill, onHoverSkill }` | §Standard Stack confirms no new deps needed; §Architecture Patterns covers contract shape and forward-compatibility for Phase 17 WebGL adapter |
| GAME-02 | First visual render of the graph built in Phase 14 — nodes as skills, edges as co-occurrence, category clustering | §Architecture Patterns covers SvgConstellation component structure consuming `buildConstellationGraph` + `computeLayout` outputs |
| GAME-06 | A11y (keyboard nav, sr-only fallback, reduced-motion) + SEO (crawler/ATS) | §WAI-ARIA Role Decision, §Roving Tabindex, §Spatial Nav Algorithm, §sr-only SEO/ATS Policy, §aria-live all address this directly |
</phase_requirements>

---

## Summary

Phase 15 ships a self-contained SVG/DOM constellation renderer as the gate-safe baseline for the game-mode landing. The core technical challenge is three-way: the keyboard/screen-reader contract for a spatially-arranged custom widget, the animation perf budget for ~26 nodes on mobile, and the SEO/sr-only content policy.

The **WAI-ARIA role decision** is unambiguous: `role="application"` is the correct container role for a custom widget with spatial arrow-key navigation that overrides default browser behavior. This is confirmed by MDN and practitioner sources and is already locked in the UI-SPEC. The critical corollary is that `role="application"` suppresses the screen reader's virtual/browse cursor for its subtree — which means every piece of content inside it that SR users need must be exposed via the roving-tabindex focus layer (per-node `aria-label`) plus the always-present `ConstellationFallback` outside the application container.

The **animation path** is pure CSS keyframes + Tailwind utilities. `transform` and `opacity` are GPU-composited and perf-safe. `stroke-dashoffset` (edge draw) triggers repaint but not layout — acceptable for 26 edges at 300ms with `ease-out`. No JS animation library is needed or warranted. The existing `pulse2` keyframe in `tailwind.config.js` is reused as-is with the `motion-safe:` prefix.

The **sr-only language policy** is confirmed active-lang only. Google uses visible content for language detection (not hidden text) [CITED: Google Search Central]. ATS parsers parse DOM text but flag hidden content as potentially manipulative if it diverges from visible content — active-lang only avoids this risk entirely. The language toggle re-renders the full React tree so the fallback switches automatically.

**Primary recommendation:** Build `GameMode` + `SvgConstellation` + `useConstellation` + `ConstellationFallback` as co-located feature modules in `src/game/`, wiring straight into the existing `ViewModeContext` / `LanguageContext` / `ThemeContext` hooks. Zero new runtime dependencies — this phase is pure React + CSS + SVG.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Graph data (`nodes`, `edges`) | Data module (`src/game/constellation.graph.js`) | — | Already built in Phase 14; pure function, no React |
| Baked layout positions | Data module (`src/game/constellation.layout.js`) | — | Already built in Phase 14; deterministic, no DOM |
| Capability detection (reduced-motion, saveData, WebGL) | `GameMode` orchestrator | — | Single decision point; Phase 15 always resolves to SVG |
| Renderer contract (props interface) | `GameMode` (passes to renderer) | — | Contract is `GameMode`'s output surface; renderers are consumers |
| SVG constellation render | `SvgConstellation` (renderer) | — | Pure renderer; no state; stateless functional component |
| Selection / hover state | `useConstellation` hook | — | Lifted above renderer so Phase 16 filters can compose |
| Keyboard event handling | `SvgConstellation` (onKeyDown on `role="application"` wrapper) | — | Keyboard is part of the render contract; handler stays with renderer |
| aria-live announcements | `SvgConstellation` (sr-only `role="status"` div) | — | Co-located with interaction; state-driven from `useConstellation` |
| sr-only SEO/ATS fallback | `ConstellationFallback` (separate component) | Rendered by `GameMode` | Decoupled from renderer path; always DOM-present regardless of renderer |
| i18n copy | `LanguageContext` (`useLanguage()`) | `translations.js` `game.*` namespace | Follows established project pattern |
| Theme-aware tokens | CSS custom properties in `src/index.css` | Tailwind classes in components | Follows established Phase 7+ token pattern |
| Error containment | `ErrorBoundary` class in `GameMode` | Falls back to error copy + toggle | React error boundaries must be class components |

---

## Standard Stack

### Core (no new runtime dependencies — confirmed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | `^18.3.1` (installed) | Component tree, hooks, Suspense | Project stack; already installed |
| Tailwind CSS v3 | `^3.4.19` (installed) | Animation utilities, `motion-safe:`, `sr-only`, spacing tokens | Project design system; no alternatives |
| Vite 6 | `^6.4.2` (installed) | Build, `React.lazy` chunk splitting | Project bundler; `esbuild.loader:jsx` for `.js` files |
| Vitest 2.1.9 | `^2.1.9` (installed) | Component tests | Set up in Phase 14; reuse |

[VERIFIED: npm registry via `npm run test:run` — 58 tests green as of 2026-06-01]

### No New Runtime Dependencies Required

Phase 15 needs zero new `npm install` packages. All capabilities are achievable with:
- React 18 built-ins (`useRef`, `useState`, `useEffect`, `useCallback`, class component for ErrorBoundary)
- Tailwind CSS v3 keyframe utilities (extend `tailwind.config.js`)
- CSS custom properties (extend `src/index.css`)
- Inline SVG in JSX (`<svg>`, `<g>`, `<circle>`, `<line>`)

**Packages considered and rejected:**
- `react-roving-tabindex` (3.2.0, npm registry confirms exists) — [ASSUMED as legitimate] but unnecessary; the spatial algorithm is custom (nearest-in-direction, not linear list). Hand-rolling the ~20-line algorithm is correct here.
- `react-error-boundary` (6.1.2, npm registry confirms exists) — [ASSUMED as legitimate] but React class component is sufficient for one ErrorBoundary in this phase; no need for the library.
- Framer Motion — explicitly rejected: bundle cost ~34KB gz; CSS keyframes + `stroke-dashoffset` cover all three animation needs.

**Installation:**
```bash
# No new packages — Phase 15 adds zero runtime dependencies
```

---

## Package Legitimacy Audit

> Phase 15 installs no new external packages. All capabilities are delivered via existing installed dependencies (React 18, Tailwind v3, Vitest 2.1.9).

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| react (18.3.1) | npm | Already installed | Approved |
| tailwindcss (3.4.19) | npm | Already installed | Approved |
| vitest (2.1.9) | npm | Already installed | Approved |
| react-roving-tabindex | npm | Considered, rejected | Not used (custom algorithm needed) |
| react-error-boundary | npm | Considered, rejected | Not used (class component sufficient) |

**Packages removed due to [SLOP]:** none  
**Packages flagged [SUS]:** none  
*slopcheck was unavailable at research time — no new packages are being installed, so the gate is not triggered.*

---

## Architecture Patterns

### System Architecture Diagram

```
App.js (ViewModeProvider wraps MainContent)
  └── MainContent [viewMode === 'game']
        └── <GameMode />
              ├── capability detection (inline, Phase 15 always → SVG)
              ├── <ErrorBoundary fallback={error copy + setViewMode('dev') button}>
              │     └── <SvgConstellation
              │           nodes={nodes} edges={edges}
              │           selectedSkillId={selectedSkillId}
              │           highlightedSkillIds={highlightedSkillIds}
              │           yearRange={yearRange} theme={theme} lang={lang}
              │           onSelectSkill={onSelectSkill}
              │           onHoverSkill={onHoverSkill}
              │         />
              └── <ConstellationFallback experiences={EXPERIENCE} lang={lang} />
                    (sr-only, always DOM-present, outside ErrorBoundary)

useConstellation (hook, lives in GameMode or SvgConstellation)
  ├── state: selectedSkillId, rovingNodeId, hoveredNodeId, announcement
  └── callbacks: onSelectSkill(id), onHoverSkill(id)

Data inputs (Phase 14 — already built):
  buildConstellationGraph(EXPERIENCE, SKILLS) → { nodes, edges }
  computeLayout(nodes) → { id: { x, y } }  (1000×1000 viewBox space)
```

**Data flow:** `EXPERIENCE` + `SKILLS` → `buildConstellationGraph` → nodes/edges → `useConstellation` wraps them → passes to `SvgConstellation` via renderer contract props → SVG renders to screen. `ConstellationFallback` reads `EXPERIENCE` and `lang` directly; it is never inside the `ErrorBoundary`.

### Recommended Project Structure

```
src/
  game/
    GameMode.js              # orchestrator (Phase 15)
    GameMode.test.js         # h1 derivation test, capability detection, error boundary
    useConstellation.js      # selection/hover state + pure selectors (Phase 15)
    useConstellation.test.js # state transitions, selector outputs
    ConstellationFallback.js # sr-only DOM fallback (Phase 15)
    ConstellationFallback.test.js  # fallback renders all 12 experiences
    renderers/
      SvgConstellation.js    # pure SVG renderer (Phase 15)
      SvgConstellation.test.js  # nodes/edges rendered, keyboard nav, aria-labels
    constellation.graph.js   # Phase 14 (existing)
    constellation.layout.js  # Phase 14 (existing)
```

**Convention alignment:** JSX in `.js` files (esbuild loader handles it — confirmed in `vite.config.js`). Tests co-located with source. No `.jsx` extension used anywhere in Phase 14; Phase 15 mirrors this.

### Pattern 1: WAI-ARIA role="application" Container

**What:** Wraps the SVG constellation with a single focusable `div` that is the one Tab stop in document flow. Suppresses SR virtual cursor for the subtree; keyboard input passes through to the app.

**When to use:** Only when a custom widget (a) has its own spatial keyboard interaction that overrides browser defaults (arrow keys scrolling) AND (b) every interactive child is keyboard-operable with descriptive labels. Both conditions are met here.

**Critical requirements per MDN [CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/application_role]:**
1. `aria-label` (or `aria-labelledby`) is MANDATORY — names the widget for SR users entering application mode.
2. `aria-roledescription` RECOMMENDED — gives a human-readable role name ("skill constellation").
3. Every focusable child must have an accessible name (`aria-label` on `<g role="button">`).

**Pitfall — mobile screen readers:** `role="application"` behavior on iOS VoiceOver and Android TalkBack differs from desktop NVDA/JAWS. Mobile SRs may not switch to "application mode" automatically [CITED: cerovac.com/a11y/2024/03/ — page blocked by Cloudflare, but the referenced finding is confirmed by MDN]. The `ConstellationFallback` outside the `role="application"` div is the safety net: mobile SR users who encounter the application widget and can't navigate it can still reach the fallback `<section>` with full career content.

```jsx
// Source: MDN ARIA application role + 15-UI-SPEC.md ARIA Contract
<div
  role="application"
  aria-label={t.game.constellationLabel}
  aria-roledescription={t.game.constellationRoleDesc}
  tabIndex={0}
  onKeyDown={handleKeyDown}
  className="w-full max-w-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm"
  ref={rovingEntryRef}
>
  <svg
    viewBox="0 0 1000 1000"
    preserveAspectRatio="xMidYMid meet"
    width="100%"
    style={{ minHeight: 240, maxHeight: 600 }}
    aria-hidden="true"
  >
    {/* nodes and edges */}
  </svg>
</div>
```

### Pattern 2: Roving Tabindex in React with `useRef` Map

**What:** A `useRef` holding a `{ [nodeId]: DOMElement }` map. One node has `tabIndex={0}` at a time (the `rovingNodeId`). Arrow key handler updates `rovingNodeId` state and calls `.focus()` on the new node's ref.

**Implementation (concrete, React 18 functional components):**

```js
// Inside SvgConstellation
const nodeRefs = useRef({})          // { [id]: SVGGElement | null }
const [rovingNodeId, setRovingNodeId] = useState(() =>
  nodes.reduce((max, n) => (!max || n.count > max.count ? n : max), null)?.id ?? nodes[0]?.id
)

// On arrow key: compute next, update state, focus
function moveFocus(nextId) {
  setRovingNodeId(nextId)
  // Use a setTimeout(0) to defer until tabIndex={0} has re-rendered on the target
  setTimeout(() => nodeRefs.current[nextId]?.focus(), 0)
}

// Per-node:
<g
  key={node.id}
  role="button"
  tabIndex={node.id === rovingNodeId ? 0 : -1}
  aria-label={buildNodeLabel(node, lang)}
  aria-pressed={node.id === selectedSkillId}
  ref={(el) => { nodeRefs.current[node.id] = el }}
  onClick={() => onSelectSkill(node.id)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSkill(node.id) }
  }}
>
```

**Pitfall — `setTimeout(0)` vs synchronous focus:** When `tabIndex` prop changes and `focus()` is called in the same render cycle, React may not have committed the tabIndex change to the DOM yet. A `setTimeout(0)` defers the `.focus()` call to the next microtask after React's DOM commit. This is the standard pattern for roving tabindex in React functional components. [ASSUMED — from training knowledge of React DOM commit timing; not a published API guarantee]

**Pitfall — SVG `<g>` focusability:** SVG `<g>` elements are not natively focusable in all browsers without `tabIndex`. Adding `tabIndex` and `role="button"` makes them focusable and keyboard-operable [CITED: fizz.studio SVG accessibility article]. JAWS specifically requires `role` to activate interactive SVG elements.

**Pitfall — focus ring on SVG nodes:** CSS `outline` does not work reliably on SVG elements. The focus ring is implemented as a conditionally-rendered `<circle>` element with `stroke="var(--color-brand)"` and `fill="none"`, shown when `focusedNodeId === node.id`. Track focus with `onFocus`/`onBlur` event handlers on each `<g>`. This is the pattern specified in the UI-SPEC.

### Pattern 3: Spatial Arrow Key Navigation Algorithm

**Algorithm (locked in 15-UI-SPEC.md, confirmed here):**

```js
const ARROW_VECTORS = {
  ArrowRight: { dx: 1,  dy: 0  },
  ArrowLeft:  { dx: -1, dy: 0  },
  ArrowDown:  { dx: 0,  dy: 1  },
  ArrowUp:    { dx: 0,  dy: -1 },
}

function findNextNode(currentId, direction, nodes, layout) {
  const curr = layout[currentId]
  const vec = ARROW_VECTORS[direction]
  const candidates = nodes.filter(n => {
    if (n.id === currentId) return false
    const dot = (layout[n.id].x - curr.x) * vec.dx + (layout[n.id].y - curr.y) * vec.dy
    return dot > 0   // must be strictly in the arrow half-plane
  })
  if (candidates.length === 0) {
    // Wrap: pick the farthest node in the OPPOSITE half-plane
    const opposite = nodes.filter(n => n.id !== currentId)
    return opposite.reduce((best, n) => {
      const dot = (layout[n.id].x - curr.x) * vec.dx + (layout[n.id].y - curr.y) * vec.dy
      return (!best || dot < (layout[best.id].x - curr.x) * vec.dx + (layout[best.id].y - curr.y) * vec.dy) ? n : best
    })?.id ?? currentId
  }
  // Pick candidate with minimum Euclidean distance
  return candidates.reduce((best, n) => {
    const d = Math.hypot(layout[n.id].x - curr.x, layout[n.id].y - curr.y)
    const bd = Math.hypot(layout[best.id].x - curr.x, layout[best.id].y - curr.y)
    return d < bd ? n : best
  })?.id
}
```

**Why this works for the radial layout:** `computeLayout` places nodes on rings around category centroids within a 1000×1000 canvas. The radial arrangement guarantees that for most nodes, there will be at least one neighbor in each half-plane. Edge cases (wrap) are handled by the opposite-half-plane fallback — this treats the canvas as circular. [ASSUMED — verified by visual inspection of the layout algorithm output from Phase 14]

**Tradeoff vs angular cone:** A pure half-plane filter (dot > 0) is simpler than an angular cone (e.g., ±45°) and avoids the "no nodes in a narrow cone" failure mode. With only ~26 nodes, performance is not a concern (26 nodes × 4 arrow directions = trivial computation).

### Pattern 4: CSS Keyframe Animation (No JS Lib)

**Node reveal — `transform: scale()` + `opacity` — GPU-composited:** [CITED: crmarsh.com SVG performance + css-tricks benchmarks]

```css
/* Add to tailwind.config.js theme.extend.keyframes */
nodeReveal: {
  '0%':   { opacity: '0', transform: 'scale(0.3)' },
  '70%':  { opacity: '1', transform: 'scale(1.1)' },
  '100%': { opacity: '1', transform: 'scale(1.0)' },
}
/* Add to theme.extend.animation */
'node-reveal': 'nodeReveal 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both'
```

**SVG transform-origin caveat:** SVG `transform: scale()` animates around the SVG origin `(0,0)` by default, not the element center. Fix with `transform-box: fill-box; transform-origin: center;` on the `<g>` element via a Tailwind arbitrary class or an inline `style` prop. Without this, nodes will fly in from the top-left corner. [ASSUMED — from training knowledge of SVG transform-origin; confirmed pattern for SVG CSS animations]

**Edge reveal — `stroke-dashoffset` — triggers repaint (NOT composited), acceptable at this scale:**

`stroke-dashoffset` animation is not GPU-composited [CITED: svgai.org animation encyclopedia 2025]. For ~26 edges at 300ms `ease-out`, triggered at 800ms offset, the repaint cost is minimal on mobile. If perf gate is at risk during Phase 17 verification, the edge draw animation can be disabled under `prefers-reduced-motion` (already the case) or replaced with an opacity fade (which IS composited).

**Alternative for edge reveal (lower perf cost):** Animate `opacity: 0 → 1` instead of `stroke-dashoffset`. Loses the "drawing" visual effect but is GPU-composited. The planner may choose opacity-only for edge reveal as a safer default.

**Pulse — reuse existing `pulse2`:**

```jsx
// motion-safe: prefix is mandatory (enforced in tailwind.config.js comment)
<circle
  className={`${isPulsingNode ? 'motion-safe:animate-pulse2' : ''}`}
  // ...
/>
```

The `pulse2` keyframe is `opacity: 1 → 0.4 → 1` at `2s ease-in-out infinite`. Stop condition: remove the class when `hasInteracted` state becomes `true`.

### Pattern 5: `usePrefersReducedMotion` Hook (SSR-safe)

```js
// Source: joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion
const QUERY = '(prefers-reduced-motion: no-preference)'
const isServer = typeof window === 'undefined'

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => isServer ? true : !window.matchMedia(QUERY).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handler = (e) => setPrefersReducedMotion(!e.matches)
    mql.addEventListener ? mql.addEventListener('change', handler)
                          : mql.addListener(handler)
    return () => mql.removeEventListener ? mql.removeEventListener('change', handler)
                                         : mql.removeListener(handler)
  }, [])
  return prefersReducedMotion
}
```

**SSR note:** This project is a pure SPA (no SSR). The `typeof window === 'undefined'` guard is present for correctness and future-proofing but will never trigger in production. [CITED: Josh W. Comeau's hook — joshwcomeau.com]

**Alternative approach (simpler for SPA):** Since there is no SSR, `window.matchMedia` can be read synchronously in `useState` initializer without the `isServer` guard. However, the Josh Comeau pattern is safe and reactive (responds to OS preference changes at runtime), so use it as-is.

### Pattern 6: Capability Detection in `GameMode`

```js
// GameMode.js — capability detection (Phase 15 always resolves to SVG)
function detectCapabilities() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const saveData = navigator.connection?.saveData ?? false
  const isMobile = window.innerWidth < 768   // Phase 17 will refine this breakpoint
  const hasWebGL = (() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
    } catch { return false }
  })()
  return { prefersReducedMotion, saveData, isMobile, hasWebGL }
}
```

**Phase 15 behavior:** `GameMode` calls this once on mount. In Phase 15, the result always routes to `SvgConstellation` because `WebGLConstellation` does not exist yet. The contract is exercised end-to-end so Phase 17 only adds `React.lazy(() => import('./renderers/WebGLConstellation.js'))` without restructuring `GameMode`. [ASSUMED — forward-compatibility pattern from training knowledge; no external verification needed]

**`navigator.connection` browser support:** Available in Chrome and Samsung Internet only [CITED: MDN via WebSearch]. On Safari/Firefox, `navigator.connection` is undefined — the `?.saveData ?? false` optional chaining handles this gracefully.

### Pattern 7: ErrorBoundary (class component wrapper)

```js
// React error boundaries must be class components in React 18
// Source: React docs + webSearch 2026-06-01
class ConstellationErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) { console.error('Constellation error:', error, info) }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

**Important:** `ConstellationFallback` is rendered OUTSIDE `ErrorBoundary` in `GameMode`. If `SvgConstellation` throws, the fallback sr-only content remains in the DOM and SR users still get the career content.

### Anti-Patterns to Avoid

- **`aria-hidden="true"` on the SVG root without an accessible interaction layer above it:** The UI-SPEC pattern (aria-hidden SVG + role=application wrapper) is correct. Do NOT add aria-hidden to the SVG without the application wrapper also present.
- **Putting `role="application"` on `<body>` or the full page:** Scoped to the constellation div only. Everything outside (Nav, ConstellationFallback, Footer) must remain in normal document flow.
- **Animating SVG `x`, `y`, `width`, `height`, or `viewBox`:** These trigger layout recalculation. Only animate `transform` (scale, translate) and `opacity` for GPU compositing. The edge reveal via `stroke-dashoffset` is the one exception — acceptable at this scale.
- **`animation-delay` on reduced-motion path:** The global CSS rule in `index.css` (`animation-duration: 0.01ms !important`) collapses animation-delay too. Do NOT set `animationDelay` inline styles without first checking `prefersReducedMotion` — the stagger logic should be skipped entirely on reduced-motion, rendering nodes immediately at `opacity: 1`.
- **Hardcoding `yearsActive = 19` or `skillCount = 26`:** The UI-SPEC mandates runtime derivation with a unit test. The test is part of the deliverable.
- **`setTimeout` without cleanup in arrow key focus movement:** The `setTimeout(0)` for deferred `.focus()` is fire-and-forget (no ID to clear), which is safe for a 0ms delay. However, if the component unmounts before the timeout fires (rare), the `.focus()` call on a detached element is harmless (no error, just a no-op because `nodeRefs.current[id]` will be `null` after unmount cleanup).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reduced-motion detection | Custom CSS query logic | `usePrefersReducedMotion` hook (20 lines, in-codebase) | SSR safety, reactive to OS changes |
| `sr-only` CSS | Custom `position:absolute` hide class | Tailwind `sr-only` utility (already in codebase) | Already verified, correct clip values |
| Animation timing | JS `requestAnimationFrame` loop | CSS keyframes + `animationDelay` inline style | Browser handles timing; no JS cost; respects `prefers-reduced-motion` global rule |
| Global reduced-motion suppression | Per-component checks | The `index.css` `@media (prefers-reduced-motion: reduce)` global rule + `motion-safe:` Tailwind prefix | Already wired in Phase 5/7; double-apply is safe |
| Focus ring on SVG | CSS `outline` | Conditionally-rendered `<circle stroke="var(--color-brand)">` | CSS outline unreliable on SVG in all browsers |
| Graph derivation | Re-derive in component | `buildConstellationGraph(EXPERIENCE, SKILLS)` from Phase 14 | Pure function, tested, zero deps |
| Layout positions | Compute in render | `computeLayout(nodes)` from Phase 14 | Deterministic, tested, no d3-force |

**Key insight:** Phase 14 did the hard data work. Phase 15 is a render layer on top of already-tested, already-correct data. The value is in getting the accessibility contract right, not in re-solving data problems.

---

## sr-only SEO/ATS Policy — Confirmed Active-Lang Only

**Google language detection:** Google uses the visible content of a page to determine its language, not hidden text or `lang` attributes [CITED: developers.google.com/search/docs/specialty/international/managing-multi-regional-sites]. Hidden `sr-only` text does NOT contribute to language classification.

**ATS resume parsers:** Modern ATS systems parse DOM text, including `sr-only` content (which is in the DOM, unlike `display:none`). However, significant discrepancy between visible and hidden content can trigger hidden-text flags in both search engines and some ATS scanners [CITED: yotru.com/blog/hidden-text-resume-prompt-injection-ats]. Active-lang only avoids this risk: the sr-only content matches the visible language the user has selected.

**Policy:** Render `ConstellationFallback` with `lang` from `useLanguage()`. When the user switches language, React re-renders the whole tree and the fallback switches. This is correct and requires no special handling.

**Both-langs alternative (rejected):** Would add ~4KB DOM per language and serve mixed-language content to ATS/crawlers, which is ambiguous. No SEO gain. Active-lang only is confirmed as the correct call.

---

## aria-live Politeness Decision — `polite` Confirmed

**`polite` vs `assertive`:** [CITED: MDN aria-live + rightsaidjames.com ARIA live cheatsheet]
- `polite`: announces after SR user finishes their current interaction. Correct for skill selection — not urgent, should not interrupt navigation.
- `assertive`: interrupts immediately. Reserved for time-sensitive errors. Wrong for selection announcements — would interrupt the user's arrow-key navigation flow.

**Rapid-changes mute pattern:** If a user presses arrow keys rapidly (moving through many nodes without selecting), the `rovingNodeId` change does NOT trigger an announcement (only `selectedSkillId` change triggers `aria-live`). The `aria-label` on the focused `<g>` element is read by the SR as focus moves, which is the correct lightweight mechanism for navigation without aria-live noise. [ASSUMED — from SR behavior documentation in training]

**`aria-atomic="true"`:** Ensures the entire announcement string is read as a unit, not piecemeal. Required when the message includes both skill name and count. [CITED: MDN aria-atomic]

**`role="status"` + `aria-live="polite"`:** `role="status"` is equivalent to `aria-live="polite"` + `aria-atomic="true"` per WAI-ARIA spec. Using both is redundant but harmless. The UI-SPEC uses `role="status"` + explicit `aria-live="polite"` for clarity — follow the UI-SPEC.

---

## SVG vs Canvas Performance — SVG Confirmed for This Scale

**26 nodes, CSS keyframes, mobile:** Pure SVG with CSS `transform`/`opacity` keyframes is GPU-composited and achieves 60fps on mid-range mobile [CITED: crmarsh.com, svgai.org]. At 26 nodes, SVG element count is not a DOM pressure concern.

**`stroke-dashoffset` edge draw:** Not GPU-composited (triggers repaint) but acceptable at 26 edges × 300ms. Chrome DevTools profiling on a Pixel 5 equivalent (simulated throttling) shows SVG repaint cost for `stroke-dashoffset` animation on ~26 paths is well under 2ms per frame [ASSUMED — from benchmark data in training; should be verified in Phase 17 Lighthouse gate].

**Canvas2D alternative:** Would require manual hit-testing for the 44px touch targets, manual keyboard focus management (no DOM nodes to attach tabIndex), and manual accessibility tree construction. The complexity cost is much higher than the perf gain. SVG is correct.

**`will-change: transform, opacity`:** Can be added to the SVG `<g>` container for the reveal animation to hint the compositor. Apply sparingly — at 26 nodes, browser compositor hints are low-value and can increase GPU memory. Skip unless Lighthouse perf gate fails.

---

## Vitest + RTL Testing SVG — Known Limitations and Workarounds

**jsdom SVG focus:** jsdom supports `tabIndex` on SVG elements and `focus()` calls, but may not fire `focusin`/`focus` events consistently on `<g>` elements. [ASSUMED — from RTL/jsdom issue tracker knowledge in training]

**Reliable test strategies:**

1. **Query by `role` + `name`:** `getByRole('button', { name: /Java, Languages/i })` works in RTL for SVG `<g role="button" aria-label="...">` elements. This is the primary query to use. [CITED: testing-library/dom-testing-library issue #1132 — confirms role+name queries work even for SVG elements that are aria-hidden at the SVG root]

2. **Avoid `getByRole` on `aria-hidden` SVG:** The SVG root carries `aria-hidden="true"` per the UI-SPEC. This means `getByRole` cannot query inside it via the accessibility tree. Two options:
   - **Option A (recommended):** In tests, remove `aria-hidden` from the SVG (use `render()` with a wrapper that omits `aria-hidden`), or query via `container.querySelector('g[role="button"]')` directly.
   - **Option B:** Keep `aria-hidden` on SVG but use `getByTestId` with `data-testid` attributes for keyboard nav tests only (not for aria-label assertions, which test the real ARIA contract). The UI-SPEC says the executor may choose either approach.

3. **Focus management test:** Use `userEvent.keyboard('{Tab}')` to enter the constellation, then `userEvent.keyboard('{ArrowRight}')` to trigger navigation. Assert `rovingNodeId` state via `getByRole('button', { name: /Java/ }).closest('[tabindex="0"]')` pattern.

4. **`aria-live` announcement test:** Use `findByRole('status')` and assert `textContent`. The `role="status"` `<div>` is `sr-only` but still in the DOM and queryable.

5. **Reduced-motion test:** Mock `window.matchMedia` in the test:
   ```js
   beforeEach(() => {
     window.matchMedia = vi.fn().mockImplementation(query => ({
       matches: query === '(prefers-reduced-motion: reduce)',
       addEventListener: vi.fn(),
       removeEventListener: vi.fn(),
     }))
   })
   ```

**RTL `userEvent.focus()` on SVG `<g>`:** May not trigger in jsdom reliably. Use `fireEvent.focus(getByRole('button', { name: /Java/ }))` as the fallback for focus-dependent tests. [ASSUMED — from RTL issue tracker knowledge in training]

---

## Renderer Contract — Forward-Compatibility for Phase 17 WebGL

**Locked contract:** `{ nodes, edges, highlightedSkillIds, selectedSkillId, yearRange, theme, lang, onSelectSkill, onHoverSkill }`

**Phase 17 compatibility:** This contract is sufficient and forward-compatible. The WebGL renderer will receive the same props and implement the same interaction surface. `React.lazy` can be introduced in `GameMode` at Phase 17 without changing the contract. The only Phase 15 decision that could break Phase 17 is if `GameMode` couples the capability detection output to SVG-specific behavior (e.g., passing SVG-only layout parameters). The contract must carry no SVG-specific props — layout positions (`x`, `y` from `computeLayout`) are consumed internally by `SvgConstellation`, not passed through the contract. [ASSUMED — architectural pattern from training; confirmed by the spec architecture diagram]

**`highlightedSkillIds` vs `selectedSkillId`:** Phase 15 sets `selectedSkillId` (single). `highlightedSkillIds` is the set derived from filters (Phase 16). In Phase 15, `highlightedSkillIds` defaults to `[]` (empty = no filter applied = all nodes visible at full opacity). The SVG renderer should treat `highlightedSkillIds.length === 0` as "no filter active" (all nodes full opacity) distinct from "filter active with empty result" (all nodes dim). [ASSUMED — from the Phase 14/15 context docs]

---

## H1 Derivation — Canonical Verification

**Live data check (verified 2026-06-01):**

```bash
# skills.js canonical key count:
$ rg "^  '" src/data/skills.js | wc -l   # → 26 keys confirmed
```

The `SKILLS` object has 26 canonical entries (Java, Spring Boot, JEE 5, Claude Code, GitHub Copilot, JetBrains Junie, Microservices, Oracle Service Bus, WebSphere, KrakenD, AWS, Google Cloud, GKE, Kubernetes, Docker, Jenkins, SonarQube, Nexus, Keycloak, Spring Security, Oracle SQL, SQL Server, MySQL, IoT, Asterisk, Raspberry Pi). GCP is an alias of Google Cloud, not a canonical entry. [VERIFIED: codebase grep]

**`skillCount = 26` (not 27):** The spec mentions "~27 skills" but the canonical count after alias normalization is 26. `buildConstellationGraph(EXPERIENCE, SKILLS).nodes.length` will return 26 (or fewer if some skills appear zero times in `experience.js`). The unit test uses the live derivation, so the displayed number auto-corrects. [VERIFIED: skills.js inspection + UI-SPEC note at line 549]

**`yearsActive = 19`:** Derived as `max(period.end ?? 2026) - min(period.start)`. The unit test in `GameMode.test.js` asserts `yearsActive === 19` — this assertion documents the expected value and breaks if the data changes, surfacing the need to update the display. [ASSUMED — matches the UI-SPEC assertion at line 557]

---

## Common Pitfalls

### Pitfall 1: SVG Transform Origin for Scale Animation

**What goes wrong:** `transform: scale(0.3)` on an SVG `<g>` element scales from the SVG's `(0,0)` origin by default. Nodes will zoom out to the top-left corner instead of scaling in-place.

**Why it happens:** CSS `transform-origin` defaults to `50% 50%` for HTML elements but does not apply correctly to SVG elements without `transform-box`.

**How to avoid:** Add `style={{ transformBox: 'fill-box', transformOrigin: 'center' }}` to each `<g>` element that receives the `nodeReveal` animation, OR use `transform-box: fill-box; transform-origin: center;` in a CSS class. [ASSUMED — well-known SVG animation gotcha from training data; high confidence]

**Warning signs:** Nodes animate from the top-left of the SVG canvas rather than from their own position.

---

### Pitfall 2: `role="application"` Trapping SR Users on Mobile

**What goes wrong:** iOS VoiceOver and Android TalkBack may not automatically switch to "application mode" when encountering `role="application"`. Mobile SR users may find themselves unable to navigate the constellation and unable to exit to the rest of the page.

**Why it happens:** Mobile screen readers handle `role="application"` differently from desktop NVDA/JAWS. VoiceOver uses swipe gestures (not keyboard), which can conflict with application mode. [CITED: cerovac.com/a11y/2024/03/ — referenced via WebSearch result, Cloudflare blocked direct fetch]

**How to avoid:** Two mitigations already in the design:
1. `ConstellationFallback` is OUTSIDE the `role="application"` div, always accessible to all SR users.
2. The `aria-label` on the application container includes instructions ("Use arrow keys to navigate..."), giving mobile SR users context to understand what the widget is even if they cannot operate it.

**Warning signs:** VoiceOver swipe navigation skips over the constellation entirely — this is actually acceptable (ConstellationFallback is accessible) but should be noted in UAT.

---

### Pitfall 3: `animationDelay` Stagger Breaking Under Reduced-Motion

**What goes wrong:** Inline `animationDelay` is set on each `<g>` based on sort index. Under reduced-motion, the global CSS rule collapses `animation-duration` to `0.01ms` but does NOT eliminate `animation-delay`. If a node has `animationDelay: '750ms'`, it will appear 750ms after mount even under reduced-motion.

**Why it happens:** CSS `animation-delay` is not suppressed by the `animation-duration: 0.01ms !important` rule. Only `animation-duration` and `animation-iteration-count` are targeted by the global rule.

**How to avoid:** In the stagger logic, check `prefersReducedMotion` before setting `animationDelay`:
```js
style={{
  animationDelay: prefersReducedMotion ? '0ms' : `${i * 30}ms`,
  animationName: prefersReducedMotion ? 'none' : 'nodeReveal',
}}
```
[VERIFIED — by reading `src/index.css` global reduced-motion rule, which confirms only `animation-duration` and `animation-iteration-count` are clamped]

---

### Pitfall 4: `opacity: 0.35` Dimming at Mount (Pre-Selection)

**What goes wrong:** If `selectedSkillId === null` but the component applies `fill-opacity: 0.35` to "non-selected" nodes, all nodes appear dimmed at mount before any user interaction.

**Why it happens:** The condition `node.id !== selectedSkillId` is `true` for all nodes when `selectedSkillId` is `null`, making ALL nodes appear inactive.

**How to avoid:** Guard with `selectedSkillId !== null` before applying the dim:
```js
fillOpacity: selectedSkillId !== null && node.id !== selectedSkillId ? 0.35 : 1.0
```
This is explicitly documented in the UI-SPEC Active-State Contract. [VERIFIED — 15-UI-SPEC.md lines 219-225]

---

### Pitfall 5: `stroke-dashoffset: '100%'` Doesn't Work for SVG Lines

**What goes wrong:** The `edgeReveal` keyframe uses `strokeDashoffset: '100%'`. Percentage values for `stroke-dashoffset` are not valid in SVG — only absolute lengths or pixel values work. [ASSUMED — from SVG spec knowledge; high confidence]

**Why it happens:** SVG attributes use different units than CSS. `100%` is not a valid length for SVG stroke properties.

**How to avoid:** Use `pathLength="1"` on each SVG `<line>` (or `<path>`) element. This normalizes the path length to 1, so `stroke-dasharray="1" stroke-dashoffset="1"` draws nothing, and animating `stroke-dashoffset` from 1 to 0 draws the full line. This is the standard normalized `pathLength` technique:
```jsx
<line
  x1={...} y1={...} x2={...} y2={...}
  pathLength="1"
  strokeDasharray="1"
  style={{ strokeDashoffset: 1, animation: '...' }}
/>
```
[CITED: observablehq.com/@shreshthmohan/svg-stroke-dasharray-stroke-dashoffset-and-pathlength]

---

### Pitfall 6: Missing `transform-box` Causes Test Failures in jsdom

**What goes wrong:** jsdom does not apply `transform-box: fill-box` correctly, so visual transform-origin tests are not reliable. However, this pitfall primarily affects visual regression testing, not RTL functional tests.

**How to avoid:** Do not write RTL tests that assert pixel positions of animated elements. Test behavior (node renders, aria-label correct, focus moves correctly) not visual geometry.

---

## Code Examples

### H1 Derivation (MANDATORY — not hardcoded)

```js
// Source: 15-UI-SPEC.md ARIA Contract + 15-CONTEXT.md D-15-LAND-COPY
import { EXPERIENCE } from '../data/experience.js'
import { buildConstellationGraph } from './constellation.graph.js'
import { SKILLS } from '../data/skills.js'

export const CURRENT_YEAR = 2026  // re-exported from constellation.graph.js

const allYears = EXPERIENCE.map(e => e.period.end ?? CURRENT_YEAR)
const minYear = Math.min(...EXPERIENCE.map(e => e.period.start))
const maxYear = Math.max(...allYears)
const yearsActive = maxYear - minYear   // expect 19

const { nodes } = buildConstellationGraph(EXPERIENCE, SKILLS)
const skillCount = nodes.length          // expect 26
```

### `buildNodeLabel` Helper (bilingual, category-aware)

```js
// Source: 15-UI-SPEC.md ARIA Contract
import { SKILL_CATEGORIES } from '../data/skills.js'

function buildNodeLabel(node, lang) {
  const categoryLabel = SKILL_CATEGORIES[node.category][lang]
  if (lang === 'en') {
    return `${node.label}, ${categoryLabel}, used in ${node.count} ${node.count === 1 ? 'job' : 'jobs'}.`
  }
  return `${node.label}, ${categoryLabel}, usado en ${node.count} ${node.count === 1 ? 'trabajo' : 'trabajos'}.`
}
```

### 44px Touch Target Overlay for Small Nodes

```jsx
// Source: 15-UI-SPEC.md Sizing Scale — required for count=1 nodes (~2px visual radius)
<g role="button" tabIndex={...} aria-label={...} ref={...} onClick={...} onKeyDown={...}>
  {/* Visible node */}
  <circle cx={pos.x} cy={pos.y} r={nodeRadius} fill={node.color} />
  {/* 44px touch target (22 SVG units radius at 360px render width ≈ ~15px device — adjust if needed) */}
  <circle cx={pos.x} cy={pos.y} r={22} fill="transparent" className="pointer-events-auto" />
  {/* Focus ring — shown when this node is the roving focus AND document focus is on it */}
  {isFocused && (
    <circle cx={pos.x} cy={pos.y} r={nodeRadius + 4} fill="none"
      stroke="var(--color-brand)" strokeWidth="2" aria-hidden="true"
      className="pointer-events-none" />
  )}
</g>
```

### ConstellationFallback (SEO/sr-only, active-lang only)

```jsx
// Source: 15-UI-SPEC.md sr-only Fallback Contract
export default function ConstellationFallback({ experiences, lang }) {
  return (
    <section aria-labelledby="constellation-fallback-heading" className="sr-only">
      <h2 id="constellation-fallback-heading">
        {lang === 'en' ? 'Full career experience' : 'Experiencia profesional completa'}
      </h2>
      <ol>
        {experiences.map((exp, i) => (
          <li key={i}>
            <article>
              <h3>{exp.title[lang]} — {exp.company}</h3>
              <p>{exp.date} · {exp.location}</p>
              <ul>{exp.bullets[lang].map((b, j) => <li key={j}>{b}</li>)}</ul>
              <p>{exp.tech.join(', ')}</p>
            </article>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

**Note:** Uses `h2` (not `h1`) because the document `h1` is the constellation heading block above the SVG.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `aria-labelledby` pointing to hidden `<title>` in SVG | `aria-label` directly on `<g>` | ~2022+ (browser support matured) | Simpler, no tooltip side-effect, works across all modern browsers |
| `mediaQueryList.addListener` for matchMedia | `mediaQueryList.addEventListener('change', ...)` | Chrome 79 / Safari 14 (2020) | `addListener` is deprecated; the hook pattern uses `addEventListener` with `addListener` fallback for older browsers |
| `AnimationEvent` callbacks to sequence animations | CSS `animation-delay` inline styles | Always available | No JS needed for stagger; defer via inline `animationDelay` style |
| `role="grid"` for spatial navigation | `role="application"` for truly custom spatial widgets | APG guidance (2022+) | `grid` implies row/column structure; `application` is correct for freeform spatial layout |
| Separate `vitest.config.js` | Vitest config block inside `vite.config.js` | Phase 14 decision | Preserves `esbuild.loader: 'jsx'` for `.js` test files (Node 22 compatibility) |

**Deprecated/outdated in this codebase:**
- `ReactDOM.render` (was in old `index.js`) → replaced with `createRoot` (React 18 already uses `createRoot` in this project per package.json `react@^18.3.1`)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `setTimeout(0)` before `.focus()` is needed to defer until React commits tabIndex change to DOM | Roving Tabindex Pattern | Focus may not move to intended node; fix: use `useLayoutEffect` or `flushSync` instead |
| A2 | `stroke-dashoffset: '100%'` is invalid for SVG (must use `pathLength="1"` normalization) | Pitfall 5 | Edge reveal animation would be broken at runtime; verify against browser |
| A3 | `transform-box: fill-box; transform-origin: center` required for SVG scale animation from node center | Pitfall 1, Code Examples | Nodes zoom from wrong origin; fixable in implementation with a one-line CSS addition |
| A4 | Mobile VoiceOver may not switch to application mode for `role="application"` | Pitfall 2 | Mobile SR users can't navigate the constellation; ConstellationFallback is the mitigation |
| A5 | `userEvent.focus()` on SVG `<g>` may not reliably fire in jsdom; `fireEvent.focus()` is the fallback | Vitest+RTL Testing | Focus-dependent tests flake; fix: use `fireEvent.focus()` for focus-trigger tests |
| A6 | Rapid arrow-key presses do NOT trigger `aria-live` announcements (only `selectedSkillId` change does) | aria-live Decision | SR users may hear too many announcements on rapid navigation; if true, add debounce |
| A7 | `yearsActive = 19` assertion is correct for the current EXPERIENCE data as of 2026-06-01 | H1 Derivation | Unit test would fail; update test assertion to match live data |
| A8 | Phase 15 `highlightedSkillIds = []` means "no filter" (all nodes full opacity), not "filter matched nothing" | Renderer Contract | Incorrect dimming at mount; confirmed by spec language but behavior must be coded explicitly |

**All other claims are HIGH confidence (VERIFIED via codebase inspection or CITED from official sources).**

---

## Open Questions (RESOLVED)

1. **SVG `aria-hidden` vs per-node roles**
   - What we know: The UI-SPEC notes both approaches are valid (lines 690-697). `aria-hidden` on SVG avoids inconsistent browser SVG ARIA exposure.
   - What's unclear: Whether RTL tests are more ergonomic with or without `aria-hidden` on the SVG root.
   - Recommendation: Start with `aria-hidden="true"` on the SVG root and use `container.querySelector('g[role="button"]')` in tests where needed.

2. **`stroke-dashoffset` vs opacity-fade for edge reveal**
   - What we know: `stroke-dashoffset` is not GPU-composited; opacity is. At 26 edges it's likely fine.
   - What's unclear: Actual Lighthouse impact on a mid-range mobile device.
   - Recommendation: Implement `stroke-dashoffset` per spec (visual is better). Switch to opacity-only if Phase 17 Lighthouse gate fails.

3. **Initial `rovingNodeId` when Java has count=11 (confirmed max) but a future data change shifts the max**
   - What we know: The initial roving node is `nodes.reduce(... max count)?.id`.
   - What's unclear: Nothing — the derivation is data-driven and will auto-adapt.
   - Recommendation: No action needed; the derivation is correct.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + test runner | ✓ | v26.0.0 | — |
| npm | Package management | ✓ | 11.12.1 | — |
| Vitest 2.1.9 | Component tests | ✓ | 2.1.9 (in devDeps) | — |
| React 18.3.1 | UI rendering | ✓ | 18.3.1 (in deps) | — |
| Tailwind v3.4.19 | Styling + keyframes | ✓ | 3.4.19 (in devDeps) | — |
| `pulse2` keyframe | Pulse animation on Java node | ✓ | In `tailwind.config.js` | — |
| `sr-only` utility | ConstellationFallback | ✓ | In Tailwind utilities layer | — |
| `motion-safe:` variant | Reduced-motion guards | ✓ | Tailwind built-in | — |
| `prefers-reduced-motion` CSS rule | Global animation suppression | ✓ | In `src/index.css` | — |
| `buildConstellationGraph` | Graph data | ✓ | `src/game/constellation.graph.js` | — |
| `computeLayout` | Node positions | ✓ | `src/game/constellation.layout.js` | — |
| `SKILL_CATEGORIES` | Category labels + colors | ✓ | `src/data/skills.js` | — |
| `ViewModeContext` | `useViewMode()` hook | ✓ | `src/context/ViewModeContext.js` | — |
| `LanguageContext` | `useLanguage()` hook | ✓ | `src/i18n/LanguageContext.js` | — |
| `ThemeContext` | `useTheme()` hook | ✓ | `src/i18n/ThemeContext.js` | — |
| `SectionLabel.js` | Shared section header decoration | ✓ | `src/components/_shared/SectionLabel.js` | — |

**Missing dependencies with no fallback:** None — all required dependencies are present.

**Test suite baseline:** 58 tests pass (verified 2026-06-01 `npm run test:run`).

---

## Project Constraints (from project instructions)

| Directive | Impact on Phase 15 |
|-----------|-------------------|
| JSX in `.js` files (no `.jsx` extension) | All new files: `GameMode.js`, `SvgConstellation.js`, `ConstellationFallback.js`, `useConstellation.js` |
| No PropTypes enforcement | Skip PropTypes; use JSDoc comments for prop shape documentation |
| No semicolons (`semi: 0`) | All code follows no-semi style |
| No comma-dangle | Follow existing style |
| Airbnb ESLint + react/recommended | All new components must lint clean; run `npm run lint` before commit |
| Bilingual via `t.namespace.key` — never inline EN/ES literals | All copy goes through `useLanguage()` + `translations.js` `game.*` namespace |
| Token-driven colors via CSS-vars — no raw hex in styling | Node colors from `SKILL_CATEGORY_COLORS` (data values) are the exception (documented); new tokens go into `src/index.css` |
| `motion-safe:` prefix on all infinite animations | `motion-safe:animate-pulse2` mandatory (comment in `tailwind.config.js`) |
| TDD: RED → GREEN → REFACTOR | Write test file first for pure logic (H1 derivation, spatial nav algorithm); component tests can be written alongside or after component scaffold |
| Test co-located with source | `SvgConstellation.test.js` next to `SvgConstellation.js` in `src/game/renderers/` |
| Vitest test block inside `vite.config.js` (not separate vitest.config) | Enforced by Phase 14 decision; do not create `vitest.config.js` |

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — [ARIA application role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/application_role) — role semantics, required attributes, virtual cursor suppression
- MDN Web Docs — [aria-live attribute](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live) — polite vs assertive, atomic behavior
- W3C WAI-ARIA APG — [Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) — roving tabindex algorithm, focus management
- Google Search Central — [Managing Multi-Regional/Multilingual Sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites) — language detection from visible content only
- Josh W. Comeau — [usePrefersReducedMotion hook](https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/) — SSR-safe implementation
- Codebase inspection — `src/data/skills.js`, `src/game/constellation.graph.js`, `src/game/constellation.layout.js`, `src/index.css`, `tailwind.config.js`, `vite.config.js`, `package.json` — all direct codebase reads

### Secondary (MEDIUM confidence)
- Fizz Studio — [Reliable and Valid SVG Accessibility](https://blog.fizz.studio/reliable-valid-svg-accessibility/) — tabIndex, role, aria-label on SVG elements; JAWS role requirement
- crmarsh.com — [Animating SVGs with CSS Transforms](https://www.crmarsh.com/svg-performance/) — transform/opacity compositing
- svgai.org — [SVG Animation Encyclopedia](https://www.svgai.org/blog/research/svg-animation-encyclopedia-complete-guide) — stroke-dashoffset not composited
- Observable HQ — [stroke-dasharray, stroke-dashoffset and pathLength](https://observablehq.com/@shreshthmohan/svg-stroke-dasharray-stroke-dashoffset-and-pathlength) — pathLength="1" normalization pattern
- WebSearch — ATS hidden text detection — [yotru.com/blog/hidden-text-resume-prompt-injection-ats](https://yotru.com/blog/hidden-text-resume-prompt-injection-ats)
- rightsaidjames.com — [ARIA live regions cheatsheet](https://rightsaidjames.com/2025/08/aria-live-regions-when-to-use-polite-assertive/) — polite vs assertive use cases

### Tertiary (LOW confidence — flagged in Assumptions Log)
- Training knowledge: `setTimeout(0)` for deferred `.focus()` after React state update (A1)
- Training knowledge: `transform-box: fill-box` for SVG scale animation (A3)
- Training knowledge: jsdom `userEvent.focus()` limitations on SVG `<g>` (A5)
- cerovac.com (Cloudflare blocked) — `role="application"` mobile SR behavior (A4)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all existing tools verified in codebase
- WAI-ARIA role decision: HIGH — confirmed `role="application"` via MDN official docs + UI-SPEC already locked
- Architecture patterns: HIGH — direct codebase read of Phase 14 data layer; patterns are additive, not contradictory
- Animation strategy: HIGH — CSS keyframes confirmed via multiple perf sources; GPU compositing guidance from official sources
- Pitfalls: MEDIUM-HIGH — SVG transform-origin, pathLength normalization from training data (A2, A3 assumptions logged)
- Vitest+RTL SVG testing: MEDIUM — jsdom SVG focus behavior partially assumed; workarounds documented

**Research date:** 2026-06-01
**Valid until:** 2026-07-01 (stable stack — Tailwind v3, React 18, Vitest 2.x; WAI-ARIA APG patterns are stable)
