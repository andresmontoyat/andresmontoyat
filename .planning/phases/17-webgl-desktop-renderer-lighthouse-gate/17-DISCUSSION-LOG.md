# Phase 17 Discussion Log

**Date:** 2026-06-03
**Mode:** default (discuss)
**Phase:** 17 — WebGL Desktop Renderer & Lighthouse Gate
**Turns:** 9 single-question (across 2 selected areas)

## Area selection

**Q:** Which gray areas should we discuss? (multi-select)
**Options:** A. WebGL library choice (Recommended) / B. Desktop breakpoint + capability gate (Recommended) / C. Visual style — what does 'wow' look like / D. Lighthouse gate target & ErrorBoundary fallback policy
**Selected:** A + B
**Deferred to planner (Implementer's Discretion):** C + D

## Area A — WebGL library choice

### Q1: Which WebGL library?
- three.js raw (Recommended) / react-three-fiber + drei / force-graph / You decide
- **Selected:** force-graph
- **Claude pushback:** force-graph conflicts with Phase 14 D-14-01-LAYOUT (baked positions), Phase 15 props contract needs adapter, bundle ~125 kB gz vs three.js raw ~70 kB. Offered reconciliation.

### Q1b (counter-question after pushback): Reconsider?
- Stay with force-graph / Switch to three.js raw (Recommended) / Switch to r3f + drei
- **Selected:** three.js raw ✓ D-17-LIB

### Q2: Tree-shake strategy?
- Tree-shake named imports (Recommended) / Full bundle
- **Selected:** Tree-shake ✓ D-17-TREESHAKE

### Q3: Render primitives?
- Points + ShaderMaterial (Recommended) / Mesh per node / You decide
- **Selected:** Points + ShaderMaterial ✓ D-17-PRIMITIVES

### Q4: Edges?
- LineSegments (Recommended) / Curved arcs shader / No edges
- **Selected:** LineSegments ✓ D-17-EDGES

### Q5: Frame loop?
- Always-running rAF 60fps (Recommended) / On-demand / Hybrid 30fps
- **Selected:** Always-running rAF ✓ D-17-FRAMELOOP

### Continue check
- **Selected:** Next area

## Area B — Desktop breakpoint + capability gate

### Q1: Breakpoint?
- ≥1024px (Recommended) / ≥768px / ≥1280px
- **Selected:** ≥1024px ✓ D-17-BREAKPOINT

### Q2: Capability gates (multi-select)?
- WebGL feature detect (Recommended) / prefers-reduced-motion → SVG (Recommended) / Save-Data → SVG (Recommended) / GPU tier detection
- **Selected:** All 3 recommended; rejected GPU tier ✓ D-17-CAP-GATES

### Q3: Detection location?
- New `useRendererCapability.js` hook (Recommended) / Inline in GameMode / Server hybrid
- **Selected:** useRendererCapability hook ✓ D-17-CAP-HOOK

### Q4: Selection mechanism?
- Suspense + React.lazy on capability='webgl' (Recommended) / Ternary conditional
- **Selected:** Suspense + React.lazy ✓ D-17-SELECTION-MECH

### Q5: Query-param override?
- Yes — `?renderer=svg|webgl` overrides (Recommended) / No override
- **Selected:** Yes ✓ D-17-OVERRIDE

### Q6: Resize behavior?
- Live swap on breakpoint crossing (Recommended) / Locked at mount / Debounced 300ms
- **Selected:** Live swap ✓ D-17-RESIZE-SWAP

### Continue check
- **Selected:** Wrap up — ready for context

## Outcome

13 decisions locked across Areas A + B. 4 decisions (D-17-VISUAL, D-17-THEME, D-17-BUNDLE, D-17-LIGHTHOUSE-TARGET, D-17-ERRORBOUNDARY-INIT/RUNTIME) deferred to planner as Implementer's Discretion with concrete recommendations.

CONTEXT.md written.
