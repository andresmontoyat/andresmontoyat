import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, 'src/data', p), 'utf8'))
const exp = read('experience.json')
const skills = read('skills.json')
const about = read('about.json')
const contact = read('contact.json')
const projects = read('projects.json')

const pick = (f, lang) => (typeof f === 'string' ? f : f?.[lang] ?? f?.en ?? '')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const card = (id) => contact.cards.find((c) => c.id === id)

const photoUri = `data:image/webp;base64,${readFileSync(join(root, 'public/me-400.webp')).toString('base64')}`

const STR = {
  en: {
    title: 'Java Solution Architect & Tech Lead',
    stack: 'Core stack',
    summary: 'Professional Summary',
    experience: 'Experience',
    skills: 'Technical Skills',
    sites: 'Live Sites',
  },
  es: {
    title: 'Arquitecto de Soluciones Java y Tech Lead',
    stack: 'Stack principal',
    summary: 'Perfil Profesional',
    experience: 'Experiencia',
    skills: 'Habilidades Técnicas',
    sites: 'Sitios en Vivo',
  },
}

const cleanHost = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '')

export function buildHtml(lang) {
  const s = STR[lang]
  const emailCard = card('email')
  const gh = card('github')
  const li = card('linkedin')
  const loc = 'Medellín, Colombia'
  const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`
  const summary = about.paragraphs.slice(0, 2).map((p) => esc(pick(p, lang))).join(' ')
  const highlights = exp.filter.chips.map(esc).join(' &nbsp;·&nbsp; ')

  const roles = exp.entries
    .filter((e) => e.visible !== false || e.cvOnly)
    .map((e) => {
      const bullets = pick(e.bullets, lang).map((b) => `<li>${esc(b)}</li>`).join('')
      const tech = (e.tech || []).map(esc).join(' · ')
      const mark = e.featured ? '<span class="mark">▸</span>' : ''
      return `<div class="role${e.featured ? ' role--featured' : ''}">
        <div class="role-head">
          <span class="role-title">${mark}${esc(pick(e.title, lang))}</span>
          <span class="role-date">${esc(pick(e.date, lang))}</span>
        </div>
        <div class="role-sub">${esc(e.company)} · ${esc(pick(e.location, lang))}</div>
        <ul>${bullets}</ul>
        ${tech ? `<div class="tech">${tech}</div>` : ''}
      </div>`
    })
    .join('')

  const siteRows = (projects.projects || [])
    .filter((p) => p.liveUrl)
    .map((p) => {
      const host = cleanHost(p.liveUrl)
      return `<div class="site-row"><span class="site-name">${esc(pick(p.title, lang))}</span> ${link(p.liveUrl, host)} <span class="site-desc">— ${esc(pick(p.desc, lang))}</span></div>`
    })
    .join('')

  const skillBlocks = skills.categories
    .map((c) => {
      const items = c.chips
        .map((ch) => (ch.core ? `<strong>${esc(ch.label)}</strong>` : esc(ch.label)))
        .join(' · ')
      return `<div class="skill-row"><span class="skill-cat">${esc(pick(c.title, lang))}</span><span class="skill-items">${items}</span></div>`
    })
    .join('')

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 10.5px; line-height: 1.42; margin: 0; }
    .head { border-bottom: 2.5px solid #00708a; padding-bottom: 8px; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 16px; }
    .head-text { flex: 1; }
    .photo { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; object-position: center 25%; border: 2px solid #00708a; flex-shrink: 0; }
    h1 { font-size: 23px; margin: 0 0 1px; letter-spacing: .2px; color: #0b1020; }
    .subtitle { font-size: 12px; color: #00708a; font-weight: bold; margin-bottom: 6px; }
    .contact { font-size: 9.5px; color: #333; }
    .contact a { color: #333; text-decoration: none; }
    .stack { font-size: 9.5px; color: #333; margin: 8px 0 2px; }
    .stack .lbl { font-weight: bold; text-transform: uppercase; letter-spacing: .6px; color: #00708a; font-size: 8.5px; margin-right: 6px; }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #00708a; padding-bottom: 3px; margin: 15px 0 8px; color: #0b1020; }
    .summary { text-align: justify; margin-bottom: 4px; }
    .role { margin-bottom: 11px; page-break-inside: avoid; }
    .role--featured { border-left: 2px solid #00708a; padding-left: 9px; margin-left: -11px; }
    .role-head { display: flex; justify-content: space-between; align-items: baseline; }
    .role-title { font-weight: bold; font-size: 11.5px; color: #0b1020; }
    .role-title .mark { color: #00708a; margin-right: 4px; }
    .role-date { font-size: 9.5px; color: #555; white-space: nowrap; padding-left: 10px; }
    .role-sub { font-size: 10px; color: #00708a; font-weight: bold; margin: 1px 0 3px; }
    ul { margin: 3px 0 4px; padding-left: 16px; }
    li { margin-bottom: 2px; }
    .tech { font-size: 9px; color: #666; font-style: italic; }
    .skill-row { margin-bottom: 4px; display: flex; }
    .skill-cat { font-weight: bold; min-width: 150px; color: #0b1020; }
    .skill-items { color: #333; }
    .skill-items strong { color: #00708a; }
    .site-row { margin-bottom: 3px; }
    .site-name { font-weight: bold; color: #0b1020; }
    .site-row a { color: #00708a; text-decoration: none; font-weight: bold; }
    .site-desc { color: #333; }
  </style></head><body>
    <div class="head">
      <div class="head-text">
        <h1>Carlos Andrés Montoya Tobón</h1>
        <div class="subtitle">${s.title}</div>
        <div class="contact">${esc(loc)} &nbsp;·&nbsp; ${link(emailCard.href, emailCard.value)} &nbsp;·&nbsp; ${link(gh.href, `github.com/${gh.value}`)} &nbsp;·&nbsp; ${link(li.href, `linkedin.com/in/${li.value}`)} &nbsp;·&nbsp; ${link('https://www.andresmontoyat.dev', 'andresmontoyat.dev')}</div>
      </div>
      <img class="photo" src="${photoUri}" alt="" />
    </div>
    <div class="stack"><span class="lbl">${s.stack}</span>${highlights}</div>
    <h2>${s.summary}</h2>
    <div class="summary">${summary}</div>
    <h2>${s.experience}</h2>
    ${roles}
    ${siteRows ? `<h2>${s.sites}</h2>${siteRows}` : ''}
    <h2>${s.skills}</h2>
    ${skillBlocks}
  </body></html>`
}

async function run() {
  const browser = await chromium.launch()
  mkdirSync(join(root, 'public'), { recursive: true })
  for (const lang of ['en', 'es']) {
    const page = await browser.newPage()
    await page.setContent(buildHtml(lang), { waitUntil: 'networkidle' })
    const out = join(root, 'public', `CarlosMontoya_CV_${lang.toUpperCase()}.pdf`)
    await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '12mm', left: '14mm', right: '14mm' } })
    console.log('wrote', out)
    await page.close()
  }
  await browser.close()
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await run()
}
