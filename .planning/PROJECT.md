# Carlos Montoya Portfolio — Redesign

## Current Milestone: v5 Astro Migration

**Goal:** Migrate from React CSR (Vite) to Astro SSG with React islands for interactive components, to clear the Lighthouse mobile hard gate (Performance ≥0.95, Accessibility/Best Practices/SEO = 1.0) that has been blocking since v4.2 Phase 11.

**Target features:**
- Astro SSG (`output: 'static'`) shell, same Vercel host
- `/en` `/es` routes via `astro:i18n`; `/` redirects by cookie/Accept-Language
- React islands only where needed: Nav, SectionPager, Hero (interactive part), Experience expand/collapse, ThemeToggle
- Static `.astro` components (zero client JS): About, Skill, Footer, Projects
- Theme flip via blocking inline `<head>` script (reuses existing `data-theme` pattern)
- Per-phase test gate: RTL for islands, Astro Container API for static components
- `vercel.json` SPA-fallback rewrite removed; unused `three` dependency removed

**Scope note:** This milestone is separate from v4.2 (Content Polish), which remains in progress directly on `main` and is untouched by this work. All v5 work happens on its own branch; merges to `main` only with the Lighthouse gate green. Source spec: `docs/superpowers/specs/2026-07-19-astro-migration-design.md` (commit `6a3bf4a`).

## Current State

**Active milestone:** **v4.0 Portfolio Redesign — JSON-Driven Section Refactor** (in progress, opened 2026-06-12).

**Baseline shipped to main 2026-06-13** (PR #26 squash `a623ede` carries Slices 1+2+3+4): purge game-mode lineage (v3.8-v3.10 src/marioWorld + src/game + ViewMode + WebGL constellation + planets-tier + OnboardingHint REMOVED), dark palette tokens (#0B1020 bg / #00E5A8 accent / #00C2FF secondary accent) via CSS vars + Tailwind, and three JSON-driven sections (Contact, About, Skills). Section render order on main: Nav → Hero → About → Skill → Contact → Footer. 34/34 tests GREEN. Build 55.65 kB gz. Bundle-gate re-baselined (no WebGL chunk; index-*.js WARN 60 / HARD 68). 4/7 slices shipped; Slices 5 (Experience), 6 (Projects), 7 (Claude Code) remaining.

**Previously shipped:**
- v3.10 3D Constellation (closed 2026-06-10) — DEPTH-01 genuine 3D WebGL constellation: PerspectiveCamera + OrbitControls + category-z layout + planets-tier + OnboardingHint. **Superseded by v4.0 purge 2026-06-12** — entire WebGL/game-mode lineage stripped from main. Historical only. See [`milestones/v3.10-ROADMAP.md`](milestones/v3.10-ROADMAP.md), [`milestones/v3.10-REQUIREMENTS.md`](milestones/v3.10-REQUIREMENTS.md).
- v3.9 Game Mode Polish (closed 2026-06-08) — above-the-fold layout + SVG ambient twinkle. Superseded by v4.0 purge. See [`milestones/v3.9-ROADMAP.md`](milestones/v3.9-ROADMAP.md).
- v3.8 Game Mode (closed 2026-06-06) — Interactive skill-constellation landing. Vitest + RTL infrastructure introduced (carried forward into v4.0). Game-mode behavior superseded by v4.0 purge. See [`milestones/v3.8-ROADMAP.md`](milestones/v3.8-ROADMAP.md).
- v3.6 (closed 2026-05-20): brand palette refresh, Tailwind CSS-var refactor, hero photo, Claude Code section copy (carried into v4.0 Slice 7 work). See [`milestones/v3.6-ROADMAP.md`](milestones/v3.6-ROADMAP.md).
- v3.5 (2026-05-12 — partial): Themes & Projects delivered. See [`milestones/v3.5-ROADMAP.md`](milestones/v3.5-ROADMAP.md).
- v3.4 (2026-05-07): Brownfield redesign baseline — Vite 6 + React 18 + Tailwind v3.4. See [`milestones/v3.4-ROADMAP.md`](milestones/v3.4-ROADMAP.md).

## Next Milestone

**v4.0 close** — Ship remaining Slices 5–7, run real-device + Lighthouse UAT on production, tag `v4.0`. Then consider:
- v4.1 deploy completion (custom domain `andresmontoyat.co`, PR preview deploys, formal production-URL Lighthouse verdict — carried from v3.7)
- v4.2 backlog activation (VIS-05 claude-kanban + caveman cards in Claude section; DIAGRAMS-01 cross-repo architecture diagrams)

## v4.0 Portfolio Redesign — JSON-Driven Section Refactor (IN PROGRESS, opened 2026-06-12)

**Goal:** Strip the game-mode / WebGL / Mario-world complexity lineage (v3.8-v3.10) and ship a clean, recruiter-focused portfolio as section-by-section MVP slices. Every section gets its own `src/data/<section>.json` bilingual data contract + 7-spec test file + ~50-line v4 component. JSON contains plain text only (kills `dangerouslySetInnerHTML` XSS surface).

**v4.0 slice playbook (applied each section):**
1. Cut `v4.0-slice-N-<section>` branch off main (or off `v4.0-slice-1-purge` integration branch while it existed).
2. Author `src/data/<section>.json` — bilingual `{en, es}` field shape, uniform `pick(field, lang)` helper inlined per component.
3. RED tests: 7 Vitest + RTL specs (section id, EN render, structured content, ES translation, schema sanity, regression guards).
4. Refactor parked `<Section>.js` → v4 JSON-driven (~50 LOC). Drops `useInView`, `_shared/SectionLabel`, `dangerouslySetInnerHTML`, all `t.<section>` reads.
5. Strip `t.<section>` subtree from translations.js (preserve `t.nav.<section>` namespace).
6. Wire `<Section />` into App.js between flanking sections.
7. PR, squash, ship.

**Shipped slices (on main):**

- **Slice 1 — Game Purge + Base Palette** (PR #26 → main `a623ede`)
  - Deleted: `src/marioWorld/`, `src/game/`, `src/context/ViewModeContext`, `src/components/_shared/ViewModeToggle`, all sprites + WebGL constellation + planets-tier + OnboardingHint + click-vs-drag hook + bundle-gate WebGL ladder
  - Stripped: `t.game`, `t.world` subtrees from translations.js
  - Landed: dark palette CSS vars + Tailwind tokens (`bg-bg`, `text-text`, `text-muted`, `bg-surface`, `border-border`, `text-accent`), body bg + grid pattern, simplified App.js (Nav + Hero + Footer only)
  - Bundle gate: dropped WebGL chunk, rebaselined `index-*.js` (WARN 60 / HARD 68 kB gz)
  - Hero polish: container wrapper removed (Hero fills viewport), lead copy rewritten (career arc + 10 industry verticals), `</cam>` → `</camt>` glyph rebrand, Footer social order GitHub-first

- **Slice 2 — Contact** (PR #27 → slice-1-purge → main via #26)
  - New: `src/data/contact.json` (5 cards: email, phone, LinkedIn, GitHub, location) + `src/components/Contact.test.js` (7 specs)
  - Refactored Contact.js to v4 (~60 LOC, JSON-driven)
  - Stripped `t.contact` subtree
  - Wired between Hero and Footer

- **Slice 3 — About** (PR #28 → slice-1-purge → main via #26)
  - New: `src/data/about.json` (3 paragraphs + 5 quick-facts) + `src/components/About.test.js` (7 specs)
  - Refactored About.js to v4 (~50 LOC); killed `dangerouslySetInnerHTML` + `<strong>` markup leak
  - Stripped `t.about` subtree
  - Wired between Hero and Contact

- **Slice 4 — Skills** (PR #29 → slice-1-purge → main via #26)
  - New: `src/data/skills.json` (4 categories × 29 chips, bilingual category titles, years suffix `y` EN / `a` ES) + `src/components/Skill.test.js` (7 specs)
  - Refactored Skill.js to v4 (~50 LOC, JSON-driven)
  - Stripped `t.skills` subtree
  - Wired between About and Contact

**Remaining slices (parked sections, awaiting v4 refactor):**

- **Slice 5 — Experience** — Parked `Experience.js` reads `EXPERIENCE` array (`src/data/experience.js`) + `t.exp` subtree (label/h2/intro/expand/collapse). Heaviest remaining: vertical timeline with expand/collapse `useState`. Needs `experience.json` schema redesign (per-entry bilingual fields already in legacy module) + ARIA labels for expand/collapse.
- **Slice 6 — Projects** — Parked `Projects.js` reads `t.projects` subtree. Smallest remaining: "Selected work" grid with live + GitHub CTAs.
- **Slice 7 — Claude Code section** — Parked `Claude.js` reads `t<assistant-config>` subtree (biggest copy block: counters, values, services, dual CTAs). AI engineering sales pitch. Largest expected `claude.json`. VIS-05 backlog (claude-kanban + caveman cards back into featured-app grid) folds into this slice.

**v4.0 decisions logged (see also STATE.md for live list):**
- **D-v4.0-PURGE** — Game mode + Mario-world + WebGL constellation + ViewMode lineage REMOVED from main. v3.8-v3.10 work historical only.
- **D-v4.0-PALETTE** — Dark palette (#0B1020 / #00E5A8 / #00C2FF) via CSS vars + Tailwind tokens. Theme toggle deferred — single dark theme until UAT pushback.
- **D-v4.0-JSON-PER-SECTION** — Every section reads from `src/data/<section>.json`. Bilingual via `{en, es}` field shape + universal `pick(field, lang)` helper inlined per component. NO shared util module — duplicating `pick` keeps each section self-contained.
- **D-v4.0-NO-HTML-IN-DATA** — JSON contains plain text only. `<strong>` and inline HTML markup eliminated (kills `dangerouslySetInnerHTML` XSS surface).
- **D-v4.0-NO-SCROLL-REVEAL** — `useInView` + `animate-on-scroll` patterns dropped. v3.x animation layer not carried into v4.
- **D-v4.0-NO-SHARED-SECTIONLABEL** — `_shared/SectionLabel` component dropped. Each section inlines its own mono-accent label pattern (`font-mono text-xs uppercase tracking-[3px] text-accent` + 10px accent bar).
- **D-v4.0-STACKED-PR-INTEGRATION** — Each slice opens a PR onto the `v4.0-slice-1-purge` integration branch while it existed. Final integration squash carried the full chain into main as one commit. Integration branch retired post-#26 merge; Slices 5+ base directly on main.

**Decisions retired with v4.0 purge** (no longer load-bearing):
- All `D-20-*` (3D constellation: VISUAL-3D, CLICK-DRAG-THRESHOLD, PROPS-CONTRACT, CONTEXT-LOSS, PLANETS-TIER, CONTEXT-HINT)
- All `D-17-*` (WebGL desktop renderer: EXTRACT, HOVERED-PROP, EDGE-RGBA, LIGHTHOUSE-FLOW, SC5-TEST, FRAMELOOP, LIB, PRIMITIVES)
- All `D-14`/`D-16` game-mode decisions (LAYOUT, CARD-POSITION, BUNDLE-GATE-WebGL)

## Deferred (carried into v4.0+ from prior milestones)

- **Custom domain + production-URL Lighthouse** — Phase 12 (custom domain `andresmontoyat.co` + DNS) and Plan 11-05 (Lighthouse against deployed `*.vercel.app` URL) still pending. Site auto-deploys from `main` to `*.vercel.app`. Target: v4.1 post-v4.0 close.
- **PR preview deploys** — Phase 13. Target: v4.1.
- **VIS-05** — claude-kanban + caveman cards back into Claude section (3 of original 5 featured-app cards present). Folds into Slice 7.
- **DIAGRAMS-01** — cross-repo architecture diagrams. Carries from v3.6. Target: v4.2 or separate milestone.

<details>
<summary>v3.8 Game Mode — original milestone goal (for historical reference)</summary>

## v3.8 Game Mode (SHIPPED)

**Goal:** Add an interactive "game mode" — a skill constellation as the default landing (node = skill, edges = tech co-occurrence) with floating bilingual experience cards, multi-skill/year/category filters, and a persisted one-click toggle to the current ("dev") view. Adaptive render (full WebGL on desktop, lightweight SVG/DOM on mobile) keeps the Lighthouse mobile HARD gate, WCAG 2.1 AA, and SEO. Introduces Vitest + RTL test infrastructure.

**Source of truth:** `docs/superpowers/specs/2026-05-29-game-mode-design.md` (full decision log + architecture — read before planning).

**Target features:**
- **GAME-01** Adaptive constellation render — full WebGL on desktop, lightweight SVG/DOM static path on mobile (same data, two intensities; capability + viewport + reduced-motion detection)
- **GAME-02** Skill graph — nodes = skills, edges = co-occurrence in the same job, clustering by skill category (derived from `experience.js` tech[] + new `skills.js` category map)
- **GAME-03** Navigation/filters — multi-skill select + year/timeline (2007–2026) + category chips + reset (pure selectors)
- **GAME-04** Floating bilingual `ExperienceCard` on skill select — title/company/date/location/bullets/tech chips + CV CTA
- **GAME-05** Game/dev toggle — default landing = game; one-click to dev view; persisted in localStorage (`cam-viewmode`); `?mode=` deep-link
- **GAME-06** Accessibility + SEO — keyboard-navigable nodes, dialog/popover semantics for cards, sr-only full-experience fallback list, reduced-motion path
- **GAME-07** Hold the Lighthouse mobile HARD gate (Perf ≥95 / A11y 100 / BP 100 / SEO 100) + perf budget (three.js only in lazy desktop chunk; baked layout positions; < ~30KB gz added on mobile path)
- **TEST-01** Introduce Vitest + React Testing Library test infrastructure (unit-test pure graph/filter logic near-100%; component tests for toggle/card/filters)

**Locked decisions:**
- Feature lives in the existing portfolio repo; this is a new milestone, not a new project (`/gsd:new-project` blocked — project exists)
- Metaphor = skill constellation; **node = skill** (job is secondary; click skill → its experiences as cards)
- Playable interactive visualization — explorable/playful, **no objective, no win/lose**
- Game is the **default landing**; perf/SEO risk mitigated by the adaptive render (D7 in spec)
- **Adaptive render** resolves the conflict between "game default" and the HARD Lighthouse mobile gate — WebGL desktop / SVG mobile; DOM fallback doubles as SEO + a11y
- v3.8 introduces **Vitest + RTL** — pays down test-infra debt deferred across 9 milestones
- Phase numbering continues → v3.8 starts at **Phase 14** (v3.7 reserved 11–13 for deploy)
- v3.7 deploy work (11-05 Lighthouse gate verdict, DEPLOY-02 custom domain, DEPLOY-03 PR preview) **carried as deferred** — site remains live on `*.vercel.app`; deploy/domain resumed in a future milestone

</details>

## What This Is

A bold, creative personal portfolio website for Carlos Andres Montoya, a senior backend engineer. The site targets recruiters and employers, designed to make a powerful first impression with rich animations, dynamic layouts, and a distinctive visual identity. Fully bilingual (English/Spanish) with flawless mobile experience.

## Core Value

The hero section and overall first impression must stop recruiters mid-scroll and make them want to learn more about Carlos.

## Requirements

### Validated

- [x] Bilingual support (EN/ES) with language switcher and localStorage persistence
- [x] Experience data for 12 job entries with detailed descriptions
- [x] CV download functionality (EN/ES Word documents) — Phase 2 (dual EN/ES buttons in Hero)
- [x] Google Analytics integration (G-4TZJGR3MXR)
- [x] Modern build toolchain (Vite 6 + React 18 + Tailwind v3.4) — Phase 1
- [x] Bold design token system (indigo/coral palette, CSS custom properties) — Phase 1
- [x] Self-hosted fonts (Inter + JetBrains Mono via @fontsource) — Phase 1
- [x] Accessibility: prefers-reduced-motion support — Phase 1
- [x] Clean ESLint config with react-hooks enforcement — Phase 1
- [x] Hero section with bold first impression (status badge, char-reveal h1b, 7-step entrance stagger, dual CV CTAs, 4-stat grid) — Phase 2
- [x] Functional bilingual navigation (sticky shell, hamburger overlay via createPortal, scroll-spy active link, scroll progress bar, EN/ES LangPill) — Phase 2
- [x] SEO-04: synchronous lazy lang init eliminates first-paint flash; html lang + per-language title/meta description sync — Phase 2
- [x] About / Skills / Experience / Contact / Footer redesigned (4-category skills chip cloud, vertical experience timeline with 12 entries + tech chips + per-card expand, email-hero with copy-to-clipboard, minimal footer) — Phase 3
- [x] Scroll-triggered entrance animations via useInView IntersectionObserver hook + CSS classes (no JS animation library); 100ms stagger; prefers-reduced-motion suppression — Phase 3
- [x] Open Graph + Twitter card meta tags with branded 1200x630 og-image.png; per-language og:title/og:description sync — Phase 3 (SEO-01)
- [x] GA G-4TZJGR3MXR page-view events firing — Phase 3 (SEO-02)
- [x] Professional presentation of work history (12 entries timeline) — Phase 3
- [x] Working contact method (mailto: + email copy-to-clipboard, 3 secondary cards) — Phase 3

- [x] Lighthouse Performance 98 / Accessibility 100 / Best Practices 100 / SEO 100 on mobile preset — Phase 4 (SEO-03)
- [x] All interactive elements meet 44px tap target minimum (target-size audit 1.0) — Phase 4 (RESP-03)
- [x] Responsive sweep verified at 4 breakpoints (iPhone 14, Pixel 7, iPad, 4K) — Phase 4 (RESP-01)
- [x] Scroll perf verified jank-free via Chrome DevTools Performance profile — Phase 4 (RESP-02)
- [x] A11y baseline: skip-to-content link, jsx-a11y promoted to error, ARIA landmarks, single h1 hierarchy — Phase 4
- [x] Bundle: 168 KB main + 11/3/1 KB lazy chunks (Experience/Contact/Footer); CSS gzip 12.6 KB — Phase 4
- [x] Test infrastructure decision: locked as manual UAT only for v3.4 (revisit v3.5+) — Phase 4 D-04

- [x] **VIS-01** Dark/light theme toggle — ThemeContext + ThemeToggle + CSS variable swap + `cam-theme` localStorage; sun/moon button in Desktop + Mobile nav; Lighthouse a11y 100 — v3.5 Phase 5
- [x] **VIS-03** Projects showcase section — 4 bilingual entries in `src/data/projects.js`; responsive `Projects.js` card grid with brand-gradient fallback; lazy-loaded `Projects-DucOh_hO.js` chunk between Experience and Contact; scroll-spy wired — v3.5 Phase 6
- [x] **DEBT-01** Orphaned i18n keys removed (`t.hero.cta2`, `t.contact.loc` cleaned from EN+ES) — v3.5 Phase 5
- [x] **DEBT-02** `scripts/og-template.html` self-hosts Inter via `@fontsource/inter` (5 `@font-face` blocks, 0 Google Fonts CDN refs); `npm run og:gen` reproducible — v3.5 Phase 5
- [x] **DEBT-03** GA `<script>` moved into `<head>` (HTML spec compliant; SEO-02 firing preserved) — v3.5 Phase 5

- [x] **THEME-01** Tailwind CSS-var refactor — `colors.{ink,brand,accent,text}.*` reference `var(--color-*)` instead of hardcoded hex; `:root` (dark defaults) + `[data-theme="light"]` overrides in `index.css`; theme toggle functionally flips all 8 sections — v3.6 Phase 7
- [x] **COLOR-01** Brand palette swap — `brand` `#6C63FF` → blue-500 `#3B82F6`; `accent` `#FF6B6B` → emerald-500 `#10B981`; WCAG AA contrast verified in both modes (light: `#2563EB` 4.97:1 / `#047857` 5.05:1 on white); og-image regenerated — v3.6 Phase 7
- [x] **HERO-01** Cinematic full-bleed hero photo via `<picture>` w/ 800w mobile + 1600w desktop WebP; theme-aware `--hero-photo-filter` / `--hero-overlay` / `--hero-h1-shadow` CSS vars; sharp pipeline (`npm run hero:process`); LCP preload — v3.6 Phase 8 (visual UAT deferred to v3.7 pre-deploy gate)
- [x] **AI-01** Bilingual sales-pitch Claude Code section between Projects and Contact — 9.95 KB lazy chunk; PitchHero + 4 ValueCard + ProofBlock (7 counters) + 5 ServiceCard + 3 FeaturedAppCard (GSD, spring-ai-qdrant-mcp, ci-templates) + StackStrip (17 chips); scroll-spy in Desktop + Mobile nav; CTAs → #contact / #projects — v3.6 Phase 9 (note: shipped with 3 of original 5 featured-app cards; claude-kanban + caveman moved to backlog as VIS-05)
- [x] **AI-01-CICD** `soldife/ci-templates` surfaced as DevOps evidence in AI section — app card with `OPEN SOURCE / DEVOPS` badge + 10 tech chips, DevOps automation service card, +2 proof counters (47 workflows / 15 templates), bilingual EN+ES — v3.6 Phase 9

- [x] **GAME-01** Adaptive constellation render — WebGL desktop / SVG-DOM mobile — v3.8
- [x] **GAME-02** Skill graph — nodes=skill, edges=co-occurrence, category clustering — v3.8
- [x] **GAME-03** Filters — multi-skill + year/timeline + categories + reset — v3.8 Phase 16
- [x] **GAME-04** Floating bilingual ExperienceCard on skill select + CV CTA — v3.8 Phase 16
- [x] **GAME-05** Game/dev toggle — default game, persisted localStorage + `?mode=` — v3.8 Phase 14
- [x] **GAME-06** A11y (keyboard nodes, dialog cards, sr-only fallback, reduced-motion) + SEO — v3.8 Phase 15
- [x] **GAME-07** Hold Lighthouse mobile HARD gate + perf budget — v3.8 Phase 17
- [x] **TEST-01** Vitest + RTL test infrastructure (test-infra debt paid down after 9 deferred milestones) — v3.8 Phase 14

- [x] **POLISH-01** Constellation visible above the fold without scroll on desktop/tablet/mobile — v3.9 Phase 18 (SkillFilters → fixed bottom-0 z-30; H1 compact; renderer slot flex-1)
- [x] **POLISH-02** Never-static constellation — SVG ambient twinkle on every render path; prefers-reduced-motion preserved — v3.9 Phase 19 (motion-safe:animate-svg-twinkle, deterministic per-node phase offset)

- [x] **DEPTH-01** Genuine 3D WebGL constellation with drag-to-rotate — v3.10 Phase 20 (PerspectiveCamera fov=55 + OrbitControls damping+polar-clamp+autoRotate + CATEGORY_Z deterministic layout + size-attenuation shader + Vector3.project pick + webglcontextlost SVG swap + useClickVsDrag 5/8/250 thresholds + planets-tier top-K=6 + bilingual OnboardingHint pill); mobile SVG path UNCHANGED; Lighthouse mobile HARD gate cleared; 293/293 tests GREEN

### Active

(None — awaiting v3.10 scoping. See "Next Milestone" section above.)

### Deferred (carried from v3.7 — site live on `*.vercel.app`, auto-deploy verified)

- [ ] **DEPLOY-01 (gate)** Lighthouse mobile gate verdict (Plan 11-05) — deferred 2026-05-29; site auto-deploys from main, formal gate run still pending. Remains HARD gate before custom-domain cutover.
- [ ] **DEPLOY-02** Custom domain andresmontoyat.co + DNS (CNAME/A) → Vercel; HTTPS auto-cert; OG card on canonical domain
- [ ] **DEPLOY-03** Auto-preview deploys per PR with OG card validation

### Backlog

- [ ] **DIAGRAMS-01** Cross-repo architecture diagrams (deferred from v3.6 Phase 11 de-scope) — gradle PlantUML + Structurizr for `spring-ai-qdrant-mcp`; Mermaid `.mmd` for GSD/claude-kanban/ci-templates/caveman; `scripts/sync-diagrams.sh`; clickable AI app cards open Mermaid/SVG modal
- [ ] **VIS-05** Add claude-kanban + caveman featured-app cards back into AI section (currently 3 of original 5)
- [ ] REQUIREMENTS.md traceability sync (remaining unmapped: VIS-02, VIS-04, ASEO-01..03, INTX-01..03) — milestone audit task

### Out of Scope

- Backend/API development — this is a static frontend site
- Blog or CMS functionality — not needed for a portfolio
- Authentication or user accounts — no login required
- E-commerce or payments — not a commercial site
- React Router / multi-page SPA — single-page is sufficient

## Context

- Existing codebase is a React + Tailwind CSS single-page app built with Create React App (via CRACO)
- Current dark neon theme (cyan/purple gradients) looks dated — redesign should feel fresh and modern while being bold
- i18n already implemented with react-i18next, translation files in `src/i18n/locales/`
- Experience data structured in `src/data/experience.js` with 12 entries
- There's a duplicate `website-new/` directory with a standalone HTML version that should be cleaned up
- Unused dependencies exist (react-router-dom, react-hook-form) that should be removed
- No tests exist currently — testing infrastructure should be considered
- ESLint config has issues (references missing plugins) that need cleanup

## Constraints

- **Stack**: React + Tailwind CSS (keep existing stack, modernize usage)
- **Bilingual**: Must maintain EN/ES support with i18n
- **Performance**: Rich animations must not degrade mobile performance — target Lighthouse 90+
- **Accessibility**: Must meet WCAG 2.1 AA basics (contrast, keyboard nav, screen reader)
- **Hosting**: Static site — must build to static assets for deployment

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep React + Tailwind | User preference, existing codebase familiarity | Validated — Phase 1 |
| Bold & creative direction | User wants personality, not corporate minimal | Validated — Phase 2 hero delivers bold first impression |
| Rich animations | Site should feel alive and impressive | Validated — Phase 2 (CSS-first stagger + char-reveal); extends in Phase 3 |
| Mobile-critical | Recruiters browse on phones | Validated — Phase 2 hamburger portal + responsive nav |
| Fresh content structure | Current sections feel generic — rethink from scratch | Validated — Phase 3 (4-category skills, vertical timeline, email-hero) |
| In-place component modify (D-01) | Lower diff, retain git history per file | Phase 2, Phase 3 |
| Native CSS scroll-behavior + custom IntersectionObserver (D-02/D-03) | Drop unused react-scroll dep; lighter bundle than lib | Phase 2, Phase 3 (useInView hook reused pattern) |
| React portal mobile menu (D-05) | Avoids z-index conflicts with sticky nav, body scroll-lock cleaner | Phase 2 |
| Manual browser-only testing (D-06) | Defer test infra to Phase 4 if quality gates require | Phase 2, Phase 3 |
| Tech chips from explicit `tech:[]` field per entry | Easier to maintain, grep-friendly | Phase 3 |
| Independent expand/collapse per experience card | More flexible than accordion | Phase 3 |
| All 12 experience entries visible from first load | Recruiters scan full career arc at-a-glance | Phase 3 |
| 1200x630 branded OG image generated via Playwright | Reproducible toolchain (`npm run og:gen`) for future regen | Phase 3 (SEO-01) |
| Animation threshold 25% / stagger 100ms | Standard cadence — neither rushed nor laggy | Phase 3 (ANIM-01/03) |
| Theme: Dark (default) + Light only — no system mode | Bold dark identity is brand; light mode is accessibility/preference, not auto-switching | Validated — v3.5 Phase 5 |
| Theme UI: icon button in nav next to LangPill | Mirrors LangPill pattern; predictable location across viewports | Validated — v3.5 Phase 5 |
| ThemeContext mirrors LanguageContext pattern | Consistent React Context shape (provider + hook + localStorage key); no new state lib | Validated — v3.5 Phase 5 |
| `[data-theme="light"]` CSS variable overrides on `:root` | Theme swap without re-rendering components; CSS transitions handled in media query (reduced-motion safe) | Validated — v3.5 Phase 5 |
| Projects data: `src/data/projects.js` mirroring `experience.js` bilingual pattern | Consistent shape for bilingual content; trivial to extend with new entries | Validated — v3.5 Phase 6 |
| Projects screenshots in `public/projects/`; brand-gradient fallback when null | Zero CLS via `aspect-video` reservation; missing assets degrade gracefully | Validated — v3.5 Phase 6 |
| Projects chunk lazy-loaded between Experience and Contact | Keeps main bundle lean; separate `Projects-DucOh_hO.js` chunk | Validated — v3.5 Phase 6 |
| og-template fonts self-hosted via `@fontsource/inter` | Reproducible builds, no CDN dependency, identical og-image.png output | Validated — v3.5 Phase 5 (DEBT-02) |
| Deploy infrastructure (Vercel + andresmontoyat.co) | Auto-preview + custom domain per locked decision | ⚠ Still deferred — now → v3.7 (carries from v3.5/v3.6) |
| Test infrastructure deferred again (7 consecutive milestones through v3.6) | Manual UAT continues to catch regressions at acceptable cost | — Pending — revisit if v3.7 reveals regression debt |
| Tailwind config references CSS variables (v3.6 Phase 7 / THEME-01) | Fix Phase 5 false-positive: existing utility classes flip on `[data-theme]` swap | ✓ Good — every section visually flips per integration check |
| Brand palette: blue-500 (#3B82F6) + emerald-500 (#10B981) (v3.6 Phase 7 / COLOR-01) | Modernize identity vs original indigo/coral; preserve WCAG AA contrast in light | ✓ Good — contrast holds 4.97:1 + 5.05:1 in light |
| Hero photo as `<picture>` + WebP (v3.6 Phase 8 / HERO-01) | Cinematic first impression; LCP preload keeps Performance budget | ✓ Good (code); visual UAT deferred to v3.7 pre-deploy gate |
| Theme-aware `--hero-photo-filter` / `--hero-overlay` / `--hero-h1-shadow` CSS vars (v3.6 Phase 8) | Theme system from Phase 7 extends to image filters Tailwind cannot tokenize | ✓ Good — cross-phase integration WIRED |
| Bilingual sales-pitch Claude Code section, lazy-loaded chunk (v3.6 Phase 9 / AI-01) | Recruiter-funnel via section between Projects and Contact; bundle stays lean | ✓ Good — 9.95 KB chunk, scroll-spy wired |
| AI-01 doc-drift: 3 featured-app cards instead of 5 (v3.6 Phase 9 close) | Scope discipline — claude-kanban + caveman not ready for sales-grade card spec | ✓ Accepted — VIS-05 in backlog |
| Phase 11 (DIAGRAMS-01) de-scoped from v3.6 | Bandwidth focus on closure — diagrams are nice-to-have, not blocker | ⚠ Re-roadmap in future milestone |
| Phase 10 UAT closed early (9/11 skip → v3.7 pre-deploy gate) | Same Lighthouse / visual sweep needed for v3.7 deploy anyway; better executed against production build | ⚠ Conscious deferral — tracked in audit + STATE.md |
| No git tag at v3.6 close | Consistent with v3.5; tag deferred until production site is live (v3.7) | — Pending v3.7 deploy |
| v3.9 micro-milestone scope (POLISH-01/02 only, no feature expansion) | Pure parity tightening of v3.8 surfaced in first real session; not a feature line | ✓ Good — same-day delivery, zero regression |
| Phase 19 shipped inline as single feat commit (no PLAN.md/SUMMARY.md) | Micro-feature (single tailwind keyframe + 2 tests); formal plan overhead unwarranted | ✓ Accepted — REQ coverage verified via commit + ROADMAP |
| SVG opacity-only animation over scale/translate (v3.9 Phase 19) | GPU-composited, no layout thrash, sidesteps SVG transform-origin quirks on path circles | ✓ Good — 8.87 kB gz unchanged |
| Deterministic per-node phase offset via `-(sortIndex * 137) % 4000`ms (v3.9 Phase 19) | Golden-ratio-inspired spacing prevents synchronized pulsing (mechanical read); reuses existing sortIndex | ✓ Good — perceptually organic, zero new state |
| v3.9 tagged inline during Phase 19 close (vs at milestone ceremony) | Single-day micro-milestone; tagging at code-complete kept ROADMAP and git history aligned | ✓ Accepted — tag v3.9 on 4e9c2b3 |
| Manual UAT deferred at v3.9 close (pending v3.10 deploy verify) | Visual confirm needs real devices + deployed URL; conflates with deferred DEPLOY work | ⚠ Tracked in STATE.md Deferred Items |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-19 — milestone v5 Astro Migration started. v4.2 Content Polish remains in-progress directly on `main`, untouched by v5 (separate branch, merges only with Lighthouse gate green). Source: `docs/superpowers/specs/2026-07-19-astro-migration-design.md` (commit `6a3bf4a`).*
