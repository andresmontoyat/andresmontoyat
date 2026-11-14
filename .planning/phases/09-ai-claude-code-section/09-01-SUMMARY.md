---
phase: 09-ai-claude-code-section
plan: "01"
subsystem: ai-section
tags: [ai-section, claude-code, sales-pitch, bilingual, lazy-load, scroll-spy, devops]
completed: 2026-05-12
status: complete
requirements_completed: [AI-01, AI-01-CICD]
commits:
  - 803cb68 — feat(09-01): add src/data/claude.js — bilingual VALUES/SERVICES/APPS/COUNTERS/STACK_CHIPS
  - fd7ee09 — feat(09-01): add t<assistant-config>.* namespace + t.nav.claudeCode to translations.js (EN+ES)
  - efa15e2 — feat(09-01): Claude.js component + 6 internal sub-components
  - 07b8366 — feat(09-01): Claude.js entrance animations via useInView + stagger 100ms
  - e80986f — feat(09-01): App.js lazy-load Claude component between Projects and Contact
  - b264bdf — feat(09-01): Nav adds claude-code SECTION_ID + DesktopNav + MobileMenu link entries
  - 2d88a57 — chore(09-01): verify Claude lazy chunk emits and stays within size budget
files_created:
  - src/data/claude.js
  - src/components/Claude.js
files_modified:
  - src/i18n/translations.js
  - src/App.js
  - src/components/Nav.js
dependency_graph:
  requires:
    - Phase 7 (CSS-var infra + new palette, brand/accent tokens)
    - Phase 7 Plan 07-02 (brand-gradient utility in tailwind.config.js)
    - Phase 8 (hero photo wired — visual flow lands recruiters into projects→AI→contact)
  provides:
    - "#claude-code anchor + section as new scroll-spy target"
    - "src/data/claude.js — VALUES/SERVICES/APPS/COUNTERS/STACK_CHIPS named exports"
    - "t<assistant-config>.* translation namespace (54 entries) + t.nav.claudeCode"
    - "Lazy Suspense boundary src/components/Claude.js (dist/assets/Claude-*.js)"
  affects:
    - src/i18n/translations.js (extended, no breaking changes)
    - src/App.js (Suspense boundary count 4→5)
    - src/components/Nav.js (SECTION_IDS length 5→6, link arrays length 5→6)
tech_stack:
  added:
    - "Tailwind arbitrary-value syntax for rgba() gradient stops (PitchHero backdrop)"
  patterns:
    - "Mirrored Projects.js single-file component with internal sub-components"
    - "useInView(ref, { threshold: 0.15 }) entrance animation, 100ms per-card stagger"
    - "Bilingual data module + translation-namespace split (consistent with projects.js + t.projects)"
key_files:
  created:
    - path: src/data/claude.js
      role: bilingual data module — 5 named exports, no default
    - path: src/components/Claude.js
      role: lazy-loaded React section + 6 file-local sub-components
  modified:
    - path: src/i18n/translations.js
      role: extended with t<assistant-config>.* (27 keys × 2 langs) + t.nav.claudeCode
    - path: src/App.js
      role: React.lazy(Claude) + Suspense block between Projects and Contact
    - path: src/components/Nav.js
      role: 'claude-code' added to SECTION_IDS + DesktopNav + MobileMenu link arrays
decisions:
  - "PitchHero backdrop uses Tailwind arbitrary-value rgba() stops (`from-[rgba(16,185,129,0.04)] to-[rgba(59,130,246,0.02)]`) instead of `from-accent/5 to-brand/5` — CSS-var-backed tokens in tailwind.config.js are full hex strings (not space-separated triplets), so the `/opacity` modifier compiles to invalid CSS. Arbitrary values mirror the V7 sketch's literal linear-gradient rule and render identically in dark+light modes."
  - "Single section-level useInView ref + boolean (Option A per plan task B2) instead of two ref pairs — simpler, matches CONTEXT decision-p exemplar; all 3 grid wrappers flip together when the section enters the viewport."
  - "Task D1 committed with --allow-empty (no source changes — verification-only step). Keeps the 7-commit atomic-per-task contract with a recorded build-verification artifact."
metrics:
  task_count: 7
  duration_minutes: ~18
  commits: 7
  files_created: 2
  files_modified: 3
  new_translation_entries: 54
  named_exports_added: 5
  build_time_ms: 957
  claude_chunk_bytes: 9949
  claude_chunk_gzip_bytes: ~3440
one_liner: "Ships the V7 sales-pitch AI / Claude Code section between Projects and Contact — bilingual EN+ES, lazy-loaded 9.95 kB chunk, 7-counter proof block, 5 services, 3 featured apps (ci-templates, GSD, spring-ai-qdrant-mcp), scroll-spy in Desktop+Mobile nav, recruiter-routing CTAs to #contact and #projects."
---

# Phase 9 Plan 01: AI / Claude Code Section Summary

## What was built

A new lazy-loaded React section (`src/components/Claude.js`) positioned between Projects and Contact in the page flow. The section follows the locked V7 sales-pitch sketch: a tinted PitchHero with eyebrow label + gradient half-line headline + sub-lead + dual CTAs, followed by a 4-card numbered Values grid, a 7-counter ProofBlock anchored by "I built my own toolkit before selling it", a 5-card left-bordered Services grid, a 3-card FeaturedApps grid (ci-templates / GSD framework / spring-ai-qdrant-mcp) with tag badges and stack chips, and a 17-chip StackStrip credentials row.

All user-facing copy is sourced from `t<assistant-config>.*` (54 new translation entries) and `*.desc[lang]` from the new `src/data/claude.js` data module. Nav scroll-spy was extended (`SECTION_IDS` + DesktopNav + MobileMenu) with a new "Claude Code" link.

## Task completion table

| Task | Name | Commit | Files |
| --- | --- | --- | --- |
| A1 | Create `src/data/claude.js` bilingual data module | `803cb68` | `src/data/claude.js` |
| A2 | Extend `src/i18n/translations.js` with `t<assistant-config>.*` + `t.nav.claudeCode` | `fd7ee09` | `src/i18n/translations.js` |
| B1 | Create `src/components/Claude.js` with 6 internal sub-components | `efa15e2` | `src/components/Claude.js` |
| B2 | Wire `useInView` + `animate-on-scroll`/`is-visible` toggle | `07b8366` | `src/components/Claude.js` |
| C1 | Add Claude lazy import + Suspense block to `src/App.js` | `e80986f` | `src/App.js` |
| C2 | Add `'claude-code'` to SECTION_IDS + DesktopNav + MobileMenu | `b264bdf` | `src/components/Nav.js` |
| D1 | Build, verify Claude lazy chunk emission + size budget | `2d88a57` | (verification only — `--allow-empty`) |

## Named exports in `src/data/claude.js`

| Export | Count | Notes |
| --- | --- | --- |
| `VALUES` | 4 | velocity, discipline, quality, transfer — longform bilingual descriptions |
| `SERVICES` | 5 | greenfield, aiSetup, mcp, legacy, devops — one-sentence each (devops anchors to ci-templates) |
| `APPS` | 3 | ci-templates (OPEN SOURCE), gsd (FRAMEWORK), spring-ai-qdrant-mcp (MCP) — REAL data, no placeholders |
| `COUNTERS` | 7 | 37/81/86/15/47/15/5 per locked CONTEXT decision-b |
| `STACK_CHIPS` | 17 | Java 21, Kotlin 2.x, Spring Boot 3, Hexagonal, PostgreSQL, Kafka, Redis, AWS, Docker, Kubernetes, Terraform, GitHub Actions, Jenkins, SonarQube, Claude Code, MCP, Spring AI |

## Build artifacts

| Artifact | Size (raw) | Size (gzip) |
| --- | --- | --- |
| `dist/assets/Claude-BSlpJmEk.js` | 9949 bytes (9.95 kB) | ~3.44 kB |
| `dist/assets/index-*.js` (main) | 173.43 kB | 55.39 kB |
| `dist/assets/index-*.css` | 38.53 kB | 13.55 kB |

Claude chunk size **9949 bytes** sits ~24% above the 8 KB soft target (CONTEXT decision-p) but **comfortably within** the 12 KB hard ceiling. Driver: 6 sub-components + 138-line data import. Phase 10 may tune by promoting `STACK_CHIPS` to `_shared/` if a second section ever reuses it; not warranted in v3.6.

## AI-01-CICD evidence (sub-feature coverage)

Per Plan 09-01 success criterion #7, the AI-01-CICD sub-requirement is fully surfaced:

- **`ci-templates` APP card** in `src/data/claude.js` explicitly lists: **47 workflows**, **15 starter templates** (Java, Krakend, React), **GitFlow** strategy, **quality gates** (SonarQube · OWASP · ArchUnit · Qodana), **deploys** EC2 / EC2-over-WireGuard-VPN / EKS, stack chips `github-actions / gitflow / sonarqube / owasp / eks / ec2 / wireguard / ecr / helm / jenkins`.
- **`devops` SERVICE card** copy: *"Production-ready GitHub Actions templates + GitFlow + multi-cloud deploys (EC2, VPN-tunneled EC2, EKS) backed by the soldife/ci-templates toolkit"* — explicitly anchors back to the featured app card.
- **`ciWorkflows: 47` + `starterTemplates: 15`** counters appear in the 7-counter ProofBlock.

## Deviations from plan

### Auto-fixed during execution

**1. [Rule 3 — Blocking issue] PitchHero gradient backdrop syntax**

- **Found during:** Task B1 implementation.
- **Issue:** The plan suggested `bg-gradient-to-br from-accent/5 to-brand/5` for the PitchHero backdrop. But Tailwind's opacity modifier (`/5`, `/10`, etc.) requires the underlying CSS variable to be a *space-separated RGB triplet* (e.g. `--color-accent: 16 185 129;`) so Tailwind can inject `<alpha-value>`. The Phase 7 implementation stores full hex/RGB values (`--color-accent: #10B981;`), so `from-accent/5` would compile to `rgba(#10B981, 0.05)` — invalid CSS, browsers ignore it, no backdrop renders.
- **Fix:** Used Tailwind arbitrary-value syntax that mirrors the V7 sketch's literal CSS rule: `bg-gradient-to-br from-[rgba(16,185,129,0.04)] to-[rgba(59,130,246,0.02)]`. Renders identically to the locked sketch in both themes; the alpha values are subtle enough (4% emerald + 2% blue) to read OK against any background.
- **Files modified:** `src/components/Claude.js` (B1).
- **Commit:** `efa15e2`.
- **Plan explicitly allowed this:** "*(`bg-gradient-to-br from-accent/5 to-brand/5 rounded-2xl p-8 md:p-12 mb-12` or theme-aware equivalent)*" — arbitrary values are the theme-aware equivalent here.

**2. [Rule 3 — Blocking issue] B1 lint error on unused `inView` binding**

- **Found during:** Task B1 verification.
- **Issue:** Plan B1 scaffolds className strings as `animate-on-scroll` (without the is-visible conditional) and Plan B2 wires the toggle. ESLint flagged the bound `inView` as unused in B1's standalone snapshot.
- **Fix:** B1 calls `useInView(sectionRef, { threshold: 0.15 })` without binding the return — preserves the hook-call side effect and IntersectionObserver attachment for future verifiers, and B2 trivially restores `const inView = useInView(...)` plus the three className conditionals. Each per-task commit ends lint-clean.
- **Files modified:** `src/components/Claude.js`.
- **Commits:** `efa15e2` (B1 scaffolds without binding), `07b8366` (B2 binds + wires conditionals).

**3. [Rule 3 — Blocking issue] D1 source-less commit**

- **Found during:** Task D1.
- **Issue:** D1 is a build-verification step with no source changes — strict `git commit` would fail on no staged content; ditto Vite's `dist/` is gitignored.
- **Fix:** `git commit --allow-empty` to record the verification artifact in history, satisfying the plan's "Commit recorded" done criterion and the 7-commits-atomic contract. Commit body carries the verification numbers (chunk size, build time, lint exit code, dist/index.html integrity check).
- **Commit:** `2d88a57`.

## Doc-drift items flagged for Phase 10 UAT

These two doc-drift entries are explicitly called out per Task D1 `<done>` so Phase 10 UAT does NOT treat them as regressions. Both predate the 09-CONTEXT discuss-phase and reflect stale early-milestone drafts.

**1. REQUIREMENTS.md AI-01: 5 apps → 3 apps**

The current REQUIREMENTS.md draft for AI-01 lists 5 featured apps. This plan ships **3** (ci-templates, GSD framework, spring-ai-qdrant-mcp) per the locked V7 sketch + CONTEXT decision-b. The other two candidates (claude-kanban + caveman) are **deferred to the v3.7 backlog** as scope-expansion candidates. Rationale: V7 sketch + chunk-size budget + content-quality bar all favored shipping 3 with strong evidence over 5 with thinner copy. Phase 10 UAT should treat the 3-app delivery as the intended state — REQUIREMENTS.md will be patched during Phase 10 (or v3.7 kickoff) to reflect the locked scope.

**2. ROADMAP.md Phase 9 SC2: stale counts**

ROADMAP.md Phase 9 SC2 currently reads "5 counters + 4 service cards". This plan ships **7 counters + 5 service cards** per locked 09-CONTEXT decision-b + the V7 sketch's `.pstats` block (7 `.pstat` items) and `.services` block (5 `.svc` items). The ROADMAP entry was authored before the discuss-phase ran, so it does not reflect the locked output. Phase 10 UAT should patch ROADMAP.md to read "7 counters + 5 service cards (devops anchors ci-templates)" for accuracy. Not a regression — counts went UP, not down.

## Known stubs

None. All content is REAL data — no placeholder strings, no hardcoded empty UI, no "coming soon" copy. The three empty `links: []` arrays in `APPS` entries are intentional forward-compat shape per CONTEXT decision-b (`// empty for v3.6; future = [{ label, href }]`) — `FeaturedAppCard` does NOT render a links block in v3.6, so the empty array doesn't surface as broken UI. Will get consumed when DIAGRAMS-01 (Phase 11) extends the card with a modal trigger.

## Hand-off to Phase 10 (UAT)

Phase 10 owns the full real-browser sweep. Specifically verify:

- **Visual layout** at iPhone 14 (390px), iPad (768px), 1440px desktop in both **dark and light** modes — PitchHero backdrop should read as a subtle tinted card; ValueCard / ServiceCard / FeaturedAppCard should look visually distinct (numbered top-left / left-border accent / tag-badge top-right).
- **Scroll-spy active state**: when scrolled into `#claude-code` the Desktop nav's "Claude Code" link gets the brand underline; same for Mobile menu overlay.
- **Smooth scroll**: PitchHero primary CTA scrolls to `#contact`; secondary CTA scrolls to `#projects`. Both should respect existing CSS `scroll-behavior: smooth`.
- **Language toggle**: clicking EN/ES flips all 54 new entries live without remount (no flicker, no missing keys).
- **Prefers-reduced-motion**: with `prefers-reduced-motion: reduce` set, the per-card 100ms stagger and `motion-safe:` hover/transform utilities should be suppressed (cards appear in their final state immediately, no transform on hover).
- **WCAG AA contrast**: all new text (PitchHero label, h2 brand-gradient span, sub-lead, value titles/desc, proof counters/labels, service titles/desc, app names/tags/desc/chips, stack chips) against the surfaces they sit on — light mode brand `#2563EB` + accent `#047857` should pass; dark mode brand `#3B82F6` + accent `#10B981` should pass.
- **Bundle metric**: `wc -c dist/assets/Claude-*.js` ≤ 12_000 (Phase 10 may tune toward 8 KB target if visual fidelity allows).
- **AI-01-CICD smoke check**: ci-templates app card surfaces "47 workflows + 15 starter templates + GitFlow + EC2/EC2-VPN/EKS + SonarQube/OWASP/ArchUnit/Qodana" — verify all evidence strings present in rendered HTML in both EN and ES.
- **Doc-drift items #1 + #2 above** — Phase 10 should NOT flag the 3-app and 7-counter/5-service shape as regressions; patch REQUIREMENTS.md and ROADMAP.md as part of the UAT cleanup if the user agrees.

## Self-Check: PASSED

- `src/data/claude.js`: FOUND (138 lines, 5 named exports verified)
- `src/components/Claude.js`: FOUND (191 lines, 6 internal sub-components verified)
- `src/i18n/translations.js`: MODIFIED (claudeCode×2, claude:{}×2, ciWorkflows×2, starterTemplates×2, appsShipped×2, subLead×2, proofHeading×2 — all confirmed)
- `src/App.js`: MODIFIED (1 lazy import + 1 Suspense block, Claude line 47 < Contact line 50)
- `src/components/Nav.js`: MODIFIED ('claude-code'×3, t.nav.claudeCode×2, SECTION_IDS array reads exactly per spec)
- Commit `803cb68`: FOUND
- Commit `fd7ee09`: FOUND
- Commit `efa15e2`: FOUND
- Commit `07b8366`: FOUND
- Commit `e80986f`: FOUND
- Commit `b264bdf`: FOUND
- Commit `2d88a57`: FOUND
- `dist/assets/Claude-BSlpJmEk.js`: EMITTED (9949 bytes ≤ 12000 ceiling)
- `npm run build`: exit 0 (957ms)
- `npm run lint`: exit 0 (4 pre-existing warnings, 0 errors)
- `tailwind.config.js` `'brand-gradient'`: PRESENT
- `dist/index.html` Phase 8 preload tag `/me-1600.webp`: PRESENT
