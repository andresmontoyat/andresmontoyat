// Interactive layer of the Technical stack decks (Skill.astro). The cards are already in the HTML;
// this wires fling / flip / fan / shuffle / open-all and the hand. Strings and combos come from
// data-attributes so each locale ships only its own copy.
import {
  TIER_STARS, addCard, fanHalfAngle, fanPose, fmt, matchesTech, openPose, readCombo, stackPose, tier,
} from './skill-deck-logic.js'

const root = document.getElementById('skills')
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
// Below this width the hand is hidden (Skill.astro): a tap flips the card instead of adding it.
const small = matchMedia('(max-width: 720px)')


// The legendary border spins forever; off screen it would keep repainting for nobody.
function pauseOffscreen(section) {
  if (!('IntersectionObserver' in window)) return
  new IntersectionObserver(([en]) => section.classList.toggle('sd-away', !en.isIntersecting)).observe(section)
}

function init(section) {
  const t = JSON.parse(section.dataset.ui)
  const combos = JSON.parse(section.dataset.combos)
  const table = section.querySelector('.sd-table')
  const zone = section.querySelector('.sd-zone')
  const comboEl = section.querySelector('.sd-combo')
  const openBtn = section.querySelector('.sd-openall')
  const hint = section.querySelector('.sd-openhint')
  const state = { hand: [], moved: false }
  const ctx = { t, table, zone, state, isOpen: () => table.classList.contains('open') }
  ctx.add = (card) => { state.hand = addCard(state.hand, card); drawHand(ctx, comboEl, combos) }
  const decks = [...table.querySelectorAll('.sd-deck')].map((el, n) => deck(el, n, ctx))
  openBtn.addEventListener('click', () => toggleOpen(ctx, openBtn, hint, decks))
  document.addEventListener('click', (e) => decks.forEach((d) => d.closeFanOutside(e.target)))
  drawHand(ctx, comboEl, combos)
  pauseOffscreen(section)
  // The career log's grep / blame: surface the matching cards and report how many were found.
  document.addEventListener('skills:highlight', (e) => {
    e.detail.hits += decks.reduce((n, d) => n + d.highlight(e.detail.tech), 0)
  })
}

function toggleOpen(ctx, btn, hint, decks) {
  const on = !ctx.isOpen()
  ctx.table.classList.toggle('open', on)
  btn.setAttribute('aria-pressed', String(on))
  btn.textContent = on ? ctx.t.closeAll : ctx.t.openAll
  const openHint = small.matches ? ctx.t.openHintTouch : ctx.t.openHint
  hint.textContent = on ? openHint : ''
  decks.forEach((d) => d.relayout())
}

const pose = (sl, p) => {
  sl.style.setProperty('--tx', `${p.tx}px`)
  sl.style.setProperty('--ty', `${p.ty}px`)
  sl.style.setProperty('--r', `${p.r}deg`)
  sl.style.zIndex = String(p.z ?? sl.style.zIndex)
  sl.style.opacity = p.hidden ? '0' : '1'
  sl.classList.toggle('gone', !!p.hidden)
}

// Coalesces pointer events to one write per frame: pointermove can fire 2-4x per frame on touch.
const perFrame = (fn) => {
  let id = 0
  let last = null
  const run = (e) => {
    last = e
    if (!id) id = requestAnimationFrame(() => { id = 0; fn(last) })
  }
  run.cancel = () => { cancelAnimationFrame(id); id = 0 }
  return run
}

const cardOf = (sl, el) => ({
  name: sl.dataset.name, years: Number(sl.dataset.years), cat: el.dataset.cat, catName: el.dataset.name,
})

// Mouse only: on touch the finger hides the effect and the tilt would fight the drag.
function tilt(sl) {
  const card = sl.firstElementChild
  let r = null
  sl.addEventListener('pointerenter', (e) => { r = e.pointerType === 'mouse' ? sl.getBoundingClientRect() : null })
  sl.addEventListener('pointermove', perFrame((e) => {
    if (!r || reduce || sl.classList.contains('held') || sl.classList.contains('flipped')) return
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    sl.classList.add('lift')
    card.style.setProperty('--ry', `${(px - 0.5) * 24}deg`)
    card.style.setProperty('--rx', `${(0.5 - py) * 20}deg`)
    card.style.setProperty('--mx', `${px * 100}%`)
    card.style.setProperty('--my', `${py * 100}%`)
    card.style.setProperty('--o', '1')
  }))
  sl.addEventListener('pointerleave', () => {
    r = null
    sl.classList.remove('lift')
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
    card.style.setProperty('--o', '0')
  })
}

function fanRadius(pile, total) {
  const r = pile.getBoundingClientRect()
  const a = (fanHalfAngle(total) * Math.PI) / 180
  // half the horizontal extent of the outermost (rotated) card
  const reach = (r.width / 2) * Math.cos(a) + (r.height / 2) * Math.sin(a)
  const room = Math.min(r.left + r.width / 2, innerWidth - r.left - r.width / 2) - reach - 8
  return Math.max(110, Math.min(360, room / Math.sin(a)))
}

function deck(el, n, ctx) {
  const pile = el.querySelector('.sd-pile')
  const count = el.querySelector('.sd-count')
  const fanBtn = el.querySelector('[data-a="fan"]')
  const slots = [...pile.querySelectorAll('.sd-slot')]
  const total = slots.length
  const s = { order: [...slots], spread: false, at: 0 }
  slots.forEach(tilt)

  const layout = () => {
    const open = ctx.isOpen()
    const radius = s.spread ? fanRadius(pile, total) : 0
    s.order.forEach((sl, i) => {
      sl.classList.toggle('is-top', i === 0 && !s.spread && !open)
      sl.firstElementChild.tabIndex = open || s.spread ? 0 : -1
      if (open) return pose(sl, openPose(i))
      if (s.spread) return pose(sl, fanPose(i, total, radius))
      const p = stackPose(i)
      sl.style.setProperty('--fx', `${p.fx}px`)
      sl.style.setProperty('--fr', `${p.fr}deg`)
      return pose(sl, p)
    })
    count.textContent = `${s.at + 1}/${total}`
  }
  const unflip = () => slots.forEach((sl) => sl.classList.remove('flipped'))
  const setFan = (on) => {
    s.spread = on
    el.classList.toggle('spread', on)
    fanBtn.setAttribute('aria-pressed', String(on))
    unflip()
    layout()
  }
  const toBottom = () => { s.order.push(s.order.shift()); s.at = (s.at + 1) % total; layout() }
  const toTop = () => { s.order.unshift(s.order.pop()); s.at = (s.at - 1 + total) % total; layout() }
  const raise = (sl) => {
    const i = s.order.indexOf(sl)
    s.order = [...s.order.slice(i), ...s.order.slice(0, i)]
    s.at = (s.at + i) % total
    setFan(false)
  }
  const bring = (sl) => { raise(sl); el.focus() }
  const pulse = (sl) => {
    sl.classList.remove('sd-hit')
    void sl.offsetWidth
    sl.classList.add('sd-hit')
    setTimeout(() => sl.classList.remove('sd-hit'), 3200)
  }
  const highlight = (q) => {
    const hits = slots.filter((sl) => matchesTech(sl.dataset.name, q))
    if (!hits.length) return 0
    unflip()
    if (!ctx.isOpen()) raise(hits[0])
    hits.forEach(pulse)
    return hits.length
  }
  const shuffle = () => {
    if (!reduce) slots.forEach((sl, i) => pose(sl, { tx: (i % 2 ? 1 : -1) * 70, ty: 10, r: (i % 2 ? 1 : -1) * 10 }))
    setTimeout(() => { s.order.sort(() => Math.random() - 0.5); s.at = 0; layout() }, reduce ? 0 : 260)
  }
  // The card leaves along its throw vector with a spin, then slides under the pile.
  const fling = (sl, vx, vy) => {
    const m = Math.hypot(vx, vy) || 1
    sl.classList.add('flying')
    pose(sl, { tx: (vx / m) * 260, ty: (vy / m) * 120, r: (vx >= 0 ? 1 : -1) * 28, hidden: true })
    setTimeout(() => { sl.classList.remove('flying', 'flipped'); toBottom() }, reduce ? 0 : 330)
  }
  const flipTop = () => s.order[0].classList.toggle('flipped')
  const act = (a) => {
    if (s.spread && a !== 'fan') setFan(false)
    if (a === 'next') fling(s.order[0], 1, 0)
    if (a === 'prev') toTop()
    if (a === 'fan') setFan(!s.spread)
    if (a === 'shuffle') shuffle()
  }

  el.querySelector('.sd-bar').addEventListener('click', (e) => {
    const a = e.target.closest('button')?.dataset.a
    if (a) act(a)
  })
  pile.addEventListener('pointerdown', (e) => drag(e, { el, s, ctx, layout, fling }))
  pile.addEventListener('click', (e) => {
    const sl = e.target.closest('.sd-slot')
    if (!sl) return
    if (ctx.isOpen() && small.matches) sl.classList.toggle('flipped')
    else if (ctx.isOpen()) ctx.add(cardOf(sl, el))
    else if (s.spread) bring(sl)
    else if (!ctx.state.moved && sl === s.order[0]) flipTop()
  })
  el.addEventListener('keydown', (e) => {
    if (e.target !== el) return
    const k = e.key.toLowerCase()
    if (e.key === 'ArrowRight') act('next')
    else if (e.key === 'ArrowLeft') act('prev')
    else if (e.key === 'Enter' || e.key === ' ') flipTop()
    else if (k === 'a') act('fan')
    else if (k === 'b') act('shuffle')
    else if (e.key === 'Escape' && s.spread) setFan(false)
    else return
    e.preventDefault()
    el.classList.remove('sd-nudge')
  })
  pile.addEventListener('keydown', (e) => { if (e.key === 'Escape' && s.spread) { setFan(false); el.focus() } })
  if (n === 0 && !reduce) el.classList.add('sd-nudge')
  layout()
  return {
    relayout: () => { if (s.spread) setFan(false); unflip(); layout() },
    closeFanOutside: (target) => { if (s.spread && !el.contains(target)) setFan(false) },
    highlight,
  }
}

const inside = (r, x, y) => r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

function drag(e, { el, s, ctx, layout, fling }) {
  if (s.spread || ctx.isOpen()) return
  const top = s.order[0]
  if (!top.contains(e.target)) return
  el.classList.remove('sd-nudge')
  const g = { sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, lx: e.clientX, ly: e.clientY, vx: 0, vy: 0, lt: performance.now() }
  ctx.state.moved = false
  const zr = ctx.zone.getBoundingClientRect()
  top.setPointerCapture(e.pointerId)
  top.classList.add('held')
  const paint = perFrame(() => {
    pose(top, { tx: g.dx, ty: g.dy, r: g.dx / 10 + g.vx * 8 })
    ctx.zone.classList.toggle('over', inside(zr, g.lx, g.ly))
  })
  const move = (ev) => {
    const now = performance.now()
    const dt = Math.max(1, now - g.lt)
    Object.assign(g, { vx: (ev.clientX - g.lx) / dt, vy: (ev.clientY - g.ly) / dt, lx: ev.clientX, ly: ev.clientY, lt: now })
    Object.assign(g, { dx: ev.clientX - g.sx, dy: ev.clientY - g.sy })
    if (Math.hypot(g.dx, g.dy) > 6) ctx.state.moved = true
    paint()
  }
  const up = () => {
    top.removeEventListener('pointermove', move)
    top.removeEventListener('pointerup', up)
    top.removeEventListener('pointercancel', up)
    paint.cancel()
    top.classList.remove('held')
    ctx.zone.classList.remove('over')
    if (ctx.state.moved && inside(zr, g.lx, g.ly)) { ctx.add(cardOf(top, el)); layout() }
    else if (Math.hypot(g.dx, g.dy) > 80 || Math.hypot(g.vx, g.vy) > 0.6) fling(top, g.dx || g.vx, g.dy || g.vy)
    else layout()
    setTimeout(() => { ctx.state.moved = false }, 0)
  }
  top.addEventListener('pointermove', move)
  top.addEventListener('pointerup', up)
  top.addEventListener('pointercancel', up)
}

const h = (tag, cls, text) => {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (text != null) n.textContent = text
  return n
}

const yrs = (t, n) => `${n} ${n === 1 ? t.year : t.years}`

function drawSpots(ctx) {
  ctx.zone.querySelectorAll('.sd-spot').forEach((sp, i) => {
    const c = ctx.state.hand[i]
    sp.className = `sd-spot${c ? ' full' : ''}`
    sp.replaceChildren()
    if (!c) { sp.textContent = i === 0 ? ctx.t.dropHere : String(i + 1); return }
    sp.style.setProperty('--c', `var(--c-${c.cat})`)
    const box = h('div')
    box.append(h('b', '', c.name), h('span', '', `${yrs(ctx.t, c.years)} · ${TIER_STARS[tier(c.years)]}`))
    sp.append(box)
  })
}

function drawHand(ctx, comboEl, combos) {
  const { t, state } = ctx
  drawSpots(ctx)
  if (!state.hand.length) {
    comboEl.replaceChildren(h('span', 'k', t.hand), h('span', 'v', t.handEmpty), h('span', 'm', t.handSub))
    return
  }
  const r = readCombo(state.hand, combos, t)
  const pow = h('span', 'sd-pow')
  pow.setAttribute('role', 'img')
  pow.setAttribute('aria-label', fmt(t.potentialOf, { n: r.power }))
  for (let k = 0; k < 5; k += 1) pow.append(h('i', k < r.power ? 'on' : ''))
  pow.append(h('em', '', t.potential))
  const list = h('ul', 'sd-can')
  r.builds.forEach((b) => list.append(h('li', '', b)))
  const clear = h('button', '', t.clear)
  clear.type = 'button'
  clear.addEventListener('click', () => {
    state.hand = []
    drawHand(ctx, comboEl, combos)
    ctx.table.querySelector('.sd-deck')?.focus()
  })
  comboEl.replaceChildren(h('span', 'k', `${t.combo} · ${t[r.synergy]}`), h('span', 'v', r.title), pow, list, clear)
}

// Last: every helper above is a const, initialised only once evaluation reaches it.
if (root?.dataset.ui) init(root)
