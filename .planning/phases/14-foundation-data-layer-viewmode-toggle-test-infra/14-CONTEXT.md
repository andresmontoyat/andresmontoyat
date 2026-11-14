# Phase 14: Foundation — Data Layer, ViewMode Toggle & Test Infra - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** Approved design spec (`docs/superpowers/specs/2026-05-29-game-mode-design.md`) — used as PRD-equivalent. Brainstormed + approved this session; no separate discuss-phase needed.

<domain>
## Phase Boundary

Phase 14 builds the **pure data + state foundation** for the v3.8 game mode, fully testable, with **no visual rendering** yet. Maps to REQs **GAME-02 (graph derivation)**, **GAME-05 (game/dev toggle)**, **TEST-01 (Vitest + RTL setup)**.

**Delivers:**
- `src/data/skills.js` — curated skill catalog: every skill in `experience.js` `tech[]` mapped to a category + color + aliases (GCP/Google Cloud normalized to one canonical node; GKE stays separate).
- `src/game/constellation.graph.js` — pure derivation of skill nodes (category, color, count, year range, experience indices) and co-occurrence edges (weight = shared jobs) from `experience.js` + `skills.js`.
- Numeric `period: { start, end|null }` field added to each entry in `src/data/experience.js` (display string `date` stays).
- `src/game/constellation.layout.js` — deterministic node positions baked at build time (no d3-force in client bundle); category clustering via per-category centroid forces.
- `src/context/ViewModeContext.js` — `'game' | 'dev'` state, persisted in localStorage (`cam-viewmode`), `?mode=` deep-link, default = game; mirrors `ThemeContext`/`LanguageContext` patterns. Wired into `App.jsx` so the tree switches (game placeholder is fine this phase; full render lands Phase 15).
- Vitest + React Testing Library test infrastructure: `npm test` runs the suite; pure graph/derivation/layout logic unit-tested near-100%; ViewMode toggle + persistence has a passing component test.

**Does NOT deliver (later phases):** constellation rendering / renderer contract (Phase 15), filters + ExperienceCard (Phase 16), WebGL desktop renderer + Lighthouse gate re-verify (Phase 17).
</domain>

<decisions>
## Implementation Decisions (locked from approved spec)

### Data model
- **Node = skill** (not experience). Job is secondary; selecting a skill later reveals its experiences.
- `skills.js` adds category + color + aliases ONLY; it does NOT duplicate edges — edges derive from `experience.js` `tech[]`.
- 8 skill categories with colors: lang `#3b82f6`, ai `#a855f7`, arch `#06b6d4`, cloud `#10b981`, devops `#f59e0b`, security `#ef4444`, data `#8b5cf6`, hardware `#ec4899`.
- Skill→category mapping per spec; **Spring Security → `security`** (single-category per node, resolved).
- Node `count` ∝ # jobs using the skill; edge `weight` = # shared jobs.
- Add numeric `period: { start, end|null }` (null = Present) to each experience — drives later timeline reliably; do NOT regex-parse the localized `date` string.

### Layout
- d3-force runs at **build time** → baked positions committed as data; **no d3-force in the client bundle**. Category clustering via per-category centroid (`forceX/Y`). (Open: build-script vs committed-data file — planner picks the simpler deterministic option.)

### ViewMode toggle
- Default landing = **game**; one-click toggle to dev; persist `localStorage` key `cam-viewmode`; addressable via `?mode=` deep-link; survives reload.
- `ViewModeContext` mirrors the existing `ThemeContext` shape (provider + hook + localStorage key). Guard `typeof window` (SSR/no-storage safety) as `LanguageContext` does → default game in memory if storage unavailable.
- `App.jsx` renders game subtree or current dev sections by view mode. Game subtree this phase may be a placeholder pending Phase 15 render.

### Testing (TEST-01)
- Introduce **Vitest + React Testing Library** (first test infra in the repo). `npm test` script added.
- Unit-test pure logic near-100%: `constellation.graph.js` derivation (nodes/edges/year ranges), layout determinism, skill normalization.
- Component test: ViewMode toggle + persistence (localStorage + `?mode=`).
- Vitest must coexist with Vite 6 / React 18 / Tailwind 3 setup (jsdom environment).

### Implementer's Discretion
- Exact module/file naming under `src/game/` (follow existing co-located component conventions).
- Internal shape details of derived node/edge objects beyond the fields named above.
- Whether baked layout is a generated JSON committed to `src/data/` or computed by a build script — pick the simplest deterministic approach.
- Test file locations + Vitest config specifics (jsdom, setup file, coverage).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design (source of truth)
- `docs/superpowers/specs/2026-05-29-game-mode-design.md` — full v3.8 architecture, data model, adaptive strategy, perf budget, a11y, testing, scope. Phase 14 implements its Data Model + ViewMode + Testing sections.

### Roadmap / requirements
- `.planning/ROADMAP.md` — Phase 14 goal + 5 success criteria (and the gate-safe build order across 14–17).
- `.planning/REQUIREMENTS.md` — GAME-02, GAME-05, TEST-01 full text.

### Existing code to follow / extend
- `src/data/experience.js` — 12 entries, bilingual, `tech[]` per entry; source of skills + edges + years. ADD `period`.
- `src/i18n/ThemeContext.js` — pattern to mirror for `ViewModeContext` (provider + hook + localStorage + `typeof window` guard).
- `src/i18n/LanguageContext.js` — second reference for the Context + localStorage pattern.
- `src/App.js` — where view-mode branching wires in.
- `package.json` — Vite 6 / React 18 / Tailwind 3; add Vitest + RTL devDeps + `test` script.
</canonical_refs>

<specifics>
## Specific Ideas

- ~27 unique skills across the 12 jobs (Java, Spring Boot, Spring Security, JEE 5, Claude Code, GitHub Copilot, JetBrains Junie, Microservices, Oracle Service Bus, WebSphere, KrakenD, AWS, Google Cloud(+GCP), GKE, Kubernetes, Docker, Jenkins, SonarQube, Nexus, Keycloak, Oracle SQL, SQL Server, MySQL, IoT, Asterisk, Raspberry Pi).
- Year span 2007 → 2026 ("Present" = 2026, `end: null`).
- localStorage keys already in use: `cam-lang` (language), `cam-theme` (theme) → new `cam-viewmode` follows the `cam-*` convention.
</specifics>

<deferred>
## Deferred Ideas

- Constellation rendering + renderer props contract — Phase 15.
- Filters (multi-skill / year / category) + floating ExperienceCard — Phase 16.
- WebGL desktop renderer + Lighthouse mobile gate re-verification — Phase 17.
- WebGL library choice + desktop breakpoint — Phase 15/17 planning.
</deferred>

---

*Phase: 14-foundation-data-layer-viewmode-toggle-test-infra*
*Context gathered: 2026-05-29 from approved design spec (PRD-equivalent path)*
