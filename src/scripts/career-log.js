// Interactive layer of the career git log (CareerLog.astro). The graph, chips and List view are
// already in the HTML; this wires the terminal. Output segments come from career-log-logic.js and
// are rendered with textContent only.
import {
  BADGES, achievements, candidates, complete, dispatch, suggest,
} from './career-log-logic.js'

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms) })
const $ = (root, sel) => root.querySelector(sel)

const h = (tag, cls, txt) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (txt != null) n.textContent = txt
  return n
}

function segment(seg) {
  if (seg.href) {
    const a = h('a', '', seg.t)
    a.href = seg.href
    if (seg.href.endsWith('.pdf')) a.download = ''
    return a
  }
  if (!seg.run && !seg.c) return document.createTextNode(seg.t)
  const n = h('span', seg.c, seg.t)
  if (!seg.run) return n
  n.dataset.run = seg.run
  n.setAttribute('role', 'button')
  n.tabIndex = 0
  return n
}

function init(root) {
  const t = JSON.parse(root.dataset.ui)
  const s = { jobs: JSON.parse(root.dataset.jobs), hist: [], last: null }
  const env = { lang: root.dataset.lang, t, now: new Date(), ...JSON.parse(root.dataset.env) }
  const el = {
    out: $(root, '.cl-out'), cmd: $(root, '.cl-in input'), ghost: $(root, '.cl-ghost'), chips: $(root, '.cl-chips'),
    term: $(root, '.cl-term'), peek: $(root, '.cl-peek'), badges: $(root, '.cl-badges'), log: $(root, '.cl-log'),
  }
  const cands = candidates(s.jobs, env.now)
  const st = { ctx: { kind: 'start' }, hi: 0, queue: Promise.resolve(), got: new Set() }

  const add = (line) => {
    const row = h('div')
    line.forEach((seg) => row.append(segment(seg)))
    el.out.append(row)
    el.out.scrollTop = el.out.scrollHeight
  }
  const typeLines = async (lines) => { for (const l of lines) { add(l); await sleep(28) } } // eslint-disable-line
  const print = (lines, typed) => {
    st.queue = st.queue.then(() => (typed && !reduce ? typeLines(lines) : lines.forEach(add)))
    return st.queue
  }
  const select = (id) => root.querySelectorAll('.cl-row').forEach((r) => r.classList.toggle('on', r.dataset.id === id))

  const ghostUpdate = () => {
    const m = complete(cands, el.cmd.value)
    const b = h('b', '', el.cmd.value)
    el.ghost.replaceChildren(...(m ? [b, m.slice(el.cmd.value.length)] : []))
  }

  const drawChips = () => {
    el.chips.replaceChildren(...suggest(st.ctx, s.jobs).map((c) => {
      const b = h('button', '', c)
      b.type = 'button'
      return b
    }))
  }

  const award = (id) => {
    if (st.got.has(id)) return
    st.got.add(id)
    const [name, desc] = t.badges[id]
    const toast = h('div', 'cl-toast')
    toast.setAttribute('role', 'status')
    const body = h('span')
    body.append(h('b', '', t.achievement), `${name} · `, h('span', 'd', desc))
    toast.append(h('span', '', '🏅'), body)
    toast.firstChild.setAttribute('aria-hidden', 'true')
    document.body.append(toast)
    setTimeout(() => toast.remove(), 3600)
    el.badges.textContent = `🏅 ${t.badgeCount.replace('{n}', st.got.size).replace('{m}', BADGES.length)}`
  }

  // The skill decks answer synchronously with how many cards they surfaced.
  const highlight = (tech) => {
    const ev = new CustomEvent('skills:highlight', { detail: { tech, hits: 0 } })
    document.dispatchEvent(ev)
    if (ev.detail.hits) print([[{ t: '→ ', c: 'm' }, { t: t.seeStack, href: '#skills' }]])
  }

  const run = (input) => {
    const line = input.trim()
    if (!line) return
    s.hist.push(line)
    st.hi = s.hist.length
    print([[{ t: '$', c: 'g' }, { t: ` ${line}` }]])
    const res = dispatch(line, s, env)
    if (res.clear) st.queue = st.queue.then(() => el.out.replaceChildren())
    else print(res.lines, res.typed)
    if ('select' in res) select(res.select)
    if (res.last) s.last = res.last
    if (res.ctx) st.ctx = res.ctx
    if (res.highlight) highlight(res.highlight)
    achievements(res.key, line, s.hist.length).forEach(award)
    st.queue = st.queue.then(drawChips)
  }

  wireInput(el, st, s, { run, ghostUpdate, cands })
  wireClicks(root, el, run)
  wirePeek(root, el, s.jobs)
  wireViews(root)
  wireList(root, t)
  wireMax(root, el.cmd)
  print([[{ t: t.welcome.split('{help}')[0], c: 'm' }, { t: 'help', run: 'help' }, { t: t.welcome.split('{help}')[1], c: 'm' }]])
  boot(el, run, ghostUpdate, st)
}

function wireInput(el, st, s, { run, ghostUpdate, cands }) {
  const { cmd } = el
  const fill = (v) => { cmd.value = v; ghostUpdate() }
  cmd.form.addEventListener('submit', (e) => { e.preventDefault(); run(cmd.value); fill('') })
  cmd.addEventListener('input', ghostUpdate)
  cmd.addEventListener('keydown', (e) => {
    const m = complete(cands, cmd.value)
    const atEnd = cmd.selectionStart === cmd.value.length
    if (m && (e.key === 'Tab' || (e.key === 'ArrowRight' && atEnd))) { e.preventDefault(); fill(m) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); st.hi = Math.max(0, st.hi - 1); fill(s.hist[st.hi] ?? '') }
    else if (e.key === 'ArrowDown') { e.preventDefault(); st.hi = Math.min(s.hist.length, st.hi + 1); fill(s.hist[st.hi] ?? '') }
    else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); run('clear') }
  })
}

function wireClicks(root, el, run) {
  const runOf = (e) => e.target.closest('[data-run]')?.dataset.run
  el.out.addEventListener('click', (e) => { const r = runOf(e); if (r) run(r) })
  el.out.addEventListener('keydown', (e) => {
    const r = runOf(e)
    if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); run(r) }
  })
  el.chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) run(b.textContent) })
  el.log.addEventListener('click', (e) => { const r = e.target.closest('.cl-row'); if (r) run(`git show ${r.dataset.id}`) })
  // Only with a mouse: on touch, focusing the input would pop the keyboard on every tap.
  const fine = matchMedia('(pointer: fine)').matches
  el.term.addEventListener('click', (e) => {
    if (fine && !e.target.closest('[data-run], button, a') && !getSelection().toString()) el.cmd.focus({ preventScroll: true })
  })
}

function wirePeek(root, el, jobs) {
  const byId = Object.fromEntries(jobs.map((j) => [j.id, j]))
  root.querySelectorAll('.cl-row').forEach((r) => {
    r.addEventListener('mouseenter', () => {
      const j = byId[r.dataset.id]
      el.peek.replaceChildren(h('b', '', j.co), h('span', 'r', j.t), h('p', '', j.m ? `★ ${j.m}` : `${j.b[0].slice(0, 110)}…`),
        h('div', 't', j.tech.slice(0, 3).join(' · ')))
      el.peek.style.top = `${Math.max(0, r.offsetTop - 6)}px`
      el.peek.classList.add('on')
    })
    r.addEventListener('mouseleave', () => el.peek.classList.remove('on'))
  })
}

// List view: filter by role and technology, jump by year (with scroll spy), and a stack chip
// filters by that tech and surfaces it in the skill decks.
function wireList(root, t) {
  const cards = [...root.querySelectorAll('.cl-job')]
  const roles = root.querySelectorAll('.cl-roles button'), input = root.querySelector('.cl-tech input')
  const count = root.querySelector('.cl-count'), reset = root.querySelector('.cl-reset'), empty = root.querySelector('.cl-empty')
  const years = [...root.querySelectorAll('.cl-years a')], box = root.querySelector('.cl-cards')
  const f = { role: 'all', tech: '' }
  let lockUntil = 0
  const matches = (c) => (f.role === 'all' || (f.role === 'lead') === (c.dataset.lead === '1'))
    && (!f.tech || c.dataset.tech.split('|').some((x) => x.includes(f.tech)))
  const apply = () => {
    let n = 0
    cards.forEach((c) => {
      const ok = matches(c); c.hidden = !ok; if (ok) n++
      c.querySelectorAll('.cl-stack button').forEach((b) => b.classList.toggle('hit', !!f.tech && b.dataset.tech.toLowerCase().includes(f.tech)))
    })
    years.forEach((a) => a.classList.toggle('off', root.querySelector(`.cl-job[data-id="${a.dataset.id}"]`)?.hidden))
    count.textContent = t.results.replace('{n}', n).replace('{m}', cards.length)
    empty.hidden = n > 0
    box.scrollTop = 0
    reset.hidden = f.role === 'all' && !f.tech
    roles.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f.role)))
  }
  roles.forEach((b) => b.addEventListener('click', () => { f.role = b.dataset.f; apply() }))
  input.addEventListener('input', () => { f.tech = input.value.trim().toLowerCase(); apply() })
  reset.addEventListener('click', () => { f.role = 'all'; f.tech = ''; input.value = ''; apply() })
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.cl-stack button'); if (!b) return
    input.value = b.dataset.tech; f.tech = b.dataset.tech.toLowerCase(); apply()
    document.dispatchEvent(new CustomEvent('skills:highlight', { detail: { tech: b.dataset.tech, hits: 0 } }))
  })
  years.forEach((a) => a.addEventListener('click', (e) => {
    const c = root.querySelector(`.cl-job[data-id="${a.dataset.id}"]`); if (!c || c.hidden) return
    e.preventDefault(); box.scrollTo({ top: c.offsetTop - 4, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    years.forEach((y) => y.classList.toggle('on', y === a)); lockUntil = performance.now() + 1500
    c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1200)
  }))
  const spy = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting || performance.now() < lockUntil) return
    years.forEach((a) => a.classList.toggle('on', a.dataset.id === e.target.dataset.id))
  }), { root: box, rootMargin: '0px 0px -70% 0px' })
  cards.forEach((c) => spy.observe(c))
  apply()
}

function wireMax(root, cmd) {
  const term = $(root, '.cl-term'), btn = $(root, '.cl-max')
  const set = (on) => {
    term.classList.toggle('max', on)
    document.documentElement.style.overflow = on ? 'hidden' : ''
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', on ? btn.dataset.restore : btn.dataset.max)
    cmd.focus({ preventScroll: true })
  }
  btn.addEventListener('click', () => set(!term.classList.contains('max')))
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && term.classList.contains('max')) set(false) })
}

function wireViews(root) {
  const btns = root.querySelectorAll('.cl-views button')
  btns.forEach((b) => b.addEventListener('click', () => {
    root.classList.toggle('is-list', b.dataset.v === 'list')
    btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
  }))
}

// The first time the terminal is on screen it types a short demo by itself; with reduced motion
// it only prints the README.
function boot(el, run, ghostUpdate, st) {
  const type = async (text) => {
    for (const ch of text) { el.cmd.value += ch; ghostUpdate(); await sleep(45) } // eslint-disable-line
    await sleep(250)
    run(el.cmd.value)
    el.cmd.value = ''
    ghostUpdate()
  }
  const start = async () => {
    if (reduce) { run('cat README.md'); return }
    await type('cat README.md')
    await st.queue
    await sleep(500)
    await type('git log --lead')
  }
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return
    io.disconnect()
    start()
  }, { threshold: 0.4 })
  io.observe(el.term)
}

const root = document.getElementById('experience')
if (root?.dataset.jobs) init(root)
