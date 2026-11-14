# Phase 11: Vercel auto-deploy + UAT pre-deploy gate - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 11-vercel-deploy-uat-gate
**Areas discussed:** Vercel project setup, vercel.json scope, UAT execution order, Lighthouse measurement protocol

---

## Vercel Project Setup

| Option | Description | Selected |
|--------|-------------|----------|
| vercel.json first + CLI link | Commit vercel.json to repo with explicit Vite framework + dist output + SPA fallback. Then `vercel link` ties local repo to Vercel project. Reproducible: anyone can clone + deploy. Config is git-tracked. | ✓ |
| Vercel Dashboard UI only | Create project in Vercel web UI, point at GitHub repo, configure via Dashboard. No vercel.json in repo — Vercel auto-detects Vite. Faster setup, less reproducible (config lives outside git). | |
| CLI link only, no vercel.json | Run `vercel link` + `vercel` from terminal. Vercel auto-detects Vite. Project linked via .vercel/project.json (gitignored). Lightest — may need vercel.json later for SPA fallback or cache headers. | |

**User's choice:** vercel.json first + CLI link (Recommended)
**Notes:** Repo-tracked config wins for reproducibility. Future contributors / fresh clones can `vercel link --yes` against the same project without rediscovering settings.

---

## vercel.json Configuration Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit — framework + SPA + cache | Lock framework=vite, buildCommand=npm run build, outputDirectory=dist, SPA fallback (`rewrites: [{source:/(.*), destination:/index.html}]`), cache headers (long max-age + immutable for /assets/*, no-cache for index.html). Verbose but explicit. | ✓ |
| Minimal — only SPA fallback | Just rewrites for SPA deep-link routing. Trust Vercel auto-detect for framework + cache. Less verbose, relies on defaults. | |
| Skip vercel.json entirely | Pure auto-detect; if SPA deep-link 404s appear or cache issues surface, add vercel.json reactively in a later patch. | |

**User's choice:** Explicit — framework + SPA + cache (Recommended)
**Notes:** Lock everything up-front. Defensive against Vercel preset changes; explicit cache policy avoids re-deploys to fix invisible caching bugs.

---

## UAT Execution Order

| Option | Description | Selected |
|--------|-------------|----------|
| Local-first — Tests 3-10 local, then deploy, then Test #11 | Run Tests 3-10 against `npx serve dist` locally BEFORE first Vercel push. Fix any failures pre-deploy. Push to Vercel only after local UAT green. Run Test #11 Lighthouse against deployed *.vercel.app URL last. | ✓ |
| Deploy-first — ship to Vercel, then run all 9 tests against deployed URL | Push to Vercel immediately, run Tests 3-11 against deployed *.vercel.app URL. Faster feedback on Vercel-specific issues (cache, headers, SPA routing). Risk: ship a regression visible to anyone who knows the URL. | |
| Hybrid — Tests 3-10 local + Test #11 deployed, in parallel | Run Tests 3-10 against `npx serve dist` + push to Vercel + Test #11 Lighthouse against deployed URL — can interleave. Faster overall but messier sequencing. | |

**User's choice:** Local-first (Recommended)
**Notes:** Catch regressions before deploy so no public Vercel URL ever has a known bug. Lighthouse runs against deployed URL because cache + CDN affect Performance score in ways local preview can't replicate.

---

## Lighthouse Measurement Protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Adapt npm run lighthouse:mobile + commit report | Modify existing `lighthouse:mobile` script to target Vercel URL (pass as env var or arg instead of localhost:4173). Run `lighthouse:check` to validate Perf/A11y. Commit lighthouse-report-mobile.report.html as evidence in phase artifacts. | ✓ |
| Chrome DevTools manual run | Open Vercel URL in Chrome, DevTools → Lighthouse panel → Mobile preset → Analyze. Screenshot the 4-circle score panel. Lower friction, no script changes, but not reproducible. | |
| Add lighthouse-ci (LHCI) | Install @lhci/cli, configure lighthouserc.json with assertions (Perf≥0.95, A11y=1, BP=1, SEO=1). Becomes part of build pipeline, gates future deploys too. Adds dependency + scope vs just-this-phase. | |

**User's choice:** Adapt npm run lighthouse:mobile + commit report (Recommended)
**Notes:** Reuse existing infrastructure (script already configured for headless Chrome, gzip+brotli sizes, target-size audit). Tighten lighthouse:check thresholds from 0.9 → 0.95 for Perf and 0.9 → 1.0 for A11y to match Phase 11 HARD gate. Commit the HTML report as phase evidence.

---

## Implementer's Discretion

Items where the user delegated decision-making to Claude:

- Vercel project name (slug) — planner picks; cosmetic once custom domain lands
- `vercel.json` filename casing and key ordering — Vercel-official conventions
- Plan decomposition: single `11-01-PLAN.md` vs multiple plans (vercel config / UAT execution / Lighthouse adaptation as separate plans) — planner decides based on atomic-commit boundaries
- Env var naming convention for deploy URL in lighthouse script (e.g., `LIGHTHOUSE_TARGET_URL` vs `DEPLOY_URL`) — planner picks
- Branch-protection / PR strategy for landing `vercel.json` — current repo has no branch protection; direct-to-main acceptable

## Deferred Ideas

Ideas mentioned or surfaced during discussion that were noted for future phases:

- **Lighthouse-CI on every PR** — backlog v3.8 candidate; out of scope for v3.7
- **GitHub Action Lighthouse against preview URL** — backlog v3.8; out of scope for DEPLOY-03 spec
- **Cloudflare or non-Vercel CDN** — Vercel locked per D-v3.6 + D-v3.7; not revisiting
- **`robots.txt` directives beyond default** (allowlist, sitemap reference) — current `Disallow:` (allow-all) acceptable for v3.7; expand in later SEO milestone
- **`<link rel="canonical">` in index.html** — verify during planning; if missing, add as part of Phase 12 canonical-domain cutover (NOT Phase 11)
- **Failed-Lighthouse remediation diagnostic flow** (bundle analyze, image payload review, AI-section bisect) — not pre-defined; address ad-hoc if Test #11 fails
- **Hero photo (Phase 8) + AI section (Phase 9) Performance risk** — both added since v3.4 baseline 98/100/100/100; first Lighthouse run will surface any regression. Mitigation path is reactive (not pre-baked).
