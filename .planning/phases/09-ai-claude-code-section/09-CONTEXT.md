---
phase: 09-ai-claude-code-section
created: 2026-05-12
milestone: v3.6 — AI Practice & Brand Refresh
requirements: [AI-01, AI-01-CICD]
discuss_mode: discuss
gray_areas_resolved: [b-data-location, f-translation-keys, l-copy-strategy, j-anchor-naming, p-chunk-size]
---

# Phase 9 Context — AI / Claude Code Section (Engineer-for-Hire Pitch)

## Goal

Visitors who scroll past Projects encounter a sales-focused section positioning Carlos as an AI-disciplined backend engineer-for-hire. CTAs route to Contact. Bilingual EN+ES. Lazy-loaded chunk. Scroll-spy entry in Desktop and Mobile nav.

## Requirements In Scope

- **AI-01** — New AI section between Projects and Contact in `App.js`. V7 sketch layout: pitch hero + 4 value props + proof block (7 counters) + 5 services + 3 featured-app cards + stack-strip credentials. Bilingual via `translations.js`. `#claude-code` scroll-spy entry. Lazy-loaded separate chunk. Mirrors Projects integration pattern from Phase 6.

- **AI-01-CICD** (sub-feature of AI-01) — Surface `soldife/ci-templates` as evidence: app card (47 workflows / 15 starter templates, GitFlow, EC2/EC2-VPN-WireGuard/EKS deploys, ECR + GitHub Packages, quality gates SonarQube + OWASP + ArchUnit + Qodana, commit-lint + semver), service card "DevOps automation", 2 additional proof counters (47 CI workflows / 15 starter templates).

## Scope Boundary

**In scope:**
- New `src/data/claude.js` data module (bilingual longform copy for VALUES, SERVICES, APPS arrays + COUNTERS array + STACK_CHIPS array)
- New `t<assistant-config>.*` namespace in `src/i18n/translations.js` (~26 keys × 2 langs)
- New `t.nav.claudeCode` translation key (Nav label)
- New `src/components/Claude.js` (default-exported lazy section with internal sub-components: PitchHero, ValueCard, ProofBlock, ServiceCard, FeaturedAppCard, StackStrip)
- `src/components/Nav.js` — extend `SECTION_IDS` to include `'claude-code'` between `'projects'` and `'contact'`; add Nav link entries in DesktopNav and MobileMenu
- `src/App.js` — add `React.lazy(() => import('./components/Claude'))` and insert `<Suspense fallback={SectionFallback}><Claude /></Suspense>` between existing Projects and Contact Suspense blocks (lines 44–45 of current App.js)
- Animations: reuse existing `useInView` hook + `.animate-on-scroll` / `.is-visible` CSS pattern from Phase 3
- Stagger delays per card group, 100ms increments

**Out of scope (this phase):**
- DIAGRAMS-01 modal — Phase 11 owns. App cards in this phase are static (no click-to-expand)
- Real-browser UAT + Lighthouse + WCAG sweep — Phase 10
- Pricing tier copy / discovery-call CTAs — explicitly deferred (no scope creep)
- Client logos / testimonials — deferred (content gathering required; ties to VIS-04 backlog)
- Analytics event tracking on CTAs — deferred
- New animation library — reuse existing useInView

## Codebase Reuse Notes

- `src/data/projects.js` is the canonical bilingual data shape — Claude.js data module follows the same pattern: arrays of objects with `{en, es}` per text field.
- `src/components/Projects.js` (109 lines) is the structural template — single file with internal sub-component (ProjectCard). Claude.js will mirror this but with 6 internal sub-components instead of 1 (since the section has more distinct visual blocks: pitch hero, value card, proof block, service card, featured app card, stack strip).
- `src/i18n/translations.js` — `t.projects` block at EN line ~117 and ES line ~251 is the reference pattern. `t<assistant-config>` block inserts after each.
- `src/components/Nav.js` line 7 `SECTION_IDS` array — append `'claude-code'` between `'projects'` and `'contact'`. The same Nav.js file has `DesktopNav` link arrays at line 67 (`href="#projects"`) and `MobileMenu` link arrays at line 175 — insert new entries in BOTH.
- `src/App.js` lines 39–48 — current Suspense blocks for Experience / Projects / Contact / Footer. Insert new Claude block between Projects close (line 44) and Contact open (line 45).
- `src/hooks/useInView.js` — reused for entrance animations. No new hook needed.
- Phase 7 CSS-var infrastructure powers all color tokens — Claude.js consumes `bg-ink-*` / `text-text-*` / `bg-brand` / etc. directly via Tailwind utility classes. NO new CSS vars required.
- Phase 8 hero theme-aware vars (`--hero-*`) do NOT apply to this section — Claude lives in normal section flow (no full-bleed photo).

## Locked Gray-Area Decisions

### b — Data location & shape (split: data file + translations)

`src/data/claude.js` holds **structured arrays with longform bilingual descriptions** (mirror `projects.js` shape):

```js
export const VALUES = [
  {
    id: '01',
    key: 'velocity',
    desc: {
      en: 'Agentic workflows (discuss → plan → execute → verify) ship in hours what takes days traditionally, while preserving atomic commits and real tests.',
      es: 'Workflows agénticos (discuss → plan → execute → verify) entregan en horas lo que toma días con desarrollo tradicional, manteniendo atomic commits y tests reales.',
    },
  },
  // ... 3 more entries (discipline, quality, transfer)
]

export const SERVICES = [
  {
    key: 'greenfield',
    desc: {
      en: 'Spring Boot + hexagonal from scratch with CI/CD, observability and complete testing infra.',
      es: 'Spring Boot + hexagonal desde cero, con CI/CD, observability y testing infra completas.',
    },
  },
  // ... 4 more entries
]

export const APPS = [
  {
    slug: 'ci-templates',
    name: 'ci-templates',
    tag: 'OPEN SOURCE',
    desc: {
      en: '47 reusable GitHub Actions workflows + 15 starter templates (Java, Krakend, React). GitFlow strategy, quality gates (SonarQube · OWASP · ArchUnit · Qodana), deploys EC2 / EC2-over-WireGuard-VPN / EKS.',
      es: '47 reusable GitHub Actions workflows + 15 starter templates (Java, Krakend, React). GitFlow strategy, quality gates (SonarQube · OWASP · ArchUnit · Qodana), deploys EC2 / EC2-over-WireGuard-VPN / EKS.',
    },
    stack: ['github-actions', 'gitflow', 'sonarqube', 'owasp', 'eks', 'ec2', 'wireguard', 'ecr', 'helm', 'jenkins'],
    links: [],   // empty for v3.6; future = [{ label, href }]
  },
  // ... GSD framework, spring-ai-qdrant-mcp
]

export const COUNTERS = [
  { value: 37, key: 'agents' },
  { value: 81, key: 'skills' },
  { value: 86, key: 'workflows' },
  { value: 15, key: 'guidelines' },
  { value: 47, key: 'ciWorkflows' },
  { value: 15, key: 'starterTemplates' },
  { value: 5, key: 'appsShipped' },
]

export const STACK_CHIPS = [
  'Java 21', 'Kotlin 2.x', 'Spring Boot 3', 'Hexagonal', 'PostgreSQL',
  'Kafka', 'Redis', 'AWS', 'Docker', 'Kubernetes', 'Terraform',
  'GitHub Actions', 'Jenkins', 'SonarQube', 'Claude Code', 'MCP', 'Spring AI',
]
```

`src/i18n/translations.js` `t<assistant-config>` namespace holds **short labels + section headings + value/service/counter titles** (`{en, es}` parallel).

**Rationale:** longform descriptions are stable-but-evolving (1-3 sentences each); centralizing in translations.js would bloat that file (it stays focused on UI strings). Counters and stack chips are language-agnostic structural data. Mixing both in `claude.js` preserves the single-file mental model for "what this section knows about itself" — same as `projects.js`.

### f — Translation key structure (~26 keys × 2 langs)

```js
// EN
nav: {
  // ... existing
  projects: 'Projects',
  claudeCode: 'Claude Code',    // NEW
  // ... existing
},
claude: {                          // NEW NAMESPACE
  label: 'AI Engineering · For your team',
  h2Part1: 'Backend systems',
  h2Part2: 'delivered with AI discipline',
  subLead: 'Senior backend engineer. Combining hexagonal architecture, Spring Boot, and agentic workflows with Claude Code to ship production-ready features in a fraction of the time — without sacrificing testing, ADRs, or observability.',
  ctaPrimary: 'Let\'s talk about your project →',
  ctaSecondary: 'See projects',
  proofLabel: 'Track record',
  proofHeading: 'I built my own toolkit before selling it',
  servicesLabel: 'Concrete services',
  counters: {
    agents: 'custom agents',
    skills: 'workflow skills',
    workflows: 'orchestrations',
    guidelines: 'guidelines',
    ciWorkflows: 'CI workflows',
    starterTemplates: 'starter templates',
    appsShipped: 'apps shipped',
  },
  values: {
    velocity: 'Delivery 3–5× faster',
    discipline: 'Hexagonal without shortcuts',
    quality: 'Tests + observability built-in',
    transfer: 'Your team keeps the workflow',
  },
  services: {
    greenfield: 'Greenfield builds',
    aiSetup: 'AI workflow setup',
    mcp: 'MCP server development',
    legacy: 'Legacy refactor',
    devops: 'DevOps automation',
  },
}

// ES (parallel — keys identical)
nav: { ..., projects: 'Proyectos', claudeCode: 'Claude Code', ... }
claude: {
  label: 'AI Engineering · Para tu equipo',
  h2Part1: 'Sistemas backend',
  h2Part2: 'entregados con disciplina AI',
  subLead: 'Senior backend engineer. Combino hexagonal architecture, Spring Boot y workflows agénticos con Claude Code para entregar features production-ready en una fracción del tiempo — sin sacrificar testing, ADRs ni observability.',
  ctaPrimary: 'Hablemos de tu proyecto →',
  ctaSecondary: 'Ver proyectos',
  proofLabel: 'Track record',
  proofHeading: 'Construí mi propio toolkit antes de venderlo',
  servicesLabel: 'Servicios concretos',
  counters: { agents: 'subagents propios', skills: 'workflow skills', workflows: 'orquestaciones', guidelines: 'guidelines', ciWorkflows: 'CI workflows', starterTemplates: 'starter templates', appsShipped: 'apps shipped' },
  values: { velocity: 'Entrega 3–5× más rápida', discipline: 'Hexagonal sin atajos', quality: 'Tests + observability built-in', transfer: 'Tu equipo se lleva el workflow' },
  services: { greenfield: 'Greenfield builds', aiSetup: 'AI workflow setup', mcp: 'MCP server development', legacy: 'Legacy refactor', devops: 'DevOps automation' },
}
```

**Total NEW keys:** 27 (26 in t<assistant-config> + 1 in t.nav.claudeCode) × 2 langs = 54 new string entries.

### l — Copy strategy (V7 sketch as v1, refine during execution)

**Locked:** V7 sketch español copy is v1 draft. Executor turns sketch placeholders into final production copy, refining for tone/clarity. User reviews LIVE in Phase 10 UAT — easy tweaks if needed (CSS-var infra makes copy iteration cheap).

**Tone constraints (executor must honor):**
- Confident, evidence-backed; NO hyperbole ("rockstar", "world-class")
- Velocity claim "3–5× faster" kept (defensible: agentic workflows objectively reduce hand-typed code; reasonable upper bound)
- ES native quality (user is native speaker); EN parallel quality
- ES uses "vos / tú" — choose "tú" (matches site tone elsewhere)
- Keep technical terms English where idiomatic (Spring Boot, hexagonal, MCP, GitFlow, observability, atomic commits)

**Copy review checkpoint:** none in this phase. Phase 10 UAT is the gate.

### j — Anchor naming + Nav label (`claude-code`)

**Locked:**

```
SECTION_IDS slug:  'claude-code'    (matches V7 sketch id)
Anchor:            #claude-code
Nav label EN:      'Claude Code'    (recruiters Googling "Claude Code AI engineer" land here)
Nav label ES:      'Claude Code'    (nombre propio — no traduce)
```

**Rationale:**
- Specific tech name beats generic "AI" or "Expertise"
- Matches V7 sketch + REQUIREMENTS.md `id="claude-code"` already locked
- SEO benefit (current buzzword)
- Risk: ties identity to Anthropic product naming. Acceptable — user owns brand pivot if Claude Code is renamed/sunset.
- Nav slot inserted between "Proyectos" and "Contacto" — fits chronological story (work → projects → AI practice → contact).

### p — Chunk size budget + component structure

**Locked: single-file `src/components/Claude.js` with internal sub-components.**

**Internal structure (not exported):**

```js
function PitchHero({ t }) { ... }
function ValueCard({ id, title, desc }) { ... }
function ProofBlock({ t, counters }) { ... }
function ServiceCard({ title, desc }) { ... }
function FeaturedAppCard({ name, tag, desc, stack }) { ... }
function StackStrip({ chips }) { ... }

export default function Claude() {
  const { t, lang } = useLanguage()
  const [ref, isVisible] = useInView({ threshold: 0.15 })

  return (
    <section id="claude-code" ref={ref} className="py-24 sm:py-32 bg-ink-950">
      <div className="max-w-6xl mx-auto px-6">
        <PitchHero t={t} />
        <div className="value-grid mt-16">
          {VALUES.map((v, i) => (
            <ValueCard key={v.key}
              id={v.id}
              title={t<assistant-config>.values[v.key]}
              desc={v.desc[lang]}
            />
          ))}
        </div>
        <ProofBlock t={t} counters={COUNTERS} />
        <div className="services-grid mt-12">
          {SERVICES.map((s) => (
            <ServiceCard key={s.key}
              title={t<assistant-config>.services[s.key]}
              desc={s.desc[lang]}
            />
          ))}
        </div>
        <div className="apps-grid mt-6">
          {APPS.map((a) => (
            <FeaturedAppCard key={a.slug}
              name={a.name}
              tag={a.tag}
              desc={a.desc[lang]}
              stack={a.stack}
            />
          ))}
        </div>
        <StackStrip chips={STACK_CHIPS} />
      </div>
    </section>
  )
}
```

**Chunk size target:** ≤ 8 KB raw (Projects 4.6 KB benchmark; Claude has more cards but same simplicity). Tree-shaking: imports `useInView` + `useLanguage` + data module. NO external libs.

**Animations:** `useInView` on top-level section. Each card group fades-in with stagger `style={{ transitionDelay: `${i * 100}ms` }}` — same pattern as Projects.js.

**Phase 9 plan structure:** **1 plan** with 4 task groups (no internal verification gate).

- Plan 09-01:
  - Group A — Data + translations (2 tasks): create `src/data/claude.js`, extend `translations.js` with t<assistant-config>.* + t.nav.claudeCode
  - Group B — Component (2 tasks): create `src/components/Claude.js` with all sub-components + animations
  - Group C — Wire into App + Nav (2 tasks): App.js lazy import + Suspense block; Nav.js SECTION_IDS + DesktopNav + MobileMenu link entries
  - Group D — Build + bundle verify (1 task): `npm run build`, confirm Claude chunk emits separately, size within budget

**Total: 7 tasks** (atomic, ~1 commit each).

## Auto-Decided Gray Areas

- **a — Single file Claude.js**: yes (consistent with Projects.js convention; sub-components internal). One file = one chunk = simpler lazy boundary.
- **c — Counters static hardcoded**: yes. No runtime calc. If counts change (more agents/skills built), update `COUNTERS` array in `src/data/claude.js` manually.
- **d — Featured app cards as new sub-component**: yes (`FeaturedAppCard`). No modal in this phase (DIAGRAMS-01 = Phase 11 owns modal).
- **e — Stack strip local to Claude.js**: yes. If a second section ever reuses it, extract to `_shared/` then.
- **g — App.js Suspense boundary**: insert between current line 44 (`</Suspense>` of Projects) and line 45 (`<Suspense fallback={SectionFallback}>` of Contact). Same pattern as Projects insertion in Phase 6.
- **h — Animations**: extend useInView with `threshold: 0.15`; per-card stagger `i * 100ms` via `style={{ transitionDelay }}`; respect `motion-safe:` prefix on all transition classes (existing project convention).
- **i — Diagrams modal**: OUT — explicitly Phase 11 (DIAGRAMS-01).
- **m — Counter labels**: hardcoded literals, no "as of {date}" caveat (looks unprofessional; numbers are intentionally evergreen — refresh manually when inventory grows).
- **n — Service cards informational**: no per-card CTAs. Pitch hero's `ctaPrimary` (→ #contact) is the only conversion path. Avoids competing buttons.
- **o — No analytics events**: keep simple. GA already fires page-view (v3.4 SEO-02). Per-CTA tracking is future work (would require event handlers + GA wiring — out of scope).

## Verification Plan (handed to Phase 10)

Phase 9 has NO internal verification gate. Phase 10 owns full sweep:
- Visual layout at iPhone 14 / iPad / 1440px in dark + light modes
- Scroll-spy active state when scrolled into `#claude-code`
- Nav links Desktop + Mobile (both languages)
- Lazy chunk emission confirmed in `dist/assets/Claude-*.js`
- Chunk size ≤ 8 KB (budget assertion)
- WCAG AA contrast across all new text (light mode brand `#2563EB` + accent `#047857` validated)
- CTAs route to `#contact` and `#projects` (smooth scroll)
- Animations stagger correctly; `prefers-reduced-motion` suppresses them
- Bilingual: EN+ES toggle flips all 27 new keys live (no re-mount required — same `useLanguage` pattern as rest of site)

## Dependencies

- **Depends on:** Phase 7 (CSS-var infra + new palette) + Phase 8 (Hero photo — visual integration story flows: hero photo → projects → AI practice → contact).
- **Unblocks:** Phase 10 (UAT covers Phase 9), Phase 11 (DIAGRAMS-01 extends FeaturedAppCard with modal).

## Risks & Mitigations

- **Risk:** Claude chunk exceeds 8 KB budget (6 sub-components + data import). **Mitigation:** Plan task D measures actual size; if over 12 KB, refactor sub-components into separate files (one chunk per card type) OR remove emoji/long inline strings.
- **Risk:** ES copy reads stiff or English-y (mixing technical English terms with Spanish). **Mitigation:** Executor produces v1; Phase 10 UAT review is the user gate. Translation keys are isolated so revisions = 1 file change.
- **Risk:** Nav grows too wide on Mobile (`Projects` + `Claude Code` + `Contact` may not fit in hamburger). **Mitigation:** Hamburger menu is full-height overlay (Phase 2 portal pattern) — no width constraint. Desktop nav at 1440px easily fits 7 items.
- **Risk:** "DevOps automation" service feels less aligned with rest (ci-templates is sub-feature; some users may read it as scope creep). **Mitigation:** Position 5th of 5 services (last) and explicitly anchor it to the `ci-templates` featured app card to reinforce the connection.
- **Risk:** ServiceCard + ValueCard + FeaturedAppCard look too similar (visual fatigue). **Mitigation:** V7 sketch uses distinct visual treatments per card type (numbered values, left-border services, bordered featured apps with tag badges). Plan task B must preserve these distinctions.
- **Risk:** Sales tone alienates non-recruiter visitors. **Mitigation:** Copy positions toolkit as evidence first, services second — engineer voice not vendor pitch. "I built my own toolkit before selling it" lands as authentic, not transactional.

## Open Questions (none)

All gray areas resolved. Planner can proceed with Plan 09-01 structure as locked above.
