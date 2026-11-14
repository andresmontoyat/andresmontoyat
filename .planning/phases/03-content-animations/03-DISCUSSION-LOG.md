# Phase 3: Content & Animations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves alternatives considered.

**Date:** 2026-05-05
**Phase:** 03-content-animations
**Areas discussed:** Experience timeline + tech chips + expand, Skills layout + categorization, Contact + social links scope, Animation thresholds + Open Graph image (+ About bonus)

---

## Gray Area Selection

| Option | Selected |
|--------|----------|
| Experience timeline + tech chips + expand | ✓ |
| Skills layout + categorization | ✓ |
| Contact + social links scope | ✓ |
| Animation thresholds + Open Graph image | ✓ |

---

## Experience Timeline Visual (CONT-03)

| Option | Selected |
|--------|----------|
| Vertical timeline (rail+dots) | ✓ |
| Alternating zigzag | |
| Card grid with date headers | |

---

## Tech Chips Source (CONT-04)

| Option | Selected |
|--------|----------|
| Add tech:[] field per entry | ✓ |
| Extract from bullets | |

---

## Expand/Collapse Pattern (CONT-05)

| Option | Selected |
|--------|----------|
| Independent toggles | ✓ |
| Accordion (only one open) | |
| Show featured + 'show all' | |

---

## Initial State

| Option | Selected |
|--------|----------|
| All 12 visible (collapsed) | ✓ |
| Featured only + 'Show all' | |

---

## Skills Layout (CONT-02)

| Option | Selected |
|--------|----------|
| Group by category | ✓ |
| Keep flat 6-card grid | |
| Single chip cloud | |

---

## Skill Icons

| Option | Selected |
|--------|----------|
| Mono symbols (current) | ✓ |
| Devicon or simple-icons | |
| Custom inline SVG | |

---

## Show Proficiency/Years

| Option | Selected |
|--------|----------|
| No — just names | |
| Years subtly | ✓ |
| Highlight 'core' | |

---

## Email Prominence (CONT-06)

| Option | Selected |
|--------|----------|
| Hero email + 3 secondary cards | ✓ |
| Equal 4-card grid | |

---

## Contact Methods

**User free-text response:** "email, phone, linkedin, github"

Recorded as:
- Email (hero)
- Phone (secondary)
- LinkedIn (secondary)
- GitHub (secondary)

No location card. No Docker. No YouTube.

---

## Copy-to-Clipboard Confirmation

| Option | Selected |
|--------|----------|
| Inline label swap | ✓ |
| Icon morph + checkmark | |
| Toast notification | |

---

## Social Links (Footer, CONT-07)

Implicitly resolved by contact methods choice → GitHub + LinkedIn only in Footer (drop Docker/YouTube).

---

## Animation Threshold (ANIM-01)

| Option | Selected |
|--------|----------|
| 10% visible | |
| 25% visible | ✓ |
| 50% visible | |

---

## Stagger Delay (ANIM-03)

| Option | Selected |
|--------|----------|
| 60ms per item | |
| 100ms per item | ✓ |
| 150ms per item | |

---

## Open Graph Image (SEO-01)

| Option | Selected |
|--------|----------|
| Existing me.webp | |
| New branded 1200x630 card | ✓ |
| Defer to Phase 4 | |

---

## About Section (CONT-01)

| Option | Selected |
|--------|----------|
| Keep + animate only | ✓ |
| Refresh copy, keep layout | |
| Redesign layout | |

---

## Continuation Prompt

| Option | Selected |
|--------|----------|
| Ready for context | ✓ |
| Explore more | |

---

## Implementer's Discretion

- Exact tech list per job entry (D-06)
- Exact category-to-skills mapping (D-02)
- Skill year/proficiency values (D-04)
- Vertical timeline rail visual specifics
- Expand chevron icon source
- Copy-to-clipboard implementation details
- OG image generation method
- Per-language OG sync approach

## Deferred Ideas

- Test infrastructure (Phase 4)
- Lighthouse 90+ (Phase 4)
- JSON-LD Person schema (backlog)
- WebP pipeline (backlog)
- Contact form (out of scope)
- Skills proficiency bars / star ratings (backlog)
- About copy rewrite / redesign (deferred)
- Per-language OG images (not required)
