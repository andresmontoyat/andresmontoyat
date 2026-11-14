# Phase 4: Polish & Performance - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Final milestone polish: hit Lighthouse Performance 90+ on mobile, ensure all interactive elements meet 44px tap target minimum, eliminate scroll jank on real devices, and fix accumulated a11y debt (Phase 1 jsx-a11y warnings + Phase 3 verifier observations W-01 / I-01).

Requirements covered: SEO-03, RESP-01, RESP-02, RESP-03.

Out of scope: New features (test infra deferred to post-v3.4 backlog per D-04 below). Visual redesign of any section. JSON-LD Person schema (ASEO-01 backlog). WebP image pipeline beyond og-image (ASEO-02 backlog). Sitemap (ASEO-03 backlog). Cross-device cloud testing (BrowserStack — explicit "DevTools responsive only" decision per D-09 below).

</domain>

<decisions>
## Implementation Decisions

### Lighthouse Optimization (SEO-03)

- **D-01:** Measure Lighthouse via **local prod build + CLI**. Workflow: `npm run build && npx serve dist -p 4173 && npx lighthouse http://localhost:4173 --preset=desktop` — repeat with mobile preset + throttling. Iterate until Performance 90+ on mobile preset. No deployed-preview measurement this phase (deploy target deferred).
- **D-02:** Optimization priorities (all 4 selected):
  - **Image optimization** — convert `me.webp` to optimized variants if larger than necessary, ensure explicit `width`/`height` on all `<img>` to prevent CLS, lazy-load below-the-fold images. Verify `og-image.png` (190KB) is acceptable size.
  - **Code splitting / lazy routes** — split below-fold sections (Experience, Contact, Footer) into lazy-loaded chunks via `React.lazy + Suspense`. Hero + Nav stay eager. Acknowledged limited gain on SPA but every byte helps mobile.
  - **Font preload + display:swap** — add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for Inter 400 + Inter 800 + JetBrains Mono 400 in `index.html` `<head>`. Verify `@fontsource` CSS uses `font-display: swap` (eliminates FOIT). 5 weights of Inter currently loaded (400/500/600/700/800) — Phase 4 may strip to 2 actively used (400, 800) since Phase 2/3 contract is 2-weight.
  - **Strip unused deps + tree-shake audit** — run bundle visualizer, identify and remove anything unused. Keep Playwright as devDep only. Audit `package.json` dependencies (not devDependencies).
- **D-03:** Bundle analysis tool: **rollup-plugin-visualizer** added as devDep. Generates HTML treemap on every `npm run build`. Add `npm run build:analyze` script.

### Test Infrastructure Final Call (deferred 3 phases)

- **D-04:** **Skip test infra entirely for milestone v3.4.** No Vitest, no Playwright e2e tests, no @testing-library/react. Continue manual UAT via `/gsd-verify-work`. Playwright stays installed (devDep) for OG image generation only — not test runs. Decision rationale: portfolio is 1 page + 6 components, low long-term maintenance volume, manual UAT has caught 100% of regressions in Phases 2+3. Revisit in v3.5 milestone if scope grows. **No visual regression** screenshots either (skipped per related question).

### Tap Target + A11y Sweep (RESP-03 + cross-cutting)

- **D-05:** Tap target audit method: **Lighthouse a11y report only**. Run alongside Performance audit (single tool, single command). Verify report shows 0 "Touch targets too small" violations. axe-core CLI / manual sweep deferred unless Lighthouse misses a known-bad element.
- **D-06:** Copy email button (Phase 3 had `min-h-[32px]` intentionally per UI-SPEC) → **bump to `min-h-[44px]`**. Reverses Phase 3 spec exception. Spacing around the email card may need a small tweak (e.g. `py-3` → `py-2` to keep visual balance) — researcher/planner picks.
- **D-07:** A11y items to fix (all 4 selected):
  - **Fix all jsx-a11y warnings** — promote rule severity from `warn` → `error` in `.eslintrc.js`; resolve every existing warning in `src/`. Categories likely include: img missing alt, button without text content, anchor href requirements, role on non-interactive elements.
  - **ARIA landmark roles audit** — verify `<main>` wraps content sections, `<nav>` on Nav, `<footer>` on Footer (verify `<footer>` already has implicit `contentinfo` role). Headings hierarchy: exactly one `h1` (in Hero), `h2` per top-level section, `h3` per sub-element (e.g. experience card title).
  - **Color contrast verification** — beyond Lighthouse a11y catches, manually verify `text-text-secondary` (#9CA3AF or similar) on `bg-ink-950` and `bg-ink-500` cards meets WCAG AA (4.5:1 normal text, 3:1 large text). If fails: adjust `text-text-secondary` token in tailwind.config.js or use `text-text-primary` for affected copy.
  - **Keyboard navigation full pass** — Tab through entire page top-to-bottom: focus rings visible on every interactive element (use Phase 2 brand-color outline ring), mobile menu trap focus when open, `Escape` dismisses menu (Phase 2 already), expand/collapse experience cards keyboard-operable, copy email button reachable via keyboard. Add **skip-to-content** link as first focusable element if missing.

### Real-Device Testing (RESP-01 + RESP-02)

- **D-08:** Real-device testing scope: **Chrome DevTools responsive mode only**. Test breakpoints: iPhone 14 (390x844), Pixel 7 (412x915), iPad (768x1024), 4K desktop (2560x1440). No BrowserStack/SauceLabs. No own-phone testing this phase. Trade-off: misses real GPU/touch-latency quirks but matches D-04 (manual-only) philosophy.
- **D-09:** Frame-rate jank verification (RESP-02): **Chrome DevTools Performance profile**. Record 5–10s of full-page scroll with CPU 4x throttle + Network "Slow 4G". Verify no long tasks > 50ms, no layout thrash, FPS stays 55–60. Specifically watch for: scroll-spy IntersectionObserver callback frequency, useInView observer firing, Hero h1b char-reveal during scroll, Experience timeline rail/dot rendering. No physical mid-range Android session this phase (per D-08).

### Phase 3 Polish Carryover

- **D-10:** **Fold W-01 + I-01 into Phase 4 polish wave**:
  - **W-01:** `src/components/Skill.js` ChipBadge — remove hardcoded `is-visible` class; gate on parent `inView` so chips actually stagger on scroll, not at mount. 1-line edit.
  - **I-01:** `src/components/Experience.js` — wrap section heading (SectionLabel + h2 + intro paragraph) in `animate-on-scroll` container so heading animates in like About/Skill/Contact. Section currently jumps in while timeline cards stagger.

### Implementer's Discretion

- Which sections get `React.lazy` split (D-02 code splitting) — researcher recommends based on bundle visualizer output.
- Exact `font-display` value if @fontsource doesn't already set `swap` — likely `font-display: swap` but verify default first.
- Skip-to-content link copy + position (visible on focus only).
- Tailwind purge / arbitrary value cleanup if visualizer reveals CSS bloat.
- Whether to enable Vite `build.rollupOptions.output.manualChunks` for explicit chunk naming.
- Image format strategy: keep me.webp / og-image.png as-is, or generate AVIF + WebP variants with `<picture>` source fallback.
- Specific font preload strategy: 2 weights (400, 800) only OR all loaded (400/500/600/700/800).
- jsx-a11y warning resolution approach per category (e.g. label vs. aria-label).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 Specs (this directory)

- `.planning/phases/04-polish-performance/04-CONTEXT.md` — this file (locked decisions D-01..D-10)
- *(UI-SPEC for Phase 4 will be generated next via `/gsd-ui-phase 4` — recommended given UI hint=yes)*

### Project-Level

- `.planning/PROJECT.md` — vision, current state through Phase 3, validated requirements
- `.planning/REQUIREMENTS.md` — full requirements list (Phase 4 reqs at lines 62, 73-75); 10 unmapped REQ-IDs (VIS-01..04, ASEO-01..03, INTX-01..03) flagged by phase complete — defer to milestone audit
- `.planning/ROADMAP.md` — milestone exit criteria
- `.planning/STATE.md` — accumulated decisions
- `project instructions` — coding conventions

### Codebase Maps

- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STACK.md`
- `.planning/codebase/ARCHITECTURE.md`

### Phase 1+2+3 Outputs (locked dependencies, all merged into main branch)

- `vite.config.js` (Phase 1) — extend with rollup-plugin-visualizer plugin
- `tailwind.config.js` (Phase 1) — purge config + token system
- `src/index.css` (Phase 1+3) — global styles + .animate-on-scroll classes
- `index.html` (Phase 0+2+3) — extend `<head>` with font preload links
- `package.json` — currently has Playwright as devDep (Phase 3); remove unused deps if visualizer flags any
- `src/components/*.js` — modify in-place per Phase 2 D-01 baseline
- `src/i18n/LanguageContext.js` — already has og:* sync (Phase 3), keep as-is
- `src/hooks/useInView.js`, `src/hooks/useActiveSection.js` (Phase 2+3) — verify rAF and IO observer cleanup is leak-free under Performance profile
- `.planning/phases/02-shell-hero/02-UI-SPEC.md` — typography/spacing/color contracts (4 sizes / 2 weights / multiples-of-4)
- `.planning/phases/03-content-animations/03-UI-SPEC.md` — Phase 3 contracts inherited
- `.planning/phases/03-content-animations/03-VERIFICATION.md` — W-01 + I-01 details (folded in via D-10)

### External References

- Lighthouse CLI docs: https://github.com/GoogleChrome/lighthouse#using-the-node-cli
- @fontsource CSS source: `node_modules/@fontsource/inter/{weight}.css` for current font-display value
- WCAG 2.1 AA contrast standards: 4.5:1 normal text, 3:1 large/UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `useInView` hook (Phase 3) — already pattern-tested, no work needed
- `useActiveSection` hook (Phase 2) — same
- `LanguageContext` lazy init + og:* sync (Phase 2+3) — verify no perf regression
- Phase 2/3 design tokens — typography 4 sizes / 2 weights, spacing multiples of 4 — strict adherence ensures small CSS payload
- `motion-safe:` Tailwind prefix — already pervasive, should keep CSS animation tree-shake clean

### Established Patterns

- `export default function ComponentName()` for page sections
- IntersectionObserver hooks with stable deps (`ids.join('|')`) — already minimal re-render
- Custom hooks in `src/hooks/`
- Inline `<style>` for hero entrance stagger animations — already CSS-only, GPU-friendly transforms
- Self-hosted fonts via @fontsource — already tree-shake friendly via direct weight imports

### Integration Points

- `index.html` `<head>` — preload links go here
- `vite.config.js` — visualizer plugin registers here; manualChunks config goes here
- `package.json` — scripts addition for `og:gen` (Phase 3) extends with `build:analyze`, `lighthouse:local`
- `.eslintrc.js` — jsx-a11y rule severity bump
- Phase 3 deferred items (test infra, JSON-LD, sitemap, AVIF pipeline) explicitly NOT in Phase 4 — hold the line

### Code-Level Risks

- Inter loads 5 weights but only 2 used (400, 800) — quick win to strip 500/600/700 imports in `src/index.js` (Phase 1 brought them in)
- Playwright + Chromium binaries are large (~150 MB on disk) but devDep only — no production bundle impact
- `.planning/codebase/CONVENTIONS.md` notes ESLint `react/prop-types: 0` and `react/no-array-index-key: 0` — Phase 4 should not change these (separate from jsx-a11y)
- `npm run lint` currently shows ~6 warnings (jsx-a11y warns + 2 react-hooks/exhaustive-deps on useActiveSection.js) — exhaustive-deps is intentional `ids.join('|')` pattern, do NOT "fix" those (justified suppression with comment if needed)

</code_context>

<specifics>
## Specific Ideas

- **Lighthouse 90+ is the gating success criterion** — measurement happens locally via CLI; iterate quickly without deploy round-trips
- **Manual UAT is the testing strategy** — confirmed final after 3 phases of deferral
- **Phase 4 is the polish wave**, not a feature wave — every change should reduce bytes, fix gaps, or tighten a11y/touch targets
- **W-01 + I-01 are quick wins** — folded in early so Phase 4 verification covers them too
- **Strip unused Inter weights (500/600/700)** — small but real gain (3 fewer woff2 files = ~100KB saved at first load)
- **Skip-to-content link** is a standard a11y pattern — visible on focus, jumps to `#about` or `#hero`
- **Strict 44px touch target** — applies to copy email button (D-06 reverses Phase 3 32px exception)

</specifics>

<deferred>
## Deferred Ideas

- **Test infrastructure (Vitest / Playwright e2e / RTL)** — locked: post-v3.4 milestone (v3.5+ revisit)
- **JSON-LD Person schema (ASEO-01)** — backlog
- **Sitemap generation (ASEO-03)** — backlog
- **AVIF + WebP `<picture>` fallback** — backlog (current me.webp + og-image.png sufficient for portfolio)
- **BrowserStack / SauceLabs cross-device** — backlog (D-08 says DevTools responsive only)
- **Real Android phone perf record** — backlog (D-09 says DevTools profile only)
- **Visual regression screenshots** — backlog
- **REQUIREMENTS.md traceability sync for unmapped REQ-IDs (VIS-01..04, ASEO-01..03, INTX-01..03)** — milestone audit task, not Phase 4
- **Deploy target choice (Vercel/Netlify/Pages)** — milestone-level deploy decision, post-Phase 4
- **Domain registration (carlosmontoya.dev or similar)** — milestone-level
- **Future test runner if v3.5 scope justifies** — backlog

</deferred>

---

*Phase: 04-polish-performance*
*Context gathered: 2026-05-07*
