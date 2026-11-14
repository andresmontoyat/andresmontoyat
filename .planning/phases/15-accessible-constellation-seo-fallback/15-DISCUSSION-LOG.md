# Phase 15: Discussion Log

**Session:** 2026-06-01
**Mode:** default (single-question turns)
**Areas presented:** visual style, initial landing, keyboard nav, sr-only SEO fallback
**Areas discussed:** visual style, initial landing, keyboard nav
**Areas deferred:** sr-only SEO fallback (implementer's discretion per spec defaults)

---

## Area 1 — Visual style of nodes/edges (4 questions)

### Q1 — Visual character
**Options presented:**
- Stars on dark sky (Recommended) — bright pinpoint category-colored nodes, thin glowing edges, subtle outer halo on active
- Pulsing nodes — bigger nodes for senior skills, brand-gradient fills, dimmer edges (hierarchical)
- Category-clustered colored zones — soft colored regions per category, nodes overlay zones
- Minimal geometric — solid filled circles, single-stroke edges, no effects

**User selected:** Stars on dark sky.

### Q2 — Node size scale
**Options:**
- Square-root √count (Recommended) — Java ~3.3× SonarQube, balanced hierarchy
- Linear — Java 11× SonarQube, dramatic hierarchy, rare nodes near-invisible
- Logarithmic — flat-ish, weak hierarchy, every skill visible
- Fixed equal size — no size-encoding, weight via edge thickness only

**User selected:** Square-root.

### Q3 — Edge visibility policy
**Options:**
- Hide low-weight, show strong (Recommended) — weight ≥2 always visible, weight=1 on hover/select
- Show all, weight = opacity — full graph visible at varying opacity
- Hover/select only — zero edges by default, fade in on interaction
- Show all equally — no visual encoding of weight, noisy

**User selected:** Hide low-weight, show strong.

### Q4 — Active-state distinction
**Options:**
- Halo + brighten + dim others (Recommended) — outer halo on active, opacity 0.35 for rest
- Stroke ring only — brand-color stroke on active, no dim on rest
- Scale-up + brand tint — active grows ~20%, conflicts with reduced-motion
- Dim others only — active unchanged, others fade

**User selected:** Halo + brighten + dim others.

---

## Area 2 — Initial landing state (3 questions)

### Q1 — First paint
**Options:**
- Animated reveal (Recommended) — fade-in + sequential stars (~800ms, biggest first), edges draw in (~400ms)
- Hero-skill highlighted — full paint, Java starts selected, reverts after 3s/first hover
- All equal + hint pill — flat opening with explicit "Click a skill" pill
- Animated reveal + hero-skill highlighted — combine both, most dramatic

**User selected:** Animated reveal.

### Q2 — Resting interaction hint
**Options:**
- Subtle pulse on biggest node (Recommended) — Java pulses 1.0↔0.7 / 2s loop; stops on first interaction; reduced-motion uses pill fallback
- Hint pill under constellation — static "Click a skill · Toca un skill" pill, fades on first interaction
- Both: pulse + pill — belt-and-suspenders
- No hint — trust the user

**User selected:** Subtle pulse on biggest node.

### Q3 — Framing copy
**Options:**
- Skill headline + sub (Recommended) — "19 years. 27 skills. One constellation." + sub-copy
- Personal-pitch headline — "Carlos Montoya — Backend engineer" + constellation sub
- Minimal — single-line invitation, no H1
- Heading-less — no text, visual only

**User selected:** Skill headline + sub.

**Follow-up captured:** Numbers (19 / 27) MUST be derived from data, not hardcoded. 19 = max(period.end ?? currentYear) - min(period.start) across all experiences. 27 = canonical skill count. Unit test asserts derivation matches live data.

---

## Area 3 — Keyboard navigation model (3 questions)

### Q1 — Tab pattern
**Options:**
- Single tabstop + arrow keys, roving tabindex (Recommended) — WAI-ARIA standard
- Tab through every node — 27 tab stops, exhausting
- Hybrid: "View as list" alternative — single tabstop + optional linear list toggle

**User selected:** Single tabstop + roving tabindex.

### Q2 — Arrow-key traversal order
**Options:**
- Spatial nearest-neighbor (Recommended) — arrows move geometrically using baked layout coords
- Category-then-alphabetical — stable order, spatial-blind
- By job-count descending — recruiter-friendly but ignores layout/categories
- Tab/Shift+Tab cycle (no arrows) — simplest, less intuitive

**User selected:** Spatial nearest-neighbor.

### Q3 — Per-node aria-label
**Options:**
- Skill + count + category (Recommended) — "Java, languages, used in 11 jobs" — bilingual via active lang
- Skill name only — shortest, strips visual meaning
- Skill + years + count — temporal range adds verbosity

**User selected:** Skill + count + category.

---

## Deferred ideas captured during discussion

- sr-only SEO fallback shape (both-langs vs active-lang, ordering, sr-only vs visible-collapsed) — area was offered but user opted not to discuss. implementer's discretion per spec defaults: active-lang only, chronological order (most recent first), `sr-only` Tailwind utility.

## implementer's discretion items

- Exact px values for node radius range / halo blur radius / edge stroke widths / pulse opacity timing curve.
- ARIA `role` for the constellation container (`application` vs `grid` vs `list+custom`) — planner researches WAI-ARIA APG patterns and picks closest.
- Animation library choice — prefer CSS keyframes/transitions; if a JS lib is added, document why.
- Internal shape of `useConstellation` hook (state location, memoization) — only the exported props contract is load-bearing.

## Scope-creep moments

None. Discussion stayed inside Phase 15 boundary; deferred items (filters, ExperienceCard, CV CTA, WebGL, Lighthouse re-verify) were correctly redirected to Phase 16 / 17.

---

*Persisted to `15-CONTEXT.md` as locked decisions for downstream gsd-phase-researcher and gsd-planner.*
