// Parts of the site that are built but not ready to be public. A switch that is off ships no way in:
// no link, no splash, and its route sends the visitor home.
//
// An object read at render time rather than a bare constant, so a test can flip a switch and render
// both states.
export const features = {
  // The Career World game: the /game route, the entry splash, the nav link and the Experience
  // platformer. Off until the game is finished (docs/superpowers/specs/2026-10-20-career-rpg-roadmap-design.md).
  game: false,
  // The Player 2 section (consoles, handles, favourite games). Off until the real handles are in
  // src/data/gamer.json: today they are placeholders.
  gamer: false,
}
