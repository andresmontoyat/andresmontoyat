# Phase 6: Projects Showcase - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Projects showcase section between Experience and Contact: a responsive 1→2→3 column card grid rendering 3-5 projects (placeholder data this phase, real content user-provided post-deploy), each card with 16:9 screenshot, title, bilingual description, tech chips, and Live + GitHub button row. Scroll-spy nav extended with #projects link. All visuals respect dark + light themes from Phase 5.

Requirements covered: VIS-03.

Out of scope: Real project content (placeholder data only — user supplies later), real screenshots (gradient placeholder fallback only), GitHub activity feed (INTX-03 backlog), projects filtering/sorting, projects detail pages.

</domain>

<decisions>
## Implementation Decisions

### Project Data (placeholder this phase)

- **D-01:** Use placeholder data for 3-5 projects in `src/data/projects.js` (mirror experience.js bilingual `{en, es}` pattern). User provides real content post-deploy.
- **D-02:** Per-project schema:
  ```js
  {
    slug: 'project-name',
    title: { en: 'Project Title', es: 'Título Proyecto' },
    desc: { en: '1-2 sentence description', es: '1-2 frases descripción' },
    tech: ['Java', 'Spring Boot', 'Kafka'],  // language-neutral array
    liveUrl: 'https://example.com' || null,
    githubUrl: 'https://github.com/user/repo' || null,
    screenshot: 'project-name.webp' || null  // file in public/projects/
  }
  ```
- Placeholder values: 4 projects with realistic backend/portfolio-relevant titles (e.g. "Person API", "GUDD API", "Blockchain Credentials Platform", "AI Coding Assistant Workflows" — derive from EXPERIENCE bullets) — researcher/planner picks 4 from existing experience entries.

### Card Layout

- **D-03:** Responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`. Mobile 1 col, tablet 2, desktop 3.
- **D-04:** Screenshot aspect ratio: **16:9** (`aspect-video` Tailwind utility).
- **D-05:** Hover effect: `hover:border-brand hover:-translate-y-1 transition-all duration-300` — matches Phase 2 Skills/Experience/Contact pattern.
- **D-06:** Card structure (top to bottom):
  1. Screenshot wrapper (16:9, rounded-t)
  2. Card body padding `p-6`
     - Title h3 `text-base font-extrabold text-text-primary` (inherits Phase 3 type roles)
     - Description `text-base text-text-secondary leading-relaxed` (~2 lines)
     - Tech chips row `font-mono text-xs` (matches Experience tech chips)
     - Button row: Live + GitHub side-by-side
- **D-07:** Card surface: `bg-ink-500 border border-ink-400 rounded-xl overflow-hidden` — matches Phase 3 design system.

### Screenshot Strategy

- **D-08:** **Placeholder gradient only this phase.** All projects render `bg-brand-gradient` (existing Phase 1 utility) when `screenshot` field is null OR `public/projects/{slug}.{ext}` not found.
- **D-09:** Placeholder content: project title centered in mono font (e.g. `font-mono text-2xl text-ink-950 font-extrabold`) — uses brand-gradient bg + ink-950 text for legibility in both themes.
- **D-10:** When user adds real screenshots later: drop file at `public/projects/{slug}.webp` (or .png), update projects.js entry's `screenshot` field. Component checks for screenshot field truthiness — falls back to placeholder gracefully.
- **D-11:** No Playwright screenshot toolchain extension this phase. INTX-03 backlog.

### Section Position + Nav Integration

- **D-12:** Insert Projects section in App.js **between Experience and Contact** (story flow: career → selected work → contact).
- **D-13:** Section ID: `id="projects"`. Add `'projects'` to Nav `SECTION_IDS` array (currently `['about', 'skills', 'experience', 'contact']` → `['about', 'skills', 'experience', 'projects', 'contact']`).
- **D-14:** Nav link translation: add `t.nav.projects` (EN: "Projects" / ES: "Proyectos") to translations.js.
- **D-15:** Nav rendering: add Projects link in DesktopNav links list + MobileMenu links list. Position: between Experience and Contact.
- **D-16:** Lazy-load Projects via `React.lazy + Suspense` consistent with Phase 4 D-02 (Experience/Contact/Footer already lazy). Maintains bundle split discipline.

### External Links Per Card

- **D-17:** Two buttons in card footer: **"View Live"** (left) + **"GitHub"** (right). Both `target="_blank" rel="noopener noreferrer"`. Hardcoded English labels OR add `t.projects.live` / `t.projects.github` translation keys. Recommend: bilingual via `t.projects.live` (EN: "View Live" / ES: "Ver Live") and `t.projects.github` (EN: "GitHub" / ES: "GitHub" — same).
- **D-18:** Conditional rendering: if `liveUrl` is null → hide Live button. If `githubUrl` is null → hide GitHub button. If both null → no button row (still show card with title/desc/tech/screenshot).

### Animation

- **D-19:** Reuse `useInView` hook from Phase 3 — same threshold 0.25, same `.animate-on-scroll`/`.is-visible` classes. 100ms stagger per card via `transitionDelay` (consistent with Experience timeline + Contact cards).

### Theme Support

- **D-20:** Card surface bg-ink-500 + border-ink-400 + text-text-* tokens — all already CSS-variable backed via Phase 5. Both themes work automatically.
- **D-21:** Brand-gradient placeholder bg uses brand color which is theme-invariant (#6C63FF in both modes). Placeholder text on gradient stays legible.

### Section Heading

- **D-22:** Use shared `SectionLabel` component (Phase 3) — mono brand label "PROJECTS" (or `t.projects.label` for bilingual "PROJECTS"/"PROYECTOS"). H2 heading + intro paragraph (e.g. "Selected work I've shipped" / "Trabajo destacado que he entregado").

### Implementer's Discretion

- Exact 4 placeholder project titles derived from EXPERIENCE bullets (researcher picks from experience.js)
- Exact tech chip count per project (recommend 3-5 to keep cards visually balanced)
- Exact placeholder description copy (2 short sentences each)
- SEO consideration: og:image regen needed if Projects section visible in OG card? (likely not — og-image is Hero-focused per Phase 3)
- nav.projects icon (none — text only consistent with other nav links)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 6 Specs (this directory)

- `.planning/phases/06-projects-showcase/06-CONTEXT.md` — this file
- *(UI-SPEC for Phase 6 may be optional — design largely inherits Phase 3 patterns. Recommend skip UI-SPEC and proceed to plan-phase directly.)*

### Project-Level

- `.planning/PROJECT.md` — v3.5 milestone block + locked decisions
- `.planning/REQUIREMENTS.md` — VIS-03 requirement
- `.planning/ROADMAP.md` — Phase 6 entry
- `project instructions` — project conventions

### Phase 3 Outputs (locked patterns to inherit)

- `src/components/Experience.js` — vertical timeline pattern, useInView usage, stagger via transitionDelay
- `src/components/_shared/SectionLabel.js` — shared section heading
- `src/hooks/useInView.js` — IntersectionObserver hook (threshold 0.25)
- `src/data/experience.js` — bilingual data file pattern (mirror for projects.js)
- `src/index.css` — .animate-on-scroll / .is-visible classes
- `.planning/phases/03-content-animations/03-UI-SPEC.md` — Phase 3 UI contracts (4 type roles, 2 weights, multiples-of-4 spacing)

### Phase 4 Outputs (lazy-load pattern)

- `src/App.js` — React.lazy + Suspense for Experience/Contact/Footer (mirror for Projects)

### Phase 5 Outputs (theme support)

- `src/index.css` — CSS variables + [data-theme="light"] block
- All `bg-ink-*` / `text-text-*` / `border-ink-*` tokens already theme-aware

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `useInView` hook (Phase 3) — direct reuse for Projects card entrance animations
- `SectionLabel` shared component (Phase 3) — direct reuse for "PROJECTS" / "PROYECTOS" heading
- `bg-ink-500 border border-ink-400 rounded-xl` card surface pattern (Phase 3) — consistent visual identity
- `font-mono text-xs` tech chip pattern (Phase 3 Experience.js, Skills chip badges)
- `motion-safe:` prefix utilities (Phase 1)
- `bg-brand-gradient` utility (Phase 1) — placeholder background
- `aspect-video` Tailwind utility (built-in) for 16:9 ratio

### Established Patterns

- Page section pattern: `<section id="X" className="py-20"><div className="max-w-6xl mx-auto px-6">...</div></section>`
- Default-export function components, no PropTypes
- `useLanguage()` hook destructure at top
- React.lazy for below-fold sections (App.js)

### Integration Points

- App.js section composition order — insert ProjectsSection between Experience and Contact
- Nav.js SECTION_IDS array — add 'projects'
- Nav.js DesktopNav + MobileMenu — add Projects link
- translations.js — extend with t.nav.projects + t.projects.label / .h2 / .intro / .live / .github keys

</code_context>

<specifics>
## Specific Ideas

- **Story flow:** Hero → About → Skills → Experience (career history) → **Projects (selected builds)** → Contact (reach out) — projects sit naturally where recruiters expect to see "what has Carlos shipped"
- **Placeholder-first ships fast** — no waiting for screenshots/content gathering. User drops real assets post-deploy, no code change needed (data-driven via projects.js).
- **Theme-invariant brand placeholder** — gradient bg + dark text works in both light and dark modes without conditional rendering.
- **Card skeleton when screenshot missing** — gradient + project title is more engaging than empty rectangle.

</specifics>

<deferred>
## Deferred Ideas

- Real project content + screenshots — user provides post-Phase-6 (out of scope this milestone)
- Projects detail pages with extended descriptions — not in v3.5 scope
- Filter/sort by tech stack — backlog
- GitHub activity feed integration (INTX-03) — backlog
- Auto-capture screenshots via Playwright (extend Phase 3 OG toolchain) — backlog if user wants automation later
- og:image refresh to include Projects section — not necessary, og-image stays Hero-focused

</deferred>

---

*Phase: 06-projects-showcase*
*Context gathered: 2026-05-08*
