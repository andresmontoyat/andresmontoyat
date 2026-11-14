# Phase 11: Vercel auto-deploy + UAT pre-deploy gate - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

**In scope:**
- Vercel project initialization + auto-deploy from `main` to a stable `*.vercel.app` URL
- `vercel.json` committed to repo (framework + build + SPA fallback + cache headers)
- UAT pre-deploy gate folded in: Phase 10 UAT Tests 3-10 run against local `npx serve dist`; Test #11 Lighthouse mobile run against the deployed `*.vercel.app` URL
- Test #11 Lighthouse mobile is the HARD gate (Perf ≥ 95 / A11y 100 / BP 100 / SEO 100) — must hold v3.4 baseline 98/100/100/100; failure blocks Phase 12 cutover
- SPA fallback verification (deep-link anchors don't 404 on Vercel)
- Cache header validation (hashed `dist/assets/*` long-cache immutable; `index.html` short/no-cache)

**Out of scope (other phases):**
- Custom domain `andresmontoyat.co` + DNS records + HTTPS auto-cert → **Phase 12**
- PR preview deploys + per-PR OG card validation → **Phase 13**
- Any new feature work (hero, AI section, theme) — code is frozen for v3.7 deploy
- Lighthouse-CI / GitHub Actions Lighthouse on every PR — Out of Scope per REQUIREMENTS.md (defer to v3.8 if PR-preview Lighthouse becomes a felt need)

</domain>

<decisions>
## Implementation Decisions

### Vercel Project Setup

- **D-01 (vercel-setup):** Commit `vercel.json` to the repo FIRST, then run `vercel link` to tie the local working copy to the Vercel project. Reproducible setup — anyone cloning the repo can `vercel link --yes` against the same project. The `.vercel/` directory stays gitignored (project ID + auth tokens).
- **D-02 (project-creation):** Use `vercel link` (CLI interactive) to create the project. Vercel Dashboard UI is not the source of truth — repo `vercel.json` is.

### vercel.json Configuration Scope

- **D-03 (vercel-config-scope):** Explicit configuration in `vercel.json`. Do NOT rely on auto-detect.
- **D-04 (framework-lock):** Lock framework to `vite`; `buildCommand: "npm run build"`; `outputDirectory: "dist"`. Defensive against future Vercel preset changes.
- **D-05 (spa-fallback):** Configure `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` so deep-link anchors like `*.vercel.app/#contact` serve `index.html` without 404. Required because portfolio is SPA with hash navigation.
- **D-06 (cache-headers):** Explicit `headers` block in `vercel.json`:
  - `/assets/(.*)` → `Cache-Control: public, max-age=31536000, immutable` (Vite hashes filenames; safe long-cache)
  - `/index.html` → `Cache-Control: public, max-age=0, must-revalidate` (so deploys propagate immediately)
  - Static files in `public/` (favicon, og-image.png, manifest.json, robots.txt, me-*.webp, CV docs) → moderate `max-age=86400, must-revalidate` (or rely on Vercel default; planner can decide per-file)

### UAT Execution Order

- **D-07 (uat-order):** Local-first sequence. Order:
  1. Run Tests 3-10 against `npx serve dist` (local production build). All must pass.
  2. Commit `vercel.json` + scripts changes to a feature branch.
  3. `vercel link` + `vercel --prod` (or push to `main` if branch-protection allows direct, otherwise PR + merge).
  4. Confirm `*.vercel.app` URL renders identically to local `npx serve dist`.
  5. Run Test #11 Lighthouse mobile against the deployed `*.vercel.app` URL.
- **D-08 (rationale):** Fix regressions BEFORE the world can see them on a Vercel URL. Local UAT catches regressions; Vercel-specific issues (cache headers, SPA routing, deploy artifacts) surface in Step 4 against an unindexed URL.

### Lighthouse Measurement Protocol

- **D-09 (lighthouse-protocol):** Adapt existing `npm run lighthouse:mobile` script to target the deployed Vercel URL.
  - Current script targets `localhost:4173` via `vite preview`. Modify to accept an env var (e.g., `LIGHTHOUSE_TARGET_URL=https://carlos-portfolio.vercel.app npm run lighthouse:mobile`) or add a new `lighthouse:deployed` script.
  - Keep `lighthouse:check` validator (parses report JSON, exits non-zero if Perf < 0.95 / A11y < 0.95 / target-size < 1).
  - **MUST update thresholds** in `lighthouse:check`: Performance ≥ 0.95 (currently 0.9), Accessibility = 1.0 (currently 0.9), Best Practices = 1.0, SEO = 1.0 — match Phase 11 HARD gate spec.
- **D-10 (evidence-commit):** Commit `lighthouse-report-mobile.report.html` (or a renamed copy: `phases/11-vercel-deploy-uat-gate/lighthouse-report.html`) as phase artifact. JSON file is regeneration-only (gitignored or committed under phase dir as deploy evidence — planner chooses).

### Known Issues to Address During Planning

- **D-11 (og-url-typo):** `index.html:23` has `<meta property="og:url" content="https://andresmontoyatco.com/" />` — typo (missing dot: should be `andresmontoyat.co`). Phase 12 will canonical the URL; Phase 11 should at minimum fix the typo so OG card works on `*.vercel.app` if anyone shares it pre-domain. Decision: planner patches the typo as part of Phase 11.
- **D-12 (og-url-pre-domain):** For Phase 11 (no custom domain yet), leave `og:url` as `https://andresmontoyat.co/` (the target canonical) even though the live URL is `*.vercel.app`. Share-debugger on the Vercel URL will flag mismatch — acceptable for Phase 11 (deploy validation), corrected when Phase 12 lands canonical domain. Alternative: dynamic `og:url` based on `window.location.origin` — rejected (OG meta is server-side, JS won't help share-bots).

### Implementer's Discretion

- Vercel project name: planner picks a stable slug (e.g., `andresmontoyatco`, `carlos-montoya-portfolio`, or auto-generated). Doesn't affect URL once custom domain lands.
- `vercel.json` filename casing + key ordering: Vercel-official conventions.
- Whether to stage Phase 11 as a single plan (`11-01-PLAN.md`) or multiple plans (vercel config / UAT execution / Lighthouse adaptation as separate plans): planner decides based on task atomic-commit boundaries.
- Exact env var name for deploy URL in lighthouse script: planner picks reasonable convention.
- Branch protection / PR strategy for landing `vercel.json`: planner decides (direct-to-main vs feature branch + PR + merge). Current repo has no branch protection rules; direct-to-main acceptable per project convention.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & success criteria

- `.planning/ROADMAP.md` §"Phase 11: Vercel auto-deploy + UAT pre-deploy gate" — 5 success criteria locked
- `.planning/REQUIREMENTS.md` §"DEPLOY-01" — full requirement spec including UAT-GATE fold
- `.planning/PROJECT.md` §"Current Milestone: v3.7 Production Deploy" — locked decisions (D-v3.7-SEQ, D-v3.7-UAT-FOLD, D-v3.7-LIGHTHOUSE-GATE)

### UAT debt being paid

- `.planning/milestones/v3.6-phases/10-real-browser-uat-a11y/10-UAT.md` — IF phase dirs were archived to milestones (NOT done at v3.6 close — phase dirs remain in place). Actual current location:
- `.planning/phases/10-real-browser-uat-a11y/10-UAT.md` — full Phase 10 UAT grid (Tests 3-11 with viewport + assertion details + skip rationale + Closure Note 2026-05-20)

### Lighthouse baseline + tooling

- `package.json` (`scripts.lighthouse:mobile`, `scripts.lighthouse:check`) — existing scripts to adapt. Current thresholds are 0.9 (Perf+A11y); must tighten to match Phase 11 HARD gate (Perf ≥ 0.95 / A11y 1.0 / BP 1.0 / SEO 1.0).
- `.planning/milestones/v3.4-ROADMAP.md` — v3.4 Lighthouse baseline 98/100/100/100 mobile

### Codebase shape (already mapped — read what's relevant, don't re-scan)

- `.planning/codebase/STACK.md` — runtime, frameworks, dependencies
- `.planning/codebase/ARCHITECTURE.md` — layer separation, data flow, entry points
- `.planning/codebase/STRUCTURE.md` — directory layout
- `.planning/codebase/INTEGRATIONS.md` — external integrations (GA, OG, etc.)

### Vite/Vercel docs

- `vite.config.js` — current Vite config; SPA, no SSR, `dist/` output, alias `@→src/`
- `index.html` — root HTML; **`og:url` line 23 typo `andresmontoyatco.com` → must be `andresmontoyat.co`** (D-11)
- `public/robots.txt` — currently allows all; verify Vercel-compatible
- Vercel docs: https://vercel.com/docs/projects/project-configuration — `vercel.json` schema (framework, rewrites, headers)

### v3.6 deliverables (post-deploy verification surface)

- `src/components/Hero.js` — Phase 8 photo (`<picture>` w/ `me-{800,1600}.webp`) — visual UAT Test 5/6 against this
- `src/components/Claude.js` — Phase 9 AI section — visual UAT Test 8/9/10 against this
- `src/index.css` (`:root` + `[data-theme="light"]`) — Phase 7 theme system — UAT Test 3/4 against this

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`npm run lighthouse:mobile`** (`package.json` scripts) — already runs Lighthouse via headless Chrome against `vite preview` on port 4173. Adapt to accept a deployed-URL env var instead of localhost. Output: `lighthouse-report-mobile.report.{html,json}`.
- **`npm run lighthouse:check`** — parses report JSON, asserts thresholds. Currently 0.9 floor; tighten to 0.95/1.0/1.0/1.0 for Phase 11 gate.
- **`npm run build`** — `vite build` → `dist/`. No code changes needed; deploy uses this.
- **`npm run preview`** — `vite preview` (port 4173 default) for `npx serve dist` equivalent. UAT Tests 3-10 can use this.
- **`scripts/process-hero-photo.js`** + `scripts/generate-og-image.js` — already in place; not affected by deploy phase.

### Established Patterns

- **Vite + Tailwind v3.4 + React 18** — single-page SPA; no SSR; output is pure static (`dist/index.html` + `dist/assets/*`). Vercel auto-detect should work, but D-04 locks it explicitly anyway.
- **Lazy-loaded chunks** (`Experience-*`, `Contact-*`, `Footer-*`, `Projects-*`, `Claude-*` per v3.5/v3.6) — Vercel must serve these from `dist/assets/` with long-cache headers. D-06 handles this.
- **No backend / no API routes** — pure static site. `vercel.json` does NOT need `functions` or `api/` rewrites.
- **OG image baked at build time** (`scripts/generate-og-image.js`, `public/og-image.png`) — already in `public/`, Vercel will serve as-is. Share-debugger needs valid `og:url`.

### Integration Points

- **`vercel.json`** lands at repo root (sibling to `package.json`, `vite.config.js`, `craco.config.js`).
- **`package.json` scripts** — add or modify `lighthouse:*` scripts to target deployed URL.
- **`.gitignore`** — must include `.vercel/` (Vercel CLI's local project metadata + auth tokens).
- **`index.html`** — patch `og:url` typo (D-11); confirm `<link rel="canonical">` if present.
- **GitHub repo + Vercel git integration** — Vercel auto-deploys on push to `main` once project is linked.

</code_context>

<specifics>
## Specific Ideas

- User decided deploy-first sequence (2026-05-20 caveman mode): "primero deploy a vercel, luego verifico los DNS". Phase 11 produces a working `*.vercel.app` URL the user can hit and validate before Phase 12 DNS cutover.
- User accepted all 4 Recommended options during discussion: vercel.json-first + explicit config + local-first UAT + adapt existing Lighthouse script.
- Lighthouse mobile gate is HARD — no compromise on Perf < 95 / A11y < 100 / BP < 100 / SEO < 100. Phase 12 is blocked until this passes. If it fails on first deploy, Phase 11 is not complete — diagnose + fix on a feature branch with iterative preview deploys.

</specifics>

<deferred>
## Deferred Ideas

- **Lighthouse-CI on every PR** — out of scope per REQUIREMENTS.md; consider for v3.8 if PR-preview Lighthouse becomes a felt need
- **GitHub Action that runs Lighthouse against preview URL on each PR** — out of scope per DEPLOY-03 spec; backlog as v3.8 candidate
- **Cloudflare or non-Vercel CDN** — Vercel locked per D-v3.6 + D-v3.7; not revisiting
- **`robots.txt` directives beyond default** — currently `Disallow:` (allow-all); explicit allowlist or sitemap reference deferred
- **`<link rel="canonical">` in index.html** — verify state during planning; if missing, add as part of Phase 12 canonical-domain cutover, not Phase 11
- **Failed-Lighthouse remediation diagnostic flow** (bundle analyze via `build:analyze`, image-payload review, AI-section-disable bisect) — not pre-defined; address ad-hoc if Test #11 fails. Hero photo (Phase 8) + AI section (Phase 9) are top suspects for any Performance regression vs v3.4 baseline.

</deferred>

---

*Phase: 11-vercel-deploy-uat-gate*
*Context gathered: 2026-05-20*
