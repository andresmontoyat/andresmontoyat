// @vitest-environment node
//
// src/pages/_404.test.ts
// Underscore-prefixed per Astro's own pages-directory convention: any file
// under src/pages/ that begins with `_` is excluded from route generation
// (Astro's create-manifest.js: "Prefix filename with an underscore to ignore
// this warning, or move the file outside of the pages directory"). Without
// the prefix, `astro build` attempts to render this test file as a page and
// crashes (TypeError: Cannot read properties of undefined (reading 'config')
// in @vitest/runner's initSuite) — discovered live during Plan 21-05's build
// sanity check. Phase 23 should reuse the underscore-prefix convention for
// any further Container API test colocated inside src/pages/.
//
// Astro Container API proof-of-life (TEST-01 harness stand-up) — the first
// `.astro` component test in the repo. `experimental_AstroContainer` is
// experimental and subject to breaking changes even in minor/patch Astro
// releases (no stabilization date per Astro's own docs, confirmed in
// 21-RESEARCH.md) — downstream harness use (Phase 23) should not assume this
// API's shape is stable, only that the pattern below (create -> renderToString
// -> assert on the output string) is the current documented way to compile
// and render an .astro component under Vitest via getViteConfig().
//
// Forced to the `node` environment (per-file override) instead of the repo's
// jsdom default (vitest.config.ts): Astro's compiler invokes esbuild
// synchronously to build the component, and esbuild's own startup invariant
// check (`new TextEncoder().encode("") instanceof Uint8Array`) fails under
// jsdom's shimmed TextEncoder — a documented esbuild/jsdom incompatibility,
// unrelated to this test's assertions. `renderToString()` output is plain
// HTML text, so no DOM APIs are needed here anyway.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import NotFoundPage from './404.astro'

describe('404 page (Container API proof-of-life — TEST-01 harness)', () => {
  it('renders without throwing', async () => {
    const container = await AstroContainer.create()
    await expect(container.renderToString(NotFoundPage)).resolves.toBeTruthy()
  })

  it('renders a home link and the 404 numeral', async () => {
    const container = await AstroContainer.create()
    const result = await container.renderToString(NotFoundPage)
    expect(result).toMatch(/href="\/(en|es)?"/)
    expect(result).toContain('404')
  })

  it('renders both locales, each with its home link and terminal suggestions', async () => {
    const container = await AstroContainer.create()
    const result = await container.renderToString(NotFoundPage)
    expect(result).toContain('data-l="en"')
    expect(result).toContain('data-l="es"')
    expect(result).toContain('Page not found')
    expect(result).toContain('Página no encontrada')
    expect(result).toContain('href="/es/#projects"')
    expect(result).toContain('href="/en/#contact"')
    expect(result).toContain('/js/not-found.js')
  })
})
