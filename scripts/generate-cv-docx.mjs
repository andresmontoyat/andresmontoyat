// Word version of the CV, built from the same data as generate-cv.mjs.
// Writes native WordprocessingML (real styles, bullets, right-aligned tab stops) and zips it with
// the system `zip`: no extra dependency. No photo, so ATS parsers read it cleanly.
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { STR, about, card, cleanHost, exp, pick, projects, skills } from './generate-cv.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const NAME = 'Carlos Andrés Montoya Tobón'
const LANGS = ['en', 'es']
const COLOR = { accent: '00708A', ink: '0B1020', text: '1A1A1A', muted: '555555', soft: '666666' }
const PAGE = { width: 11906, height: 16838, margin: 794 }
const TEXT_WIDTH = PAGE.width - 2 * PAGE.margin
const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FONT = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>'

function runProps({ bold, italic, color, size, caps, plain } = {}) {
  const props = [
    FONT,
    bold && '<w:b/>',
    plain && '<w:u w:val="none"/>',
    italic && '<w:i/>',
    caps && '<w:caps/>',
    color && `<w:color w:val="${color}"/>`,
    size && `<w:sz w:val="${size}"/>`,
  ].filter(Boolean)
  return `<w:rPr>${props.join('')}</w:rPr>`
}

const run = (text, fmt) => `<w:r>${runProps(fmt)}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
const para = (runs, props = '') => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs.join('')}</w:p>`
const spacing = (before, after) => `<w:spacing w:before="${before}" w:after="${after}"/>`

function createLinks() {
  const urls = []
  const add = (url) => `rIdLink${urls.push(url)}`
  const rels = () =>
    urls.map((u, i) => `<Relationship Id="rIdLink${i + 1}" Type="${REL}/hyperlink" Target="${xml(u)}" TargetMode="External"/>`)
  return { add, rels }
}

const hyperlink = (links, url, text, size) =>
  `<w:hyperlink r:id="${links.add(url)}">${run(text, { color: COLOR.accent, size, plain: true })}</w:hyperlink>`

function heading(text) {
  const border = `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${COLOR.accent}"/></w:pBdr>`
  return para([run(text, { bold: true, caps: true, size: 24, color: COLOR.ink })], `<w:keepNext/>${border}${spacing(280, 120)}`)
}

function contactLine(links) {
  const email = card('email')
  const gh = card('github')
  const li = card('linkedin')
  const sep = run('  ·  ', { size: 19, color: COLOR.muted })
  const parts = [
    run('Medellín, Colombia', { size: 19 }),
    hyperlink(links, email.href, email.value, 19),
    hyperlink(links, gh.href, `github.com/${gh.value}`, 19),
    hyperlink(links, li.href, `linkedin.com/in/${li.value}`, 19),
    hyperlink(links, 'https://www.andresmontoyat.dev', 'andresmontoyat.dev', 19),
  ]
  return para(parts.flatMap((p, i) => (i ? [sep, p] : [p])), spacing(60, 60))
}

function header(lang, links) {
  const s = STR[lang]
  const stack = [run(`${s.stack}   `, { bold: true, caps: true, size: 17, color: COLOR.accent }), run(exp.filter.chips.join('  ·  '), { size: 19 })]
  return [
    para([run(NAME, { bold: true, size: 44, color: COLOR.ink })]),
    para([run(s.title, { bold: true, size: 26, color: COLOR.accent })]),
    contactLine(links),
    para(stack, spacing(60, 0)),
  ].join('')
}

function summary(lang) {
  const paragraphs = about.paragraphs.slice(0, 2).map((p) => para([run(pick(p, lang))], `<w:jc w:val="both"/>${spacing(0, 120)}`))
  return heading(STR[lang].summary) + paragraphs.join('')
}

const DATE_WIDTH = 2600

function roleTitle(e, lang) {
  const mark = e.featured ? [run('▸ ', { bold: true, size: 23, color: COLOR.accent })] : []
  const title = para([...mark, run(pick(e.title, lang), { bold: true, size: 23, color: COLOR.ink })], '<w:keepNext/>')
  const date = para([run(pick(e.date, lang), { size: 19, color: COLOR.muted })], '<w:keepNext/><w:jc w:val="right"/>')
  const row = `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(TEXT_WIDTH - DATE_WIDTH, title)}${cell(DATE_WIDTH, date, 'bottom')}</w:tr>`
  return `${spacer(100)}${borderlessTable([TEXT_WIDTH - DATE_WIDTH, DATE_WIDTH], row)}`
}

const spacer = (before) => para([], `<w:keepNext/>${spacing(before, 0)}<w:rPr><w:sz w:val="4"/></w:rPr>`)

function borderlessTable(widths, rows) {
  const borders = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="nil"/>`).join('') + '</w:tblBorders>'
  const margins = '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>'
  const props = `<w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/>${borders}<w:tblLayout w:type="fixed"/>${margins}</w:tblPr>`
  const grid = `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
  return `<w:tbl>${props}${grid}${rows}</w:tbl>`
}

const bullet = (text) => para([run(text)], `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>${spacing(0, 40)}`)

function role(e, lang) {
  const company = para([run(`${e.company} · ${pick(e.location, lang)}`, { bold: true, size: 20, color: COLOR.accent })], `<w:keepNext/>${spacing(0, 60)}`)
  const tech = e.tech?.length ? para([run(e.tech.join(' · '), { italic: true, size: 18, color: COLOR.soft })], spacing(40, 0)) : ''
  return roleTitle(e, lang) + company + pick(e.bullets, lang).map(bullet).join('') + tech
}

function experience(lang) {
  const roles = exp.entries.filter((e) => e.visible !== false || e.cvOnly).map((e) => role(e, lang))
  return heading(STR[lang].experience) + roles.join('')
}

function sites(lang, links) {
  const rows = (projects.projects || [])
    .filter((p) => p.liveUrl)
    .map((p) =>
      para([run(`${pick(p.title, lang)}  `, { bold: true, color: COLOR.ink }), hyperlink(links, p.liveUrl, cleanHost(p.liveUrl)), run(` — ${pick(p.desc, lang)}`)], spacing(0, 60)),
    )
  return rows.length ? heading(STR[lang].sites) + rows.join('') : ''
}

const cell = (width, content, valign = 'top') =>
  `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="${valign}"/></w:tcPr>${content}</w:tc>`

function skillRow(c, lang) {
  const items = c.chips.flatMap((ch, i) => [
    ...(i ? [run(' · ', { color: COLOR.muted })] : []),
    run(ch.label, ch.core ? { bold: true, color: COLOR.accent } : {}),
  ])
  const label = para([run(pick(c.title, lang), { bold: true, color: COLOR.ink })], spacing(0, 60))
  return `<w:tr>${cell(2900, label)}${cell(TEXT_WIDTH - 2900, para(items, spacing(0, 60)))}</w:tr>`
}

function skillTable(lang) {
  const rows = skills.categories.map((c) => skillRow(c, lang)).join('')
  return heading(STR[lang].skills) + borderlessTable([2900, TEXT_WIDTH - 2900], rows)
}

const SECTION = `<w:sectPr><w:pgSz w:w="${PAGE.width}" w:h="${PAGE.height}"/><w:pgMar w:top="${PAGE.margin}" w:right="${PAGE.margin}" w:bottom="${PAGE.margin}" w:left="${PAGE.margin}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`

export function buildDocumentXml(lang) {
  const links = createLinks()
  const body = [header(lang, links), summary(lang), experience(lang), sites(lang, links), skillTable(lang)].join('')
  const document = `${XML_HEAD}<w:document xmlns:w="${NS_W}" xmlns:r="${NS_R}"><w:body>${body}${SECTION}</w:body></w:document>`
  return { document, linkRels: links.rels() }
}

const STYLES = `${XML_HEAD}<w:styles xmlns:w="${NS_W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:color w:val="${COLOR.text}"/><w:sz w:val="21"/><w:lang w:val="es-CO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`

const NUMBERING = `${XML_HEAD}<w:numbering xmlns:w="${NS_W}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="340" w:hanging="220"/></w:pPr><w:rPr><w:color w:val="${COLOR.accent}"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`

const CONTENT_TYPES = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`

const ROOT_RELS = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`

const documentRels = (linkRels) =>
  `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="${REL}/numbering" Target="numbering.xml"/>${linkRels.join('')}</Relationships>`

const coreProps = (lang) =>
  `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>CV ${NAME}</dc:title><dc:creator>${NAME}</dc:creator><dc:language>${lang}</dc:language></cp:coreProperties>`

function packageParts(lang) {
  const { document, linkRels } = buildDocumentXml(lang)
  return {
    '[Content_Types].xml': CONTENT_TYPES,
    '_rels/.rels': ROOT_RELS,
    'docProps/core.xml': coreProps(lang),
    'word/document.xml': document,
    'word/styles.xml': STYLES,
    'word/numbering.xml': NUMBERING,
    'word/_rels/document.xml.rels': documentRels(linkRels),
  }
}

function writeDocx(lang, out) {
  const dir = mkdtempSync(join(tmpdir(), 'cv-docx-'))
  for (const [path, content] of Object.entries(packageParts(lang))) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  rmSync(out, { force: true })
  execFileSync('zip', ['-X', '-q', '-r', out, '.'], { cwd: dir })
  rmSync(dir, { recursive: true, force: true })
}

function main() {
  const outDir = join(root, 'cv')
  mkdirSync(outDir, { recursive: true })
  for (const lang of LANGS) {
    const out = join(outDir, `CarlosMontoya_CV_${lang.toUpperCase()}.docx`)
    writeDocx(lang, out)
    console.log('wrote', out)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
