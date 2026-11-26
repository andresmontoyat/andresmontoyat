// The tag values this game understands, exported for the map editor so it can suggest and lint them.
// Which kind is valid on which map is the game's knowledge, so it travels in the file (the editor
// picks `overworld` or `interior` by the map's own flag). Keys are inserted in a fixed order so the
// committed JSON is byte-stable, and there is no timestamp: the CI equality test would fail daily.

// Same filter as scripts/import-map.mjs: a door is demanded only for a visible, identified entry.
const isVisible = e => e.visible !== false && e.id

export function vocabularyFrom(experience) {
  const visible = (experience.entries || []).filter(isVisible)
  const ids = visible.map(e => e.id).sort()
  const byId = Object.fromEntries(visible.map(e => [e.id, e]))
  return {
    vocabVersion: 1,
    consumer: 'career-world',
    overworld: {
      door: { values: ids },
      npc: { free: true },
      animal: { free: true },
      object: { free: true },
      poi: { free: true },
      solid: {},
      spawn: {},
    },
    interior: {
      npc: { values: ['host'] },
      read: { numeric: true },
      solid: {},
      spawn: {},
      exit: {},
    },
    interiors: Object.fromEntries(ids.map(id => [id, { reads: byId[id].bullets.en.length }])),
  }
}
