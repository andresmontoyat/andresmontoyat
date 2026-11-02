// The dialog's own font: the renderer sets it before drawing (it would otherwise inherit whatever
// was drawn last) and measures with it to know how many columns fit.
export const DIALOG_FONT = '11px monospace'
// The box runs 20px in from each edge and its text 20px further in: 40px of margin a side.
export const DIALOG_TEXT_X = 40
const DEFAULT_COLS = 46

// How many glyphs of the dialog font fit on a line of a viewport this wide. Until a glyph has been
// measured (no canvas yet) the dialog keeps the width it was designed at.
export function colsFor(viewW, charW) {
  if (!(charW > 0)) return DEFAULT_COLS
  return Math.max(1, Math.floor((viewW - 2 * DIALOG_TEXT_X) / charW))
}

export function dialogLines(site, lang) {
  const L = [`${site.title[lang]}  ·  ${site.co}`, site.date[lang]]
  if (site.metric) L.push(`★ ${site.metric.value ? `${site.metric.value}  ` : ''}${site.metric.label[lang]}`)
  L.push(`‹tech› ${site.tech.slice(0, 5).join(' · ')}`)
  return L
}

function splitLong(word, cols) {
  const parts = []
  for (let i = 0; i < word.length; i += cols) parts.push(word.slice(i, i + cols))
  return parts
}

function wrap(text, cols) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length <= cols) { line += ` ${word}`; continue }
    if (line) lines.push(line)
    const parts = splitLong(word, cols)
    lines.push(...parts.slice(0, -1))
    line = parts[parts.length - 1]
  }
  if (line) lines.push(line)
  return lines
}

export function paginate(text, { cols = DEFAULT_COLS, rows = 4 } = {}) {
  const lines = wrap(text, cols)
  const pages = []
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows).join('\n'))
  return pages.length ? pages : ['']
}

// A source turns its text into pages for a language and a line width (cols, from the renderer).
// The card is today's card and keeps its lines; a bullet wraps to whatever width the box has.
export const siteSource = site => ({ pages: lang => [dialogLines(site, lang).join('\n')] })

export const bulletSource = (entry, n) => ({ pages: (lang, cols) => paginate(entry.bullets[lang][n - 1], { cols }) })

export function createDialog() {
  let state = 'closed'
  let source = null
  let index = 0
  let typed = 0
  let cols
  // Clamped per language so switching to a shorter one never shows an empty page.
  const pageIn = lang => {
    const pages = source.pages(lang, cols)
    return { index: Math.min(index, pages.length - 1), count: pages.length }
  }
  const textOf = lang => source.pages(lang, cols)[pageIn(lang).index]
  const full = () => Math.max(textOf('en').length, textOf('es').length)
  const lastIndex = () => Math.max(pageIn('en').count, pageIn('es').count) - 1
  const nextPage = () => { index += 1; typed = 0; state = 'typing' }
  return {
    get state() { return state },
    open(s) { source = s.pages ? s : siteSource(s); index = 0; typed = 0; state = 'typing' },
    tick(dtChars = 1.6) {
      if (state !== 'typing') return
      typed += dtChars
      if (typed >= full()) { typed = full(); state = 'waiting' }
    },
    advance() {
      if (state === 'typing') { typed = full(); state = 'waiting' }
      else if (state !== 'waiting') return
      else if (index < lastIndex()) nextPage()
      else { state = 'closed'; source = null }
    },
    // The renderer reports the columns the box has every frame; a resize or a rotation re-pages
    // the text, and the page index clamps like a language switch does.
    fit(n) { cols = n },
    visibleText(lang) { return textOf(lang).slice(0, Math.floor(typed)) },
    page(lang) { return pageIn(lang) },
    isOpen() { return state !== 'closed' },
  }
}
