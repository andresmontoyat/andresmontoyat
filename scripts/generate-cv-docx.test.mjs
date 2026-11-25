// @vitest-environment node
import { describe, expect, it } from 'vitest'
import exp from '../src/data/experience.json'
import { buildDocumentXml } from './generate-cv-docx.mjs'

const hidden = exp.entries.find((e) => e.visible === false && !e.cvOnly)
const shown = exp.entries.find((e) => e.visible !== false)

describe('buildDocumentXml', () => {
  it('should include the name and the localized title when language is es', () => {
    const { document } = buildDocumentXml('es')

    expect(document).toContain('Carlos Andrés Montoya Tobón')
    expect(document).toContain('Arquitecto de Soluciones Java y Tech Lead')
  })

  it('should include visible roles when building the cv', () => {
    expect(buildDocumentXml('en').document).toContain(shown.company)
  })

  it('should leave out roles hidden from the cv', () => {
    expect(buildDocumentXml('en').document).not.toContain(hidden.company)
  })

  it('should register one external relationship per hyperlink', () => {
    const { document, linkRels } = buildDocumentXml('en')
    const hyperlinks = document.match(/<w:hyperlink /g)

    expect(linkRels).toHaveLength(hyperlinks.length)
  })

  it('should escape xml special characters in the content', () => {
    expect(buildDocumentXml('en').document).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/)
  })
})
