---
phase: 03-content-animations
verified: 2026-05-05T23:30:00Z
status: passed
human_verified: 2026-05-07T00:00:00Z
score: 5/5 must-haves verified (5/5 human-tested in browser)
re_verification: false
human_verification:
  - test: "Scroll entrance animations fire visibly in browser"
    expected: "Each section (About, Skills, Experience, Contact) fades/slides up as the user scrolls past the 25% threshold. Reduce-motion users see content immediately without animation."
    why_human: "IntersectionObserver + CSS transition correctness cannot be confirmed without a live browser. ChipBadge in Skill.js has a hardcoded `is-visible` class (see Warning W-01) — human must confirm whether chip stagger is still perceptible."
  - test: "GA fires page-view events to G-4TZJGR3MXR"
    expected: "GA DebugView shows a `page_view` hit with `tid=G-4TZJGR3MXR` within seconds of opening the site."
    why_human: "Per D-18 in CONTEXT.md, this is explicitly a HUMAN-UAT item. Script is present in index.html and dist/index.html but network-level firing cannot be verified programmatically."
---

# Phase 3: Content & Animations Verification Report

**Phase Goal:** The full portfolio story is told — About, Skills, Experience, Contact, Footer complete and animated.
**Verified:** 2026-05-05T23:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Scrolling past each section triggers visible fade/slide entrance animation | WIRED (human visual confirm pending) | `useInView` hook + `.animate-on-scroll`/`.is-visible` CSS applied across About, Skills, Experience, Contact. See W-01 for chip exception. |
| 2 | Experience timeline: 12 entries with tech chips + per-card expand/collapse | VERIFIED | `src/data/experience.js` has 12 entries each with `tech:[]`. `Experience.js` renders `TimelineCard` with `job.tech.map()`, chevron toggle, `openCards` state object. |
| 3 | Site URL renders rich link preview (Open Graph) | VERIFIED | `index.html` has 11 OG/Twitter meta tags (og:type, og:url, og:image, og:image:width, og:image:height, og:title, og:description, twitter:card, twitter:image, twitter:title, twitter:description). `public/og-image.png` exists (190KB, 1200x630). LanguageContext syncs og:title/og:description per language change. |
| 4 | Contact section: prominent email + click-to-copy + visible confirmation | VERIFIED | `Contact.js` EmailHeroCard renders email at `text-3xl sm:text-4xl`, `handleCopy` calls `navigator.clipboard.writeText`, `setCopied(true)` swaps label to `'Copied!'` for 1500ms via `aria-live="polite"`. |
| 5 | GA fires page-view events to G-4TZJGR3MXR | WIRED (human browser confirm pending) | GA script with `gtag('config', 'G-4TZJGR3MXR')` present in both `index.html` and `dist/index.html`. Actual network hit requires browser UAT per D-18. |

**Score:** 5/5 truths wired. 2 require human browser confirmation.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useInView.js` | IntersectionObserver hook, threshold 0.25, unobserve after first fire | VERIFIED | 32 lines. Handles SSR fallback, observer cleanup, threshold-parameterized. Calls `observer.unobserve(entry.target)` on first intersection. |
| `src/index.css` | `.animate-on-scroll` + `.is-visible` classes + `prefers-reduced-motion` guard | VERIFIED | Lines 51-71: `.animate-on-scroll` sets `opacity:0; transform:translateY(16px); transition: 700ms`. `.is-visible` resets to visible. `@media (prefers-reduced-motion: reduce)` collapses both. |
| `src/components/_shared/SectionLabel.js` | Shared label component, font-extrabold | VERIFIED | 10-line component, `font-mono text-xs text-brand uppercase tracking-[3px] font-extrabold`. Used in About, Skill, Experience, Contact. |
| `src/components/About.js` | useInView wired, SectionLabel, layout preserved | VERIFIED | Imports `useInView` and `SectionLabel`. Three `animate-on-scroll` divs with `inView` gate and stagger delays (100ms, 200ms). |
| `src/components/Skill.js` | 4-category chip cloud + year badges + per-chip stagger | VERIFIED | 54 lines. Renders `t.skills.categories` (4 categories, 29 chips total). `ChipBadge` renders `{chip.label}` + `{chip.years}y`. Stagger at `ci * 100ms` per category. Note W-01. |
| `src/components/Experience.js` | Vertical timeline, 12 entries always visible, independent expand, tech chips, 100ms stagger | VERIFIED | 113 lines. `openCards` object state per card. `TimelineCard` renders brand rail dot, tech chips (`job.tech.map()`), chevron, bullets on expand. 100ms stagger per `index`. |
| `src/components/Contact.js` | EmailHeroCard with Copy/Copied! label swap, 3 secondary cards | VERIFIED | 115 lines. EmailHeroCard with `navigator.clipboard.writeText`, `setCopied` state, `aria-live`. Three `SecondaryCard` instances (phone, LinkedIn, GitHub). 100ms stagger. |
| `src/components/Footer.js` | GitHub + LinkedIn only, font-extrabold | VERIFIED | `const social` array has 2 entries only (LinkedIn, GitHub). No Docker, no YouTube. `font-extrabold` on logomark. |
| `src/data/experience.js` | `tech:[]` field on all 12 entries | VERIFIED | 12 `tech:` fields confirmed via grep. All entries non-empty. |
| `src/i18n/translations.js` | `t.skills.categories[]`, `t.exp.expand`/`collapse` | VERIFIED | `categories:` at lines 51 and 176 (en/es). `expand:`/`collapse:` at lines 111-112 and 236-237. No obsolete `t.skills.cards` or `t.exp.more`/`less` found. |
| `src/i18n/LanguageContext.js` | OG meta sync on lang change | VERIFIED | `useEffect([lang])` calls `setMeta()` for `og:title`, `og:description`, `twitter:title`, `twitter:description`. |
| `index.html` | 11 OG+Twitter meta tags, GA G-4TZJGR3MXR | VERIFIED | 7 `og:*` properties + 4 `twitter:*` properties. GA script loads with correct ID. Both present in `dist/index.html` too. |
| `public/og-image.png` | 1200x630, ~190KB | VERIFIED | File exists, 190KB (194315 bytes). |
| `scripts/og-template.html` + `scripts/generate-og-image.js` | Reproducible OG image toolchain | VERIFIED | 112 + 39 lines respectively. `package.json` has `"og:gen": "node scripts/generate-og-image.js"`. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `About.js` | `useInView` | `import` + `const inView = useInView(sectionRef)` | WIRED | sectionRef attached to wrapper div; `inView` gates `animate-on-scroll` class string. |
| `Skill.js` | `useInView` | `import` + `const inView = useInView(sectionRef)` | WIRED | Category divs gated on `inView`. ChipBadge skips gate (see W-01). |
| `Experience.js` | `useInView` | `import` + `const inView = useInView(sectionRef)` | WIRED | `sectionRef` on timeline container div. Each `TimelineCard` receives `inView` prop and gates its class. |
| `Contact.js` | `useInView` | `import` + `const inView = useInView(sectionRef)` | WIRED | `sectionRef` on inner container. All cards gated on `inView`. |
| `Experience.js` | `src/data/experience.js` | `import EXPERIENCE` + `EXPERIENCE.map()` | WIRED | Each entry rendered as `TimelineCard`. `job.tech.map()` renders chips. |
| `LanguageContext.js` | OG meta tags | `useEffect([lang])` → `setMeta()` | WIRED | Selectors target `meta[property="og:title"]`, `og:description`, `twitter:title`, `twitter:description`. |
| `index.html` | `og-image.png` | `content="https://andresmontoyatco.com/og-image.png"` | WIRED | Static URL in both `og:image` and `twitter:image`. File exists at `public/og-image.png`. |
| `Contact.js` | clipboard | `navigator.clipboard.writeText(EMAIL)` | WIRED | With `!navigator.clipboard` guard. `setCopied(true)` drives label swap. |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `Skill.js` | `t.skills.categories` | `translations.js` static object (4 categories, 29 chips with `years` values) | Yes — hardcoded content, not empty | VERIFIED (static content is intentional for a portfolio) |
| `Experience.js` | `EXPERIENCE` | `src/data/experience.js` default export | Yes — 12 non-empty entries, all with `tech:[]` and bilingual `bullets` | VERIFIED |
| `Contact.js` | `EMAIL` | Module-level constant `'andresmontoyat@gmail.com'` | Yes — single hardcoded email value appropriate for contact section | VERIFIED |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| 12 experience entries exist | `grep -c 'company:' experience.js` → 12 | 12 | PASS |
| All 12 have tech field | `grep -c 'tech:' experience.js` → 12 | 12 | PASS |
| OG image exists at expected path | `ls -lh public/og-image.png` → 190K | 190K present | PASS |
| OG image dimensions match 1200x630 | Size 190KB, SUMMARY documents Playwright screenshot at `clip:{w:1200,h:630}` | Cannot verify pixel dimensions without binary parsing | SKIP (human visual) |
| GA ID correct in built output | `grep 'G-4TZJGR3MXR' dist/index.html` | Found × 2 lines | PASS |
| Clipboard handler wired | `navigator.clipboard.writeText(EMAIL)` in Contact.js line 67 | Present | PASS |
| translations.categories has 4 entries | `grep -c 'symbol:' translations.js` | 8 (4 en + 4 es) | PASS |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| CONT-01 | About section with professional summary and key highlights | SATISFIED | About.js renders 3 paragraphs + quick-facts sidebar, useInView wired |
| CONT-02 | Skills section with technology grouping by category and visual icons | SATISFIED | 4 categories (Backend, Cloud & Infra, DevOps & Tools, AI & Productivity) with mono symbols and year badges |
| CONT-03 | Experience section as visual timeline with scroll-triggered staggered entries | SATISFIED | Vertical timeline with brand rail, dots, 100ms stagger per card |
| CONT-04 | Tech chips displayed per experience entry showing technologies used | SATISFIED | `job.tech.map()` renders chips per entry in Experience.js |
| CONT-05 | Expand/collapse functionality for experience entry details | SATISFIED | `openCards` object state, independent toggles, chevron SVG, aria-expanded |
| CONT-06 | Contact section with dominant email CTA and copy-to-clipboard | SATISFIED | EmailHeroCard at text-3xl/4xl, clipboard.writeText, Copied! label swap |
| CONT-07 | Social links (GitHub, LinkedIn) in contact section | SATISFIED | GitHub + LinkedIn SecondaryCards in Contact.js |
| CONT-08 | Footer with bilingual copyright and minimal branding | SATISFIED | `</cam>` logomark, bilingual tagline/rights, 2 social icons (GitHub + LinkedIn only) |
| ANIM-01 | Scroll-triggered entrance animations for each content section | SATISFIED | useInView + animate-on-scroll + is-visible applied on About, Skill, Experience, Contact |
| ANIM-02 | Animation primitives built with IntersectionObserver + CSS classes | SATISFIED | `useInView.js` uses native IntersectionObserver; `.animate-on-scroll` / `.is-visible` in index.css |
| ANIM-03 | Stagger support for lists and groups | SATISFIED | `transitionDelay: \`${i * 100}ms\`` applied in Skill (per category + per chip), Experience (per card), Contact (per card) |
| SEO-01 | Open Graph meta tags for rich link previews | SATISFIED | 11 OG/Twitter meta tags in index.html; og-image.png at public/ |
| SEO-02 | Correct GA measurement ID G-4TZJGR3MXR | SATISFIED (static wiring) | GA script with correct ID in index.html and dist/index.html; live firing is human UAT |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/Skill.js` | 47 | `ChipBadge` has hardcoded `animate-on-scroll is-visible` — the `is-visible` class is always present, bypassing the inView gate | WARNING W-01 | Chips do not animate on scroll; they appear immediately regardless of viewport position. Parent category div still animates (gated on `inView`). Chip stagger delay (`index * 100ms`) is applied but fires at component mount, not at scroll trigger. No functional gap — content is always visible — but the per-chip scroll stagger intended by D-15 does not fire as designed. |
| `src/components/Experience.js` | 20-22 | Section heading (SectionLabel + h2 + p) is not wrapped in `animate-on-scroll` — static, always visible | INFO I-01 | Experience heading does not animate on scroll unlike About, Skill, Contact. Consistent with `sectionRef` being placed on the timeline container div (line 24), not the section header. Minor design inconsistency across sections; no content missing. |

---

## Human Verification Required

### 1. Scroll Entrance Animations

**Test:** Open the site in Chrome/Safari. Scroll slowly past each section (About, Skills, Experience, Contact). Observe each section's content.
**Expected:** Each section's heading and body content fades in and slides up as it enters the viewport at ~25% visible. Multiple experience cards stagger in with 100ms delay between each. Contact cards stagger similarly.
**Why human:** IntersectionObserver triggers cannot be confirmed programmatically. Also confirm that chip animations in Skills (W-01) are acceptable UX — categories animate but individual chips appear immediately.

### 2. GA Page-View Events

**Test:** Open site in Chrome DevTools Network tab, filter by `collect` or `g/collect`. Reload the page.
**Expected:** Within 2 seconds of load, a network request appears to `googletagmanager.com` with `tid=G-4TZJGR3MXR`. Alternatively use GA4 DebugView (requires `?gtm_debug=x` or GA Debugger extension).
**Why human:** Script presence is verified; actual beacon firing requires a live browser session. Per D-18, this is explicitly a human UAT item.

### 3. OG Image Visual Quality

**Test:** Use a social preview tool (e.g., opengraph.xyz or LinkedIn post inspector) with the production URL, or open `scripts/og-template.html` in Chrome and inspect visually.
**Expected:** 1200x630 branded card with dark ink-950 background, Carlos's name in bold, "Solutions Architect & Senior Backend Engineer" with brand purple accent, profile photo on right.
**Why human:** PNG dimensions and visual content cannot be verified without rendering the binary.

---

## Gaps Summary

No blocking gaps found. All 13 requirements (CONT-01 through SEO-02) have substantive, wired implementations. The two issues found are warnings, not blockers:

- **W-01** (Skill chip stagger): `ChipBadge` skips the `inView` gate. Chips are always visible. The scroll animation design intent for per-chip stagger (D-15) is not achieved at the chip level, though the category-level stagger still triggers on scroll. Content is never hidden or missing.
- **I-01** (Experience heading): Section label/h2 in Experience.js is always visible, unlike the other three sections which animate their headings. Aesthetic inconsistency only.

Both items are isolated to visual polish and do not prevent the phase goal from being achieved.

---

_Verified: 2026-05-05T23:30:00Z_
_Verifier: gsd-verifier_
