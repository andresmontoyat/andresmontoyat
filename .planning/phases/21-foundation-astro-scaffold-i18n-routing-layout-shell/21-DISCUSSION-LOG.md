# Phase 21: Foundation — Astro scaffold, i18n routing & layout shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 21-foundation-astro-scaffold-i18n-routing-layout-shell
**Areas discussed:** Redirect / en middleware, Canonical domain SEO, Meta/OG/JSON-LD en BaseLayout, Página 404

---

## Redirect / en middleware

| Option | Description | Selected |
|--------|-------------|----------|
| cam-lang | Same name as current localStorage key — continuity | ✓ |
| Nombre nuevo | Clean-slate cookie name, not tied to localStorage convention | |

**User's choice:** cam-lang (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Heurística simple | Header contains 'es' → es, else en — matches LanguageContext.jsx exactly | ✓ |
| Parsing q-values | Full weighted Accept-Language parsing | |

**User's choice:** Heurística simple igual a hoy (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| 302 Temporary | Destination depends on visitor, not a fixed permanent target | ✓ |
| 301 Permanent | Better cacheable but semantically wrong here | |

**User's choice:** 302 Temporary (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| En toda ruta | Middleware refreshes cookie on every route visited, not just / | ✓ |
| Solo en redirect de / | Simpler but misses direct-landing visitors | |

**User's choice:** En toda ruta (Recomendado)

**Notes:** All four sub-questions in this area resolved to the recommended option, matching current site behavior as closely as possible while moving detection server/edge-side.

---

## Canonical domain SEO

| Option | Description | Selected |
|--------|-------------|----------|
| andresmontoyat.co | Already hardcoded in index.html today, even though DNS isn't live yet | ✓ |
| *.vercel.app | Reflects actual live domain today | |

**User's choice:** andresmontoyat.co (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| PUBLIC_SITE_URL env var | Single place to update when custom domain (DEPLOY-02) goes live | ✓ |
| Hardcoded in BaseLayout.astro | Same as today, but requires a PR to change later | |

**User's choice:** Env var PUBLIC_SITE_URL (Recomendado)

**Notes:** Custom domain DNS cutover itself (DEPLOY-02) is out of scope for this phase/milestone — referenced only as context for why an env var was preferred over hardcoding.

---

## Meta/OG/JSON-LD en BaseLayout

| Option | Description | Selected |
|--------|-------------|----------|
| Igual, sin traducir | JSON-LD Person schema stays English-only in both locales | ✓ |
| Traducir por locale | Bilingual jobTitle/description in structured data | |

**User's choice:** Igual, sin traducir (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Igual, inline en BaseLayout.astro | Copy-paste GA gtag script as-is | ✓ |
| Mover a env var PUBLIC_GA_ID | More tidy but out of scope | |

**User's choice:** Igual, inline en BaseLayout.astro (Recomendado)

**Notes:** Confirmed `translations.js` already has `meta.title`/`meta.description` per locale (en lines ~29-31, es lines ~82-84) — no new content authoring needed, just a new consumption site.

---

## Página 404

| Option | Description | Selected |
|--------|-------------|----------|
| Mínima, paleta dark actual | Simple bilingual message, existing Tailwind tokens, link to / | ✓ |
| Elaborada con animación | More design effort for a rarely-seen page | |

**User's choice:** Mínima, paleta dark actual + link a / (Recomendado)

| Option | Description | Selected |
|--------|-------------|----------|
| Una sola /404.astro genérica | Astro's standard catch-all, no per-locale duplication | ✓ |
| Duplicada por locale | Extra logic for marginal benefit | |

**User's choice:** Una sola /404.astro genérica (Recomendado)

---

## Implementer's Discretion

- Exact bilingual copy/wording for the 404 page message
- Exact middleware cookie-refresh implementation detail (single function vs split helpers)

## Deferred Ideas

None — discussion stayed within phase scope. Custom domain DNS cutover referenced as context only (separate backlog item, unrelated to this migration).
