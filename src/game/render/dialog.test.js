import { describe, it, expect } from 'vitest'
import { dialogLines, createDialog, paginate, siteSource, bulletSource } from './dialog.js'

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
