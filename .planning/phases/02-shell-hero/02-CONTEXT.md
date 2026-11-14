# Phase 2: Shell & Hero - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Bilingual navigation shell (sticky header, mobile hamburger menu, EN/ES language switcher, scroll-spy active link, scroll progress bar) plus Hero section (status badge, three-line headline with character-by-character reveal on the gradient line, lead, two CTAs, four-stat row, ambient gradient + dot-grid background). Plus SEO-04 lang persistence with no first-paint flash.

Requirements covered: NAV-01, NAV-02, NAV-03, NAV-04, HERO-01, HERO-02, HERO-03, HERO-04, HERO-05, I18N-01, I18N-02, I18N-03, SEO-04.

Out of scope: About / Skills / Experience / Contact / Footer sections (Phase 3). Lighthouse / perf budget enforcement (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Component Refactor Strategy

- **D-01:** Modify `src/components/Hero.js` and `src/components/Nav.js` **in-place**. No new file names, no V2 suffixes, no parallel implementations. Edit existing files directly to match UI-SPEC contracts.
  - Rationale: cleaner git history per file; existing import paths in `App.js` stay; keeps diff focused.
  - Risk acknowledged: heavy changes mix with prior code — reviewer must read full file rewrites.

### Scroll Behavior (NAV-03, NAV-04)

- **D-02:** Native CSS `scroll-behavior: smooth` (already set in `src/index.css`) for smooth-scroll on anchor link clicks. **No** `react-scroll` library usage.
- **D-03:** Custom **IntersectionObserver** hook (e.g., `src/hooks/useActiveSection.js`) for scroll-spy active section detection. `rootMargin` per UI-SPEC: `-20% 0px -60% 0px`.
- **D-04:** `react-scroll` is a declared but unused dependency — remove from `package.json` as part of Phase 2 cleanup.

### Mobile Menu Rendering

- **D-05:** Render the mobile menu overlay via **React portal** to `document.body` (`ReactDOM.createPortal`).
  - Rationale: avoids z-index stacking conflicts with sticky nav; `overflow: hidden` scroll-lock applies cleanly to `<body>`; ESC keyboard handler attaches at document level.
  - Implementation: extract `<MobileMenu />` sub-component from Nav.js; portal target = `document.body`.

### Testing Strategy

- **D-06:** **Manual browser-only** testing for Phase 2. No Vitest, no Playwright, no test runner setup this phase.
  - Verification path: `/gsd:verify-work 2` for UAT against the 5 success criteria.
  - Defer test infrastructure decision to Phase 4 (Polish & Performance) if needed.

### Translation Keys (additions required)

- **D-07:** Add two keys to `src/i18n/translations.js` under `nav` namespace:
  - `nav.menuOpen` → "Open menu" / "Abrir menú" (hamburger button aria-label)
  - `nav.menuClose` → "Close" / "Cerrar" (overlay close button aria-label)

### Locked from UI-SPEC (Phase 2 02-UI-SPEC.md — read it)

- All visual contracts: palette (ink-950, brand #6C63FF, coral gradient endpoint), 4 type roles, 2 weights (400/800), spacing scale (multiples of 4), copy strings pulled from translations.js
- Hero entrance stagger sequence (7 steps, 0–950ms delays, motion-safe: prefix mandatory)
- h1b char-reveal: useState + setTimeout, 40ms per char, prefers-reduced-motion guard skips to full string instantly
- Mobile overlay: fade 200ms, body overflow:hidden scroll-lock, ESC keydown, close button absolute top-5 right-6
- Active nav indicator: text-brand + 2px bottom border (border-b-2 border-brand pb-0.5)
- Scroll progress bar: fixed top-0 z-[200], 3px height, brand color, rAF-throttled scroll handler writing to ref.style.width
- Language switcher: synchronous localStorage init in LanguageContext to fix SEO-04 flash (already implemented via cam-lang key; verify sync read in `useState` initializer)
- CV downloads: two side-by-side ghost buttons, hardcoded language labels ("Download CV (EN)" / "Descargar CV (ES)"), `download` attribute, links to `public/CV_Carlos_Montoya_EN.docx` and `public/CV_Carlos_Montoya_ES.docx`

### Implementer's Discretion

- `<html lang>` attribute syncing on language change — pick a clean approach (likely `useEffect` in `LanguageProvider` setting `document.documentElement.lang`)
- Per-language `<title>` and `<meta name="description">` tag updates — pick a clean approach (same `useEffect` pattern, no need for `react-helmet`)
- Scroll progress bar exact CSS implementation (single fixed div ref + rAF, vs hooked into IntersectionObserver) — researcher/planner picks
- Custom hook file location: `src/hooks/` directory does not exist — create it for `useActiveSection.js`
- Hero `<section>` semantic structure (heading levels, landmark roles)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Specs (in this directory)

- `.planning/phases/02-shell-hero/02-UI-SPEC.md` — **PRIMARY DESIGN CONTRACT.** Full visual + interaction spec, locked decisions, 6/6 dimension checker PASS.

### Project-Level

- `.planning/PROJECT.md` — vision, principles, "stop recruiters mid-scroll" core value
- `.planning/REQUIREMENTS.md` — full v1 requirements list (NAV-01..04, HERO-01..05, I18N-01..03, SEO-04 in scope)
- `.planning/ROADMAP.md` — phase boundaries, success criteria
- `.planning/STATE.md` — current progress, accumulated decisions

### Codebase Maps

- `.planning/codebase/STRUCTURE.md` — directory layout, file purposes
- `.planning/codebase/CONVENTIONS.md` — naming, formatting, import order
- `.planning/codebase/STACK.md` — tech stack
- `.planning/codebase/ARCHITECTURE.md` — patterns and abstractions

### Phase 1 Outputs (locked dependencies)

- `tailwind.config.js` — design tokens (`ink`, `brand`, `accent`, `text`, `bg-hero-gradient`, `bg-grid-subtle`, `motion-safe:` animations)
- `src/index.css` — global styles, `scroll-behavior: smooth`, `prefers-reduced-motion` rule, `bg-grid-subtle` utility
- `src/i18n/LanguageContext.js` — existing language state + persistence (cam-lang localStorage key)
- `src/i18n/translations.js` — bilingual copy tree (extends with `nav.menuOpen` / `nav.menuClose`)
- `src/components/Hero.js` — existing hero (modify in-place)
- `src/components/Nav.js` — existing nav (modify in-place)
- `public/CV_Carlos_Montoya_EN.docx`, `public/CV_Carlos_Montoya_ES.docx` — CV download targets

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `useLanguage()` hook from `src/i18n/LanguageContext.js` — already provides `{ lang, setLang, t }`. All Phase 2 components consume it.
- `tailwind.config.js` design tokens (Phase 1) — full palette, animation keyframes, font stack ready to use.
- `bg-hero-gradient` and `bg-grid-subtle` utilities already defined.
- Hero copy keys in translations.js: `hero.statusBadge`, `hero.h1a`, `hero.h1b`, `hero.h1c`, `hero.lead`, `hero.cta1`, `hero.cta2`, `hero.stats[]`.
- Nav copy keys: `nav.about`, `nav.skills`, `nav.experience`, `nav.contact`, `nav.langEn`, `nav.langEs` (verify exact key names; add `nav.menuOpen` / `nav.menuClose`).

### Established Patterns

- `export default function ComponentName()` for page-section components.
- Private sub-components defined in same file (e.g., `function Stat()` inside Hero.js).
- `useLanguage()` destructure at top: `const { lang, setLang, t } = useLanguage()`.
- No PropTypes (disabled in ESLint).
- No semicolons (airbnb override `semi: 0`).
- 2-space indent, LF line endings (`.editorconfig`).

### Integration Points

- `src/App.js` composes `<Nav />` and `<Hero />` inside `<LanguageProvider>` — no changes required to App.js for D-01 strategy.
- Mobile menu portal target = `document.body` — no DOM changes needed in `public/index.html`.
- New `src/hooks/` directory must be created for `useActiveSection.js`.

### Code-Level Risks

- `src/index.js` uses `ReactDOM.render` (React 17 API) per project instructions tech stack note — Phase 1 upgraded to React 18, so verify this was migrated to `createRoot`. If not, scroll progress bar's portal child rendering still works either way, but note for cleanup.
- Existing `react-scroll` and `react-router-dom` deps unused — remove during Phase 2 cleanup as part of D-04.

</code_context>

<specifics>
## Specific Ideas

- "Stop recruiters mid-scroll" — Hero h1b gradient char-reveal is the focal element per UI-SPEC. Stagger timing must let the reveal land before CTAs appear (h1b char-reveal duration ≈ char_count × 40ms).
- Active section indicator must use **color + 2px bottom border** (D-02 in UI-SPEC), not just color change. Border applied via `border-b-2 border-brand pb-0.5` on active link.
- Mobile menu fade duration: **200ms** (matches NAV-01 from UI-SPEC). Body `overflow: hidden` toggle on overlay open/close.
- Scroll progress bar: **3px height**, fixed at top, z-index 200, brand-color solid fill. rAF-throttled scroll handler.

</specifics>

<deferred>
## Deferred Ideas

- **Test infrastructure setup** (Vitest / Playwright) — not in Phase 2 scope. Revisit in Phase 4 (Polish & Performance) if quality gates require it.
- **About / Skills / Experience / Contact / Footer redesign** — Phase 3 (Content & Animations).
- **Lighthouse 90+ enforcement** — Phase 4.
- **`website-new/` directory cleanup** — flagged as blocker in STATE.md; remove during Phase 2 if it does not slow phase delivery, otherwise defer to Phase 4 cleanup task.

</deferred>

---

*Phase: 02-shell-hero*
*Context gathered: 2026-05-05*
