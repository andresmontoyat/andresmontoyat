import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  output: 'static', // default, but explicit — no adapter installed
  // Keep the default 'auto' (small CSS inlined, the shared bundle stays an external
  // cacheable <link>). Forcing 'always' inlined the ~52KB Tailwind bundle into <head>,
  // and parsing it synchronously on Lighthouse's 4x-throttled mobile CPU INCREASED the
  // LCP render-delay (consistent ~83 vs the external build's up-to-100) — the round-trip
  // it saved cost less than the main-thread parse it added. Measured, reverted.
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Eagerly pre-bundle React + its JSX runtimes so `astro dev`'s first page
    // load never races Vite's on-demand optimizeDeps — that race served island
    // modules referencing an un-bundled `react/jsx-dev-runtime`, surfacing as
    // "TypeError: _jsxDEV is not a function" until a reload. Dev-only; the
    // production build is unaffected.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
  },
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true, // both /en/* and /es/* — no bare-root default-locale tree
      redirectToDefaultLocale: false, // the Vercel Edge Middleware (D-01..D-04) owns "/", not Astro's own i18n redirect
    },
  },
})
