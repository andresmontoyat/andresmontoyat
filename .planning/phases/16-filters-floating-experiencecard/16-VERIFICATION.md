---
phase: 16-filters-floating-experiencecard
verified: 2026-06-02T10:54:00-05:00
status: passed
score: 5/5 must-haves verified (automated) + 9/9 human UAT items pass (2026-06-03)
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Filter chip → constellation dim-others visual flow"
    expected: "Click a skill chip → only matching nodes stay bright (opacity 1), all others dim to 0.35, edges incident to dimmed nodes also dim. No flicker or jank."
    why_human: "Visual fidelity & jank perception cannot be measured statically; opacity transition feel and >60fps smoothness require a real browser."
  - test: "Chip-flash animation when adding skill to filter (motion-safe)"
    expected: "When user clicks a tech chip in the card, the matching constellation node briefly flashes (100ms ease-out). Under prefers-reduced-motion the flash is skipped."
    why_human: "Animation timing/perception requires a browser; static code grep shows the class is conditionally applied (verified) but the visual cue must be sanity-checked."
  - test: "Dual-thumb year-range slider — keyboard a11y in browser"
    expected: "Tab focuses the start thumb, arrow keys move ±1 year, Home/End jump to bounds, Shift+Tab to end thumb. Start thumb cannot exceed end-1. aria-valuetext announced by SR."
    why_human: "Static aria attributes verified (aria-valuemin/max/now/text + role=slider + onKeyDown); real keyboard cycle + screen-reader announcement string need human ear."
  - test: "ExperienceCard focus trap + Esc + return focus to originating node"
    expected: "Open card via Enter on a node → focus lands on H2 heading → Tab cycles through chips/CTA/close → Esc closes → focus returns to the originating constellation node (roving entry)."
    why_human: "Focus-trap unit tests cover wraparound; the return-focus contract is delegated to Phase 15's roving tabindex via Esc closing the card, which is hard to assert in jsdom without integration tests."
  - test: "Mobile bottom-sheet vs desktop popover layout switch"
    expected: "Viewport <768px renders fixed bottom-0 left-0 right-0 bottom-sheet with drag-handle bar + slide-up animation; ≥768px renders anchored popover (max-w 360px) at LAYOUT[selectedSkillId] + offset (24, -60) with fade-in. Both legible in dark + light themes."
    why_human: "Tests assert the CSS classes and inline style; visual positioning + readability on a real device need eyeball confirmation."
  - test: "CV CTA download triggers .docx file (no preview modal)"
    expected: "Click 'Download CV (English)' → browser downloads CV_Carlos_Montoya_EN.docx. Click in ES context → CV_Carlos_Montoya_ES.docx. No PDF preview or in-app modal."
    why_human: "anchor href + download attribute verified; actual browser download behavior + correct filename is a runtime check."
  - test: "Empty intersection state (e.g., Java + Hardware skills)"
    expected: "Selecting two skills with no co-occurrence shows 'No matches — try fewer filters' inside the card (role=status), constellation dims all non-highlighted nodes, no crash."
    why_human: "Empty-state markup verified in test; UX clarity (does the recruiter understand the empty state?) is a human judgment."
  - test: "AA contrast in both themes for new chip/slider/card surfaces"
    expected: "All chip-active, chip-outline, slider-thumb, card-bg, cvCta-bg combinations pass WCAG AA 4.5:1 against their backgrounds in dark AND light themes."
    why_human: "CSS-var tokens are defined for both themes (verified in src/index.css §dark + §light); actual contrast ratios must be measured in a real DOM via DevTools or a contrast checker."
  - test: "Real-device touch on iPhone / Pixel / iPad"
    expected: "44×44px touch targets on all chips/thumbs/close buttons usable without mis-taps; bottom-sheet slide-up + close gestures responsive; no layout shift on filter open."
    why_human: "Touch ergonomics & responsiveness require a physical device."
---

# Phase 16: Filters & Floating ExperienceCard — Verification Report

**Phase Goal:** "The visitor can explore the constellation — narrow it by skills, years, and categories — and on selecting a skill sees the jobs where Carlos used it as floating bilingual experience cards."

**Verified:** 2026-06-02 10:54 GMT-5
**Status:** human_needed — all 5 ROADMAP success criteria PASS via static + automated test verification; 9 items require browser/device UAT before phase can be marked complete.
**Re-verification:** No — initial verification.

## Executive Summary

Phase 16 ships all 6 declared plans (16-01 RED scaffold through 16-06 GameMode wiring). Every artifact named in the canonical refs exists, is substantive (not stub), is wired into the user flow, and pure-logic + component tests cover every D-16-* decision that can be asserted statically. **183/183 tests GREEN** including 27 SvgConstellation, 23 useConstellation, 16 ExperienceCard, 14 GameMode, 13 SkillFilters, 16 filters.test.js. **Production build exits 0; GameMode chunk is 8.82 kB gz** — well below the 14 kB PASS band of the D-16-BUNDLE-GATE three-band gate.

End-to-end data flow is traceable in the source: visitor → `<SkillFilters>` chip click → `cons.toggleSkill(id)` → `selectedSkills` state + `justFilteredId` flash trigger → `composeFilters` derives `highlightedSkillIds` → `<SvgConstellation>` dim-others + `motion-safe:animate-chip-flash` → click node → `cons.onSelectSkill(id)` → `<ExperienceCard>` mounts via portal with `cardJobs = composeFilters(EXPERIENCE, [selectedSkillId + selectedSkills], yearRange, category)` (D-16-INTERSECT-AND) → tech-chip click loops back to `onToggleSkill` → click outside `[data-game-interactive]` → `onClose` → card unmounts.

The ONLY reason status is `human_needed` rather than `passed`: visual fidelity, animation feel, real keyboard navigation, screen-reader announcement strings, mobile touch ergonomics, and AA contrast measurement cannot be verified programmatically. None of these are gaps in the implementation — they are confirmation steps the planner explicitly deferred to end-of-phase UAT.

## Goal Achievement

### Observable Truths (ROADMAP §"Phase 16" — 5 Success Criteria)

| # | Truth (Success Criterion) | Status | Evidence |
|---|---------------------------|--------|----------|
| SC-1 | Visitor can select multiple skills + set a year/timeline range (2007–2026) + pick category chips; filters combine as intersection; reset clears all at once | PASSED | `SkillFilters.js:209-231` renders SkillChips + CategoryChips + YearRangeSlider + ResetButton; `useConstellation.js:103-109` `resetFilters` clears all three dimensions in one action; `useConstellation.js:127` `isFilterActive = selectedSkills.length > 0 \|\| yearRange !== null \|\| category !== null`; `useConstellation.test.js:97` asserts resetFilters clears all three |
| SC-2 | Applying filters highlights the matching skill subset (nodes + their edges) and dims the rest, computed by pure selectors with no flicker or jank | PASSED (visual flicker → human UAT) | `filters.js:25-28` pure `filterBySkillIntersection`; `filters.js:44-50` `composeFilters` is pure; `useConstellation.js:117-125` derives `highlightedSkillIds` via `useMemo` with correct deps (Pitfall 7); `SvgConstellation.js:84-95` `shouldDimNode` composite predicate; `SvgConstellation.js:227-234` dims edges incident to dimmed nodes; `SvgConstellation.test.js:308-356` 3 tests assert dim behavior |
| SC-3 | Selecting a skill opens floating bilingual ExperienceCard(s) for the jobs that used it — showing title, company, date, location, bullets, and tech chips colored by category | PASSED | `GameMode.js:161-172` conditionally mounts `<ExperienceCard>` when `selectedSkillId !== null`; `ExperienceCard.js:155-208` renders `<ol>` of jobs with title/company/date/location/bullets/tech chips; `cardJobs` computed via `composeFilters` (line 82-93); each tech chip rendered as button (line 186) |
| SC-4 | Each experience card exposes a CV CTA that downloads the correct `CV_Carlos_Montoya_{EN,ES}.docx` for the active language | PASSED | `ExperienceCard.js:213-223` `<a href={`/CV_Carlos_Montoya_${lang === 'en' ? 'EN' : 'ES'}.docx`} download>`; CV files present in `public/`: `CV_Carlos_Montoya_EN.docx`, `CV_Carlos_Montoya_ES.docx`; `ExperienceCard.test.js:129,135` assert EN+ES hrefs |
| SC-5 | Filter selectors + card content render correctly in EN/ES + both themes; selecting a skill with no matching experiences shows empty state, never a crash | PASSED | 16 `t.game.*` keys exist in both EN+ES blocks (`translations.js:43-60` + `259-276`); CSS-var tokens defined in both `:root` (dark) and `[data-theme="light"]` blocks (`index.css:75-77` + `159-161`); empty-state branch `ExperienceCard.js:143-149` renders `role="status"` with `t.game.filterEmpty`; `ExperienceCard.test.js:169` asserts empty state |

**Score:** 5/5 truths verified by automated + static evidence.

### Required Artifacts (CONTEXT §Delivers)

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/game/filters.js` | Pure selectors: filterByYearRange, filterBySkillIntersection, filterByCategory, composeFilters, visibleSkillIds, yearBounds — zero framework deps | VERIFIED | 73 lines, named exports only, no react/dom imports. AND semantics on line 27 (`skillIds.every`). 16 unit tests GREEN. |
| `src/game/useConstellation.js` | Filter state holder (selectedSkills, yearRange, category, justFilteredId), derived highlightedSkillIds, toggleSkill/setYearRange/setCategory/resetFilters, yearBounds | VERIFIED | 163 lines. State + derived + setters + 100ms chip-flash timer with cleanup. 23 tests GREEN. |
| `src/game/SkillFilters.js` | Controlled chip+slider+reset bar; data-game-interactive root; WAI-ARIA dual-thumb; bilingual labels | VERIFIED | 234 lines. SkillChips/CategoryChips/YearRangeSlider/ResetButton sub-components. role=slider with aria-valuemin/max/now/text + dependent bounds (line 92-93). 13 tests GREEN. |
| `src/game/ExperienceCard.js` | role=dialog + aria-modal + aria-labelledby + focus trap + portal + click-outside + bilingual CV CTA + empty state | VERIFIED | 231 lines. createPortal at L230. Focus trap L43-70 (Pitfall 3 re-query). Click-outside w/ rAF defer L72-89 (Pitfall 2). 16 tests GREEN. |
| `src/game/renderers/SvgConstellation.js` | Phase 15 renderer extended to read highlightedSkillIds + yearRange (dim-others) + justFilteredId (chip-flash) | VERIFIED | 393 lines. `shouldDimNode` composite predicate L84-95. `nodeMatchesYearRange` L73-78. Chip-flash `motion-safe:animate-chip-flash` on matching node L285-289. 27 tests GREEN. |
| `src/game/GameMode.js` | Wires SkillFilters + SvgConstellation + ExperienceCard; data-game-interactive on renderer-slot; position prop from LAYOUT | VERIFIED | 177 lines. cardJobs memoized via composeFilters with deps `[selectedSkillId, selectedSkills, yearRange, category]` (Pitfall 7). 14 tests GREEN. |
| `src/components/Nav.js` | data-game-interactive on `<header>` so nav clicks don't close card | VERIFIED | `Nav.js:26` `<header data-game-interactive className="sticky top-0…">` |
| `src/i18n/translations.js` | t.game.{filterReset, yearLabel, filterEmpty, cardClose, cvCtaLabel, cardJobsCount, …} EN+ES | VERIFIED | 16 Phase 16 keys present in each language block; zero inline literals in components |
| `tailwind.config.js` keyframes | chipFlash, cardFadeIn, cardSlideUp + animate-chip-flash / animate-card-fade-in / animate-card-slide-up | VERIFIED | L104-108 animation + L143-159 keyframes |
| `src/index.css` CSS-vars | --color-slider-thumb, --color-card-bg, etc. in dark + light blocks | VERIFIED | L75-77 dark, L159-161 light |
| `public/CV_Carlos_Montoya_{EN,ES}.docx` | CV download targets | VERIFIED | both files present in `public/` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| SkillFilters chip click | useConstellation.toggleSkill | `onClick={() => onToggleSkill(node.id)}` (SkillFilters.js:26) → wired in GameMode.js:128 (`onToggleSkill={cons.toggleSkill}`) | WIRED | Bidirectional state propagation via props; useConstellation owns state |
| useConstellation.toggleSkill | justFilteredId set+timeout clear | `setJustFilteredId(id)` + setTimeout (useConstellation.js:83-87); flashTimerRef.current cleanup on unmount L112-114 | WIRED | Timer cleared on REMOVE path skipped (chip-flash signals only NEW filter intent); cleanup on resetFilters L104 |
| useConstellation.highlightedSkillIds | SvgConstellation dim predicate | GameMode.js:148 passes prop; SvgConstellation.js:84-95 `shouldDimNode` reads it | WIRED | Composite with selectedSkillId + yearRange |
| SvgConstellation node click | useConstellation.onSelectSkill | `onClick={() => …onSelectSkill(node.id)}` (SvgConstellation.js:309); GameMode.js:155 wires `onSelectSkill={cons.onSelectSkill}` | WIRED | Phase 15 contract preserved |
| GameMode selectedSkillId !== null | ExperienceCard mount | GameMode.js:161 conditional mount; passes `selectedNode`, `jobs=cardJobs`, `position=LAYOUT[selectedSkillId]` | WIRED | Clean unmount on close via toggle-off (`onClose={() => cons.onSelectSkill(cons.selectedSkillId)}`) |
| ExperienceCard tech-chip click | useConstellation.toggleSkill | `onClick={isLocked ? undefined : () => onToggleSkill(tech)}` (L189); GameMode.js:169 wires `onToggleSkill={cons.toggleSkill}` | WIRED | Loops back to filter state; locked skill (selectedSkillId) skipped |
| ExperienceCard click-outside | onClose | mousedown listener with `!e.target.closest('[data-game-interactive]')` (L77); rAF-deferred attach (Pitfall 2) | WIRED | Allow-list: SkillFilters root + renderer-slot wrapper + Nav `<header>` + dialog itself |
| CV CTA anchor | public/CV_Carlos_Montoya_{EN,ES}.docx | `href={`/CV_Carlos_Montoya_${lang === 'en' ? 'EN' : 'ES'}.docx`}` + `download` (L213-216) | WIRED | Both target files exist in public/ |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| SkillFilters | `nodes` prop | GameMode passes `GRAPH_NODES` from `buildConstellationGraph(EXPERIENCE, SKILLS)` (GameMode.js:22, 122) | Yes — 26 real skill nodes | FLOWING |
| SkillFilters | `yearBounds` | useConstellation returns YEAR_BOUNDS = yearBounds(EXPERIENCE) computed at module load from real EXPERIENCE periods | Yes — [2007, 2026] derived from live data, not hardcoded (D-16-YEAR-BOUNDS) | FLOWING |
| SkillFilters | `category` | useConstellation state, initialized to null; updated via setCategoryState | Yes — flows from CategoryChips click → setCategory → state | FLOWING |
| SvgConstellation | `highlightedSkillIds` | Derived via useMemo from composeFilters(EXPERIENCE, {skillIds, yearRange, category}, SKILLS) → visibleSkillIds | Yes — real intersection over live EXPERIENCE | FLOWING |
| SvgConstellation | `justFilteredId` | useConstellation setJustFilteredId on toggleSkill ADD path with 100ms motion-safe / 0ms reduced-motion timeout clear | Yes — flash trigger flows from toggleSkill to render in same tick | FLOWING |
| ExperienceCard | `jobs` (cardJobs) | GameMode useMemo: composeFilters(EXPERIENCE, {skillIds: [selectedSkillId, …selectedSkills], yearRange, category}, SKILLS) | Yes — D-16-INTERSECT-AND honored; uses live EXPERIENCE data with locked selectedSkillId included | FLOWING |
| ExperienceCard | `selectedNode` | GameMode finds in GRAPH_NODES by selectedSkillId | Yes — live graph node with label/category/count | FLOWING |
| ExperienceCard | `position` | GameMode passes LAYOUT[selectedSkillId] | Yes — desktop popover anchored to baked node position | FLOWING |

No HOLLOW or STATIC findings. Every dynamic-data artifact has a real upstream source.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite GREEN | `npm test -- --run` | 14 files / 183 tests / 1.85s / 0 failures | PASS |
| Production build succeeds | `npm run build` | Exit 0 / 766ms / dist generated | PASS |
| GameMode chunk size respects bundle gate | `ls dist/assets/GameMode-*.js` + reported gzip | 25.56 kB raw / **8.82 kB gz** → PASS band (≤14 kB) | PASS |
| Phase 14/15 regression intact | Test files for ConstellationFallback (5), ViewModeContext (13), ViewModeToggle (8), constellation.graph (17), constellation.layout (6), skills (12), spatialNav (11), setup (2) all GREEN | 74 carry-forward tests pass | PASS |
| CV files present | `ls public/CV_Carlos_Montoya_*.docx` | Both files present | PASS |
| No localStorage writes in game/ source (D-16-PERSIST-MEMORY) | `rg -n "localStorage\|sessionStorage" src/game/` | Only matches in `GameMode.test.js` for `cam-lang` test fixture (not in production code) | PASS |
| Bilingual coverage — no inline EN/ES literals in components | `rg -n "t\.game\." src/game/ src/i18n/translations.js \| wc -l` | 48 usages routed through `t.game.*` | PASS |

### Probe Execution

No conventional `scripts/*/tests/probe-*.sh` probes declared by Phase 16 PLANs (verified via `rg`); D-16-BUNDLE-GATE is enforced via the build's reported gzip output, which was the documented gate mechanism in the SUMMARY. Result: GameMode 8.82 kB gz < 14 kB PASS band.

### CONTEXT.md Decision Compliance (13 D-16-* decisions)

| Decision | Spec | Implementation Evidence | Status |
|----------|------|--------------------------|--------|
| D-16-FLAYOUT-DESKTOP | Persistent visible bottom bar on ≥768px | SkillFilters L207 `bg-ink-900/80 backdrop-blur-sm border-t … rounded-b-xl` (single bar always-rendered) | VERIFIED |
| D-16-FLAYOUT-MOBILE | Top compact toolbar w/ horizontal scroll chips | SkillFilters L19 + L41 `flex gap-2 overflow-x-auto scrollbar-hide md:flex-wrap` | VERIFIED |
| D-16-FLAYOUT-RESET | Single Reset button bilingual + disabled when no filter | SkillFilters L64-79 ResetButton with `disabled={!isFilterActive}` + `aria-disabled` + label via `t.game.filterReset` (EN: "Reset" / ES: "Limpiar" confirmed in translations.js:51,267) | VERIFIED |
| D-16-YEAR-INPUT | Dual-thumb slider w/ keyboard ±1 + Home/End | SkillFilters YearRangeSlider L85-182; handleKey L99-128 with ArrowRight/Left/Up/Down/Home/End | VERIFIED |
| D-16-YEAR-EFFECT | Year range dims non-matching nodes + incident edges | SvgConstellation `nodeMatchesYearRange` L73-78; `shouldDimNode` composite L84-95; edge dim L227-234 | VERIFIED |
| D-16-YEAR-BOUNDS | Slider bounds derived from live data, not hardcoded | filters.js `yearBounds` L68-72; useConstellation.js L10 `YEAR_BOUNDS = yearBounds(EXPERIENCE)` at module scope; useConstellation.test.js:138 asserts [2007, 2026] from live data | VERIFIED |
| D-16-FLOW-OPEN | 1-click direct on node opens card | SvgConstellation L309 `onClick={() => …onSelectSkill(node.id)}`; GameMode L161 conditional mount on `selectedSkillId !== null` | VERIFIED |
| D-16-FLOW-CLOSE-EMPTY | Click outside closes card + clears selection | ExperienceCard L77 mousedown listener with `!e.target.closest('[data-game-interactive]')` → onClose; GameMode L168 `onClose={() => cons.onSelectSkill(cons.selectedSkillId)}` (toggle-off) | VERIFIED |
| D-16-FLOW-SWAP | Click another node while card open → swap | GameMode `key={selectedNode.id}` not on card root; inner content wrapper has `key={selectedNode.id}` (ExperienceCard.js:115) forcing remount on swap; `motion-safe:animate-card-fade-in` on desktop (L109) | VERIFIED |
| D-16-CARD-STRUCTURE | Single scrollable card w/ internal job list; mobile bottom-sheet | ExperienceCard L107-110 base classes; `<ol className="overflow-y-auto …">` L151; mobile drag-handle L111-114 | VERIFIED |
| D-16-CARD-CHIPS | Tech chips clickable to add to filter; locked chip = selected skill | ExperienceCard L182-204; `isLocked = tech === selectedNode.id` (L184) → `onClick={isLocked ? undefined : () => onToggleSkill(tech)}` + `aria-disabled={isLocked}` | VERIFIED |
| D-16-CARD-CV-CTA | CV CTA per card, bilingual, downloads .docx | ExperienceCard L213-223; href `/CV_Carlos_Montoya_${lang === 'en' ? 'EN' : 'ES'}.docx`; `download` attribute; label via `t.game.cvCtaLabel` | VERIFIED |
| D-16-CARD-A11Y | role=dialog, aria-modal, aria-labelledby, focus trap, Esc | ExperienceCard L102-104 + L43-70 focus trap; ExperienceCard.test.js asserts dialog role + aria-modal + focus trap wraparound + Esc | VERIFIED |
| D-16-INTERSECT-AND | Multi-skill = AND co-occurrence | filters.js L27 `skillIds.every((s) => e.tech.includes(s))`; filters.test.js covers; GameMode L82-93 cardJobs uses composeFilters with full `[selectedSkillId, …selectedSkills]` | VERIFIED |
| D-16-INTERSECT-HIGHLIGHT | Brighten selected + connecting edges; dim others | SvgConstellation shouldDimNode L84-95; edge multiplication by 0.35 when incident to dimmed L233 | VERIFIED |
| D-16-PERSIST-MEMORY | In-memory only — no localStorage writes | `rg -n "localStorage" src/game/` shows no production matches (only test fixture in GameMode.test.js) | VERIFIED |
| D-16-PERSIST-CROSS-TOGGLE | Lang/theme toggle preserves in-memory state | useConstellation owns state via React useState; LanguageContext + ThemeContext are independent providers; no reset hook on language change | VERIFIED |
| D-16-CHIP-FLASH | Brief flash on node when chip click adds filter | useConstellation `justFilteredId` + 100ms timeout L82-93; SvgConstellation `motion-safe:animate-chip-flash` conditional on `node.id === justFilteredId` L285-289; tailwind.config.js keyframe `chipFlash` L108+ | VERIFIED |
| D-16-CLICK-OUTSIDE-RENDERER | data-game-interactive on renderer wrapper | GameMode L138 `<div data-game-interactive className="w-full max-w-3xl relative" data-testid="renderer-slot" …>`; GameMode.test.js:124 BLOCKER 1 test asserts SVG-background click does NOT close, swap behavior holds | VERIFIED |
| D-16-CARD-POSITION | Desktop popover anchored via LAYOUT; mobile bottom-sheet | ExperienceCard L29-32 desktopStyle = `{ left: position.x + 24, top: position.y - 60 }` when isDesktop && position; mobile bottom-sheet via fixed-bottom classes L107 | VERIFIED |
| D-16-BUNDLE-GATE | gzip-size gate enforced (≤14 PASS / 14-16 WARN / >16 FAIL) | npm run build reports `GameMode-avtN7BLT.js │ gzip: 8.82 kB` → PASS band | VERIFIED (8.82 kB) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GAME-03 | 16-01..16-04, 16-06 | Visitor can filter by multiple skills + year range + category; intersection semantics | SATISFIED | filters.js + useConstellation.js + SkillFilters.js + SvgConstellation.js dim consumers; 67 supporting tests across modules |
| GAME-04 | 16-01, 16-02, 16-05, 16-06 | Selecting a skill shows floating bilingual ExperienceCard(s) with CV CTA | SATISFIED | ExperienceCard.js + GameMode.js wiring + CV files in public/; 16 ExperienceCard tests cover dialog/focus-trap/Esc/CV-CTA/empty-state/swap/desktop-position/mobile-position |

No orphaned requirements; no other REQ-IDs were declared for Phase 16.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/game/constellation.graph.js | 4 | `// TODO(WR-02): bump CURRENT_YEAR at the start of each calendar year.` | Info | Pre-existing Phase 14 marker, references formal follow-up ID `WR-02` → complies with debt-marker gate; not in any file modified by Phase 16 |

No Phase 16-introduced TODO/FIXME/TBD/XXX/HACK markers. No `return null`/`return {}`/`return []` stub returns in production paths. No hardcoded empty data flowing to render. No `console.log`-only handlers.

## Phase 15 Carry-Forward Integrity

| Carry-forward | Status | Evidence |
|---------------|--------|----------|
| Roving tabindex (Phase 15 D-15-NAV) | Preserved | SvgConstellation L121-124 `rovingNodeId` state; L296 `tabIndex={node.id === rovingNodeId ? 0 : -1}`; spatialNav.test.js 11 tests GREEN |
| Weight-1 edge reveal-on-active (D-15-VIS-EDGE) | Preserved | SvgConstellation L219-224 `incidentToActive` logic intact; SvgConstellation.test.js:71 weight-1 hide test GREEN |
| ARIA contract (role=application, aria-roledescription, aria-live announcement) | Preserved | SvgConstellation L198-200 + L386-388; useConstellation Esc-toggle contract L176-180 |
| sr-only ConstellationFallback | Preserved | GameMode L174 mounts ConstellationFallback; ConstellationFallback.test.js 5 tests GREEN |
| Capability detection + ErrorBoundary | Preserved | GameMode L29-44 detectCapabilities; L46-67 ConstellationErrorBoundary; L99-110 errorFallback with t.game.error + view-mode escape hatch |

## Manual UAT Items (browser-only — cannot verify statically)

See `human_verification:` in frontmatter for the 9 items requiring human browser/device testing. These were not introduced by gaps — they are inherent verification needs deferred from the planner because they require visual / animation / keyboard / SR / contrast / touch judgments.

## Risks / Open Questions for Phase 17

1. **Bundle headroom for WebGL chunk:** Phase 16 added ~3 kB gz to GameMode (from Phase 15's ~5.8 kB → 8.82 kB). Phase 17 must lazy-load three.js into a separate desktop-only chunk to keep the mobile/light path under the +30 kB gz baseline budget. The current 8.82 kB is well within the band — no debt carried.
2. **D-16-FLOW-SWAP cross-fade timing:** Code wires `key={selectedNode.id}` + `motion-safe:animate-card-fade-in` (200ms) but the spec said "150ms cross-fade". The actual 200ms vs spec'd 150ms is a minor cosmetic deviation — non-blocking, recommend confirming during UAT or in a follow-up tweak.
3. **YearRangeSlider is keyboard-only (RESEARCH.md §2 v1):** Pointer-drag explicitly deferred to v2. Acceptable for v3.8 since keyboard a11y is the harder bar; touch users still get full range via two-thumb tap. Document this in Phase 17 close-out if user feedback requests pointer-drag.
4. **Mobile bottom-sheet drag-down gesture:** Spec mentions "drag-down-to-close handled by a small drag-handle bar". Current implementation renders the visual drag-handle bar (L111-114) but no swipe gesture — tap-close via X + Esc + overlay click only. Per CONTEXT §"Implementer's Discretion" this is acceptable ("Optional swipe gesture if planner finds a lean library; otherwise pure tap-close via the X button + Esc + click outside"). Phase 17 may revisit if recruiter UAT shows friction.

## Recommendation

**Mark Phase 16 complete after human UAT closes the 9 items in `human_verification:`.**

All 5 ROADMAP success criteria PASS by automated + static verification. All 21 D-16-* CONTEXT decisions are honored or explicitly out-of-scope. Both requirements (GAME-03, GAME-04) are SATISFIED. Build passes; 183/183 tests GREEN; no regressions in Phase 14/15 tests; bundle in PASS band; no debt markers introduced. The only gating step is human browser/device UAT to confirm visual fidelity, animation feel, keyboard nav by hand, screen-reader announcements, theme contrast, and mobile touch — which cannot be measured programmatically.

If UAT confirms the 9 items, advance to Phase 17 (WebGL Desktop Renderer + Lighthouse Gate).

If UAT reveals issues, re-verify in `gaps_found` mode with the specific failures structured for `/gsd:plan-phase --gaps`.

---

*Verified: 2026-06-02 10:54 GMT-5*
*Verifier: Claude (gsd-verifier, goal-backward methodology)*

## VERIFICATION COMPLETE
