# Phase 3: Content & Animations - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete About / Skills / Experience / Contact / Footer sections with scroll-triggered entrance animations and Open Graph SEO. Tells the full portfolio story: who Carlos is, what he can do, what he's done (12 jobs as expandable timeline cards with tech chips), and how to reach him (email-first with copy-to-clipboard). All section transitions animated via IntersectionObserver + CSS classes — no JS animation library.

Requirements covered: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, ANIM-01, ANIM-02, ANIM-03, SEO-01, SEO-02.

Out of scope: Lighthouse 90+ enforcement (Phase 4). Test infrastructure (Phase 4 candidate). JSON-LD Person schema (ASEO-01 deferred). WebP image pipeline (ASEO-02 deferred).

</domain>

<decisions>
## Implementation Decisions

### About (CONT-01)

- **D-01:** Keep existing About layout (3 paragraphs + quick-facts sidebar). Apply scroll entrance animation only. No copy rewrite, no layout redesign this phase.

### Skills (CONT-02)

- **D-02:** Group skills by category — 4 categories: **Backend**, **Cloud & Infrastructure**, **DevOps & Tools**, **AI & Productivity**. Each category gets a heading + chip group (not 6 cards).
- **D-03:** Mono-symbol icons retained per category (◆ ● ▲ ✦ etc) — consistent with `</cam>` brand voice. No devicon/simple-icons dep.
- **D-04:** Show years/proficiency subtly per skill chip — small "15y" / "5y" badge. Not a star rating, not a percentage bar.

### Experience (CONT-03, CONT-04, CONT-05)

- **D-05:** Vertical timeline — single-column layout with brand-color rail down the left side, dot per entry, content card to the right of the rail. Simple responsive collapse on mobile (rail+dot stay, padding reduces).
- **D-06:** Tech chips sourced from explicit `tech: []` field per entry. **Modify `src/data/experience.js`** — add `tech: ['Java', 'Spring Boot', 'Kafka', ...]` per job. Bilingual `bullets` stay as-is. Tech labels are language-neutral.
- **D-07:** Independent expand/collapse per card — multiple cards can be open simultaneously. Each card has its own toggle (chevron icon). State held per card (boolean array or per-card useState).
- **D-08:** Initial state: **all 12 entries visible** with details collapsed by default. Each card shows: date, title, company, location, tech chips. Bullets hidden until expand. No pagination, no "show all" gate.

### Contact (CONT-06, CONT-07)

- **D-09:** **Email = hero card** (dominant visual element). Copy button next to email text → clipboard write + 'Copy' → 'Copied!' inline label swap (1.5s) → 'Copy'. mailto: still active for click anywhere on the card aside from the copy button.
- **D-10:** Three secondary contacts below the hero email card: **phone, LinkedIn, GitHub**. Smaller cards, equal weight to each other. **No location card. No Docker. No YouTube.**
- **D-11:** Social links in Footer = **GitHub + LinkedIn only** (per CONT-07). Drop Docker + YouTube from existing Footer social array. Email/phone live in Contact section, not Footer.

### Footer (CONT-08)

- **D-12:** Minimal redesign: `</cam>` logomark mark + bilingual tagline + 2 social icons (GitHub, LinkedIn) + bilingual copyright. Strip Docker/YouTube. Keep existing border-top + py-10 layout. No major visual change.

### Animations (ANIM-01, ANIM-02, ANIM-03)

- **D-13:** Scroll-triggered entrance fade/slide on each section: section heading, body content, list groups (skill chips, experience cards). Trigger threshold = **25% visible in viewport**. Animations play once per session per element (use IntersectionObserver `unobserve` after first fire).
- **D-14:** Animation primitives = **IntersectionObserver hook + CSS classes**, NOT a JS animation library. Build a reusable `useInView(ref, { threshold: 0.25 })` hook (similar to existing `useActiveSection.js`). Element starts at `motion-safe:opacity-0 motion-safe:translate-y-4`; on intersection, hook adds `is-visible` class which transitions to `opacity-100 translate-y-0`. All animations honor `prefers-reduced-motion` (Phase 1 global rule + `motion-safe:` prefix).
- **D-15:** Stagger delay base = **100ms per item** for grouped lists (skill chips, experience cards within timeline, contact secondary cards). Apply via inline `style={{ animationDelay: \`${i * 100}ms\` }}` per item.

### SEO (SEO-01, SEO-02)

- **D-16:** Open Graph meta tags added to `index.html` `<head>` AND/OR synced via LanguageContext useEffect (per-language og:title and og:description like existing meta description sync). Required tags: og:title, og:description, og:image, og:url, og:type=website, twitter:card=summary_large_image.
- **D-17:** OG image = **new branded 1200x630 PNG** generated for this phase. Source: existing `public/images/me.webp` photo + dark ink-950 bg + brand-colored "Carlos Andrés Montoya · Senior Backend Engineer" headline. Save to `public/og-image.png`. Reference as `<meta property="og:image" content="/og-image.png" />`. Generation can be scripted (HTML → screenshot via Playwright/Puppeteer one-off) OR designed in Figma/Canva and exported. Researcher/planner picks tool.
- **D-18:** GA SEO-02: confirm G-4TZJGR3MXR fires page-view events. The script is already in `index.html` (verified during scout). **No code change needed unless verification fails.** Verification = manual via GA DebugView OR `chrome://network` filter `collect?v=2&tid=G-4TZJGR3MXR`. This is a HUMAN-UAT item, not an executor task.

### Implementer's Discretion

- Exact tech list per job entry (D-06) — researcher/planner enriches by reading bullet text and matching against existing CV/profile data.
- Exact category-to-skills mapping (D-02) — derive from existing `t.skills.cards` content + experience tech list.
- Skill year/proficiency values (D-04) — derive from CV (e.g., Java 18y from earliest job date).
- Vertical timeline rail visual (D-05) — color (brand vs ink-400 with brand dots), thickness (1px / 2px), dot size (8px / 12px), connector style.
- Expand chevron icon source (D-07) — inline SVG vs unicode (▾/▴) vs CSS arrow.
- Copy-to-clipboard implementation (D-09) — `navigator.clipboard.writeText` with try/catch fallback for older browsers (likely not needed on modern Chrome/Safari/Firefox).
- OG image generation method (D-17) — Playwright screenshot script vs static Figma export vs HTML+canvas. Researcher recommends.
- Per-language OG title/description sync (D-16) — useEffect approach mirroring existing title/description sync, OR static fallback in index.html for crawlers that don't run JS (most don't).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 Specs (this directory)

- `.planning/phases/03-content-animations/03-CONTEXT.md` — this file (locked decisions)
- *(UI-SPEC for Phase 3 not yet generated — recommend running `/gsd:ui-phase 3` before plan-phase)*

### Project-Level

- `.planning/PROJECT.md` — vision, "stop recruiters mid-scroll" core value, validated requirements through Phase 2
- `.planning/REQUIREMENTS.md` — full requirements list (Phase 3 reqs at lines 43–61)
- `.planning/ROADMAP.md` — phase boundaries, success criteria
- `.planning/STATE.md` — current progress, accumulated decisions
- `project instructions` — project conventions (no semicolons, no PropTypes, motion-safe: prefix mandatory, in-place modify)

### Codebase Maps

- `.planning/codebase/STRUCTURE.md` — directory layout
- `.planning/codebase/CONVENTIONS.md` — naming, formatting, import order
- `.planning/codebase/STACK.md` — tech stack
- `.planning/codebase/ARCHITECTURE.md` — patterns

### Phase 2 Outputs (locked dependencies)

- `.planning/phases/02-shell-hero/02-UI-SPEC.md` — design system contracts (palette, type scale, spacing, motion)
- `.planning/phases/02-shell-hero/02-CONTEXT.md` — D-01..D-07 still apply (in-place modify, native scroll, custom IO hook, no test infra, etc.)
- `src/components/Nav.js` — Phase 2 sticky nav with scroll-spy (provides active link styling for Phase 3 sections)
- `src/components/Hero.js` — Phase 2 hero (ID="hero" anchor target)
- `src/i18n/translations.js` — bilingual copy tree, includes `t.about.*`, `t.skills.cards`, `t.experience.*`, `t.contact.*`, `t.footer.*` already populated
- `src/i18n/LanguageContext.js` — Phase 2 sync init + html lang/title/meta description sync (extend with og:title/og:description)
- `src/hooks/useActiveSection.js` — existing IntersectionObserver pattern reference for Phase 3 `useInView` hook
- `tailwind.config.js` — Phase 1 design tokens (`brand`, `ink-*`, `text-*`, `motion-safe:` animations, `animate-fade-in`, `animate-slide-up`)
- `src/data/experience.js` — 12 job entries (extend with `tech: []` field per entry)
- `public/images/me.webp` — profile photo (source for OG image generation)
- `index.html` — Vite root HTML (already has GA G-4TZJGR3MXR; needs og:* meta tags added)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `useActiveSection.js` (src/hooks/) — existing IntersectionObserver hook from Phase 2; pattern reference for new `useInView.js`.
- `useLanguage()` hook from LanguageContext — provides `{ lang, setLang, t }`. Phase 3 sections continue consuming.
- Phase 2 design tokens: `bg-ink-500`, `border-ink-400`, `hover:border-brand`, `text-text-primary`, `text-text-secondary`, `text-brand`, `font-mono`, `motion-safe:` prefixed animations.
- Existing `SectionLabel` pattern (defined inline in About/Skills/Experience/Contact) — mono brand label with horizontal accent line. Consider extracting to `src/components/_shared/SectionLabel.js` to dedupe across Phase 3 sections.
- `bg-hero-gradient`, `bg-grid-subtle` already defined for backgrounds.

### Established Patterns

- `export default function ComponentName()` for page sections.
- Private sub-components defined in same file (e.g., `function Card()`, `function Row()`).
- `useLanguage()` destructure at top.
- No PropTypes (ESLint disabled).
- No semicolons (airbnb override `semi: 0`).
- 2-space indent, LF line endings.
- IntersectionObserver hook with stable deps (`ids.join('|')` pattern from useActiveSection).

### Integration Points

- `src/App.js` already composes About/Skills/Experience/Contact/Footer in order — no App.js change needed.
- Section IDs already exist: `#about`, `#skills`, `#experience`, `#contact` — Phase 2 nav scroll-spy already targets these.
- LanguageContext useEffect can be extended with og:title / og:description sync (mirror existing title sync pattern).
- `index.html` `<head>` is the place for static og:image, og:url, og:type, twitter:card meta tags.

### Code-Level Risks

- `dangerouslySetInnerHTML` used in About.js for `t.about.p1/p2/p3` — translations contain HTML. Phase 3 should NOT introduce more `dangerouslySetInnerHTML` unless absolutely necessary. Existing usage acceptable (translations are author-controlled, not user input).
- `src/data/experience.js` is a default-exported `const EXPERIENCE` array. Adding `tech: []` per entry is additive — no consumer break risk.
- Footer.js currently exports a `const social` array with 4 items. Trimming to 2 (GitHub, LinkedIn) is a pure data change.

</code_context>

<specifics>
## Specific Ideas

- **Email = hero, dominant** (CONT-06) — visually largest contact element. The copy-to-clipboard interaction with inline 'Copied!' swap should feel snappy: no toast component overhead.
- **All 12 experience entries visible from first load** — collapsed but the timeline rail shows the full career arc at a glance. Recruiters can scan dates+titles+companies+tech without expanding.
- **Tech chips sourced from explicit `tech: []` field** — easier for Carlos to maintain (one place to edit per job) and for downstream agents to grep.
- **Skills grouped by category** — Backend / Cloud & Infrastructure / DevOps & Tools / AI & Productivity. Recruiter scanning improves over flat 6-card grid.
- **Animation threshold 25% / stagger 100ms** — standard cadence, neither rushed nor laggy. All `motion-safe:` prefixed; reduce-motion users see content immediately.
- **OG image is a new branded 1200x630 PNG** — not the raw me.webp. Recruiter sees a polished card on Slack/LinkedIn/Twitter previews.

</specifics>

<deferred>
## Deferred Ideas

- **Test infrastructure (Vitest / Playwright / RTL)** — Phase 4 candidate per Phase 2 D-06.
- **Lighthouse 90+ enforcement** — Phase 4.
- **JSON-LD Person schema (ASEO-01)** — backlog (post-v3.4).
- **WebP image optimization pipeline (ASEO-02)** — backlog.
- **Contact form** — out of scope per PROJECT.md (mailto: + clipboard email is sufficient).
- **Skills proficiency bars / star ratings** — D-04 settled on subtle "Ny" badge; richer visualization is backlog.
- **About copy rewrite / layout redesign** — D-01 settled on keep-and-animate.
- **Per-language OG image** (e.g., separate og-image-en.png / og-image-es.png) — not required; tagline can be language-neutral or English default.

</deferred>

---

*Phase: 03-content-animations*
*Context gathered: 2026-05-05*
