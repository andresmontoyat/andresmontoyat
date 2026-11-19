// @vitest-environment node
//
// src/components/astro/Projects.test.ts
// Astro Container API parity test — ports all 8 it-blocks of the former
// src/components/Projects.test.jsx RTL suite against the zero-JS
// Projects.astro (D-01/D-06). Forced to the `node` environment per-file
// (see src/pages/_404.test.ts for the esbuild/jsdom rationale established in
// Phase 21) — renderToString() output is plain HTML text, no DOM APIs needed.
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { describe, expect, it } from 'vitest'
import Projects from './Projects.astro'
import data from '../../data/projects.json'

async function renderProjects(locale = 'en') {
  const container = await AstroContainer.create()
  return container.renderToString(Projects, { props: { locale } })
}

describe('Projects.astro (Container API parity — D-06)', () => {
  it('renders the section with id="projects"', async () => {
    const result = await renderProjects('en')
    expect(result).toContain('id="projects"')
  })

  it('renders label + heading + intro (EN)', async () => {
    const result = await renderProjects('en')
    expect(result).toContain('Projects')
    expect(result).toContain('Selected work')
    expect(result).toMatch(/A focused look at the systems/)
  })

  it('renders one article per project with its EN title', async () => {
    const result = await renderProjects('en')
    const articleMatches = result.match(/<article/g) || []
    expect(articleMatches).toHaveLength(data.projects.length)
    for (const p of data.projects) {
      expect(result).toContain(p.title.en)
    }
  })

  it('renders each project emoji icon + tech chips', async () => {
    const result = await renderProjects('en')
    for (const p of data.projects) {
      expect(result).toContain(p.icon)
      for (const tag of p.tech) {
        expect(result).toContain(tag)
      }
    }
  })

  it('translates label/h2/intro + ES project titles when locale=es', async () => {
    const result = await renderProjects('es')
    expect(result).toContain('Proyectos')
    expect(result).toContain('Trabajo destacado')
    expect(result).toMatch(/mirada enfocada/)
    for (const p of data.projects) {
      expect(result).toContain(p.title.es)
    }
  })

  it('renders a View Live CTA for each project with a liveUrl, and none without', async () => {
    const result = await renderProjects('en')
    const withLive = data.projects.filter((p) => p.liveUrl)
    const liveCtas = result.match(/>View Live</g) || []
    expect(liveCtas).toHaveLength(withLive.length)
    for (const p of withLive) {
      expect(result).toContain(p.liveUrl)
    }
    expect(result).not.toContain('>GitHub<')
  })

  it('renders the featured project first as a highlighted variant (Mr. Yoker)', async () => {
    const result = await renderProjects('en')
    expect(data.projects[0].id).toBe('mr-yoker')
    expect(data.projects[0].featured).toBe(true)
    const featuredMatches = result.match(/data-featured="true"/g) || []
    expect(featuredMatches).toHaveLength(data.projects.filter((p) => p.featured).length)
    const featuredIndex = result.indexOf('data-featured="true"')
    const restIndex = result.indexOf('data-featured="false"')
    const featuredBlock = result.slice(featuredIndex, restIndex === -1 ? undefined : restIndex)
    expect(featuredBlock).toContain('Mr. Yoker')
    expect(featuredBlock).toMatch(/Featured/i)
  })

  it('shows each project domain and a live or client status', async () => {
    const result = await renderProjects('en')
    for (const p of data.projects) {
      expect(result).toContain(p.domain.en)
      expect(result).toMatch(new RegExp(`~/projects/<span[^>]*>${p.id}</span>`))
    }
    const live = data.projects.filter((p) => p.liveUrl).length
    expect(result.match(/class="pj-dot"/g) || []).toHaveLength(live)
    expect(result.match(/Private client code/g) || []).toHaveLength(data.projects.length - live)
  })

  it('projects.json schema sanity — each project has required bilingual keys', () => {
    expect(Array.isArray(data.projects)).toBe(true)
    expect(data.projects.length).toBeGreaterThan(0)
    for (const p of data.projects) {
      expect(typeof p.id).toBe('string')
      expect(typeof p.icon).toBe('string')
      expect(typeof p.title.en).toBe('string')
      expect(typeof p.title.es).toBe('string')
      expect(typeof p.desc.en).toBe('string')
      expect(typeof p.desc.es).toBe('string')
      expect(Array.isArray(p.tech)).toBe(true)
    }
  })
})
