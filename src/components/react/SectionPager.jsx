import React, { useEffect, useRef, useState } from 'react'
import translations from '../../i18n/translations'
import useActiveSection from '../../hooks/useActiveSection'

const SECTION_IDS = ['hero', 'about', 'skills', 'experience', 'projects', 'claude-code', 'contact']

const SECTION_COLORS = {
  hero: '#00E5A8',
  about: '#00C2FF',
  skills: '#3B82F6',
  experience: '#8B5CF6',
  projects: '#EC4899',
  'claude-code': '#F59E0B',
  contact: '#34D399',
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function scrollToY(y) {
  window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

const ICONS = {
  top: 'M6 4h12 M12 20V8 M7 13l5-5 5 5',
  prev: 'M7 15l5-5 5 5',
  next: 'M7 9l5 5 5-5',
  end: 'M6 20h12 M12 4v12 M7 11l5 5 5-5',
}

function PagerButton({ dpath, label, onClick, disabled }) {
  return (
    <div className="group relative flex items-center">
      <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-ink-900/95 border border-ink-400 px-2 py-1 text-[10px] font-mono text-muted opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
        {label}
      </span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-all duration-150 hover:text-brand hover:bg-ink-500 hover:scale-110 active:scale-95 disabled:opacity-25 disabled:pointer-events-none"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={dpath} />
        </svg>
      </button>
    </div>
  )
}

function ProgressDial({ progress, index, total, color }) {
  const r = 15
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(100, Math.max(0, progress)) / 100)
  return (
    <div className="relative flex h-10 w-10 items-center justify-center" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-400" />
        <circle
          data-role="dial-progress"
          cx="20"
          cy="20"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ stroke: color, filter: `drop-shadow(0 0 3px ${color})`, transition: 'stroke-dashoffset .15s, stroke .3s, filter .3s' }}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-bold" style={{ color, transition: 'color .3s' }}>
        {index + 1}
        <span className="text-muted">/{total}</span>
      </span>
    </div>
  )
}

export default function SectionPager({ locale }) {
  const t = translations[locale]
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const tickingRef = useRef(false)
  const navRef = useRef(null)

  // React 18.3 does not render the `inert` prop, so set the DOM property
  // directly — keeps the hidden pager's buttons out of the tab order and the
  // a11y tree (fixes the aria-hidden-focus audit) without killing the
  // slide-in transition that a `visibility:hidden` swap would.
  useEffect(() => {
    if (navRef.current) navRef.current.inert = !visible
  }, [visible])

  useEffect(() => {
    function update() {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
      setVisible(window.scrollY > 320)
      tickingRef.current = false
    }
    function onScroll() {
      if (!tickingRef.current) {
        window.requestAnimationFrame(update)
        tickingRef.current = true
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const idx = Math.max(0, SECTION_IDS.indexOf(active))
  const atStart = idx <= 0
  const atEnd = idx >= SECTION_IDS.length - 1
  const activeColor = SECTION_COLORS[SECTION_IDS[idx]]

  return (
    <nav
      ref={navRef}
      aria-label={t.nav.pagerGroup}
      aria-hidden={!visible}
      className={`fixed right-4 sm:right-6 bottom-6 z-40 hidden md:flex flex-col items-center gap-0.5 rounded-full border border-ink-400 bg-ink-900/70 p-1.5 backdrop-blur-md shadow-brand transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <PagerButton dpath={ICONS.top} label={t.nav.pagerTop} onClick={() => scrollToY(0)} disabled={atStart} />
      <PagerButton dpath={ICONS.prev} label={t.nav.pagerPrev} onClick={() => scrollToId(SECTION_IDS[Math.max(0, idx - 1)])} disabled={atStart} />
      <ProgressDial progress={progress} index={idx} total={SECTION_IDS.length} color={activeColor} />
      <PagerButton dpath={ICONS.next} label={t.nav.pagerNext} onClick={() => scrollToId(SECTION_IDS[Math.min(SECTION_IDS.length - 1, idx + 1)])} disabled={atEnd} />
      <PagerButton dpath={ICONS.end} label={t.nav.pagerEnd} onClick={() => scrollToY(document.documentElement.scrollHeight)} disabled={atEnd} />
    </nav>
  )
}
