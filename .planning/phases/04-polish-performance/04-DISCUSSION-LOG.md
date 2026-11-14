# Phase 4: Polish & Performance - Discussion Log

> **Audit trail only.** Decisions captured in CONTEXT.md.

**Date:** 2026-05-07
**Phase:** 04-polish-performance
**Areas discussed:** Lighthouse measurement + opt priorities, Test infra final call, Tap target audit + a11y sweep, Real-device + jank verification, Phase 3 polish carryover

---

## Gray Area Selection

| Option | Selected |
|--------|----------|
| Lighthouse optimization + measurement env | ✓ |
| Test infrastructure final call | ✓ |
| Tap target audit (RESP-03) + a11y sweep | ✓ |
| Real-device + responsive testing scope (RESP-01/02) | ✓ |

---

## Lighthouse Measurement Environment (SEO-03)

| Option | Selected |
|--------|----------|
| Local prod build via Lighthouse CLI | ✓ |
| Deployed Vercel/Netlify preview | |
| Both — local first, deployed after | |

---

## Optimization Priorities (multiselect)

| Option | Selected |
|--------|----------|
| Image optimization | ✓ |
| Code splitting / lazy routes | ✓ |
| Font preload + display:swap | ✓ |
| Strip unused deps + tree-shake audit | ✓ |

All four selected.

---

## Bundle Analysis Tool

| Option | Selected |
|--------|----------|
| rollup-plugin-visualizer | ✓ |
| vite-bundle-visualizer CLI | |
| Skip — trust Lighthouse + Network | |

---

## Test Infrastructure Final Call

| Option | Selected |
|--------|----------|
| Skip — manual UAT only | ✓ |
| Vitest + RTL units only | |
| Playwright e2e smoke | |
| Both Vitest + Playwright | |

---

## Visual Regression

| Option | Selected |
|--------|----------|
| Skip visual regression | ✓ |
| Playwright screenshot baselines | |
| N/A | |

---

## Tap Target Audit Method

| Option | Selected |
|--------|----------|
| Lighthouse a11y report only | ✓ |
| Manual DevTools sweep | |
| axe-core CLI | |

---

## Copy Email Button (32px exception)

| Option | Selected |
|--------|----------|
| Bump to min-h-[44px] | ✓ |
| Keep 32px, document exception | |

---

## A11y Items (multiselect)

| Option | Selected |
|--------|----------|
| Fix jsx-a11y warnings | ✓ |
| ARIA landmark roles audit | ✓ |
| Color contrast verification | ✓ |
| Keyboard navigation full pass | ✓ |

All four selected.

---

## Real-Device Testing Scope

| Option | Selected |
|--------|----------|
| DevTools responsive only | ✓ |
| Own phone(s) | |
| BrowserStack/SauceLabs | |

---

## Frame-Rate Jank Verification

| Option | Selected |
|--------|----------|
| Chrome DevTools Performance profile | ✓ |
| Mid-range Android record session | |
| Both | |

---

## Phase 3 Polish Carryover (W-01 + I-01)

| Option | Selected |
|--------|----------|
| Fold into Phase 4 | ✓ |
| Skip — already PASS UAT | |

---

## Continuation Prompt

| Option | Selected |
|--------|----------|
| Ready for context | ✓ |
| Explore more | |

---

## Implementer's Discretion

- Which sections get React.lazy split
- Exact font-display value if @fontsource doesn't already set swap
- Skip-to-content link copy + position
- Tailwind purge / arbitrary value cleanup
- Vite manualChunks config
- Image format strategy (AVIF/WebP picture)
- Specific font preload strategy (2 vs 5 weights)
- jsx-a11y warning resolution per category

## Deferred Ideas

- Test infrastructure (post-v3.4)
- JSON-LD Person schema (backlog)
- Sitemap (backlog)
- AVIF picture fallback (backlog)
- BrowserStack cross-device (backlog)
- Real Android phone perf (backlog)
- Visual regression (backlog)
- REQUIREMENTS traceability sync (milestone audit)
- Deploy target (milestone-level)
- Domain registration (milestone-level)
