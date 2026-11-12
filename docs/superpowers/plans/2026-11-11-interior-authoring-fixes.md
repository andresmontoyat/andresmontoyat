# Interior authoring fixes — implementation plan

> Four fixes the Tul pilot (`feat/interior-tul`, 7853f19) exposed, approved before the other 10 houses are authored. Then the pilot is reworked on top of them.

**Repos.** Site = this repo. Editor = `/Users/andres/Development/repositories.nosync/codehunters/tools/world-editor`.

**Decisions taken (2026-11-11):**
- Avatar is drawn at world scale **inside interiors only**; the exterior keeps 40×44.
- `walls` layer is honoured on **any** map (exterior and interiors), same code.
- Markers get their own ADR **0006**; export stays `version: 2` (purely additive).
- Tags allowed on a marker: `spawn`, `exit`, `read:<n>`. Refused: `npc*`, `door*`, `animal`, `object`, `poi`.
- Reach rule: every host/read/exit is reachable from the spawn and is the nearest interactable somewhere — not strict non-overlap.
- Room size limit for interiors: ≤ 10 columns and ≤ 14 rows (fits a 390px phone).

## Fix 1 — characters too small inside interiors

**Cause.** `convert.js:18` `WORLD_TILE = 32` → world scale 2: cells and objects are drawn ×2 (`convert.js:224`). The avatar is a 64×64 source cell drawn at `CONFIG.avatar` 40×44 (`scene2d.js:17-18, 281-289`), ≈0.65×; its visible body is ≈8×14 game px next to a 64×36 desk. No camera zoom exists (`engine/camera2d.js` only translates). `map.spriteScales` is editor-only and never exported.

**Approach.** Inside an interior draw the avatar at world scale: 64 × 2 = 128×128 game px (body ≈26×40; exact 2× keeps pixel art crisp). Collision box stays 24 wide (`worldRpg.js:204`). Hosts go back to scale 1.

**Files.** `src/game/config.js`: `avatar.interiorWidth: 128, interiorHeight: 128` (comment: 64px cell × world scale 2). `src/game/render/scene2d.js`: exported pure `avatarSize(state)`; `drawAvatar` uses it.

**Tests.** `scene2d.test.js`: `avatarSize` 40×44 outdoors, 128×128 when `world.interior` is set; `drawAvatar` inside draws at `player.x - 64`.

## Fix 2 — mobile dialog under the D-pad / A

**Cause.** Dialog box at `h-150 … h-30` (`scene2d.js:453-464`), page indicator at `(w-36, h-40)`; `TouchControls` `absolute bottom-4` `h-28` (`WorldRpg.jsx:105-117`) covers `h-128 … h-16`. A already pages/closes (`worldRpg.js:286`).

**Approach.** In `sizeCanvasBuffer` (`WorldRpg.jsx:78`) stamp `canvas.safeBottom = canvasRect.bottom - controlsRect.top` (0 when controls are hidden, i.e. desktop) — same pattern as `logicalWidth`. Pure `dialogRect(w, h, safeBottom, playerScreenY)` in `scene2d.js`: the box goes in the half the player is not in; bottom box ends at `h - safeBottom - 8`, top box starts at y=20. Page indicator is drawn relative to the box.

**Files.** `src/components/react/WorldRpg.jsx` (ref on TouchControls root, stamp). `src/game/render/scene2d.js` (`viewportOf` returns `safeBottom`; `drawDialog`/`drawPageIndicator` use `dialogRect`).

**Tests.** `scene2d.test.js`: `dialogRect` never overlaps `[h-safeBottom, h]`, flips to the top when the player is in the lower half, page indicator inside the box (extend "drawDialog on a phone"). `WorldRpg.test.jsx`: `safeBottom` stamped from a mocked rect, 0 when hidden.

## Fix 3 — walls that block as tiles (ADR 0005)

**Cause.** Only placement hitboxes (`convert.js:216-230` → `interiors.js:16`) and `water` cells (`water.js`, `interiors.js:52-56`) block; `update()` merges those plus buildings/decor (`worldRpg.js:156-157`). Tile layers never block → the pilot needed 36 wall objects + 15 hitboxes.

**Approach.** A tiles layer named `walls`: every painted cell is fully solid (inset 0), merged into row runs with the helper extracted from `water.js` (`cellBox`/`mergeRun`; `waterSolids` keeps `shoreInset`). Honoured on any map. Doorways are unpainted gaps. Tall wall art (e.g. `Interior_Walls.png` cut 16×48) must be re-cut 16×16 and painted as rows, because `drawAuthoredTiles` draws every cell at TILE×TILE (`scene2d.js:252`).

**Files (site).** New `src/game/world/walls.js` (`WALLS_LAYER`, `wallCellsOf(authored)`, `wallSolids(keys, tile)`) + shared merge helper with `water.js`. `convert.js`: `validateWalls(map)` next to `validateWater` (~416, called ~465): refuse a non-tiles `walls` layer; refuse a `spawn` (object or marker) whose cell is a wall cell. `interiors.js` `buildInteriorWorld` adds `wallSolids`. `worldRpg.js`: exterior build (~192) sets `world.wallSolids`; `update()` (~157) concatenates `state.world.wallSolids || []`.

**Files (editor).** `src/map/tags.js`: shared `WATER_LAYER` / `WALLS_LAYER` (today duplicated in `lint.js:349`, `scatter-dialog.js:55`). `src/persist/lint.js`: warnings `walls-shape` (not a tiles layer) and `object-in-wall` (tagged object/marker in a wall cell, read one pixel up like `objectsInWater`), registered next to lines 106-107. `src/ui/scatter-dialog.js:67`: always avoid `walls` cells. No terrain/autotile for walls.

**Tests.** Site: `walls.test.js` (3×2 block → 2 boxes; full cells; no layer → `[]`), `convert.test.js` (non-tiles `walls` throws; spawn in a wall cell throws), `interiors.test.js` (wallSolids built), `worldRpg.test.js` (`stepMovement` cannot enter a wall cell). Editor: `lint.test.js` (walls-shape, object-in-wall), `scatter-dialog.test.js` (no position on a `walls` cell).

**ADR 0005 "The map can draw its own walls"** — builds on 0003/0004. Context: pilot cost. Drivers: what you see blocks; one layer-name contract; maps without the layer unchanged. Options: objects+hitboxes / tile-frame hitboxes / `walls` layer. Decision: `walls` layer as above. Consequences: name is the contract; only whole cells block (thin blockers stay objects); tall wall sheets cut 16×16; doorways are gaps. Confirmation: tests + Tul re-import.

## Fix 4 — sprite-less markers (ADR 0006)

**Cause.** Editor objects are `{ref,x,y}` (`model.js:199`, `canvas.js:134`, `main.js:537` all need a ref). Site turns every object into a drawn, depth-sorted placement (`convert.js:233` → `scene2d.js:433`); `scripts/import-map.mjs:35` does `o.frame.slice`. Pilot workaround: transparent `Indoor_Decor.png#0,4` tagged `spawn`.

**Approach.** A marker is an item in an ordinary objects layer: `{id, uid, x, y, marker: true, name?, tags?}` with no `ref`. Editor: "Marcador" tool; canvas draws a pin + first tag; hit-test with a fixed one-tile box; inspector shows name/tags, hides transform/clip/hitbox. Export: `{x, y, uid, marker: true, name, tags}`, no `frame`; SCHEMA.md entry (additive, version stays 2). Site: a frameless object must have `marker: true` else throw "re-export"; markers skipped by `placementsFrom`, `allRefs` (~275), `dimsCache` (never drawn, sorted or packed); they flow through `interactablesFrom` (~169) and `anchorsFrom`. Allowed tags per the decisions above; a marker with `clip` is refused. Old maps always have frames → unchanged.

**Files (editor).** `src/map/model.js` (`addMarker`; `cloneObjects` keeps `marker`), `src/persist/project.js` (`serializeObject` ~59, `deserializeProject`), `src/persist/export.js` (`exportObjectLayer`), `src/persist/import-map.js` (`importObject`: frameless → marker), `src/persist/lint.js` (`marker-untagged`; other checks skip null ref — `eachRef` in `ref.js:59` already guards), `src/render/canvas.js` (~121-140 marker branch), `src/main.js` (`sizeOf`; tool button ~1106), `src/ui/object-inspector.js`, `src/map/stamps.js`, `index.html`, `docs/SCHEMA.md`.

**Files (site).** `src/game/world/authored/convert.js` (`placementsFrom`, `allRefs`, marker-tag check in `validateMap`, refuse marker with `clip`), `scripts/import-map.mjs:35` (skip frameless objects).

**Tests.** Editor: `model.test.js` (uid minted), `project.test.js` + `import-map.test.js` (round-trip), `export.test.js` (no `frame`, slices don't grow), `lint.test.js` (`marker-untagged`), `object-inspector.test.js` (controls hidden), `stamps.test.js` (markers survive paste). Site `convert.test.js`: spawn marker → interactable, no placement; frameless without `marker` throws; `npc:host` on a marker throws; existing fixtures pass.

**ADR 0006 "A map can mark a point without a sprite"** — builds on 0004. Records the object shape, the allowed tags, the export field and backward compatibility.

## Playable-room test

`src/game/world/interiors.rooms.test.js` globs `src/data/interiors/*.json`, builds each with `buildInteriorWorld`, and asserts: (1) the player box at the spawn hits no placement/water/wall solid; (2) flood-filling free player positions (4px grid) from the spawn, every host/read/exit is the `nearestInteractable` somewhere reachable. Export the player box constant (inline at `worldRpg.js:204`) and `INTERACT_RANGE` (`worldRpg.js:87`). Also add the fast import check "spawn not in a solid" to `validateInterior` (`authored/interior.js`).

## Commits

**Editor** branch `feat/walls-and-markers`: E1 `feat(lint): walls layer warnings` · E2 `feat(scatter): keep walls clear` · E3 `feat(model): sprite-less marker objects` · E4 `feat(ui): marker tool`.

**Site** branch `feat/interior-infra`: S1 `docs(adr): 0005 walls, 0006 markers` (+ this plan) · S2 `feat(world): walls layer blocks` · S3 `feat(world): marker objects import` · S4 `fix(game): interior avatar at world scale` · S5 `fix(game): dialog clears the touch controls` · S6 `test(world): adopted rooms are playable`.

**Pilot** (after both): rebase `feat/interior-tul` onto `feat/interior-infra`; in the editor re-cut `Interior_Walls.png` 16×16, delete the `muros` objects, paint `walls` (side columns 0 and 9, back rows 0–2, bottom row 9 except the door cell), door without hitbox with `exit` (or an exit marker), replace the transparent spawn with a `spawn` marker, Bruno scale 1, prune unused hitboxes; export, `npm run map:import && npm run assets:pack`, rooms test green, playtest keyboard + touch at 390px; commit `refactor(world): Tul walls as a layer, spawn as a marker`.

## Verification

Both repos: `npx vitest run` green. Site, before every commit with src changes: production build + Playwright checks + Lighthouse mobile (home ≥0.95/1/1/1; for S4/S5 also the game page ≥0.95 with `features.game` forced on in a scratch worktree only). Node 22 for the site.
