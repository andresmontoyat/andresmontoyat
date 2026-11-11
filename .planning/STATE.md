---
gsd_state_version: 1.0
milestone: v5
milestone_name: Astro Migration
status: planning
stopped_at: context exhaustion at 75% (2026-07-27)
last_updated: "2026-07-27T21:32:21.799Z"
last_activity: 2026-07-19 — ROADMAP.md + REQUIREMENTS.md traceability written for v5 (17/17 requirements mapped)
progress:
  total_phases: 28
  completed_phases: 14
  total_plans: 58
  completed_plans: 57
  percent: 50
---

# Project State

## v5 Astro Migration (ROADMAPPED — Phases 21-27, not yet planned)

**Focus:** React CSR (Vite) → Astro SSG with React islands, to clear the Lighthouse mobile hard gate (Performance ≥0.95, Accessibility/Best Practices/SEO = 1.0) blocked since v4.2 Phase 11. Separate branch from `main`; does not touch v4.2 Content Polish in progress there.

**Roadmap:** 17/17 v1 requirements mapped across 7 phases (21-27) — see `.planning/ROADMAP.md` § Phase Details (v5). Source: `docs/superpowers/specs/2026-07-19-astro-migration-design.md` (commit `6a3bf4a`); research: `.planning/research/SUMMARY.md` (4 independent passes, confidence HIGH).

**Phase sequence:**

| Phase | Name | Requirements |
|-------|------|--------------|
| 21 | Foundation — Astro scaffold, i18n routing & layout shell | ROUTE-01..04, ISLAND-04, DEPLOY-01..03 |
| 22 | Nav island | ISLAND-01, ROUTE-05, TEST-02 |
| 23 | Static content sections | STATIC-01, TEST-01 |
| 24 | Hero | STATIC-02 (Hero half) |
| 25 | SectionPager | ISLAND-02 |
| 26 | Experience | ISLAND-03, STATIC-02 (Experience half) |
| 27 | Lighthouse gate + cleanup | DEPLOY-04 |

**Locked decision carried from research:** Root `/` redirect uses Vercel-native Edge Middleware (`middleware.ts`, platform feature, no npm package) — NOT Astro's own middleware (confirmed inert under `output: 'static'`) and NOT `@astrojs/vercel`. This is the single highest-severity risk item, independently flagged by 3 of 4 research passes; must be validated against a real Vercel preview deploy in Phase 21, not just `astro dev`.

**Next step:** `/gsd:plan-phase 21`

## v4.2 Content Polish (IN PROGRESS — on main, no tag)

**Focus:** Recruiter-facing content quality — experience copy rewrite + projects section redesign. No infra/perf scope.

**Shipped to main (PR order):**

| PR | Commit | Description |
|----|--------|-------------|
| #36 | 9684201 | Experience rewrite — apply tNic template (Fase 1); 12 entries, JSON-driven |
| #37 | 8ec5ed2 | Experience timeline UI polish (interactive states) |
| #38 | 57be81d | Projects 3-card redesign (🎫 Mr. Yoker / 🏥 Mutual SER / 📞 Hexadialer) — emoji glyphs + gradient overlay + centered flexbox (fixed card width, replaces grid); contact reorder (GitHub before LinkedIn) |
| #39 | 7e3c27e | npm audit fix — non-breaking security bumps (25→23 vulns) |

**Direct-to-main since PR #41 (no PR, content/type passes):**

| Commit | Description |
|--------|-------------|
| aca26be | type: retro pixel display font (Press Start 2P) on titles + accents |
| 9ce6817 | type: pixel font on short lead/intro texts |
| a01bc08 · 70df9ad · 3dad919 | interactive states — about quick-facts, hero count-up stats bar, skills+footer hover |
| 26481cc | skills: GitHub Actions 4→5 years |
| c191dd0 | projects: add Llevape warehouse system |
| 10fbc78 | projects: feature Mr. Yoker as highlighted lead (2-tier featured/regular card system) |
| 333bcd2 | cv: remove dead public docx CVs (superseded by generated PDFs) |
| 392316f | planning: fill v4.2 experience fase-2 questionnaire (ES rewrites + visibility flags) |

**Earlier direct-to-main (pre-pixel-font):**

| Commit | Description |
|--------|-------------|
| 177392f | claude: remove secondary 'See projects' CTA from PitchHero |
| d737353 | claude: value card 'Hexagonal' → 'Architecture without shortcuts' |
| eb35856 | claude: remove featured-apps grid after services (incl VIS-05 cards) |
| 817a2f0 | claude: merge AI capabilities + services → single 6-card offerings grid |
| 6bb9ef3 | claude: remove stack chips strip from section end |
| a97b435 | experience: per-entry `visible` flag (show/hide roles) |
| 57a05c8 | experience: questionnaire — visibility field + Coderio/Linked role blocks |
| 743400b | cv: `scripts/generate-cv.mjs` — ATS PDF CV (EN/ES) from site data |
| f406d41 | cv: commit generated `cv/CarlosMontoya_CV_{EN,ES}.pdf` |
| 6cf7c8b | **PR #41** deps: vite 6→8, vitest 2→4, plugin-react 4→6, esbuild dropped + `.js`→`.jsx` migration (23 files) for oxc JSX parsing. Vulns 23→17 (2 critical + 1 high CLEARED, 17 moderate remain — all devDep). 56/56 GREEN, Vercel PASS |

**Repo cleanup (2026-06-30):** Removed strays — `website-new/` (old standalone HTML), root `CV_Carlos_Montoya_{EN,ES}.docx` (byte-identical dupes of tracked `public/` copies). Kept: `.planning/projects-input.md` (active intake), `Diagnostico_LinkedIn_*.docx` (input scratch), `14-PATTERNS.md` (GSD artifact).

**Dependency hygiene (2026-06-22):** Closed 16 obsolete dependabot PRs (#5–#24) — all targeted the removed CRA/craco toolchain (craco, react-scripts, axios, lodash + transitives no longer in package.json post-Vite migration). Inmergeable + no-op.

**Carried concerns:**

- ~~**23 vulns**~~ — CLOSED via PR #41 (2026-07-01). Toolchain upgraded (vite 8 / vitest 4 / plugin-react 6); required `.js`→`.jsx` migration (oxc replaced esbuild, parses JSX only in `.jsx`). **17 moderate vulns remain** — all still devDep (vite/vitest/lighthouse chain); 2 critical + 1 high eliminated. No prod-bundle exposure.
- **No v4.2 tag** — content work unbounded (no fixed slice count). Tag when content passes converge.
- **projects-input.md** (`.planning/`) holds the raw project intake (Mr. Yoker filled; Atenea + others blank) — source for future projects expansion.

**v4.2 backlog:**

- ~~**VIS-05**~~ — RETIRED. Cards added (260625-dvq) then the entire featured-apps grid was removed (eb35856) during Claude offerings consolidation. No longer applicable.
- **Projects expansion** — fill `.planning/projects-input.md` (Mr. Yoker filled; Atenea + others blank), then surface in Projects section.
- **DIAGRAMS-01** — cross-repo architecture diagrams.
- Custom domain `andresmontoyat.co` (carried from v4.1).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260625-dvq | VIS-05 caveman + claude-kanban featured-app cards (apps 3→5) | 2026-06-25 | fddca76 | [260625-dvq-vis-05-add-caveman-claude-kanban-feature](./quick/260625-dvq-vis-05-add-caveman-claude-kanban-feature/) |
| 260625-etd | Claude section: replace Track record counters with 4 AI-capability cards | 2026-06-25 | e94a377 | [260625-etd-claude-section-replace-track-record-with](./quick/260625-etd-claude-section-replace-track-record-with/) |
| 260701-v6a | 999.6 ASEO-01: static schema.org Person JSON-LD in index.html `<head>` + vitest regression test (63/63 GREEN) | 2026-07-01 | 3480bda | [260701-v6a-aseo-jsonld-person](./quick/260701-v6a-aseo-jsonld-person/) |
| 260812-u7m | M6 adapter hardening: anchor bounds, splitRef cell validation, colliding manifest keys (57→66 tests) | 2026-08-12 | 062b861 | [20260812-m6-adapter-hardening](./quick/20260812-m6-adapter-hardening/) |
| 260928-kt4 | Authored-world adapter reads the editor's object tags: export-version gate, tag vocabulary, interactables.json (441→468 tests). `map:import` now refuses the v1 seed map until it is re-exported | 2026-09-28 | 2eeecec, a3c7535, b8241a8 | [260928-kt4-adaptador-del-mundo-autorado-lee-tags-de](./quick/260928-kt4-adaptador-del-mundo-autorado-lee-tags-de/) |
| 261020-b3y | About summary leads with leadership years (18+ backend, 11+ leading teams, ~7 as architect); CV regenerated | 2026-10-20 | c238c64 | [261020-b3y-about-summary-leads-with-leadership-year](./quick/261020-b3y-about-summary-leads-with-leadership-year/) |
| 261020-b75 | Apply the reviewed career timeline to experience.json: leadership titles/metrics, rewritten bullets EN/ES, stacks, CODERIO hidden; CV regenerated | 2026-10-20 | b82bbd7 | [261020-b75-apply-the-reviewed-career-timeline-to-ex](./quick/261020-b75-apply-the-reviewed-career-timeline-to-ex/) |
| 261020-baq | Align hero, meta, JSON-LD, CV title and OG card with Solution Architect & Tech Lead; 15+ Companies stat → 11+ Years leading | 2026-10-20 | 1100293 | [261020-baq-align-hero-and-page-titles-with-solution](./quick/261020-baq-align-hero-and-page-titles-with-solution/) |
| fast | Fix ES horizontal scroll at 320px in #claude-code (unbreakable arrow chain) + regression test | 2026-10-20 | 5a1de38 | — |
| fast | Move canonical domain andresmontoyat.co → andresmontoyat.dev (layout, OG, CV, project links) | 2026-10-20 | 5f067a4 | — |
| fast | Game door point below the base so tall authored houses can be entered | 2026-10-20 | 5c0c619 | — |
| fast | Commit the authored map: 11 editor-placed houses tagged door:<id>, 11 of 11 coverage | 2026-10-20 | cc78040 | — |
| fast | Career RPG roadmap design doc (5 phases, scope cuts, open decisions) | 2026-10-20 | d64d7eb | — |
| fast | Map visual fixes: authored grass leaves roads/ponds to the ground, one-tone era wash, labels only near the player; big tree strips cut and scaled 0.6 | 2026-10-22 | d6dc110, c9e9ebe | — |
| fast | Map composition (B): road layer owns roads+decor, era wash fades at borders, career road + villages + groves authored via editor model; editor autotile inner-block fix (world-editor 64f21bb) | 2026-10-28 | 292dc11, 6fd6c59, f1fdea5 | — |
| fast | Version map:compose (idempotent); roadmap phase 1: house generator retired, import refuses houseless experiences, era anchors in the map, ADR 0002 (map can lay roads) | 2026-10-28 | efa2cb1, 422904e, 627bad0 | — |
| fast | Canonical, hreflang, JSON-LD and CV link on www.andresmontoyat.dev (apex 308-redirects to www) | 2026-10-29 | cb79dea | — |
| fast | Switch the unfinished game off (features.game=false): no splash, no nav link, no Experience platformer, /game redirects home; Lighthouse mobile 0.97/1/1/1 | 2026-10-29 | 27032d6 | — |
| fast | ADR 0003 accepted: a `water` tiles layer makes the map own the ponds (bodies, collision and pond life derived from cells); amends 0002 | 2026-10-30 | 2956b8f | — |
| fast | ADR 0003 game side: `water` layer → ponds from cell bodies, box collision with shore inset, no procedural ponds, no era wash on water, import checks (tiles only, water sheets, 2x2 min); 555 tests | 2026-10-30 | 72ba577 | — |
| fast | Adopt the hand-authored map (editor UI re-author) with a painted `water` layer: 2 ponds, shore collision checked in a playtest; 11/11 houses, 555 tests | 2026-10-31 | dd2b564 | — |
| fast | Map fix: spruce removed from the east pond's open water (found by the editor's new object-in-water lint) | 2026-11-01 | 3319ed6 | — |
| fast | Per-sprite collision: editor exports `hitboxes`, import turns each into a world solid (flip/scale/rot), game blocks on them; 12 prop frames boxed, 327/360 placements solid; trunk stop checked in a playtest; 563 tests | 2026-11-01 | 7c41491, 68f1cbc | — |
| fast | Phase 2 design approved: interiors spec + ADR 0004 (one .map.json per interior, tags spawn/npc:host/read:<n>/exit, lazy per-interior atlas) | 2026-11-02 | e8a3569 | — |
| fast | Phase 2 interiors pipeline + scene switch; acceptance with a throwaway Tul interior (keyboard + touch + Lighthouse): enter, host + 4 reads (es, L→en), exit to the door; no interior fetched on first load; Lighthouse mobile 0.98/1/1/1 after fixing aria-pressed on the game page language links; final-review fixes: spawn/exit counted by flag, visible:false rule aligned, import names houses with and without an interior, painted water blocks indoors, dialog font set and reads wrapped to the box width (touch re-run at 390px: whole lines), door fades through black with a loading cue | 2026-11-02 | 31410aa, acf7564, d8b8271, a27ae41, 98930ed, 5517bc3, 36ac36d, 05ff97d, a5f2f5f, a59f203, 192b0d3, 9f0cba3, 987c06c, ac2f8f4 | — |
| 261110-p8u | Tailwind 3.4 → 4.3 (`@tailwindcss/vite`, config in `src/index.css`, source scoped to src) + drop unused @vercel/analytics (PR #48 closed; supersedes Dependabot #64). Accepted visible change: opacity-modifier utilities on var colours now emit CSS (all skill bars, timeline spine, accent card borders). Lighthouse mobile 0.97/1/1/1; browser floor Safari 16.4 / Chrome 111 / Firefox 128. Follow-up: `text-text-primary/secondary/muted` still emit nothing (kept for parity) | 2026-11-10 | 1065166, bf5c51c, 529c7e1, 572cc5e | [261110-p8u-migrate-tailwind-3-to-4-and-drop-unused-](./quick/261110-p8u-migrate-tailwind-3-to-4-and-drop-unused-/) |
| fast | Theme hydration: ThemeToggle starts unset and reads data-theme after mount → no React #418/#423 with a stored light theme (prod run: 0 console errors). Dead `text-text-primary/secondary/muted` (~33) moved to canonical `text-text` / `text-muted` (closes the 261110-p8u follow-up). Lighthouse mobile 0.98/1/1/1 | 2026-11-11 | 4df3deb, 9777df3 | — |

## Project Reference

See: .planning/PROJECT.md (refreshed 2026-07-19 — v5 Astro Migration milestone started)

**Core value:** Hero + first impression must stop recruiters mid-scroll and convert visits into engineering conversations.
**Current focus:** v5 Astro Migration — ROADMAP.md created (Phases 21-27), awaiting `/gsd:plan-phase 21`.
**Last shipped:** v4.1 tag (2026-06-16). v4.2 Content Polish continues in parallel on `main`, untouched by v5.

## Current Position

Phase: 21 of 27 (Foundation — Astro scaffold, i18n routing & layout shell)
Plan: TBD — not yet planned
Status: Roadmap created, ready to plan
Last activity: 2026-11-10 - Completed quick task 261110-p8u: Tailwind 4 migration

Progress: [░░░░░░░░░░] 0%

## Shipped Slices (v4.0, on main, in chronological + PR order)

| Slice | Section | PR | Squash commit | Description |
|-------|---------|-----|---------------|-------------|
| 1 | Game Purge + Base Palette | #26 | a623ede | Strips game-mode + Mario-world + ViewMode + WebGL constellation; lands dark palette tokens (#0B1020 / #00E5A8 / #00C2FF); bundle-gate re-baselined (no WebGL chunk; index-*.js WARN 60 / HARD 68) |
| 2 | Contact | #27 → via #26 | 79cb0eb | 5-card grid from contact.json; v4 JSON-driven pattern established |
| 3 | About | #28 → via #26 | 99c39e1 | 3 paragraphs + 5 quick-facts; killed `dangerouslySetInnerHTML` |
| 4 | Skills | #29 → via #26 | f44fdc1 | 4 categories × 29 chips; bilingual category titles + years suffix |
| 5 | Experience | #30 | 5e973ec | 12-entry vertical timeline; expand/collapse useState preserved (rekeyed by stable entry.id); ARIA labels from JSON |
| 6 | Projects | #31 | 3a9e434 | 4-project "Selected work" grid; CTA labels from JSON |
| 7 | Claude Code | #32 | e8abb1b | AI-Engineering pitch — 4 values + 7 counters + 5 services + 3 featured apps + 17 stackChips; consolidated claude.json |

**Final section order:** Nav → Hero → About → Skill → Experience → Projects → Claude → Contact → Footer.

**Final metrics:**

- 57/57 tests GREEN on main
- Build 60.93 kB gz (bundle-gate WARN — over soft 60, under HARD 68 — Claude section content +1 kB above soft ceiling acceptable for closing slice)
- All 7 sections JSON-driven; uniform `pick(field, lang)` helper inlined per component
- Zero `dangerouslySetInnerHTML` in rendered output
- Zero `useInView` / `animate-on-scroll` survivors
- `_shared/SectionLabel` retired (each section inlines mono-accent label)

## v4.0 Decisions (final, on main)

- **D-v4.0-PURGE** — Game mode + Mario-world + WebGL constellation + ViewMode lineage REMOVED.
- **D-v4.0-PALETTE** — Dark palette (#0B1020 bg / #00E5A8 accent / #00C2FF secondary) via CSS vars + Tailwind tokens. Theme toggle deferred.
- **D-v4.0-JSON-PER-SECTION** — Every section reads from `src/data/<section>.json`. Bilingual `{en, es}` shape + universal `pick()` helper inlined per component.
- **D-v4.0-NO-HTML-IN-DATA** — JSON contains plain text only.
- **D-v4.0-NO-SCROLL-REVEAL** — `useInView` + `animate-on-scroll` dropped.
- **D-v4.0-NO-SHARED-SECTIONLABEL** — `_shared/SectionLabel` dropped.
- **D-v4.0-STACKED-PR-INTEGRATION** — Slices 1+2+3+4 stacked onto `v4.0-slice-1-purge` integration branch and squashed via PR #26; Slices 5+6+7 based directly on main.

## Blockers / Concerns

- **v5 root-redirect risk** — Vercel Edge Middleware cookie/`Accept-Language` parsing + allowlist validation is the least-certain, highest-consequence piece of Phase 21; must be validated against a real Vercel preview deploy before any later phase assumes it works (3 of 4 research passes flagged this independently).
- **v5 Tailwind + Astro PostCSS pickup** — MEDIUM confidence combination per research STACK.md; validate with a build spike at the very start of Phase 21.
- **v5 Astro Container API coverage parity** — unresolved until at least one static component is migrated and its assertions compared side-by-side with the original RTL spec (Phase 23); experimental API, breaking-change risk.
- **Real-device UAT pending (v4.0/v4.1 lineage)** — Operator UAT (Chrome stable + Safari iOS + Android real device) not yet formally re-executed since v4.1 LCP fix; carries as background item, not a v5 blocker.
- **18 stale dependabot PRs** open — None blocking; sweep opportunistically.
- **Vercel production URL** — Site lives on `*.vercel.app`; custom domain `andresmontoyat.co` still deferred (carries through v4.1/v4.2, unrelated to v5).

## v4.1 SHIPPED (2026-06-13 → 2026-06-16)

| PR | Commit | Status | Description |
|---|---|---|---|
| #33 | 7891e2f | MERGED 2026-06-13 | OG image refresh + responsive me-400.webp variant (orthogonal to actual LCP bottleneck) |
| #34 | a0051b2 | MERGED 2026-06-16 | Static hero LCP fix — move `<img>` to index.html (kill React hydration LCP delay) |
| #35 | 7e2c34c | MERGED 2026-06-16 | LCP eligibility fix — remove aria-hidden + add alt so photo qualifies as LCP candidate |

**Tags placed:** `v4.0`, `v4.1`.

## v4.1 Final Metrics (prod, andresmontoyatco.vercel.app, Lighthouse mobile simulated throttling)

| Metric | Before v4.1 | After v4.1 |
|---|---|---|
| Performance | 0.84 | **0.99** |
| LCP | ~4.0s | **2.1s** |
| FCP | — | 1.1s |
| TBT | — | 0 ms |
| CLS | — | 0.014 |
| SI | — | 2.5s |
| Accessibility | 1.0 | 1.0 |
| Best Practices | 1.0 | 1.0 |
| SEO | 1.0 | 1.0 |

Root cause closed: React SPA hydration was blocking the LCP critical path. Hero `<img>` now lives in `index.html` as a static absolute-positioned layer behind `#root`, paints with FCP, and qualifies as LCP candidate (alt + no aria-hidden). **v5 supersedes this architecture entirely** — the LCP fix pattern (static `<img>` outside React) is subsumed by the whole-page static-by-default Astro approach.

## Session Continuity

Last session: 2026-07-27T21:32:21.793Z
Stopped at: context exhaustion at 75% (2026-07-27)
Resume file: None
Untracked (intentional-keep): .planning/projects-input.md, Diagnostico_LinkedIn_*.docx, 14-PATTERNS.md
Open PR: #2 junie-init only (foreign JetBrains scaffold — close if unused)

## v4.2 Roadmap Candidates (separate track, on main)

1. **Custom domain** — `andresmontoyat.co` DNS + Vercel binding (currently `*.vercel.app` only; root domain returns 000)
2. **Dependabot sweep** — Triage open PRs #19-#24 (5 stale npm bumps); merge security fixes, close stale
3. **PR preview deploys** — Configure Vercel preview deploys (currently SSO-gated; consider bypass token for external Lighthouse runs)
4. **OG image refresh** — When custom domain lives, point `og:url` + `og:image` at it (currently hardcoded to `andresmontoyat.co`)

## v3.x Closure Reference (historical only)

v3.4 → v3.10 milestone lineage (brownfield redesign baseline through 3D WebGL constellation) entirely retired from main by v4.0 Slice 1 purge (PR #26 a623ede, 2026-06-12). All `D-20-*` / `D-17-*` / `D-14-16-*` game-mode decisions no longer load-bearing. Historical milestone docs preserved under `.planning/milestones/v3.*-ROADMAP.md` for reverse lookup.
