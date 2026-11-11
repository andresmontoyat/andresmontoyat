# 6. A map can mark a point without a sprite

- Status: accepted
- Date: 2026-11-11
- Deciders: Carlos Andres Montoya
- Builds on: [0004](0004-a-house-can-have-an-interior.md) — `spawn` and `exit` are tags on objects

## Context

0004 gives an interior four kinds of tagged point: `spawn`, `npc:host`, `read:<n>` and `exit`. A tag
rides on an object, and in the editor every object is a sprite: `{ ref, x, y }`, where `ref` names a
frame of an image. Placing, drawing and hit-testing an object all need that ref.

Some of those points have nothing to draw. Where the player appears is a place, not a thing. The Tul
pilot (`feat/interior-tul`, 7853f19) worked around it: its spawn is a fully transparent frame,
`Indoor_Decor.png#0,4`, tagged `spawn`.

The workaround leaks:

- **It is drawn.** The game turns every object into a placement, so the transparent frame is packed into
  the atlas, depth-sorted and drawn every frame, for nothing.
- **It is invisible in the editor too.** The author cannot see or click where the spawn is.
- **It can hide a real sprite.** Any frame works, so an author who picks a rug draws a rug over the player.

## Decision drivers

- A point the player uses but never sees must not need art.
- The export stays readable by the site as it is today: an old map imports unchanged.
- The tags a point may carry are the ones that mean a place, not a thing.

## Considered options

1. **Keep the transparent sprite.** No change. Every room carries the same trick, and the costs above.
2. **A separate "points" layer type.** Clean, but the editor gains a new layer kind, with its own
   panel, serialisation and export path, for what is still an object with a position and tags.
3. **A marker: an object with no ref**, in an ordinary objects layer.

## Decision

**Option 3. A marker is an item of an objects layer with no ref and `marker: true`.**

**Shape.** In the editor document: `{ id, uid, x, y, marker: true, name?, tags? }`. In the export:
`{ x, y, uid, marker: true, name, tags }`, with no `frame`. The export stays `version: 2`. The field is
additive, and a map without markers is byte-identical to today's.

**Tags.** A marker means a place. It may carry:

| Tag | Meaning |
|---|---|
| `spawn` | where the player appears |
| `exit` | the way out of an interior |
| `read:<n>` | a spot that reads bullet `n` (a window, a view) |

It may not carry `npc*`, `door*`, `animal`, `object` or `poi`. Each of those names a thing the player
sees, and a thing needs a sprite. A marker with a `clip` is refused too: it has nothing to animate.

**The site** treats a marker as a tagged point and nothing else:

- it is an interactable like any tagged object, with its uid, position and tags;
- it is never a placement: never drawn, depth-sorted, given a solid, or packed into the atlas;
- an object with no `frame` and no `marker: true` is refused with "re-export the map". It is a broken
  export, not a marker.

**The editor** gains a marker tool. A marker is drawn as a pin with its first tag, and is hit-tested with
a fixed one-tile box. The inspector shows its name and tags and hides transform, clip and hitbox. The
lint warns on an untagged marker, which marks nothing.

## Consequences

Good:

- The spawn and the exit are visible and clickable in the editor, and cost nothing in the game.
- Nothing can be drawn over the player at the spawn by accident.
- Old maps always have frames, so they import as before.

Bad, and accepted:

- **Two kinds of item in one layer.** Every editor path that reads `ref` must handle a marker without
  one. `eachRef` already skips a missing ref; the rest is covered by the editor's tests.
- **The tag list is enforced on the site.** The editor lints shape, not meaning (as in 0001), so a
  forbidden tag on a marker is reported only at import.

## Confirmation

- Site `convert.test.js`: a `spawn` marker becomes an interactable and no placement; a frameless object
  without `marker` is refused; `npc:host` on a marker is refused; a marker with a clip is refused;
  existing fixtures pass unchanged.
- Editor: a marker gets a uid, survives save, load, export, import and paste, has no `frame` in the
  export, and an untagged one is linted.
- The Tul pilot replaces its transparent spawn with a `spawn` marker, and the rooms test passes on it.
