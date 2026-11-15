// Delivery pipeline tabs for the AI engineering section: roving tabindex, arrow keys,
// and a slow autoplay that stops for good once the visitor interacts.
const STEP_MS = 5000

function wire(root) {
  const tabs = [...root.querySelectorAll('[role="tab"]')], panels = [...root.querySelectorAll('[role="tabpanel"]')]
  const bar = root.querySelector('.cp-bar'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let cur = 0, timer = 0, start = 0, raf = 0, auto = !reduced
  const show = (i, focus) => {
    cur = (i + tabs.length) % tabs.length
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === cur)); t.tabIndex = k === cur ? 0 : -1 })
    panels.forEach((p, k) => { p.hidden = k !== cur })
    panels[cur].querySelectorAll('pre span').forEach((s, k) => s.style.setProperty('--d', k))
    bar.style.setProperty('--i', cur)
    if (focus) tabs[cur].focus()
  }
  const tick = (now) => {
    const p = Math.min((now - start) / STEP_MS, 1); bar.style.setProperty('--p', p)
    if (p >= 1) { show(cur + 1); start = now }
    if (auto) raf = requestAnimationFrame(tick)
  }
  const stop = () => { auto = false; cancelAnimationFrame(raf); bar.style.setProperty('--p', 0) }
  tabs.forEach((t, k) => t.addEventListener('click', () => { stop(); show(k) }))
  root.querySelector('[role="tablist"]').addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (d) { e.preventDefault(); stop(); show(cur + d, true) }
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); stop(); show(e.key === 'Home' ? 0 : tabs.length - 1, true) }
  })
  root.classList.add('js'); show(0)
  if (!auto) return
  new IntersectionObserver((es) => es.forEach((e) => {
    cancelAnimationFrame(raf)
    if (e.isIntersecting && auto) { start = performance.now(); raf = requestAnimationFrame(tick) }
  }), { threshold: 0.4 }).observe(root.querySelector('.cp-box'))
}

document.querySelectorAll('[data-pipeline]').forEach(wire)
