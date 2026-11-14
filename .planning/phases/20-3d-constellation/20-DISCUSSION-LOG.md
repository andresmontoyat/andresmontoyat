# Phase 20 Discussion Log

**Date:** 2026-06-08
**Mode:** default (no flags)
**Areas selected:** 4 of 4 offered (multi-select all)

## Setup

Phase 20 entered discuss with extensive locked context already in place:
- `.planning/research/SUMMARY.md` (cross-cutting findings from 4 parallel researchers + synthesizer)
- `.planning/REQUIREMENTS.md` v3.10 DEPTH-01 (fov, OrbitControls config, click-vs-drag threshold, bundle-gate fix, shader formula — all already locked)
- 4 D-20-* decisions queued at REQUIREMENTS authoring time (D-20-VISUAL-3D, D-20-CLICK-DRAG-THRESHOLD, D-20-PROPS-CONTRACT, D-20-CONTEXT-LOSS)
- 9 pre-rejected decision violations (PITFALLS.md §"Decision Violations to Flag")

Remaining gray areas were design/storytelling decisions that needed Carlos's vision input (not technical implementation choices that researcher could derive).

## Area 1 — Z-mapping por categoría

**Question:** Orden z para storytelling de arquitectura. ¿Qué vibra quieres que perciba el recruiter al rotar?

**Options presented:**
1. Research propuesto (AI al frente, hardware al fondo) — `ai +150 → lang +75 → arch 0 → data −25 → cloud −75 → devops −100 → security −125 → hardware −150`
2. Backend-first (arch al frente, AI atrás) — `arch +150 → data +75 → cloud 0 → lang −25 → devops −75 → ai −100 → security −125 → hardware −150`
3. Inverso research (hardware al frente, AI atrás) — `hardware +150 → security +75 → devops 0 → cloud −25 → data −75 → arch −100 → lang −125 → ai −150`
4. Hablamos más — ninguna encaja perfecto

**User selected:** Option 1 (research propuesto).
**Captured as:** D-20-CONTEXT-ZMAP

## Area 2 — Ángulo inicial cámara + auto-rotate post-drag

**Question A:** Ángulo inicial de cámara en primer paint

**Options presented:**
1. Tilted (~15° azimuth, ~10° polar) — 3D obvio frame 1
2. Straight-on (mismo look que v3.9 ortho)
3. Slight tilt (~5°) — compromise

**User selected:** Option 1 (Tilted).
**Captured as:** D-20-CONTEXT-INITIAL-ANGLE

**Question B:** Comportamiento auto-rotate después del primer drag de usuario

**Options presented:**
1. Pausa indefinida (Recommended)
2. Reanuda tras 5s idle
3. Reanuda tras 10s idle

**User selected:** Option 1 (Pausa indefinida).
**Captured as:** D-20-CONTEXT-AUTOROTATE-RESUME

## Area 3 — Onboarding hint "drag to rotate"

**Question:** Hint visible 'drag to rotate / arrastra para rotar' al primer landing

**Options presented:**
1. Ship en v3.10.0 (Recommended) — pill + 5s auto-dismiss + localStorage flag + ~30 LOC + 2 i18n keys + ~3h scope expand to Plan 20-02
2. Defer a v3.10.1 — ship v3.10.0 without hint; auto-rotate + cursor grab carry telegraphy
3. Ambient hint solo — cursor change + auto-rotate, no pill

**User selected:** Option 1 (Ship v3.10.0).
**Captured as:** D-20-CONTEXT-HINT

## Area 4 — Keyboard navigation en 3D

**Question:** Keyboard nav en 3D. Phase 15 D-15-KB-ACTIVATE — arrows mueven focus entre nodos (no rotan cámara)

**Options presented:**
1. Mantener Phase 15 sin cambio (Recommended)
2. Shift+Arrows = orbit cámara, Arrows = node focus
3. Add 'Reset view' button visible (cierra cualquier deuda KB)

**User selected:** Option 1 (Mantener Phase 15).
**Captured as:** D-20-CONTEXT-KB-NOORBIT

## Deferred Ideas Surfaced During Discussion

- **"Reset view" button** — surfaced as Option 3 in Area 4; rejected for Phase 20, deferred to v3.11+ pending UAT.
- **Camera-state persistence across viewmode toggle** — surfaced as ARCHITECTURE.md "open question"; deferred.
- **Per-category depth color shift** — surfaced as visual differentiation aid; deferred to v3.10.1.
- **Fog falloff via shader uniforms** — surfaced as PITFALLS MOD-04 mitigation alternative; deferred to v3.10.1.
- **Manual real-device UAT v3.9 bundling** — flagged at v3.9 close; folded into Plan 20-03 UAT instead of separate phase.

## Implementer's Discretion Items (no user input requested)

- CATEGORY_Z exact values are UAT-tunable starting points
- Tilted initial angle exact degrees (15° / 10°) — shiftable during Plan 20-02 dev-server iteration
- Hint pill exact Tailwind styling
- Hint pill render location (`GameMode.js` slot vs. inside `WebGLConstellation.js`) — decide in Plan 20-02

## Scope Creep Redirected

None. All 4 selected areas stayed within Phase 20 boundary. Options 2/3 in Area 4 ("Shift+Arrows orbit", "Reset view button") were correctly read as either (a) trade-off probes inside scope OR (b) deferred features captured in Deferred Ideas — not acted on inside Phase 20.

## Outcomes

- 5 new D-20-CONTEXT-* decisions captured (added to the 4 already queued D-20-VISUAL-3D / D-20-CLICK-DRAG-THRESHOLD / D-20-PROPS-CONTRACT / D-20-CONTEXT-LOSS)
- Plan 20-02 scope expanded by ~3h to ship hint pill in v3.10.0
- Phase 15 keyboard contract preserved unchanged
- Plan 20-03 UAT will fold v3.9 manual UAT debt

---

*Phase: 20-3d-constellation*
*Log written: 2026-06-08*
