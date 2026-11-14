# Phase 21: Foundation — Astro scaffold, i18n routing & layout shell - Context

**Gathered:** 2026-07-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the Astro static route tree (`/en`, `/es`), a working `/` → locale redirect that actually runs per-request (Vercel Edge Middleware, not Astro's own middleware — confirmed inert under `output:'static'`), `BaseLayout.astro` (head, blocking theme-flip script, meta/OG/JSON-LD, hreflang/canonical), and deploy cleanup (`vercel.json` SPA-rewrite removal + `404.astro`, `three` dep removal, `engines.node` pin). This is infrastructure/routing only — no content-section components migrate in this phase (that starts Phase 22+).

**In scope:** `astro.config.mjs`, `astro:i18n` config, `middleware.ts` (Vercel Edge Middleware), `BaseLayout.astro`, `404.astro`, `vercel.json` edits, `package.json` cleanup, Astro Container API test harness stood up (proof-of-life, not full test migration).
**Out of scope:** Nav/ThemeToggle island (Phase 22), any content-section component (Phase 23+), custom domain DNS cutover (separate backlog, unrelated to this migration).

</domain>

<decisions>
## Implementation Decisions

### Redirect / middleware (ROUTE-02)
- **D-01:** Cookie name stays `cam-lang` — same name as today's `localStorage` key, for continuity. It becomes a real cookie (not localStorage) since the middleware reads it server/edge-side before any JS runs.
- **D-02:** Accept-Language parsing uses the same simple heuristic as today's `LanguageContext.jsx` (`readInitialLang`): header contains `es` → `es`, else → `en`. No q-value weighted parsing library — over-engineering for 2 supported locales.
- **D-03:** Redirect status is `302` (temporary) — the destination depends on the visitor (cookie/header), so `301` would wrongly tell crawlers/browsers to permanently cache `/` → `/en`, breaking detection for other visitors.
- **D-04:** The middleware runs on every route (not just `/`) and refreshes the `cam-lang` cookie on each request based on the path visited (`/en/*` sets `es`→`en`, `/es/*` sets it to `es`). This way a visitor who lands directly on `/es` via search and later revisits `/` from another tab gets redirected to their actual last-visited locale, not just Accept-Language guesswork.

### Canonical domain / SEO (ROUTE-03)
- **D-05:** Canonical/hreflang/`og:url`/JSON-LD base domain is `https://andresmontoyat.co` — matches what `index.html` already hardcodes today, even though DNS isn't cut over yet (DEPLOY-02, separate backlog). Keeps consistency with existing meta tags; zero code change needed when the domain goes live.
- **D-06:** The base domain is read from a `PUBLIC_SITE_URL` build-time env var (Astro `import.meta.env`), not hardcoded in `BaseLayout.astro`. Single place to update in Vercel project settings when DEPLOY-02 lands — no code/PR needed.

### Meta / OG / JSON-LD in BaseLayout (ROUTE-03, ROUTE-04)
- **D-07:** `translations.js` already has `meta.title` / `meta.description` per locale (`en` block lines ~29-31, `es` block lines ~82-84) — `BaseLayout.astro` frontmatter resolves these at build time per route, replacing the current runtime `useEffect` override in `LanguageContext.jsx`.
- **D-08:** JSON-LD `Person` schema stays static and untranslated (same English `jobTitle`/`description` in both locales) — schema.org structured data isn't user-facing content and Google doesn't penalize English-only structured data; not worth bilingual duplication effort.
- **D-09:** Google Analytics `gtag` script stays inline in `BaseLayout.astro` `<head>`, copy-pasted as-is from current `index.html` — GA ID isn't sensitive, doesn't vary by environment, out of scope to move to an env var in this phase.

### 404 page (new — DEPLOY-02 area)
- **D-10:** `404.astro` is a single generic route (Astro's standard catch-all) — no per-locale duplication (`/en/404`, `/es/404`), since Astro doesn't route 404s by locale prefix automatically and there's no real benefit here.
- **D-11:** Minimal design: current dark palette Tailwind tokens (`bg-ink-900`, `text-neon`, etc.), simple bilingual message (or locale-inferred from the broken URL's `/en`/`/es` prefix if present), link back to `/`. No new animation/personality work — this is a foundation-phase page almost nobody sees.

### Implementer's Discretion
- Exact bilingual copy/wording for the 404 page message.
- Exact middleware cookie-refresh implementation detail (e.g., whether it's a single `middleware.ts` function or split helpers) — implementation detail, not a user-facing decision.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design & requirements
- `docs/superpowers/specs/2026-07-19-astro-migration-design.md` — original approved design spec (architecture, island boundary table — note: root-redirect section is superseded by research, see below)
- `.planning/REQUIREMENTS.md` — v5 REQ-IDs (ROUTE-01..05, ISLAND-01..04, STATIC-01..02, TEST-01..02, DEPLOY-01..04)
- `.planning/ROADMAP.md` — Phase 21 goal, success criteria, requirement mapping

### Research (supersedes/corrects the design spec on routing)
- `.planning/research/SUMMARY.md` — synthesized findings, 7-phase suggested order, Phase 21 deliverables
- `.planning/research/STACK.md` — Astro/`@astrojs/react` versions, Vercel Routing Middleware as the correct redirect mechanism (not Astro middleware, not `@astrojs/vercel`)
- `.planning/research/PITFALLS.md` — Pitfall 1 (middleware/static-output contradiction), Pitfall 2 (hreflang/canonical), Pitfall 8 (Vercel config cleanup), Pitfall 9 (Lighthouse target URLs)
- `.planning/research/ARCHITECTURE.md` — data layer / BaseLayout structure guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/i18n/translations.js` — already has per-locale `meta.title` / `meta.description` (lines ~29-31 `en`, ~82-84 `es`); consume directly in `BaseLayout.astro` frontmatter
- `index.html` — existing static `<head>` block (favicon, viewport, theme-color, OG/Twitter fallback tags, JSON-LD Person schema, critical CSS for `#hero-static`, GA script) is the direct source to port into `BaseLayout.astro` almost verbatim
- `index.html` `#hero-static` pattern (static `<img>` layer behind `#root`, already LCP-optimized) — this pattern is exactly what Astro static-by-default gives for free; carries forward conceptually into Phase 24 (Hero)

### Established Patterns
- `src/i18n/LanguageContext.jsx` `readInitialLang()` — the exact heuristic (`cam-lang` localStorage → `navigator.language.startsWith('es')`) that the new Vercel Edge Middleware should mirror server-side (D-02)
- `src/i18n/ThemeContext.jsx` — theme is currently a runtime `useEffect` DOM mutation (`document.documentElement.dataset.theme`), not blocking-before-paint; Phase 21's `ISLAND-04` (blocking inline `<head>` script) fixes this FOUC gap that exists even in the current site

### Integration Points
- `vercel.json` — current SPA-fallback rewrite (`"/(.*)" -> "/index.html"`) must be removed (DEPLOY-02); cache-header rules for `/assets/*` etc. need re-scoping to Astro's actual static output paths (likely `/_astro/*`)
- `package.json` — `three@^0.169.0` confirmed unused anywhere in `src/` (only referenced in a test file) — safe removal (DEPLOY-01); no `engines` field exists today, needs adding (DEPLOY-03)

</code_context>

<specifics>
## Specific Ideas

No specific visual/copy requirements beyond D-10/D-11 (404 stays minimal, matches existing dark palette). Open to standard Astro/Vercel patterns for everything else.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Custom domain DNS cutover (DEPLOY-02 backlog item, separate from this migration) was referenced as context for the `PUBLIC_SITE_URL` decision (D-06) but is explicitly not actioned in this phase.

</deferred>

---

*Phase: 21-foundation-astro-scaffold-i18n-routing-layout-shell*
*Context gathered: 2026-07-19*
