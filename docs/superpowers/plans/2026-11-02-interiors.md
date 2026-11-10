# Interiors (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A house whose experience has an adopted interior map can be entered; inside, a host gives the experience's card, one object per bullet reads that bullet in EN/ES, and an exit returns the player to the house's door.

**Architecture:** Each interior is an ordinary world-editor export at `src/game/world/authored/interiors/<experience-id>.map.json`. `npm run map:import` converts it with the existing `convertMap` (interior mode) plus interior checks, and writes a per-interior data file; `npm run assets:pack` bakes a per-interior atlas. At runtime the game discovers adopted interiors through a lazy `import.meta.glob`, loads one when the player enters, and swaps the exterior's world for the interior's, then swaps it back on exit.

**Tech Stack:** Astro static + React island, vanilla JS game (canvas 2D), Vitest, sharp (Node scripts), Vite `import.meta.glob`.

**Spec:** `docs/superpowers/specs/2026-11-02-interiors-design.md` · ADR `docs/adr/0004-a-house-can-have-an-interior.md` (accepted)

## Global Constraints

- Node ≥22: prefix commands with `PATH=/opt/homebrew/bin:$PATH`.
- Commits: Conventional Commits, no AI attribution of any kind (no trailer, no tool name in versioned files).
- GSD: every site change gets a `.planning/STATE.md` row (`| fast | <what> | <date> | <sha> | — |`) in a `docs(state): …` commit.
- Text comes only from `src/data/experience.json` (`entries[].bullets.{en,es}`, `title`, `company`, `date`, `metric`, `tech`). The map holds references, never prose.
- Tag vocabulary inside an interior: `spawn` (exactly 1), `npc:host` (exactly 1), `read:<n>` 1-based bullet, covering exactly `1..bullets.length`, `exit` (exactly 1). `read` and `exit` are refused on the exterior map, and `door:` is refused inside an interior.
- A file in `interiors/` means adopted; any invalid interior fails the whole `map:import`.
- Bullet counts in EN and ES must be equal for an interior's experience, or the import fails naming it.
- Host dialog = today's card, `dialogLines(site, lang)`, unchanged (tech line included).
- Exit = the action at the `exit` object. On exit, the player stands at `doorPoint(site)` facing `down`.
- Entering a house marks it `seen` (burst + `discover` sfx on first time), like opening the card today.
- A house without an adopted interior opens today's card.
- No interior is fetched on first load; Lighthouse mobile gate `npm run lighthouse:check` (performance ≥ 0.95, a11y/BP/SEO = 1.0) passes on a preview with `features.game=true`.
- `features.game` stays `false` in the committed `src/config/features.js`.
- The paid pack (`public/game/cute-fantasy/`) is gitignored; generated artifacts are versioned.

## Review Focus

1. **Language switch with a different page count in EN and ES, mid-dialog.** The dialog must clamp to the last page of the new language, not show blank text or throw. Test: Task 4.
2. **Pressing the action repeatedly while an interior is loading.** Only one load may run, the player is frozen meanwhile, and the scene switches once. Test: Task 6.
3. **The interior load fails (chunk 404, image error).** The player must stay outside, unfrozen, and see the house's card instead. Test: Task 6.
4. **An interior smaller than the viewport.** The room must be centred on screen, not pinned to the top-left with void on two sides. Test: Task 5 (camera).
5. **An interior exported with a different tile size or world size than the exterior.** Positions (spawn, host, reads, exit) must come out in game pixels through `worldScaleOf`, exactly like the exterior. Test: Task 2.

---

### Task 1: Tag vocabulary — `read` and `exit`, and where each map may use them

**Files:**
- Modify: `src/game/world/authored/convert.js` (`IDENTITY_KINDS`, `FLAG_TAGS`, `validateMap`, `convertMap`)
- Test: `src/game/world/authored/convert.test.js`

**Interfaces:**
- Produces: `convertMap(map, { dimsOf, exists, experienceIds, interior = false })`. In interior mode, `validateMap` skips door coverage (`experienceIds` is ignored) and refuses `door:` tags. In exterior mode, it refuses `read:` and `exit`.
- Produces: interactable entries `{ kind: 'read', id: '<n>' }` and `{ kind: 'exit' | …, exit: true }`, using the existing `interactablesFrom` shape.

- [ ] **Step 1: Write the failing tests** in `convert.test.js`, using the file's existing map fixture builder:
  - `should read a read:<n> tag as kind read with id n`: `interactablesFrom` on an object tagged `['read:3']` gives an entry with `kind: 'read'` and `id: '3'`.
  - `should read exit as a flag`: tagged `['exit']` gives `exit: true`, and `kind: 'exit'` when it carries no identity.
  - `should refuse read and exit on the exterior map`: `convertMap(exteriorWith(['read:1']), …)` throws `/read.*interior/`, and the same holds for `['exit']`.
  - `should refuse a door inside an interior`: `convertMap(mapWith(['door:tul-2022']), { …, interior: true })` throws `/door.*interior/`.
  - `should skip door coverage for an interior`: an interior map with no doors converts with `experienceIds` set.
- [ ] **Step 2: Run them and confirm they fail.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/world/authored/convert.test.js`. Expected: the 5 new tests FAIL, and today's tests still pass.
- [ ] **Step 3: Implement.** Add `'read'` to `IDENTITY_KINDS` and `'exit'` to `FLAG_TAGS`. Thread `interior` through `convertMap` → `validateMap`. The check walks tags with the same parser (`readTag`) and throws with the layer and object position, in the style of the existing messages.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/world/authored`. Expected: all PASS.
- [ ] **Step 5: Re-run the real exterior import.** Run `PATH=/opt/homebrew/bin:$PATH npm run map:import && git status --short`. Expected: `authored houses: 11 of 11`, and no generated file changed.
- [ ] **Step 6: Commit** with `feat(world): read and exit tags, interior-only`.

### Task 2: Interior rules — one host, one spawn, one exit, every bullet read once

**Files:**
- Create: `src/game/world/authored/interior.js`
- Test: `src/game/world/authored/interior.test.js`

**Interfaces:**
- Consumes: `convertMap(…, { interior: true })` output from Task 1, and an `experience.json` entry.
- Produces:
  - `interiorIdOf(fileName: string) → string | null`. `'tul-2022.map.json'` → `'tul-2022'`. Anything not ending in `.map.json` → `null`.
  - `validateInterior(id: string, interactables: Entry[], entry: ExperienceEntry | undefined, exteriorDoorIds: string[]) → void`. Throws an `Error` whose message starts with `interior <id>:`.
  - `interiorData(out: ConvertOutput) → { tiles, placements, clips, interactables }`. This is the runtime file's content, without `manifest`.

- [ ] **Step 1: Write the failing tests.** Use a small `entry(nBullets)` factory: `{ id: 'tul-2022', visible: true, bullets: { en: [...n], es: [...n] } }`. Use a `tagged(kind, id, flags)` factory for interactables.
  - Accepts a complete room: 1 `spawn`, 1 `npc:host`, `read:1..4`, 1 `exit`, for a 4-bullet entry.
  - Refuses an unknown id, a hidden entry (`visible: false`), and an id not in `exteriorDoorIds`. Each message names the id.
  - Refuses 0 or 2 of each of `spawn`, `npc:host` and `exit`. The message names the tag and the count.
  - Refuses a missing bullet (`read:1,2,4` for 4 bullets → message contains `read:3`).
  - Refuses `read:5` for 4 bullets, `read:0`, `read:x`, and a repeated `read:2`.
  - Refuses an `npc:` other than `host` (`npc:bob`).
  - Refuses EN/ES bullet counts that differ (`en` 4, `es` 3). The message names both counts.
  - Review-focus 5: `convertMap` on an interior fixture with `tileSize: 16` gives a `spawn` entry at `x * 2, y * 2` (the `worldScaleOf` scale).
  - `interiorIdOf`: `'tul-2022.map.json'` → `'tul-2022'`, `'tul-2022.manifest.json'` → `null`.
- [ ] **Step 2: Run them and confirm they fail.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/world/authored/interior.test.js`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `interior.js` with the three functions. Keep each check its own small function, in the style of `water.js`.
- [ ] **Step 4: Run the tests and confirm they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with `feat(world): the rules an interior map must meet`.

### Task 3: Pipeline — import and pack each adopted interior

**Files:**
- Modify: `scripts/import-map.mjs`
- Modify: `scripts/pack-atlas.mjs` (extract `packFrames`)
- Modify: `src/game/world/authored/README.md` (how to adopt an interior)
- Create (generated, per interior):
  - `src/data/interiors/<id>.json`: runtime data;
  - `src/game/world/authored/interiors/<id>.manifest.json`: frames to bake;
  - `src/data/interiors/<id>.atlas.json`: frame rects;
  - `public/game/interiors/<id>.png`: the atlas.

**Interfaces:**
- Consumes: `interiorIdOf`, `validateInterior` and `interiorData` (Task 2), and `convertMap(…, { interior: true })` (Task 1).
- Produces:
  - `src/data/interiors/<id>.json` = `{ tiles, placements, clips, interactables }`.
  - `src/data/interiors/<id>.atlas.json` = `{ images: { interior: '/game/interiors/<id>.png' }, frames: { <name>: { img: 'interior', x, y, w, h } } }`. The image key is `interior`, not `atlas`, so it can merge with the main atlas in Task 5.
  - Exported `packFrames(frames, imageUrlOf, { outPng, imgKey, url }) → Promise<{ images, frames }>` in `pack-atlas.mjs`. The main atlas calls it with `imgKey: 'atlas'`. Today's `atlas.png`/`atlas.json` output must stay byte-identical.

- [ ] **Step 1: Refactor the pack script.** Move `dedupeFrames` + `shelfPack` + composite into `packFrames` without changing output. Run `PATH=/opt/homebrew/bin:$PATH npm run assets:pack && git status --short public/game src/game/assets`. Expected: no changes.
- [ ] **Step 2: Import the interiors.** In `import-map.mjs`, after the exterior:
  - Read every `*.map.json` in `src/game/world/authored/interiors/` (missing folder = none), sorted by name.
  - For each, run `convertMap(map, { dimsOf, exists, interior: true })` and `validateInterior(id, out.interactables, entryById[id], exteriorDoorIds)`.
  - Write the two generated files.
  - Delete generated files whose interior no longer exists, so a removed interior closes its house.
  - Print `interiors: <k> of 11 houses (<ids>)`.
  - `dimsCache` already handles any map; reuse it per interior.
- [ ] **Step 3: Pack the interiors.** In `pack-atlas.mjs`, after the main atlas: for each `src/game/world/authored/interiors/*.manifest.json`, call `packFrames` → `public/game/interiors/<id>.png` + `src/data/interiors/<id>.atlas.json`. Also delete atlases with no manifest.
- [ ] **Step 4: End-to-end with a throwaway interior.** Hand-write `src/game/world/authored/interiors/tul-2022.map.json`:
  - start from a copy of an existing export fixture;
  - a 20×15-cell world, a floor layer from `Houses_Interiors/`;
  - objects tagged `spawn`, `npc:host`, `read:1`…`read:4`, `exit`.

  Run `PATH=/opt/homebrew/bin:$PATH npm run map:import && npm run assets:pack`. Expected: `interiors: 1 of 11 houses (tul-2022)`, and the four generated files exist.

  Then remove the fixture, re-run both commands, and confirm the generated files are gone and `git status` is clean. **Do not commit the throwaway interior.**
- [ ] **Step 5: Check failure.** Hand-break the throwaway file (drop `read:2`) and run `npm run map:import`. Expected: exit code 1 and `interior tul-2022: … read:2`.
- [ ] **Step 6: README.** Add a section "Adopting an interior" to `src/game/world/authored/README.md`:
  - file name = experience id;
  - the four tags;
  - drafts stay in the editor project;
  - the two commands.
- [ ] **Step 7: Run the full suite.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run`. Expected: all PASS (563 + new).
- [ ] **Step 8: Commit** with `feat(world): import and pack each adopted interior`.

### Task 4: Paged dialog with text sources

**Files:**
- Modify: `src/game/render/dialog.js`
- Modify: `src/game/render/scene2d.js` (`drawDialog`: page indicator)
- Test: `src/game/render/dialog.test.js`

**Interfaces:**
- Produces:
  - `paginate(text: string, { cols = 46, rows = 4 }) → string[]`. Word-wraps at `cols`, then groups the lines into pages of `rows`. A word longer than `cols` is hard-split.
  - `siteSource(site) → { pages(lang) → string[] }`. One page: `dialogLines(site, lang).join('\n')`.
  - `bulletSource(entry, n) → { pages(lang) → string[] }`. `paginate(entry.bullets[lang][n - 1])`.
  - `createDialog()`: `open(source)` now takes a source. `open(site)` still works: a value without `pages` is wrapped with `siteSource`. `advance()` goes typing → waiting → next page (typing) → … → closed after the last page. `visibleText(lang)` and `page(lang) → { index, count }`.
- [ ] **Step 1: Write the failing tests.**
  - `paginate` of a 200-char bullet gives ≥ 2 pages, each ≤ 4 lines of ≤ 46 chars, and joining them back gives the same words.
  - A 3-page source needs `advance` ×6 to close (type-skip + next, per page). `page('en').index` goes 0 → 1 → 2.
  - Review-focus 1: with source `pages(en)=3`, `pages(es)=2`, advanced to index 2, `visibleText('es')` is the last ES page (not `''`) and `page('es')` = `{ index: 1, count: 2 }`.
  - `open(site)` with a bare site keeps today's text, so the existing dialog tests are unchanged.
- [ ] **Step 2: Run them and confirm they fail.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/render/dialog.test.js`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** The `typed` length is the max over `en`/`es` of the current page, as today's `full()` is. `drawDialog` draws `index+1/count` at the box's bottom-right when `count > 1`.
- [ ] **Step 4: Run the tests and confirm they pass.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/render`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(game): a dialog can turn pages, in either language`.

### Task 5: Interior world — build, discover, load, sprites, camera

**Files:**
- Create: `src/game/world/interiors.js`
- Test: `src/game/world/interiors.test.js`
- Modify: `src/game/engine/camera2d.js` (centre a small world)
- Test: `src/game/engine/camera2d.test.js`

**Interfaces:**
- Consumes: `buildAuthoredIndex` and `worldSizeOf` (`world/authored/index.js`), the `placementSolids` logic (move it from `worldRpg.js` to an exported `placementSolids(placements)` in this file, and import it back in `worldRpg.js`), and the Task 3 file shapes.
- Produces:
  - `buildInteriorWorld(data) → { interior: true, worldW, worldH, authored, placements, placementSolids, clips, interactables, sites: [], spawn: {x,y}, host: Entry, reads: Entry[], exit: Entry }`. `reads` is sorted by `Number(id)`.
  - `adoptedInteriorIds(modules = INTERIOR_MODULES) → Set<string>`. The ids from the glob keys `…/interiors/<id>.json`, with `*.atlas.json` excluded.
  - `loadInterior(id, modules = INTERIOR_MODULES) → Promise<{ data, atlas }>`. Rejects for an unknown id.
  - `INTERIOR_MODULES = import.meta.glob('../../data/interiors/*.json', { import: 'default' })`. Lazy: one chunk per file.
  - `withInteriorAtlas(mainAtlas, interiorAtlas) → manifest`. `{ images: { ...main.images, ...interior.images }, frames: { ...main.frames, ...interior.frames } }`. Interior frames win, and the avatar frames still resolve from the main atlas.
  - `followCamera2D`: when `worldW < VW`, `cam.x = (worldW - VW) / 2` (and the same for y). Otherwise it behaves as today.
- [ ] **Step 1: Write the failing tests.** Use a fake `modules` map `{ '../../data/interiors/tul-2022.json': () => Promise.resolve(DATA), '../../data/interiors/tul-2022.atlas.json': () => Promise.resolve(ATLAS) }`.
  - `adoptedInteriorIds(fake)` → `Set{'tul-2022'}`.
  - `loadInterior('tul-2022', fake)` resolves both. `loadInterior('nope', fake)` rejects.
  - `buildInteriorWorld(DATA)`:
    - spawn/host/exit come from the tagged entries;
    - `reads` ids are `['1','2','3','4']` in order;
    - `worldW` = cols × 32;
    - `placementSolids` comes from `placement.solid`.
  - `withInteriorAtlas`: an interior frame overrides a same-named main frame, and a main-only frame (`cfPlayer…`) survives.
  - Review-focus 4 (`camera2d.test.js`): for a world of 640×480 and a viewport of 1024×768, `cam` ends at `x = -192, y = -144` and stays there across calls.
- [ ] **Step 2: Run them and confirm they fail.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/world/interiors.test.js src/game/engine/camera2d.test.js`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** The functions as specified above.
- [ ] **Step 4: Run the tests and confirm they pass.** Run the full suite. Expected: PASS. Moving `placementSolids` breaks nothing.
- [ ] **Step 5: Commit** with `feat(game): load and build an interior world`.

### Task 6: Scene switch — enter, read, leave

**Files:**
- Modify: `src/game/worldRpg.js` (`createWorldRpg`, `interact`, `update`, the `draw` closure)
- Modify: `src/game/render/scene2d.js` (`render2d`: skip exterior-only passes when `state.world.interior`)
- Test: `src/game/worldRpg.test.js`

**Interfaces:**
- Consumes: Task 4 (`siteSource`, `bulletSource`, `createDialog`), Task 5 (all of `interiors.js`), `doorPoint`/`nearestSite` (`entities/site.js`), `loadSprites`.
- Produces:
  - `createWorldRpg({ …, interiorIds = adoptedInteriorIds(), loadInterior: load = loadInterior, loadSheet = loadSprites })`. Injected for tests, where `Image` does not exist: tests pass `loadSheet: () => Promise.resolve(FAKE_SPRITES)`.
  - `state.scene`: `null` outside; inside it is `{ id, site, outside: { world, authored, decor, critters, npcs, sprites, player: {x,y,dir} } }`.
  - `state.entering: boolean`. True while a load runs. `update` treats it like an open dialog (frozen).
  - Exported pure helpers in `worldRpg.js`:
    - `enterInterior(state, site, built, sprites)`;
    - `leaveInterior(state)`;
    - `nearestInteractable(player, world, r = 40) → { kind: 'host'|'read'|'exit', entry } | null`. Distance is to the entry's `(x, y)` (its base point).
  - `interact()` inside: dialog open → advance. Host → `dialog.open(siteSource(scene.site))`. Read → `dialog.open(bulletSource(entryOf(scene.id), Number(entry.id)))`. Exit → `leaveInterior`. `entryOf` looks up `experience.entries` by id.
  - `interact()` outside, at a site:
    - The `seen` handling is as today.
    - If `interiorIds.has(site.id)` and no load is running: set `entering`, then `load(id)`, then `loadSheet(withInteriorAtlas(ATLAS, atlas))`, then `enterInterior`, then clear `entering`.
    - On rejection: clear `entering` and `dialog.open(site)` (Review-focus 3).
    - Otherwise: `dialog.open(site)`, as today.
  - `enterInterior` stashes the exterior fields and sets `state.world = built`, `authored = built.authored`, `decor = critters = npcs = []`, `sprites` and the player at `built.spawn`, facing `up`. Then `cam` snaps to the player.
  - `leaveInterior` restores the stash and puts the player at `doorPoint(site)`, facing `down`. It keeps `clock`, `seen` and `revealed`.
  - `render2d`: when `state.world.interior`, skip `drawGround`, `drawAmbient` and `drawNightOverlay`. `drawAuthoredTiles` gets no `anchors`, which it already handles.
  - `update`: skip `updateRegionMusic` inside.
  - The `draw` closure uses `state.world.worldW/H`, not the captured `world`.
- [ ] **Step 1: Write the failing tests.** Use a fake `load` that resolves a fixture `{ data, atlas }` built from Task 5's fixture, a fake `loadSheet`, and `interiorIds = new Set(['tul-2022'])`. `interact` returns the load promise when it starts one, so tests `await` it.
  - At Tul's door, `interact()` → after await, `state.scene.id === 'tul-2022'`, the player is at the spawn, and `site.seen === true`.
  - At a door without an interior, `interact()` opens the card (today's behaviour), and `state.scene === null`.
  - Inside, standing at the host → `interact()` → `dialog.visibleText('en')` (after `advance`) contains the Tul title.
  - Inside, standing at `read:2` → the text equals bullet 2 of Tul in `es` when `state.lang='es'` (first page).
  - Inside, standing at exit → `interact()` → `state.scene === null`, the player is at `doorPoint(site)`, `dir === 'down'`, the exterior `world.sites.length` is unchanged, and `clock` is preserved.
  - Review-focus 2: `interact()` ×3 at the door before the load resolves → `load` was called once, `update` while `entering` does not move the player, and one scene switch happens.
  - Review-focus 3: `load` rejects → `state.scene === null`, `entering === false`, the dialog is open with the card, and the player moves again on `update`.
  - Inside, `update` with input held moves the player and collides with the interior's `placementSolids`, not the exterior's houses.
- [ ] **Step 2: Run them and confirm they fail.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run src/game/worldRpg.test.js`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** as specified in the Interfaces block.
- [ ] **Step 4: Run the full suite and the build.** Run `PATH=/opt/homebrew/bin:$PATH npx vitest run && npm run build`. Expected: all tests PASS, and the build succeeds.
- [ ] **Step 5: Commit** with `feat(game): walk into a house, read it, walk out`.

### Task 7: Acceptance — playtest, touch, Lighthouse, record

**Files:**
- Modify: `.planning/STATE.md`
- Scratch only (never committed): a worktree `scratchpad/site-accept` with `features.game=true` and the throwaway `tul-2022` interior from Task 3 Step 4.

- [ ] **Step 1: Worktree.** Same recipe as previous playtests: a temporary worktree, symlinked `node_modules` and pack, and `features.game=true`. Add the throwaway interior, run `npm run map:import && npm run assets:pack && npm run build`, then `npx astro preview --port 4322`.
- [ ] **Step 2: Keyboard playtest** (Playwright, headless). Walk to Tul's door, press the action, and assert you are inside. `window.__worldRpg` is DEV-only and absent in preview, so assert with canvas screenshots plus a pixel probe of the floor colour. Then:
  - read the host and all 4 objects in `es`;
  - switch to `en` (`L`) with a dialog open;
  - walk to the exit and press the action;
  - assert you are back outside at the door.

  Save the screenshots in the scratchpad.
- [ ] **Step 3: Touch playtest.** Same route using the on-screen D-pad and action buttons (mobile viewport 390×844, `hasTouch`).
- [ ] **Step 4: Check network.** On first load of `/en/game`, no request for `/game/interiors/` and no `interiors/*.json` chunk. After entering Tul, exactly one PNG and one data chunk are requested.
- [ ] **Step 5: Lighthouse.** Run `LIGHTHOUSE_TARGET_URL=http://localhost:4322/en/game npm run lighthouse:mobile && npm run lighthouse:check`. Expected: `LIGHTHOUSE GATE PASSED`.
- [ ] **Step 6: Tear down** the worktree and confirm `git status` is clean in the main checkout and `features.game` is still `false`.
- [ ] **Step 7: STATE row + commit.** Add a STATE row "Phase 2 interiors pipeline + scene switch; acceptance with a throwaway Tul interior (keyboard + touch + Lighthouse)" with the shas of Tasks 1–6, then commit with `docs(state): log the interiors work`.

After this plan: the author decorates the 11 real interiors in the editor and adopts them one at a time (copy to `interiors/`, the two commands, commit). Each adoption is its own small change.
