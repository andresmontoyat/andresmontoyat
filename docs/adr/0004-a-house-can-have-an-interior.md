# 4. A house can have an interior

- Status: accepted
- Date: 2026-11-02
- Deciders: Carlos Andres Montoya
- Builds on: [0001](0001-the-map-owns-the-world.md) — the map owns the world; houses are `door:<experience-id>`

## Context

After 0001–0003 the exterior map owns the houses, roads, water and decor. A house is still a facade: at
its door the action opens a card with the experience's title, company, dates, metric and stack. Phase 2 of
the roadmap lets the player walk inside, where a character gives that card and the objects of the room
read the experience's bullets.

The world-editor has no notion of an interior. One document is one map, with no portal or second scene
(world-editor `docs/BACKLOG.md`, "Interiors have no representation at all").

## Decision drivers

- Interiors are decorated by hand in the editor, like the exterior.
- Text has one source, `src/data/experience.json`; the map holds references, never prose.
- Houses open one at a time as their interior is finished; a house without one keeps today's card.
- The cheapest path for the editor, without closing the door to a richer one later.

## Considered options

1. **One map document per interior.** Each interior is an ordinary editor map, exported to its own file,
   joined to its house by the experience id.
2. **Several maps in one editor project, with portals.** The editor gains a map list, door targets and
   navigation between maps.
3. **Rooms built by the game from a template.** No authoring; every house the same room with different text.

## Decision

**Option 1.** Option 3 contradicts hand-decorated rooms. Option 2 is the largest change the editor would
take and delays the phase; option 1 needs no editor change to start, and moving to 2 later re-uses every
interior file unchanged, because the per-map format does not change.

**Files.** An interior is `src/game/world/authored/interiors/<experience-id>.map.json`, in the same export
format as `career.map.json`. The file name is the join key.

**Tags inside an interior.**

| Tag | Meaning | Count |
|---|---|---|
| `spawn` | where the player appears on entering (existing flag) | exactly 1 |
| `npc:host` | the character who gives the experience's card | exactly 1 |
| `read:<n>` | reads bullet `n` (1-based) of the experience | one per bullet |
| `exit` | the way out (new flag) | exactly 1 |

`read` joins `IDENTITY_KINDS`, `exit` joins `FLAG_TAGS` in `convert.js`. Neither is meaningful on the
exterior map, and the import refuses them there.

**The import refuses** an interior whose id is not a visible experience with a door outside, one missing
`spawn`, `npc:host` or `exit` or carrying two of any, and one whose `read:<n>` do not cover exactly
`1..bullets.length`. A house opens only when its interior is complete.

**The game** keeps one active scene, the exterior or one interior. Entering is the action at a door whose
house has an interior; leaving is the action at `exit`, and the player comes back at that house's door
point with the exterior's state intact.

## Consequences

- Good: no editor work blocks the phase; each interior is reviewed and adopted on its own.
- Good: bullets and their objects cannot drift apart silently — a bullet added or removed in
  `experience.json` fails the next import until the room matches.
- Bad: editing a bullet count means re-opening that interior in the editor. Accepted: it is the point of
  the check.
- Bad: no editor-side view of which house leads where; the join lives in file names. Revisit with option 2
  if it hurts.
- Neutral: each interior packs its own atlas and is fetched when the player enters, so the exterior's first
  load does not grow with every room. A file in `interiors/` means adopted; drafts stay in the editor
  project, so a half-made room never blocks the exterior's import.

## Confirmation

- `convert.test.js`: tag vocabulary, exterior refusal of `read`/`exit`, bullet coverage, spawn/host/exit
  arity, unknown or hidden experience id.
- `worldRpg.test.js`: entering a house with an interior switches scene; leaving returns to the door point;
  a house without one opens the card.
- Phase 2 acceptance playtest (enter, read every object, leave) on keyboard and touch.
