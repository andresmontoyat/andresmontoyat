# 5. The map can draw its own walls

- Status: accepted
- Date: 2026-11-11
- Deciders: Carlos Andres Montoya
- Builds on: [0003](0003-the-map-can-paint-its-own-water.md) — a layer name makes painted cells behave;
  [0004](0004-a-house-can-have-an-interior.md) — a house can have an interior

## Context

After 0004 an interior is an ordinary map. The first one, the Tul pilot (`feat/interior-tul`, 7853f19),
showed what it costs to make a room hold the player in.

Only two things block today:

- a placed object whose frame has a hitbox (`convert.js` `solidFor` → `interiors.js` `placementSolids`);
- a cell of the `water` layer (`water.js`, docs/adr/0003).

Tile layers never block. So the pilot drew its walls as objects, not tiles:

- **36 wall objects and 15 hitboxes** for a 10×10 room. Every wall segment was placed by hand and given
  a box by hand.
- **What blocks is not what is drawn.** A hitbox is a rectangle on a frame, drawn in a different dialog
  from the wall it belongs to. A gap between two boxes is a hole in the wall that nothing on screen shows.
- **Ten more houses** are waiting for their rooms. The same work, eleven times.

The water layer already solved this problem for ponds: the author paints cells, and the game derives the
collision from them.

## Decision drivers

- What the author sees blocking in the editor is what blocks in the game.
- One contract, the layer name, as for `road` (0002) and `water` (0003).
- A map without the layer behaves exactly as today, exterior and interiors alike.
- No new editor machinery: painting a tile layer already exists.

## Considered options

1. **Keep walls as objects with hitboxes.** No change. The pilot already shows the cost: dozens of
   objects per room, and the boxes drift from the art.
2. **Hitboxes on tile frames.** A frame drawn in a tile layer would block where its hitbox says. This is
   precise to the pixel, but every wall frame needs a box, the tile renderer and the collision would both
   learn about hitboxes, and a frame used as both floor and wall could not say which it is.
3. **A tiles layer named `walls`.** Every painted cell is solid.

## Decision

**Option 3. A map may paint a tiles layer named `walls`. Every painted cell of it blocks, the whole
cell.**

**Collision is the cell.** There is no inset: a wall is solid to its edge, unlike a shore. The cells of
a row that touch are merged into one box, with the same row-merge the water layer uses (the helper is
shared with `water.js`), so a room's walls cost a handful of AABBs.

**Any map.** The layer is read the same way on the exterior and in every interior. The exterior's boxes
are built once with the world; an interior's are built with the room.

**Doorways are gaps.** A doorway is a cell left unpainted. Nothing opens or closes.

**The import checks the walls layer.**

- `walls` must be a tiles layer. An objects layer with that name is refused.
- A `spawn` whose cell is a wall cell is refused. The player would appear inside a wall and could not
  move. The cell is read one pixel above the base point, as the editor does for objects in water.

**In the editor, walls are ordinary tiles.** There is no terrain and no autotile for walls. The scatter
always avoids `walls` cells, as it avoids `water`. The lint warns on a `walls` layer that is not a tiles
layer, and on a tagged object or marker standing in a wall cell.

## Consequences

Good:

- A room's walls are painted in a few strokes. The pilot's 36 objects and 15 hitboxes become one layer.
- The author sees exactly what blocks. A hole in the wall is a hole in the drawing.

Bad, and accepted:

- **The layer name is the contract.** If `walls` is renamed, the walls stop blocking and the player
  walks out of the room. The rooms test (`interiors.rooms.test.js`) catches it for an adopted room.
- **Only whole cells block.** A thin blocker (a railing, a table edge) cannot be half a cell. It stays an
  object with a hitbox, as today.
- **Tall wall sheets must be re-cut 16×16.** `drawAuthoredTiles` draws every cell at one tile, so a wall
  frame cut 16×48 (as `Interior_Walls.png` is in the pilot) is squashed. The sheet is re-cut and the
  wall is painted as rows.

## Confirmation

- `walls.test.js`: a 3×2 block gives 2 boxes; boxes are whole cells; a map without the layer gives none.
- `convert.test.js`: a `walls` layer that is not tiles is refused; a spawn in a wall cell is refused.
- `interiors.test.js`: an interior with a `walls` layer carries its wall solids.
- `worldRpg.test.js`: the player cannot step into a wall cell.
- The Tul pilot is re-imported with its walls painted, and the rooms test passes on it.
