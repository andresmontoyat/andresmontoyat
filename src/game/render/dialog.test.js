import { describe, it, expect } from 'vitest'
import {
  dialogLines, createDialog, paginate, siteSource, bulletSource, colsFor,
} from './dialog.js'

const site = { co: 'TCS', title: { en: 'Tech Lead', es: 'Líder' }, date: { en: '2013', es: '2013' }, metric: { value: '45+', label: { en: 'devs', es: 'devs' } }, tech: ['Java', 'OSB'] }
const noMetric = { ...site, metric: null }
const noValueMetric = { ...site, metric: { label: { en: 'B2B marketplace', es: 'Marketplace B2B' } } }

describe('dialogLines', () => {
  it('builds title·company, date, metric, tech in the active language', () => {
    expect(dialogLines(site, 'es')).toEqual(['Líder  ·  TCS', '2013', '★ 45+  devs', '‹tech› Java · OSB'])
  })
  it('skips the metric line when absent', () => {
    expect(dialogLines(noMetric, 'en')).toEqual(['Tech Lead  ·  TCS', '2013', '‹tech› Java · OSB'])
  })
  it('renders the metric line without a leading number when value is absent', () => {
    expect(dialogLines(noValueMetric, 'en')).toEqual(['Tech Lead  ·  TCS', '2013', '★ B2B marketplace', '‹tech› Java · OSB'])
  })
})

describe('createDialog', () => {
  it('opens into typing state', () => {
    const d = createDialog()
    d.open(site)
    expect(d.state).toBe('typing')
    expect(d.isOpen()).toBe(true)
  })
  it('advance during typing reveals full text and moves to waiting', () => {
    const d = createDialog()
    d.open(site)
    d.advance()
    expect(d.state).toBe('waiting')
    expect(d.visibleText('es')).toBe(dialogLines(site, 'es').join('\n'))
  })
  it('advance while waiting closes the dialog', () => {
    const d = createDialog()
    d.open(site)
    d.advance()
    d.advance()
    expect(d.state).toBe('closed')
    expect(d.isOpen()).toBe(false)
  })
  it('tick accumulates revealed characters and reaches waiting', () => {
    const d = createDialog()
    d.open(site)
    for (let i = 0; i < 200; i++) d.tick(2)
    expect(d.state).toBe('waiting')
  })
  it('reveals full Spanish text when ES is longer than EN', () => {
    const esLong = { co: 'Soldife', title: { en: 'Arch', es: 'Arquitecto de Soluciones y Tech Lead' }, date: { en: '2026', es: '2026' }, metric: null, tech: ['Java'] }
    const d = createDialog()
    d.open(esLong)
    d.advance()
    expect(d.visibleText('es')).toBe(dialogLines(esLong, 'es').join('\n'))
  })
})

const WORDS = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
const source = (en, es) => ({ pages: lang => (lang === 'en' ? en : es) })

describe('paginate', () => {
  it('wraps at 46 cols and groups 4 rows per page, keeping every word', () => {
    const pages = paginate(WORDS)
    const lines = pages.flatMap(p => p.split('\n'))
    expect(pages.length).toBeGreaterThanOrEqual(2)
    expect(pages.every(p => p.split('\n').length <= 4)).toBe(true)
    expect(lines.every(l => l.length <= 46)).toBe(true)
    expect(lines.join(' ')).toBe(WORDS)
  })
  it('hard-splits a word longer than the column width', () => {
    const lines = paginate('x'.repeat(100)).flatMap(p => p.split('\n'))
    expect(lines.map(l => l.length)).toEqual([46, 46, 8])
  })
  it('honours custom cols and rows', () => {
    expect(paginate('aa bb cc dd', { cols: 5, rows: 1 })).toEqual(['aa bb', 'cc dd'])
  })
})

describe('text sources', () => {
  it('siteSource is one page with the card text', () => {
    expect(siteSource(site).pages('en')).toEqual([dialogLines(site, 'en').join('\n')])
  })
  it('siteSource keeps a card line that fits as written', () => {
    expect(siteSource(site).pages('en', 46)).toEqual([dialogLines(site, 'en').join('\n')])
  })
  it('siteSource wraps a card line wider than the box and pages the overflow', () => {
    const wide = { ...site, tech: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL'] }
    const pages = siteSource(wide).pages('en', 20)
    const lines = pages.flatMap(p => p.split('\n'))
    expect(lines.every(l => l.length <= 20)).toBe(true)
    expect(lines.slice(0, 2)).toEqual(['Tech Lead  ·  TCS', '2013'])
    expect(pages.every(p => p.split('\n').length <= 4)).toBe(true)
    expect(lines.join(' ')).toContain('PostgreSQL')
  })
  it('bulletSource paginates the 1-based bullet in that language', () => {
    const entry = { bullets: { en: ['one', 'two'], es: ['uno', 'dos'] } }
    expect(bulletSource(entry, 2).pages('es')).toEqual(['dos'])
  })
})

describe('paged dialog', () => {
  it('needs two advances per page and reports the page index', () => {
    const d = createDialog()
    d.open(source(['a', 'b', 'c'], ['a', 'b', 'c']))
    const seen = []
    for (let i = 0; i < 6; i++) {
      seen.push(d.page('en').index)
      d.advance()
    }
    expect(seen).toEqual([0, 0, 1, 1, 2, 2])
    expect(d.isOpen()).toBe(false)
  })
  it('restarts typing on each new page', () => {
    const d = createDialog()
    d.open(source(['abc', 'def'], ['abc', 'def']))
    d.advance()
    d.advance()
    expect(d.state).toBe('typing')
    expect(d.visibleText('en')).toBe('')
  })
  it('clamps to the last page of a shorter language and returns on switch back', () => {
    const d = createDialog()
    d.open(source(['a', 'b', 'c'], ['x', 'y']))
    d.advance(); d.advance(); d.advance(); d.advance(); d.advance()
    expect(d.visibleText('es')).toBe('y')
    expect(d.page('es')).toEqual({ index: 1, count: 2 })
    expect(d.page('en')).toEqual({ index: 2, count: 3 })
  })
  it('wraps a bare site through siteSource', () => {
    const d = createDialog()
    d.open(site)
    expect(d.page('en')).toEqual({ index: 0, count: 1 })
  })
})

describe('colsFor', () => {
  it('fits the columns of the text area: the viewport less 40px of margin a side', () => {
    expect(colsFor(336, 6.6)).toBe(38)
    expect(colsFor(640, 6.6)).toBe(84)
  })
  it('keeps the default width until a glyph has been measured', () => {
    expect(colsFor(336, 0)).toBe(46)
  })
})

describe('dialog fitted to a width', () => {
  const entry = { bullets: { en: [WORDS], es: [WORDS] } }
  it('paginates a bullet at the columns it is given', () => {
    expect(bulletSource(entry, 1).pages('en', 10)).toEqual(paginate(WORDS, { cols: 10 }))
  })
  it('re-paginates when the width changes, and advance follows the new page count', () => {
    const d = createDialog()
    d.open(bulletSource(entry, 1))
    d.fit(80)
    const wide = d.page('en').count
    d.fit(20)
    const narrow = d.page('en').count
    expect(narrow).toBeGreaterThan(wide)
    d.advance()
    expect(d.visibleText('en')).toBe(paginate(WORDS, { cols: 20 })[0])
    for (let i = 0; i < 2 * narrow; i++) d.advance()
    expect(d.isOpen()).toBe(false)
  })
  it('keeps the page in range when a resize leaves fewer pages', () => {
    const d = createDialog()
    d.open(bulletSource(entry, 1))
    d.fit(20)
    for (let i = 0; i < 6; i++) d.advance()
    d.fit(200)
    expect(d.page('en')).toEqual({ index: 0, count: 1 })
    expect(d.isOpen()).toBe(true)
  })
})
