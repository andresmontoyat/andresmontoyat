# Stack Research

**Domain:** Static site generator migration (React CSR/Vite → Astro SSG with React islands)
**Researched:** 2026-07-19
**Confidence:** HIGH (core versions/APIs verified via npm registry + official Astro/Vercel docs), MEDIUM on one item (Tailwind v3 + Astro native PostCSS pickup, flagged below)

> **Supersedes** the 2026-06-08 STACK.md (v3.10 3D constellation delta — that WebGL/three.js lineage was purged from `main` in the v4.0 game-mode purge and is historical only). This document targets the **v5 Astro migration** milestone exclusively.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `astro` | `^7.1.1` (current stable, verified via npm registry `dist-tags.latest`) | SSG build pipeline, replaces Vite+React-CSR as the top-level tool | Current GA major (Astro 7.0 shipped a Rust-rewritten compiler + Vite 8/Rolldown pipeline); zero-JS-by-default output is the entire reason this milestone exists (clears the Lighthouse hard gate the CSR build can't hit) |
| `@astrojs/react` | `^6.0.1` | React island integration — hydrates only the components under `src/components/react/` | Official integration, peer-compatible with React `^18.0.0` (project is on 18.3.1 — **no React version bump needed**). Bundles its own `@vitejs/plugin-react@^5.2.0` and `vite@^8.0.13` internally |
| Node.js | `>=22.12.0` (even-numbered LTS only — odd releases like v23 unsupported) | Runtime for build + dev server | **Hard requirement of `astro@7.x`** (`engines.node` on npm). Local dev machine is already on v26.5.0 (compatible), but **project has no `.nvmrc`/`engines` field today** — must add one, and Vercel's Project Settings → Node.js Version must be set to 22.x+ (Node 20 is being deprecated on Vercel Oct 1 2026 anyway) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vercel **Routing Middleware** (platform feature, no npm package required) | N/A — `middleware.ts`/`middleware.js` at project root | Cookie/`Accept-Language`-based redirect on `/` → `/en` or `/es` | **Required correction to the design spec.** See "What NOT to Use" below — Astro's own `astro:i18n` middleware/`redirectToDefaultLocale()` does NOT execute at request time under `output: 'static'`. Vercel's framework-agnostic Routing Middleware (standard `Request`/`Response`, runs on Edge by default) is the mechanism that actually performs this redirect while keeping the site fully static |
| `@astrojs/sitemap` | latest (optional) | `sitemap.xml` generation for both locale trees | Not researched in depth for this pass — flag for phase-level lookup if the SEO=100 Lighthouse gate needs it; Astro's static build makes this trivial to add later |
| `@types/react`, `@types/react-dom` | `^18.x` (match installed React) | Type defs consumed by `@astrojs/react`'s peer set even in a JS-only project — Astro's tooling expects them present for editor/IDE support | Add as devDependency even without adopting TypeScript project-wide; not adding them doesn't break the build but breaks `astro check`/editor intellisense |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `astro dev` / `astro build` / `astro preview` | Replaces `vite`/`vite build`/`vite preview` npm scripts | `astro.config.mjs` supersedes the existing `vite.config.js`; Astro wraps Vite internally (own bundled `vite@^8.0.13`, close to the project's current direct `vite@^8.0.16` devDependency — low friction, but the direct `vite` devDependency becomes largely redundant once Astro owns the Vite instance) |
| `getViteConfig()` (exported from `astro/config`) | Wires Astro's own Vite/plugin config (including `@astrojs/react`'s JSX handling) into `vitest.config.ts` | **This replaces the current `test` block inside `vite.config.js`.** Required for both (a) React-island Vitest+RTL tests to resolve JSX the same way Astro does, and (b) Astro Container API tests to run under Vitest at all |
| Astro **Container API** (`astro/container`, import as `experimental_AstroContainer`) | Render `.astro` static components to HTML strings for assertions in Vitest | **Still experimental as of the current Astro release** — import path literally carries the `experimental_` prefix, and Astro's own docs state it is "subject to breaking changes, even in minor or patch releases." Confirms the risk already flagged in the design spec's "Risks / Open Items." Available since `astro@4.9.0`, so no version gate blocks using it today, but do not treat it as a stable, contract-locked test API |
| ESLint (existing `eslint@8.57.1` + `airbnb`) | Lint `.jsx` islands unchanged | No `.astro`-file linting is set up in this stack pass — `eslint-plugin-astro` exists community-side but was out of scope for this research question; flag for a phase-specific look if `.astro` file linting is wanted |

## Installation

```bash
# Core Astro + React integration (also scaffolds astro.config.mjs interactively)
npm install astro @astrojs/react

# React island peer set (React itself is already installed — 18.3.1)
npm install @types/react @types/react-dom

# Remove: unused three.js dependency (already identified as dead in the design spec)
npm uninstall three

# Dev: no @astrojs/vercel adapter — this site stays output: 'static', Vercel serves
# the build output directly, same as today. Do NOT add an adapter package.
```

```json
// package.json — pin engines for Astro 7's Node floor (currently missing)
{
  "engines": { "node": ">=22.12.0" }
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `output: 'static'` (no adapter) | `output: 'server'`/`'hybrid'` + `@astrojs/vercel` adapter | Only if the project later needs real server-rendered/on-demand routes (e.g., a real contact-form backend). The design spec's Non-Goals explicitly rule this out ("No CMS or dynamic backend introduction") — do not add the adapter preemptively |
| Vercel Routing Middleware for the `/` locale redirect | `export const prerender = false` on just the `index.astro` route (hybrid rendering, needs `@astrojs/vercel`) | If the team later wants the redirect logic co-located in the Astro codebase instead of a separate Vercel-platform file — trades "stay 100% static, zero adapter" for "one dynamic route, adapter required." Given the milestone's explicit goal (clear the Lighthouse static-perf gate) and Non-Goal (no hosting provider change/no server runtime), the platform-middleware route is the better fit |
| Keep `tailwindcss@^3.4.19` unchanged, drop `@astrojs/tailwind` entirely, rely on Astro's Vite-native PostCSS pickup of the existing `postcss.config.js`/`tailwind.config.js` | Upgrade to `tailwindcss@^4` + `@tailwindcss/vite` | Tailwind v4 is Astro's own documented "preferred" path going forward, but it is a breaking rewrite (CSS-first `@theme` config replaces `tailwind.config.js`, some utility renames) that directly conflicts with this milestone's Non-Goal of "no visual/design changes." Revisit as its own follow-up milestone, not bundled into the SSG migration |
| Astro Container API for static `.astro` component tests | Keep RTL-only tests, skip Container API, do manual/visual verification for static components | If the Container API's experimental instability causes churn mid-migration (breaking change lands in a patch release), fall back to snapshot-testing the rendered HTML output via a small custom render helper rather than blocking the whole migration on the experimental API maturing |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@astrojs/vercel` adapter (by default) | Pulls the site into serverless/edge-function territory it doesn't need; the design spec is explicit that Vercel continues serving pure static output. Adding it "just in case" reintroduces the exact server-runtime surface this migration is trying to shed for the Lighthouse gate | `output: 'static'` (Astro's default) — confirmed by Astro's own Vercel deploy docs: *"Your Astro project is a static site by default. You don't need any extra configuration to deploy a static Astro site to Vercel"* |
| `@astrojs/tailwind` integration | Its published peer dependency range is `"astro": "^3.0.0 \|\| ^4.0.0 \|\| ^5.0.0"` — it has **not** been updated for Astro 6 or 7. Installing it alongside `astro@^7` will either hard-fail npm's peer resolution or silently mismatch, and the package is explicitly marked "legacy" in Astro's own styling guide (superseded by the Tailwind v4 Vite plugin) | Plain `postcss.config.js` + `tailwind.config.js` (both already present, unchanged) — Astro's build is Vite underneath, and Vite auto-detects a root `postcss.config.js` with no integration needed |
| Astro's own `astro:i18n` middleware / `redirectToDefaultLocale()` / `Astro.preferredLocale` for the root `/` redirect | These execute as **request-time middleware**, which requires `output: 'server'` (an adapter). Astro's own i18n docs state the routing/middleware layer needs SSR to run dynamically — under `output: 'static'` there is no request to intercept, only prerendered files. This directly contradicts the design spec's current wording ("Root `/` resolves via Astro middleware") — flag for correction during implementation planning | Vercel Routing Middleware (`middleware.ts` at repo root) — a platform-level, framework-agnostic feature that runs on every request to a static deployment and can read cookies/headers before the static file is served |
| Direct devDependency on `@vitejs/plugin-react` for the app build | Redundant once `@astrojs/react` is installed — the integration bundles and wires its own copy (`^5.2.0`) into Astro's internal Vite instance | Keep `@vitejs/plugin-react` only if still needed standalone for the `vitest.config.ts` test pipeline outside `getViteConfig()`; otherwise remove |
| Treating Astro Container API as a stable, permanent test contract | Documented as experimental with breaking-change risk in *any* release, not just majors | Gate on it per the design spec's own risk note — verify it covers the current RTL assertions (bilingual text, ARIA attributes) early, and keep the fallback (manual HTML assertion helper) in mind if it churns |

## Stack Patterns by Variant

**If a component needs interactivity but only after scroll (Experience expand/collapse, SectionPager):**
- Use `client:visible` hydration directive
- Because it defers the JS payload until the element enters the viewport — directly serves the Lighthouse Performance ≥0.95 mobile gate by not shipping/executing JS for below-the-fold islands on initial load

**If a component needs interactivity immediately on load (Nav, ThemeToggle):**
- Use `client:load`
- Because these affect above-the-fold state (theme flip, active-section nav) that must be interactive as soon as possible; deferring would cause a visible non-interactive flash

**If content is purely static with no client state (About, Skill, Footer, Projects):**
- Author as `.astro` files under `src/components/astro/`, no hydration directive at all
- Because this is the whole point of the migration — these ship **zero** client JS, which is the mechanism actually clearing the Lighthouse gate the CSR build couldn't

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `astro@^7.1.1` | `@astrojs/react@^6.0.1` | Verified via npm registry: `@astrojs/react@6.0.1` peer-depends on `react@^17\|^18\|^19` — no conflict with installed `react@18.3.1` |
| `astro@^7.1.1` | Node `>=22.12.0` | `engines.node` from npm registry metadata — **project currently has no engines field or `.nvmrc`; must add both**, and bump Vercel's configured Node.js Version in Project Settings (Node 20 default there is being deprecated Oct 2026 anyway) |
| `astro@^7.1.1` | `@astrojs/tailwind@6.0.2` | **Incompatible** — `@astrojs/tailwind`'s peer range tops out at `astro@^5.0.0`. Do not install; see "What NOT to Use" |
| `astro@^7.1.1` | `@astrojs/vercel@^11.0.3` | Peer-compatible (`astro: "^7.0.0"`) **if** the project ever needs it, but it is explicitly not needed for this milestone's `output: 'static'` plan |
| `tailwindcss@^3.4.19` (unchanged) | Astro's internal Vite/PostCSS pipeline | Vite (which Astro wraps) auto-loads root `postcss.config.js` — this is documented, stable Vite behavior, not Astro-specific config. **MEDIUM confidence on this specific combination** (verified Vite's general PostCSS auto-detection behavior, but did not find an Astro doc paragraph explicitly confirming "Tailwind v3 works with zero integration, just PostCSS" — validate with a build spike early in the migration, first phase, before committing the whole plan to it) |
| `vitest@^4.1.9` (existing) | `getViteConfig()` from `astro/config` | Astro's testing docs confirm this is the documented Vitest-integration path (`vitest.config.ts` calling `getViteConfig({}, {...})`) — no version conflict with the existing Vitest 4.x already in the project |

## Sources

- npm registry `astro` `dist-tags.latest` → `7.1.1`, `engines: {"node":">=22.12.0","npm":">=9.6.5","pnpm":">=7.1.0"}` — HIGH confidence, live registry query
- npm registry `@astrojs/react` `dist-tags.latest` → `6.0.1`, peerDependencies `react/react-dom ^17||^18||^19` — HIGH confidence, live registry query
- npm registry `@astrojs/vercel` `dist-tags.latest` → `11.0.3`, peerDependencies `astro: ^7.0.0` — HIGH confidence, live registry query
- npm registry `@astrojs/tailwind` `dist-tags.latest` → `6.0.2`, peerDependencies `astro: ^3.0.0 || ^4.0.0 || ^5.0.0`, `tailwindcss: ^3.0.24` — HIGH confidence, live registry query (this is the key compatibility gap found)
- https://docs.astro.build/en/install-and-setup/ — Node `v22.12.0` floor, odd versions unsupported — HIGH confidence, official docs
- https://docs.astro.build/en/guides/integrations-guide/react/ — `@astrojs/react` current version, peer/type-def requirements — HIGH confidence, official docs
- https://docs.astro.build/en/guides/deploy/vercel/ — "static site by default... no extra configuration," adapter only for on-demand rendering — HIGH confidence, official docs
- https://docs.astro.build/en/guides/testing/ — Container API + Vitest integration, `getViteConfig()`, added in `astro@4.9.0` — HIGH confidence, official docs
- https://docs.astro.build/en/reference/container-reference/ — Container API still experimental, `experimental_AstroContainer` import, "subject to breaking changes... even in minor or patch releases" — HIGH confidence, official docs, direct quote
- https://docs.astro.build/en/guides/internationalization/ — i18n middleware/`redirectToDefaultLocale()` require request-time execution; static output cannot run this dynamically — HIGH confidence, official docs (this contradicts a design-spec assumption — flagged above)
- https://docs.astro.build/en/reference/modules/astro-i18n/ — `astro:i18n` module API surface (`Astro.currentLocale`, `getRelativeLocaleUrl`, etc.) — HIGH confidence, official docs
- https://docs.astro.build/en/guides/styling/ — Tailwind v4 + `@tailwindcss/vite` now the documented "preferred" path; `@astrojs/tailwind` labeled legacy — HIGH confidence, official docs
- https://vercel.com/docs/routing-middleware — framework-agnostic `middleware.ts`/`.js` at project root, works with static sites, standard `Request`/`Response`, Edge runtime by default — HIGH confidence, official Vercel docs (fetched 2026-07-19, `last_updated: 2026-07-01` per page metadata)
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions — Node 20 deprecation Oct 1 2026 on Vercel, `engines.node` override behavior — HIGH confidence, official Vercel docs
- Local repo inspection: `package.json` (existing `react@18.3.1`, `tailwindcss@3.4.19` — not `postcss7-compat` as project `project instructions` still states; confirmed stale per prior session memory), `vite.config.js`, `vercel.json` — direct file reads

---
*Stack research for: React CSR (Vite) → Astro SSG with React islands migration, v5 milestone*
*Researched: 2026-07-19*
