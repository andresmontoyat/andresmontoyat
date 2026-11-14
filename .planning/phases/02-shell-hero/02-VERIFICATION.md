---
phase: 02-shell-hero
verified: 2026-05-05T00:00:00Z
status: passed
human_verified: 2026-05-05T17:00:00Z
score: 5/5 must-haves verified (5/5 human-tested in browser)
human_verification:
  - test: "On phone/narrow viewport, tap the hamburger icon — verify full-screen overlay appears and body does not scroll beneath it"
    expected: "Overlay covers viewport; attempting to scroll the page background fails; MobileMenu rendered via createPortal with opacity-100"
    why_human: "document.body.style.overflow='hidden' is set in code but real scroll-lock behavior requires browser rendering — cannot verify without a live session"
  - test: "While mobile menu is open, press ESC key — verify menu closes"
    expected: "MobileMenu closes (opacity-0, pointer-events-none); overflow restored to ''"
    why_human: "Keyboard event handler wired correctly in code (line 158 Nav.js) but end-to-end key behavior requires live browser"
  - test: "Click a nav link (e.g. About) — verify page smooth-scrolls to that section, then scroll manually — verify active link highlights"
    expected: "Smooth scroll animation plays (scroll-behavior:smooth at line 30 index.css); active link gains text-brand + border-b-2 border-brand styling as section enters -20%/+60% viewport band"
    why_human: "IntersectionObserver scroll-spy and CSS smooth-scroll work only in live browser — grep confirms wiring but not runtime firing"
  - test: "Switch language EN -> ES using the LangPill, then reload the page — verify all text flips instantly on toggle and persists after reload"
    expected: "All t.* values re-render in Spanish immediately; localStorage key 'cam-lang' = 'es'; on reload page starts in Spanish with no flash"
    why_human: "localStorage read and React re-render require live browser execution; lazy useState(readInitialLang) prevents flash but only verifiable with real paint"
  - test: "Verify entrance animations play on first load — badge, h1 lines, lead text, CTA buttons, stats grid stagger from 0ms to 950ms"
    expected: "Seven animation steps with motion-safe: Tailwind prefix play; elements start opacity-0 then animate in; users with prefers-reduced-motion see content immediately without animation"
    why_human: "CSS animation timing and motion-safe: behavior requires visual inspection in both a standard and reduced-motion browser environment"
---

# Phase 2: Shell & Hero Verification Report

**Phase Goal:** A recruiter landing on the site sees a bold, animated hero and a functional bilingual navigation — the design direction is locked.
**Verified:** 2026-05-05
**Status:** human_needed — all automated checks passed; 5 items require live browser verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Hero section visible on first load with name, role, tagline, CTA buttons — staggered entrance animations play automatically | VERIFIED (code) / HUMAN (visual) | Hero.js renders t.hero.h1a/h1b/h1c, lead, cta1, CV EN/ES buttons, 4-stat grid; 7 animation steps with animationDelay 0–950ms and motion-safe: prefixes confirmed at lines 64–137 |
| 2 | On phone, tapping hamburger opens full-screen menu overlay; body does not scroll behind it; ESC or close tap dismisses it | VERIFIED (code) / HUMAN (runtime) | MobileMenu via createPortal(overlay, document.body) at Nav.js line 219; document.body.style.overflow='hidden' at line 156; ESC handler at line 158–160; onClose tap at line 187–189 |
| 3 | Clicking nav link smooth-scrolls to target section; nav highlights active section as user scrolls | VERIFIED (code) / HUMAN (runtime) | scroll-behavior:smooth in index.css line 30; href="#${l.id}" links at Nav.js lines 75 and 207; useActiveSection IntersectionObserver with rootMargin '-20% 0px -60% 0px' at useActiveSection.js lines 22–24; active class text-brand border-b-2 border-brand applied at Nav.js lines 72 and 202 |
| 4 | Switching EN/ES updates all visible text instantly; choice persists after page reload | VERIFIED (code) / HUMAN (runtime) | LanguageContext.js: lazy init via useState(readInitialLang) at line 19; localStorage.getItem('cam-lang') at line 12; localStorage.setItem at line 36; t: translations[lang] memoized in useMemo at line 43; all section components consume t via useLanguage() |
| 5 | CV download buttons offer both EN and ES Word documents for download | VERIFIED | Hero.js lines 119–130: href="/CV_Carlos_Montoya_EN.docx" download and href="/CV_Carlos_Montoya_ES.docx" download; files confirmed at public/CV_Carlos_Montoya_EN.docx and public/CV_Carlos_Montoya_ES.docx |

**Score:** 5/5 truths verified in code; 4 truths additionally require live browser verification

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/Nav.js` | Sticky nav shell with ProgressBar, Logomark, DesktopNav, LangPill, Hamburger, MobileMenu | VERIFIED | 220 lines; all sub-components present and substantive; createPortal, useActiveSection, scroll-spy, aria attributes all wired |
| `src/components/Hero.js` | Bold hero with char-reveal, stagger animations, CTA + CV download buttons, stats grid | VERIFIED | 147 lines; useCharReveal hook used for h1b; 7 animation stages; both CV download anchors with download attr; 4 Stat components |
| `src/hooks/useActiveSection.js` | IntersectionObserver scroll-spy returning active section id | VERIFIED | 33 lines; IntersectionObserver with rootMargin '-20% 0px -60% 0px'; cleanup via observer.disconnect(); stable dep pattern ids.join('|') |
| `src/i18n/LanguageContext.js` | Sync lazy init, html lang sync, document.title + meta description update | VERIFIED | 55 lines; useState(readInitialLang) at line 19; useEffect syncs document.documentElement.lang, document.title, meta[name=description] at lines 22–29 |
| `src/i18n/translations.js` | nav.menuOpen/menuClose + meta.title/description in EN+ES | VERIFIED | grep confirms: 2 occurrences each of menuOpen, menuClose, meta: {; EN and ES strings present at lines 8–13 and 87–92 |
| `public/CV_Carlos_Montoya_EN.docx` | EN CV for download | VERIFIED | File exists at public/ |
| `public/CV_Carlos_Montoya_ES.docx` | ES CV for download | VERIFIED | File exists at public/ |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Nav.js hamburger button | t.nav.menuOpen / t.nav.menuClose | useLanguage() → t | WIRED | aria-label={t.nav.menuOpen} at line 26; aria-label={t.nav.menuClose} at line 188 |
| LanguageContext useEffect | document.title and meta[name=description] | translations[lang].meta | WIRED | lines 24–28; translations[lang].meta.title and meta.description used |
| Nav.js links | section IDs | href="#${l.id}" native anchor | WIRED | SECTION_IDS=['about','skills','experience','contact'] at line 6; all sections have matching id= attributes confirmed in About.js, Skill.js, Experience.js, Contact.js |
| scroll-behavior | native CSS smooth scroll | index.css html { scroll-behavior: smooth } | WIRED | line 30 of index.css; react-scroll and react-router-dom absent from package.json (D-02, D-04) |
| useActiveSection | Nav active link styling | IntersectionObserver → setActive → DesktopNav/MobileMenu isActive check | WIRED | hook returns active id; Nav lines 70–73 and 200–203 apply text-brand + border-b-2 conditionally |
| Hero.js CV links | public/ static files | href="/CV_Carlos_Montoya_EN.docx" download | WIRED | Both hrefs point to confirmed file paths; download attribute present |
| LanguageContext lazy init | localStorage 'cam-lang' | useState(readInitialLang) synchronous call | WIRED | readInitialLang() at line 10 reads localStorage before first render — no flash (SEO-04) |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| Hero.js | t.hero.h1a/h1b/h1c, t.hero.lead, t.hero.cta1, t.stats.* | translations[lang] via useLanguage() | Yes — translations.js exports full bilingual copy | FLOWING |
| Nav.js | t.nav.about/skills/experience/contact, t.nav.menuOpen/menuClose | translations[lang] via useLanguage() | Yes — all keys verified in translations.js | FLOWING |
| Nav.js | activeSection | useActiveSection IntersectionObserver | Yes — IO observes real DOM elements from SECTION_IDS | FLOWING (runtime needed) |
| LanguageContext.js | lang | localStorage 'cam-lang' or navigator.language | Yes — real localStorage + browser language API | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build passes | `ls build/static/js/*.js` | main.bfa48bea.js + 453.a207e175.chunk.js exist | PASS |
| react-scroll absent | `grep '"react-scroll"' package.json` → 0 | 0 matches | PASS |
| react-router-dom absent | `grep '"react-router-dom"' package.json` → 0 | 0 matches | PASS |
| No src/ imports of removed deps | `grep -rn "from 'react-scroll'" src/` → 0 | 0 matches | PASS |
| menuOpen/menuClose in both languages | `grep -c "menuOpen" translations.js` → 2 | 2 | PASS |
| meta namespace in both languages | `grep -c "meta: {" translations.js` → 2 | 2 | PASS |
| CV files present in public/ | file existence check | Both EN and ES .docx files confirmed | PASS |
| Sync lazy init for lang | `grep "useState(readInitialLang)" LanguageContext.js` | Match at line 19 | PASS |
| createPortal used for MobileMenu | `grep "createPortal" Nav.js` | Import at line 2, call at line 219 | PASS |
| scroll-behavior: smooth present | `grep "scroll-behavior: smooth" src/index.css` | Match at line 30 | PASS |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| NAV-01 | Mobile hamburger menu with full-screen overlay, body scroll lock, keyboard a11y | SATISFIED (code) | MobileMenu createPortal, overflow=hidden, ESC handler, aria-modal, aria-expanded all present |
| NAV-02 | Smooth scroll to anchor sections on nav link click | SATISFIED (code) | scroll-behavior:smooth in index.css; href="#${l.id}" native anchors; section IDs confirmed |
| NAV-03 | Scroll spy highlighting active section | SATISFIED (code) | useActiveSection IO hook; active link styling applied in DesktopNav and MobileMenu |
| NAV-04 | Scroll progress bar at top of page | SATISFIED | ProgressBar rAF-throttled with window.scrollY / (scrollHeight - innerHeight) at Nav.js lines 112–151 |
| HERO-01 | Bold hero section with name, role, tagline in both languages | SATISFIED | Hero.js renders t.hero.h1a/h1b/h1c/lead from translations; both EN and ES copy verified |
| HERO-02 | Staggered CSS entrance animation sequence | SATISFIED (code) | 7 elements with animationDelay 0ms, 150ms, 300ms, 500ms, 650ms, 800ms, 950ms using motion-safe: prefix |
| HERO-03 | Ambient animated background (gradient, geometric) | SATISFIED | bg-hero-gradient (radial + linear), bg-grid-subtle (CSS pattern at index.css line 44), absolute inset div at Hero.js line 60 |
| HERO-04 | Character-by-character text reveal for title | SATISFIED | useCharReveal hook at Hero.js lines 4–35; 40ms/char interval; prefers-reduced-motion guard at line 15 |
| HERO-05 | CTA buttons (CV download, contact) prominently placed | SATISFIED | Contact CTA (href="#contact"), EN CV download, ES CV download all in CTA group at Hero.js lines 108–132 |
| I18N-01 | Full bilingual EN/ES support across all redesigned sections | SATISFIED | translations.js covers nav, hero, stats, about, skills, exp, contact, footer in both languages |
| I18N-02 | Language switcher in nav with localStorage persistence | SATISFIED | LangPill in DesktopNav and MobileMenu; setLang writes to localStorage; readInitialLang reads on init |
| I18N-03 | CV download available in both languages | SATISFIED | Both EN and ES .docx files in public/; download anchors in Hero.js |
| SEO-04 | i18n language flash fixed via synchronous localStorage read | SATISFIED | useState(readInitialLang) uses lazy initializer (function ref, not call) — executes synchronously before first render |

---

### Design Decision Compliance

| Decision | Description | Status | Evidence |
|----------|-------------|--------|---------|
| D-01 | In-place modify existing components | HONORED | Nav.js and Hero.js replace original files; no new top-level components added |
| D-02 | Native scroll-behavior:smooth (no react-scroll) | HONORED | scroll-behavior:smooth at index.css line 30; react-scroll absent from package.json |
| D-03 | Custom IntersectionObserver hook (no library) | HONORED | src/hooks/useActiveSection.js — pure IO hook, no external library |
| D-04 | react-scroll and react-router-dom removed | HONORED | Both absent from package.json and package-lock.json; 0 imports in src/ |
| D-05 | createPortal to document.body for MobileMenu | HONORED | Nav.js line 2 imports createPortal; line 219 renders to document.body |
| D-06 | No test infra — manual browser verification | HONORED | No test files in phase; 5 items routed to human verification |
| D-07 | menuOpen/menuClose i18n keys | HONORED | Both keys present in en.nav and es.nav in translations.js |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Nav.js | 167 | `return null` in MobileMenu | INFO | Guard for SSR (typeof document === 'undefined') — correct defensive pattern, not a stub |

No blocker or warning anti-patterns found. The `return null` on line 167 is a legitimate SSR guard before the createPortal call, not a placeholder.

---

### Human Verification Required

#### 1. Mobile hamburger overlay + scroll lock

**Test:** On a phone or browser devtools mobile viewport, tap the hamburger icon.
**Expected:** Full-screen overlay appears covering 100% viewport; attempting to scroll the background page is blocked (overflow:hidden on body); close button and ESC both dismiss the menu.
**Why human:** `document.body.style.overflow='hidden'` is confirmed in code (Nav.js line 156) but real scroll-lock behavior requires the browser to honor it — not verifiable via grep.

#### 2. ESC key dismissal

**Test:** While mobile menu is open, press the ESC key.
**Expected:** Menu closes; `document.body.style.overflow` is restored to ''.
**Why human:** Keyboard event listener on `document` is wired at Nav.js line 158–160 but runtime key dispatch requires a live browser session.

#### 3. Smooth-scroll + active nav highlighting

**Test:** Click the "Experience" nav link; then manually scroll through all sections.
**Expected:** Page smooth-scrolls (animated, not instant jump) to the experience section; as each section enters the central viewport band the corresponding nav link gains the brand-colored underline; leaving removes it.
**Why human:** CSS `scroll-behavior:smooth` and IntersectionObserver rootMargin behavior must be observed in a running browser — not inferable from static code.

#### 4. Language switch + persistence

**Test:** Switch from EN to ES via the LangPill; verify all text changes. Reload the page.
**Expected:** All visible copy switches to Spanish immediately with no layout shift; after reload the page renders in Spanish without an EN flash.
**Why human:** React re-render on context update and localStorage synchronous read are code-verified but the absence of a language flash requires a real paint cycle to confirm.

#### 5. Entrance animations + reduced-motion

**Test:** Load the page fresh and observe the hero section; also load with OS reduced-motion setting enabled.
**Expected:** Normal: badge fades in at 0ms, h1a slides up at 150ms, h1b char-reveals from 300ms, h1c slides at 500ms, lead at 650ms, CTAs at 800ms, stats at 950ms. Reduced-motion: all elements appear immediately with no animation; char-reveal completes instantly (useCharReveal returns full target string).
**Why human:** CSS animation timing and the `motion-safe:` Tailwind prefix behavior require visual inspection; `prefers-reduced-motion: reduce` path in useCharReveal (line 15–18) is code-verified but needs a real media query match to confirm.

---

### Gaps Summary

No gaps found. All 5 success criteria are fully implemented in code. The 5 human verification items are not gaps — they are runtime behaviors that require a live browser to confirm. All structural, wiring, data-flow, and anti-pattern checks pass.

The phase goal is achieved: Nav.js and Hero.js together constitute a bold, animated hero with a functional bilingual navigation. The design direction contract is locked in code.

---

_Verified: 2026-05-05_
_Verifier: gsd-verifier_
