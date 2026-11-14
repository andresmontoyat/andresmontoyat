// Pure model of the career git log (CareerLog.astro): jobs, graph geometry, completion and the
// command dispatcher. Output is data — lines of segments { t, c, run, href } — so the DOM layer
// (career-log.js) renders with textContent and never builds HTML from strings.

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
export const ROW = 52
const X = [22, 50]

const pick = (field, lang) => (typeof field === 'string' ? field : field?.[lang] ?? field?.en ?? '')
const yearOf = (now) => now.getFullYear() + now.getMonth() / 12
const lc = (s) => s.toLowerCase()

export const strings = (ui, lang) => Object.fromEntries(Object.entries(ui).map(([k, v]) => [k, pick(v, lang)]))

export const parseAt = (s, now) => {
  const v = s.trim()
  if (/present/i.test(v)) return yearOf(now)
  return Number(v.split(/\s+/)[1]) + (MON[lc(v.slice(0, 3))] ?? 0) / 12
}

export const slug = (s) => lc(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*\)/, '').trim().split(/[\s-]+/)[0].replace(/[^a-z0-9]/g, '')

export const sha = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  .toString(16).slice(0, 7).padStart(7, '0')

const metric = (m, lang) => (m ? [m.value, pick(m.label, lang)].filter(Boolean).join(' ') : '')

const toJob = (e, lang, now) => {
  const [a, b] = pick(e.date, 'en').split('—')
  return {
    id: slug(e.company), sha: sha(e.company), co: e.company, t: pick(e.title, lang), d: pick(e.date, lang),
    m: metric(e.metric, lang), b: pick(e.bullets, lang), tech: e.tech,
    lead: /lead|architect/i.test(pick(e.title, 'en')), from: parseAt(a, now), to: parseAt(b, now),
  }
}

// Newest first; a job overlapping the main-line job above it moves to the side branch.
export const buildJobs = (entries, lang, now) => {
  const jobs = entries.filter((e) => e.visible !== false).map((e) => toJob(e, lang, now))
    .sort((a, b) => b.from - a.from)
  jobs.forEach((j, i) => {
    const above = jobs[i - 1]
    j.lane = above && above.lane === 0 && j.to > above.from + 0.05 ? 1 : 0
  })
  return jobs
}

const cy = (i) => i * ROW + ROW / 2

export const graph = (jobs) => ({
  height: jobs.length * ROW,
  main: { x: X[0], y1: cy(0), y2: cy(jobs.length - 1) },
  branches: jobs.map((j, i) => (j.lane ? i : -1)).filter((i) => i >= 0).map((i) => (
    `M${X[0]} ${cy(i - 1) + 10} C ${X[1]} ${cy(i - 1) + 22}, ${X[1]} ${cy(i) - 20}, ${X[1]} ${cy(i)} `
    + `L ${X[1]} ${cy(i) + 4} C ${X[1]} ${cy(i) + 22}, ${X[0]} ${cy(i + 1) - 24}, ${X[0]} ${cy(i + 1) - 6}`)),
  dots: jobs.map((j, i) => ({ cx: X[j.lane], cy: cy(i), r: j.lead ? 8 : 6, lead: j.lead })),
})

export const find = (jobs, q = '') => {
  const v = lc(q)
  return jobs.find((j) => j.id.startsWith(v) || j.sha.startsWith(v) || lc(j.co).includes(v))
}
const usesTech = (j, q) => j.tech.some((t) => lc(t).includes(lc(q)))
export const grepJobs = (jobs, q) => jobs.filter((j) => usesTech(j, q))

export const diffJobs = (a, b) => {
  const [o, n] = a.from < b.from ? [a, b] : [b, a]
  return {
    o, n,
    gained: n.tech.filter((t) => !o.tech.includes(t)),
    dropped: o.tech.filter((t) => !n.tech.includes(t)),
    kept: n.tech.filter((t) => o.tech.includes(t)),
    yrs: Math.round((n.from - o.from) * 10) / 10,
    promoted: !o.lead && n.lead,
  }
}

export const blame = (jobs, q) => {
  const hits = grepJobs(jobs, q).sort((a, b) => a.from - b.from)
  if (!hits.length) return null
  return { first: hits[0], tech: hits[0].tech.find((t) => lc(t).includes(lc(q))), hits }
}

const COMMANDS = ['help', 'git log', 'git show', 'grep', 'git checkout', 'git shortlog', 'clear', 'whoami', 'ls',
  'cat README.md', 'contact', 'sudo hire carlos', 'git diff', 'git blame', 'download cv', 'curl cv', 'history']

export const candidates = (jobs, now) => {
  const techs = [...new Set(jobs.flatMap((j) => j.tech.map(lc)))]
  const first = Math.floor(Math.min(...jobs.map((j) => j.from)))
  return [...COMMANDS, ...techs.map((t) => `git blame ${t}`), 'git log --lead',
    ...jobs.slice(1).map((j, i) => `git diff ${j.id}..${jobs[i].id}`), ...jobs.map((j) => `git show ${j.id}`),
    ...techs.map((t) => `grep ${t}`),
    ...Array.from({ length: now.getFullYear() - first + 1 }, (_, i) => `git checkout ${first + i}`)]
}

export const complete = (cands, v) => (v ? cands.find((c) => c.startsWith(lc(v)) && c !== lc(v)) : undefined)

export const dist = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

// --- output model -------------------------------------------------------------------------
const S = (t, c, run) => ({ t: String(t), c, run })
export const text = (line) => line.map((s) => s.t).join('')
// Template with {key} slots; a slot value may be a segment (keeps its link) or plain text.
const tpl = (str, vars = {}, c) => str.split(/(\{\w+\})/).filter(Boolean).map((p) => {
  const k = /^\{(\w+)\}$/.exec(p)?.[1]
  if (!k) return S(p, c)
  return typeof vars[k] === 'object' ? vars[k] : S(vars[k] ?? '', c)
})
const fmt = (str, vars) => text(tpl(str, vars))
const show = (j) => `git show ${j.id}`
const grepCmd = (t) => `grep ${lc(t)}`
const prefix = (j) => (j.lead ? S('lead:', 'r') : S('feat:', 'g'))

const logLine = (j) => [S(j.sha, 'y', show(j)), S(' '), prefix(j), S(' '), S(j.co, '', show(j)), S(` (${j.d})`, 'm')]

function cmdHelp(_, s, { t }) {
  const gap = (c, a) => ' '.repeat(Math.max(1, 22 - c.length - (a ? a.length + 1 : 0)))
  return {
    lines: [[S(t.helpTitle, 'm')],
      ...t.help.map(([c, a, d]) => [S('  '), S(c, 'c'), S(a ? ` ${a}` : '', 'y'), S(gap(c, a)), S(d)]),
      [S('  '), ...['whoami', 'ls', 'cat README.md', 'contact', 'history', 'clear'].flatMap((c, i) => [S(i ? ' · ' : ''), S(c, 'c')])],
      [S(`  ${t.helpTip}`, 'm')]],
  }
}

function cmdLog(arg, s) {
  const list = arg === '--lead' ? s.jobs.filter((j) => j.lead) : s.jobs
  return { lines: list.map(logLine), typed: true, select: null }
}

function cmdShow(q, s, { t }) {
  const j = find(s.jobs, q)
  if (!j) return { lines: [[S(fmt(t.notFound, { q }), 'r')]] }
  return {
    select: j.id, last: j, ctx: { kind: 'show', j }, typed: true,
    lines: [[S(`commit ${j.sha}${s.jobs[0] === j ? ' (HEAD → main)' : ''}`, 'y')],
      [S('Author: Carlos Andrés Montoya')], [S(`Date:   ${j.d}`)], [],
      [S(`    ${j.lead ? 'lead' : 'feat'}: ${j.t} @ ${j.co}`, 'b')],
      ...(j.m ? [[], [S(`    ★ ${j.m}`, 'c')]] : []), [],
      ...j.b.slice(0, 3).map((x) => [S('    '), S('+', 'g'), S(` ${x}`)]), [],
      [S('    '), S('stack:', 'm'), S(' '), ...j.tech.flatMap((x, i) => [S(i ? ', ' : ''), S(x, '', grepCmd(x))])]],
  }
}

function cmdGrep(q, s, { t }) {
  if (!q) return { lines: [[S(t.grepUsage, 'r')]] }
  const hits = grepJobs(s.jobs, q)
  const base = { ctx: { kind: 'grep', q, hits }, highlight: lc(q) }
  if (!hits.length) return { ...base, lines: [[S(fmt(t.grepNone, { q }), 'm')]] }
  const y = Math.round(Math.max(...hits.map((j) => j.to)) - Math.min(...hits.map((j) => j.from)))
  return {
    ...base,
    lines: [...hits.map((j) => [S(j.sha, 'y', show(j)), S(' '), S(j.co, '', show(j)),
      S(` · ${j.tech.filter((x) => lc(x).includes(lc(q))).join(', ')}`, 'm')]),
    [S(fmt(t.grepSum, { n: hits.length, y }), 'c')]],
  }
}

function cmdCheckout(q, s, e) {
  const y = Number(q)
  if (!y) return { lines: [[S(e.t.checkoutUsage, 'r')]] }
  const j = s.jobs.find((x) => y >= Math.floor(x.from) && y <= Math.floor(x.to))
  if (!j) return { lines: [[S(fmt(e.t.checkoutNone, { y }), 'm')]] }
  const r = cmdShow(j.id, s, e)
  return { ...r, lines: [[S(`HEAD detached at ${y}`, 'm')], ...r.lines] }
}

function cmdShortlog(_, s, { t, now }) {
  const { jobs } = s
  const oldest = jobs.at(-1)
  return {
    lines: [[S(`Carlos Andrés Montoya (${jobs.length} commits)`, 'b')],
      [S(`    ${fmt(t.shortlog, {
        lead: jobs.filter((j) => j.lead).length,
        y: Math.floor(yearOf(now) - Math.min(...jobs.map((j) => j.from))),
        n: new Set(jobs.flatMap((j) => j.tech)).size,
      })}`)],
      [S(`    ${fmt(t.firstCommit, { co: oldest.co, y: Math.floor(oldest.from) })}`)]],
  }
}

function cmdDiff(q, s, { t }) {
  const [a, b] = (q || '').split(/\.\.|\s+/).filter(Boolean).map((x) => find(s.jobs, x))
  const newer = b || s.last || s.jobs[0]
  const older = a && b ? a : a || s.jobs[s.jobs.indexOf(newer) + 1]
  if (!older || !newer || older === newer) return { lines: [[S(t.diffUsage, 'r')]] }
  const d = diffJobs(older, newer)
  const { o, n } = d
  return {
    typed: true, select: n.id, last: n, ctx: { kind: 'diff', o, n },
    lines: [[S(`diff --career a/${o.id} b/${n.id}`, 'b')], [S(`--- a/${o.co} (${o.d})`, 'm')],
      [S(`+++ b/${n.co} (${n.d})`, 'm')], [S(t.role, 'y')], [S(`- ${o.t}`, 'r')],
      [S(`+ ${n.t}`, 'g'), ...(d.promoted ? [S('  '), S(t.promoted, 'c')] : [])], [S('@@ stack @@', 'y')],
      ...(d.gained.length ? d.gained.map((x) => [S('+ ', 'g'), S(x, 'g', grepCmd(x))]) : [[S(t.noNew, 'm')]]),
      ...d.dropped.map((x) => [S(`- ${x}`, 'r')]),
      ...(d.kept.length ? [[S(fmt(t.kept, { list: d.kept.join(', ') }), 'm')]] : []),
      [S(fmt(t.diffSum, { y: d.yrs, n: d.gained.length }), 'c')]],
  }
}

function cmdBlame(q, s, { t }) {
  if (!q) return { lines: [[S(t.blameUsage, 'r')]] }
  const r = blame(s.jobs, q)
  if (!r) return { lines: [[S(fmt(t.blameNone, { q }), 'm')]] }
  const { first, hits } = r
  return {
    highlight: lc(q), ctx: { kind: 'grep', q, hits: [...hits].reverse() },
    lines: [[S(first.sha, 'y', show(first)), S(` (${first.co} ${Math.floor(first.from)}) `), S(r.tech, 'g'), S('  '),
      S(t.blameFirst, 'm')],
    [S(fmt(t.blameUsed, { n: hits.length, jobs: hits.length === 1 ? t.job : t.jobs, co: hits.at(-1).co }), 'm')]],
  }
}

function cmdCv(_, s, { t, lang }) {
  const L = lang === 'en' ? 'EN' : 'ES'
  return {
    typed: true, ctx: { kind: 'cv' },
    lines: [[S('  % Total    % Received   Time', 'm')], [S(`  100  ████████████████████  CarlosMontoya_CV_${L}.pdf`, 'g')],
      [S(t.cvDone, 'c'), S(' '), { t: fmt(t.cvLink, { L }), href: `/CarlosMontoya_CV_${L}.pdf` }]],
  }
}

const HANDLERS = {
  help: cmdHelp,
  'git log': cmdLog,
  'git show': cmdShow,
  grep: cmdGrep,
  'git checkout': cmdCheckout,
  'git shortlog': cmdShortlog,
  'git diff': cmdDiff,
  'git blame': cmdBlame,
  'download cv': cmdCv,
  'curl cv': cmdCv,
  clear: () => ({ lines: [], clear: true }),
  whoami: () => ({ lines: [[S('Carlos Andrés Montoya Tobón · Java Solution Architect & Tech Lead · Medellín, Colombia')]] }),
  ls: (_, s) => ({ lines: [s.jobs.flatMap((j, i) => [S(i ? '  ' : ''), S(`${j.id}/`, '', show(j))])] }),
  'cat README.md': (_, s, { t }) => ({
    typed: true,
    lines: [[S('# Carlos Andrés Montoya', 'b')], [S(t.readme[0])], [S(t.readme[1])],
      tpl(t.readme[2], { a: S('git shortlog', '', 'git shortlog'), b: S('grep kubernetes', '', 'grep kubernetes') })],
  }),
  contact: (_, s, { contact: c }) => ({
    lines: [[S('email:', 'c'), S(` ${c.email}`)], [S('linkedin:', 'c'), S(` ${c.linkedin}`)], [S('github:', 'c'), S(` ${c.github}`)]],
  }),
  'sudo hire carlos': (_, s, { t }) => ({
    typed: true,
    lines: [[S(t.sudo, 'g')], [S(t.granted, 'c'), S(' '), ...tpl(t.writeMe, { c: S('contact', '', 'contact') })]],
  }),
  history: (_, s, { t }) => ({
    lines: s.hist.length ? s.hist.map((h, i) => [S(`  ${String(i + 1).padStart(3)}  `), S(h, '', h)]) : [[S(t.empty, 'm')]],
  }),
}
const KEYS = Object.keys(HANDLERS).sort((a, b) => b.length - a.length)
const KEEPS_CTX = ['git show', 'git diff', 'grep', 'git blame', 'download cv', 'curl cv', 'git checkout']

function unknown(line, t) {
  const [near, d] = Object.keys(HANDLERS).map((k) => [k, dist(line.slice(0, k.length), k)]).sort((a, b) => a[1] - b[1])[0]
  const tail = d <= 3 ? tpl(t.didYouMean, { s: S(near, '', near) }) : tpl(t.typeHelp, { s: S('help', '', 'help') })
  return { key: null, lines: [[S(fmt(t.unknown, { c: line.split(' ')[0] }), 'r'), S(' '), ...tail]] }
}

// s = { jobs, hist, last }; e = { lang, t, now, contact }. Returns what to print and what changed.
export function dispatch(input, s, e) {
  const line = input.trim()
  const key = KEYS.find((k) => line === k || line.startsWith(`${k} `))
  if (!key) return unknown(line, e.t)
  const res = HANDLERS[key](line.slice(key.length).trim(), s, e)
  return { key, ...(KEEPS_CTX.includes(key) ? {} : { ctx: { kind: 'start' } }), ...res }
}

// Chips that follow what was just done, so the terminal is usable on a phone without typing.
export function suggest(ctx, jobs) {
  const at = (j, d) => jobs[jobs.indexOf(j) + d]
  const mid = jobs[Math.min(3, jobs.length - 1)]
  let list
  if (ctx.kind === 'show') {
    const older = at(ctx.j, 1)
    const newer = at(ctx.j, -1)
    list = [older && `git diff ${older.id}..${ctx.j.id}`, grepCmd(ctx.j.tech[2] ?? ctx.j.tech[0]),
      older && show(older), newer && show(newer)]
  } else if (ctx.kind === 'diff') list = [show(ctx.n), show(ctx.o), `git diff ${jobs.at(-1).id}..${jobs[0].id}`]
  else if (ctx.kind === 'grep') {
    const h = ctx.hits
    list = [h[0] && show(h.at(-1)), h.length > 1 && `git diff ${h.at(-1).id}..${h[0].id}`, 'grep kubernetes', 'grep keycloak']
  } else if (ctx.kind === 'cv') list = ['contact', 'git shortlog']
  else list = ['git log --lead', `git diff ${mid.id}..${jobs[0].id}`, 'grep kafka', 'git checkout 2014', 'git shortlog']
  return [...list.filter(Boolean), 'download cv'].filter((x, i, a) => a.indexOf(x) === i).slice(0, 6)
}

export const BADGES = ['curious', 'archaeologist', 'recruiter', 'diff', 'blame']

export function achievements(key, line, count) {
  return [
    count >= 5 && 'curious',
    key === 'sudo hire carlos' && 'recruiter',
    key === 'git diff' && 'diff',
    key === 'git blame' && 'blame',
    ((key === 'git show' && /castor/i.test(line)) || (key === 'git checkout' && /2007|2008/.test(line))) && 'archaeologist',
  ].filter(Boolean)
}
