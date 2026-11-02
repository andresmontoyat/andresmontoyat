# Authored map

`career.map.json` is the raw export from the world-editor
(`codehunters/tools/world-editor`), committed verbatim.

## Re-import after editing the map

1. Export the map from the editor, overwrite `career.map.json`.
2. `npm run map:import`  — regenerates manifest.authored.js, career.tiles.json, placements.json, clips.json, interactables.json
3. `npm run assets:pack` — rebakes atlas.png / atlas.json
4. `npm test`
5. Commit all generated files together.

Requires the paid Cute Fantasy pack unpacked at `public/game/cute-fantasy/`
(gitignored). The import cannot run in CI.

> **The committed map is export v1 and the import now refuses it.** `validateMap` requires export
> version 2 or newer, which is where the editor started writing a per-object `uid` — the handle every
> link from the game into the map hangs off. `career.map.json` predates that, so the next
> `npm run map:import` stops with a re-export instruction until the map is exported again from the
> editor. Hand-bumping its `version` field would be a lie about provenance, which is the one thing
> that number is for.

## Tags: what the game reads off an object

The editor writes a `uid` on every placed object and lets an author put `tags` and `props` on it (see
`docs/SCHEMA.md` in the world-editor repo). The editor validates the SHAPE of a tag — a bare word or
`kind:value` — and knows nothing about what any of it means. Naming the kinds is this side's job,
enforced in `convert.js`:

| Tag | Means |
|---|---|
| `door:<experienceId>` | this building is that job — enter it and talk |
| `npc:<dialogId>` | a person with a conversation |
| `animal:<kind>` | an animal that reacts |
| `object:<dialogId>` | something examinable |
| `poi:<poiId>` | a point of interest that is not a job |
| `solid` | the player collides with it |
| `spawn` | where the player starts (at most one in the map) |

The import also cross-checks `door:` ids against the CV: a door naming a job that is not a visible
entry in `experience.json` **fails the import**, because at runtime it would simply never match and
the house would silently not appear. The run then reports coverage —
`authored houses: 3 of 11 experiences` — which is the migration's progress bar. An experience with no
house yet is still generated procedurally, so that number is one to watch, not a failure; it becomes
one when the generator is deleted (see `docs/adr/0001-the-map-owns-the-world.md`).

`door:` and `poi:` ids name ONE object each and the import refuses a duplicate. `npc:` ids may repeat
— two villagers with the same lines is a legitimate world. An unknown kind, a tagged object with no
uid, an object carrying two identities at once, a duplicate uid and a second spawn are all refused
too: the editor's export dialog offers "Exportar igual", so a lint-dirty file can reach here and every
check is this side's own.

Tagged objects appear in BOTH generated files: `placements.json` draws them, `interactables.json`
says what they are, joined by `uid`. Untagged objects are scenery and appear only in placements.

Nothing in the game reads `interactables.json` yet — the interaction system, dialog trees and
interiors are later work. This file is the contract they will read.

## Anchors, the older convention

`anchor:<biome>` layer names predate object tags and still work: a layer so named must hold exactly
one object, and that point becomes the biome's centre. Tags are the general mechanism now; the anchor
convention stays because the seed map uses it.

## The map defines the world's size

`WORLD_W`/`WORLD_H` in `overworld.js` are now the fallback for a caller with no map, not the truth.
The world is `cols x rows` of the authored map, measured at the game's 32px tile: today 60x45 cells
= **1920x1440**, where the constants said 2140x1360.

That is what closes the old gap. The carpet used to end 220px before the world did, and those pixels
showed procedural ground; now the world ends where the map ends, so the gap cannot exist by
construction. The cost is that the castle town sits 40px from the right edge — to give it room, make
the map wider in the editor and paint the new cells.

## Verified path shape

Bundle refs look like: `Cute_Fantasy/Tiles/Grass/Grass_1_Middle.png#3,2`
(pack root included). `publicUrlFor` strips the root and serves from
`/game/cute-fantasy/`.

## Seed map provenance

`career.map.json` is the operator's export, with one edit: the `anchor:farm` layer came out
with TWO objects and validation requires exactly one (an anchor defines a single point — the
town, the player spawn, the barn and the windmill all derive from it). The object at
(159,160) was kept; the one at (27,78) was dropped because it sat on the top-left edge, which
would have thrown half the building ring off the map.

Note also that none of the 12 objects in `props` carries a transform, so this seed does not
exercise flip/rotate/scale visually. The transform code paths are covered by unit tests.

Two further edits, both recorded rather than silently applied:

- **`slices` was backfilled.** The map was exported before the editor emitted slice geometry
  (world-editor commit `9b45a5d`). The block was generated once by running the editor's own
  `buildManifest` over the referenced paths — not by reimplementing its heuristic here. The
  next export carries the block natively, and `validateMap` now refuses a map without one.
- **`Capa 2` was dropped.** It flood-filled `Big_Oak_Tree` across all 2700 cells — a bucket fill
  with a tree selected on a tiles layer. It was invisible while frames were sliced wrongly;
  once they were fixed it wallpapered the world with oaks. The editor now warns about exactly
  this in its status line (`click = rellenar región · los tiles no se seleccionan ni rotan`).

## Adopting an interior

A house opens onto its own map (docs/adr/0004). A file in `interiors/` means the interior is
adopted; the house it belongs to then lets the player walk in instead of showing the card.

- **File name = experience id.** Save the editor export as
  `src/game/world/authored/interiors/<id>.map.json`, where `<id>` is the `id` of the entry in
  `src/data/experience.json` (and of the `door:<id>` on the exterior map). The entry must be visible.
- **Four tags**, all placed on objects:
  - `spawn` — exactly one; where the player lands on entering.
  - `npc:host` — exactly one; tells the card, as the house does today.
  - `read:<n>` — one per bullet, `n` counted from 1, covering exactly `1..bullets.length`.
    The English and Spanish bullet counts must match.
  - `exit` — exactly one; the action that leaves, back to the door.
  `door:` is refused inside an interior, and `read`/`exit` are refused on the exterior.
- **Drafts stay in the editor project.** Only an interior ready to adopt goes in `interiors/`:
  any invalid file there fails the whole `map:import`.
- **Two commands**, both needing the paid pack locally:
  `npm run map:import` then `npm run assets:pack`. They write `src/data/interiors/<id>.json`,
  `<id>.atlas.json`, `interiors/<id>.manifest.json` and `public/game/interiors/<id>.png`; commit all
  of them. Removing the map file and re-running both closes the house and deletes its files.
