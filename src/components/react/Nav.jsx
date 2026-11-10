import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import translations from '../../i18n/translations'
import useActiveSection from '../../hooks/useActiveSection'
import ThemeToggle from './ThemeToggle'

// Single source of truth for primary navigation (Phase 9 review WR-07).
// SECTION_IDS (scroll-spy), DesktopNav and MobileMenu all derive from this list.
const NAV_ITEMS = [
  { id: 'about',       labelKey: 'about' },
  { id: 'skills',      labelKey: 'skills' },
  { id: 'experience',  labelKey: 'experience' },
  { id: 'projects',    labelKey: 'projects' },
  { id: 'claude-code', labelKey: 'claudeCode' },
  { id: 'contact',     labelKey: 'contact' },
]
const SECTION_IDS = NAV_ITEMS.map((item) => item.id)

export default function Nav({
  locale, hrefEn, hrefEs, hrefGame,
}) {
  const lang = locale
  const t = translations[locale]
  const [menuOpen, setMenuOpen] = useState(false)
  const activeSection = useActiveSection(SECTION_IDS)

  return (
    <header data-game-interactive className="sticky top-0 z-50 backdrop-blur-md bg-ink-900/70 border-b border-ink-600">
      <ProgressBar />
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Logomark />
        <DesktopNav t={t} activeSection={activeSection} hrefGame={hrefGame} />
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle t={t} />
          <LangPill lang={lang} t={t} hrefEn={hrefEn} hrefEs={hrefEs} />
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 text-text-primary"
          aria-label={t.nav.menuOpen}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        t={t}
        lang={lang}
        hrefEn={hrefEn}
        hrefEs={hrefEs}
        hrefGame={hrefGame}
        activeSection={activeSection}
      />
    </header>
  )
}

function Logomark() {
  return (
    <a
      href="#hero"
      className="font-pixel text-[10px] tracking-tight text-text-primary hover:text-brand transition-colors"
    >
      &lt;<span className="text-brand">/</span>camt&gt;
    </a>
  )
}

// Career World is a real route (/game), not a hash-scroll SECTIONS entry — it
// deliberately lives outside NAV_ITEMS/useActiveSection so it never fights the
// scroll-spy for "active" styling. Rendered as an accent CTA pill so it reads
// as "play", not as another passive nav label.
function DesktopNav({ t, activeSection, hrefGame }) {
  return (
    <nav className="hidden md:flex items-center gap-7 text-xs font-mono">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id
        const cls = isActive
          ? 'text-brand font-normal border-b-2 border-brand pb-0.5 transition-colors duration-200'
          : 'text-text-secondary font-normal hover:text-brand transition-colors duration-200'
        return (
          <a key={item.id} href={`#${item.id}`} className={cls}>
            {t.nav[item.labelKey]}
          </a>
        )
      })}
      {hrefGame && (
        <a
          href={hrefGame}
          className="px-3 py-1.5 rounded-full bg-brand-gradient text-ink-900 font-extrabold normal-case tracking-normal hover:opacity-90 transition-opacity duration-200"
        >
          ▶ {t.nav.careerWorld}
        </a>
      )}
    </nav>
  )
}

// LangPill renders real hash-preserving <a> links (ROUTE-05, D-04) instead of
// mutating local state — hrefEn/hrefEs arrive as props already resolved
// server-side in the page frontmatter (astro:i18n's locale-url helper is not
// importable from island code). The current section hash is appended
// client-side and kept in sync via a hashchange listener.
function LangPill({ lang, t, hrefEn, hrefEs }) {
  const base = 'px-3 py-1.5 rounded-full transition-colors duration-150 font-mono text-xs'
  const active = 'bg-brand-gradient text-ink-900 font-extrabold'
  const inactive = 'text-text-secondary font-normal'

  const [enHref, setEnHref] = useState(hrefEn)
  const [esHref, setEsHref] = useState(hrefEs)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    function syncHash() {
      setEnHref(hrefEn + window.location.hash)
      setEsHref(hrefEs + window.location.hash)
    }
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [hrefEn, hrefEs])

  function persistLangCookie(target) {
    try {
      document.cookie = `cam-lang=${target}; path=/; max-age=31536000`
    } catch (e) {
      // cookie write blocked — ignore, navigation still proceeds via href
    }
  }

  // WR-09: group aria-label describes purpose (stable across state); per-link
  // aria-label is action-oriented ("Switch to English") to pair with aria-pressed.
  return (
    <div
      role="group"
      aria-label={t.nav.langGroup}
      className="flex gap-0.5 bg-ink-500 border border-ink-400 rounded-full p-0.5"
    >
      <a href={enHref}
        onClick={() => persistLangCookie('en')}
        className={`${base} ${lang === 'en' ? active : inactive}`}
        aria-label={t.nav.langSwitchEn}
        aria-pressed={lang === 'en'}
      >
        EN
      </a>
      <a href={esHref}
        onClick={() => persistLangCookie('es')}
        className={`${base} ${lang === 'es' ? active : inactive}`}
        aria-label={t.nav.langSwitchEs}
        aria-pressed={lang === 'es'}
      >
        ES
      </a>
    </div>
  )
}

function ProgressBar() {
  const ref = useRef(null)

  useEffect(() => {
    let ticking = false
    function update() {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0
      if (ref.current) ref.current.style.width = `${pct}%`
      ticking = false
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
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

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-200 h-[3px] bg-transparent pointer-events-none"
    >
      <div
        ref={ref}
        className="h-full bg-brand"
        style={{ width: '0%' }}
      />
    </div>
  )
}

function MobileMenu({
  open, onClose, t, lang, hrefEn, hrefEs, hrefGame, activeSection,
}) {
  // SSR-safe portal: render nothing until mounted so the first client render
  // matches the server (both null) — a document-existence guard alone renders
  // null on the server but a portal on the client's first (hydration) render,
  // which is exactly the React #418 mismatch that forced a full island re-render.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.body.style.overflow = open ? 'hidden' : ''
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted) return null

  const overlay = (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      className={`fixed inset-0 z-100 bg-ink-950/95 transition-opacity duration-200 md:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none invisible'}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-6 inline-flex items-center justify-center w-11 h-11 text-text-secondary hover:text-text-primary transition-colors"
        aria-label={t.nav.menuClose}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
      <div className="h-full flex flex-col items-center justify-center gap-8 px-6">
        <div className="mb-10 flex items-center gap-2">
          <ThemeToggle t={t} />
          <LangPill lang={lang} t={t} hrefEn={hrefEn} hrefEs={hrefEs} />
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id
          const cls = isActive
            ? 'text-2xl font-extrabold text-brand border-b-2 border-brand pb-0.5'
            : 'text-2xl font-extrabold text-text-primary'
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={onClose}
              className={cls}
            >
              {t.nav[item.labelKey]}
            </a>
          )
        })}
        {hrefGame && (
          <a
            href={hrefGame}
            onClick={onClose}
            className="px-6 py-3 rounded-full bg-brand-gradient text-ink-900 text-xl font-extrabold"
          >
            ▶ {t.nav.careerWorld}
          </a>
        )}
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
