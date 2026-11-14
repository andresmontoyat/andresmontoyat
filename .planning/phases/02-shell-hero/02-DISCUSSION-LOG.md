# Phase 2: Shell & Hero - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 02-shell-hero
**Areas discussed:** Component refactor strategy, Scroll-spy + smooth-scroll lib, Mobile menu rendering pattern, Phase 2 testing strategy

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Component refactor strategy | Modify existing Hero.js/Nav.js in-place vs create new components and replace | ✓ |
| Scroll-spy + smooth-scroll lib | react-scroll (declared dep, unused) vs native CSS + custom IntersectionObserver | ✓ |
| Mobile menu rendering pattern | React portal to document.body vs inline fixed within Nav | ✓ |
| Phase 2 testing strategy | Manual / Vitest+RTL / Playwright e2e | ✓ |

**User's choice:** All four areas selected for discussion.

---

## Component Refactor Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Modify in-place | Edit existing Hero.js / Nav.js directly. Lower diff, retain git history per file. | ✓ |
| Rewrite same files | Replace contents wholesale. Same import paths, no App.js change. | |
| New files + replace | Create HeroV2.js / NavV2.js, swap imports, delete old. | |

**User's choice:** Modify in-place.
**Notes:** Keeps file paths stable; avoids parallel implementations during transition.

---

## Scroll-Spy + Smooth-Scroll

| Option | Description | Selected |
|--------|-------------|----------|
| Native + custom IO | CSS `scroll-behavior: smooth` + custom IntersectionObserver hook. Drop unused react-scroll dep. | ✓ |
| react-scroll (existing dep) | Use react-scroll Link/Element/scrollSpy. Less code, more runtime. | |
| Native + react-scroll hybrid | Custom IO for spy; react-scroll only for smooth Link behavior. | |

**User's choice:** Native + custom IO.
**Notes:** Aligns with UI-SPEC's IntersectionObserver spec. react-scroll dep slated for removal.

---

## Mobile Menu Rendering Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| React portal to body | createPortal(overlay, document.body). Clean z-index + scroll-lock. | ✓ |
| Inline fixed in Nav | Render overlay as fixed-positioned div inside Nav. Simpler, z-index discipline required. | |

**User's choice:** React portal to body.
**Notes:** Avoids stacking context conflicts with sticky nav; body scroll-lock applies cleanly.

---

## Phase 2 Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual browser only | No automated tests. Verify via /gsd:verify-work. Fastest delivery. | ✓ |
| Vitest + RTL units | Add Vitest + @testing-library/react. Unit-test scroll-spy hook, lang persistence, CV download mapping. | |
| Playwright e2e smoke | Add Playwright. One smoke test covering full Phase 2 flow. | |

**User's choice:** Manual browser only.
**Notes:** Test runner setup deferred — revisit in Phase 4 if quality gates demand it.

---

## Continuation Prompt

| Option | Description | Selected |
|--------|-------------|----------|
| Explore more | Surface additional gray areas (SEO-04 flash mitigation, html lang attr, CV UX). | |
| Ready for context | UI-SPEC + Phase 1 + 4 captured decisions cover the surface. | ✓ |

**User's choice:** Ready for context.

---

## Implementer's Discretion

- `<html lang>` attribute syncing on language change
- Per-language `<title>` and `<meta description>` updates
- Scroll progress bar exact CSS implementation
- Custom hook directory creation (`src/hooks/`)
- Hero `<section>` semantic structure

## Deferred Ideas

- Test infrastructure setup (Vitest / Playwright) — Phase 4 candidate
- About / Skills / Experience / Contact / Footer redesigns — Phase 3
- Lighthouse 90+ enforcement — Phase 4
- `website-new/` directory cleanup — flagged in STATE.md, opportunistic during Phase 2 or defer to Phase 4
