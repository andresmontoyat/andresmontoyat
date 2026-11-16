# Development

Source of [www.andresmontoyat.dev](https://www.andresmontoyat.dev): a static, bilingual (EN/ES) portfolio built with Astro, React islands and Tailwind CSS 4, deployed on Vercel.

## Requirements

- Node.js >= 22.23.4
- npm

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/`, then checks every inline script hash is allowed by the CSP in `vercel.json` |
| `npm run preview` | Serves the production build |
| `npm run test:run` | Unit and component tests (Vitest) |
| `npm run e2e` | End-to-end tests (Playwright) |
| `npm run lint` | ESLint |
| `npm run lighthouse:mobile` | Lighthouse mobile report against a local build |

## Layout

- `src/pages/{en,es}/` — one page per locale
- `src/components/astro/` — zero-JS sections; `src/scripts/` — the small modules that enhance them
- `src/data/` — all bilingual copy as `{ en, es }` JSON
- `src/game/` — the career RPG at `/game`
- `docs/adr/` — architecture decisions

## Content Security Policy

The CSP is enforced from `vercel.json`. Inline scripts are allowed by hash only. When a build adds or changes one, `npm run build` fails and prints the missing hash. After deploying, `node scripts/csp-hashes.mjs --check` verifies the hashes production actually serves.
