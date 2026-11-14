# Codebase Structure

**Analysis Date:** 2026-04-21

## Directory Layout

```
andresmontoyatco/          # Project root
├── public/                # Static assets served at root path
│   ├── images/            # Image assets
│   │   └── me.webp        # Profile photo
│   ├── CV_Carlos_Montoya_EN.docx  # Downloadable CV (English)
│   ├── CV_Carlos_Montoya_ES.docx  # Downloadable CV (Spanish)
│   ├── index.html         # HTML shell (CRA entry point)
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
├── src/                   # All application source code
│   ├── components/        # React section components
│   │   ├── Nav.js         # Sticky header + language toggle
│   │   ├── Hero.js        # Hero section + stats + CTA
│   │   ├── About.js       # About section + quick facts sidebar
│   │   ├── Skill.js       # Skills grid with chip tags
│   │   ├── Experience.js  # Timeline with expand/collapse
│   │   ├── Contact.js     # Contact cards with icons
│   │   └── Footer.js      # Footer with social links
│   ├── data/              # Static structured data
│   │   └── experience.js  # EXPERIENCE array (bilingual career entries)
│   ├── i18n/              # Internationalization
│   │   ├── LanguageContext.js  # React Context + useLanguage hook
│   │   └── translations.js    # Full EN/ES translation dictionary
│   ├── App.js             # Root component — layout composition
│   ├── index.js           # React DOM entry point
│   ├── index.css          # Global styles (Tailwind base + custom)
│   ├── logo.svg           # CRA default logo (unused in production UI)
│   └── reportWebVitals.js # CRA web vitals utility
├── website-new/           # Standalone HTML prototype (not integrated)
│   └── index.html         # Self-contained HTML/CSS/JS page
├── .planning/             # GSD planning documents
│   └── codebase/          # Codebase analysis documents
├── <assistant-config>/               # local assistant settings
├── craco.config.js        # CRACO config (Tailwind PostCSS + @ alias)
├── tailwind.config.js     # Tailwind design tokens and theme extensions
├── postcss.config.js      # PostCSS config
├── jsconfig.json          # JS path aliases for editor
├── .eslintrc.js           # ESLint rules
├── .editorconfig          # Editor formatting baseline
├── package.json           # Dependencies and scripts
└── package-lock.json      # Lockfile
```

## Directory Purposes

**`src/components/`:**
- Purpose: All React section components that compose the single page
- Contains: One `.js` file per page section. Components are presentational — they render UI from translations and static data, hold no server state.
- Key files: `Nav.js` (language toggle), `Hero.js` (CTA + stats), `Experience.js` (expand logic)

**`src/data/`:**
- Purpose: Static content that is structured (arrays/objects) rather than copy strings
- Contains: `experience.js` — the EXPERIENCE array with bilingual career timeline entries
- Note: Skills card data lives in `src/i18n/translations.js` (embedded in the translation tree), not here

**`src/i18n/`:**
- Purpose: All internationalization logic and copy
- Contains: Context provider, custom hook, complete EN/ES translation dictionaries
- Key files: `LanguageContext.js` (stateful), `translations.js` (pure data)

**`public/`:**
- Purpose: Static files served as-is by the web server at root (`/`)
- Contains: CV `.docx` files (downloaded by `Hero` CV button), profile image, HTML shell
- Generated: No. Committed: Yes.

**`website-new/`:**
- Purpose: A standalone HTML prototype of a redesigned site
- Generated: No. Committed: Yes. Not integrated into the React build.

## Key File Locations

**Entry Points:**
- `src/index.js`: React DOM mount point
- `src/App.js`: Root component and layout composition
- `public/index.html`: HTML shell injected by CRA build

**Configuration:**
- `tailwind.config.js`: Design tokens (`ink`, `neon`, `slate2` colors; `grad-neon`, `radial-hero` backgrounds; `neon` shadows; `pulse2`, `fadein` animations)
- `craco.config.js`: Tailwind PostCSS integration + `@` → `src/` webpack alias
- `.eslintrc.js`: Linting rules
- `jsconfig.json`: Editor path alias (`@` → `src/`)

**Core Logic:**
- `src/i18n/LanguageContext.js`: Language state, persistence, locale detection
- `src/i18n/translations.js`: All user-facing copy (EN + ES)
- `src/data/experience.js`: Career timeline data

**Static Assets:**
- `public/CV_Carlos_Montoya_EN.docx`: English CV download
- `public/CV_Carlos_Montoya_ES.docx`: Spanish CV download
- `public/images/me.webp`: Profile photo

## Naming Conventions

**Files:**
- Components: PascalCase `.js` matching the exported component name (`Nav.js`, `Hero.js`, `Experience.js`)
- Data files: camelCase `.js` matching the exported constant (`experience.js` exports `EXPERIENCE`)
- i18n files: PascalCase for context (`LanguageContext.js`), camelCase for data (`translations.js`)

**Components:**
- Default export per file, named with PascalCase matching filename
- Local helper components defined in the same file as the primary component (e.g., `Stat` in `Hero.js`, `Row` in `About.js`, `SectionLabel` in multiple files)

**Exported constants:**
- UPPER_SNAKE_CASE for array data: `EXPERIENCE`
- camelCase for objects: `translations`

**CSS classes:**
- Tailwind utility classes applied inline in JSX
- Custom tokens use kebab-case matching Tailwind convention: `ink-900`, `neon`, `slate2-400`, `grad-neon`, `shadow-neon`

## Where to Add New Code

**New portfolio section:**
- Create: `src/components/NewSection.js` (default export, PascalCase)
- Register: Import and add `<NewSection />` in `src/App.js` inside `<main>`
- Copy: Add translation keys to both `en` and `es` objects in `src/i18n/translations.js`
- Anchor: Add `id="new-section"` to the `<section>` element and link in `Nav.js`

**New translation string:**
- Add to both `en` and `es` keys in `src/i18n/translations.js`
- Access in component: `const { t } = useLanguage()` then `t.sectionKey.fieldKey`

**New structured data (bilingual):**
- Create: `src/data/newData.js` with UPPER_SNAKE_CASE named export
- Pattern: Each language-varying field as `{ en: '...', es: '...' }`

**New static downloadable file:**
- Place in: `public/` directory
- Reference in component: `href="/{filename}"` (served at root path)

**New image:**
- Place in: `public/images/`
- Reference: `src="/images/{filename}"`

**Shared UI primitives:**
- Currently: `SectionLabel` is duplicated in 4 component files
- Recommended location for extraction: `src/components/ui/SectionLabel.js`

## Special Directories

**`website-new/`:**
- Purpose: Standalone HTML/CSS redesign prototype
- Generated: No. Committed: Yes.
- Not part of the React build. Ignore for any React development work.

**`build/`:**
- Purpose: CRA production build output
- Generated: Yes (`npm run build`). Not committed.

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: No. Committed: Yes.

**`<assistant-config>/`:**
- Purpose: Claude Code local project settings
- Generated: No. Committed: Yes.

---

*Structure analysis: 2026-04-21*
