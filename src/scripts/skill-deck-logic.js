// Pure rules of the skill decks, shared by Skill.astro (server-rendered first layout)
// and skill-decks.js (the interactive layer). No DOM access here, so vitest imports it as-is.

export const TIER_STARS = { legendary: '★★★★', epic: '★★★', rare: '★★', common: '★' }
const TIER_POWER = { legendary: 4, epic: 3, rare: 2, common: 1 }

// Rarity by years: common < 6, rare 6-9, epic 10-14, legendary 15+.
export const tier = (years) => {
  if (years >= 15) return 'legendary'
  if (years >= 10) return 'epic'
  return years >= 6 ? 'rare' : 'common'
}

// CORE cards first, then by years (desc); ties keep the data order.
export const sortChips = (chips) =>
  chips.map((c, i) => [c, i])
    .sort(([a, i], [b, j]) => Number(!!b.core) - Number(!!a.core) || b.years - a.years || i - j)
    .map(([c]) => c)

export const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

export const CARD_H = 290
export const OPEN_STEP = 44
const STACK_MAX = 5

// Closed pile: the first six cards peek out with a slight alternating tilt, the rest hide under them.
export const stackPose = (i) => {
  const k = Math.min(i, STACK_MAX)
  return { tx: 0, ty: k * 4, r: (i % 2 ? 1 : -1) * k * 1.4, fx: k * 12, fr: k * 3.5, z: 100 - i, hidden: i > STACK_MAX }
}

// Fan: cards on an arc of radius `radius`, centred on the pile.
export const fanPose = (i, total, radius) => {
  const a = (i - (total - 1) / 2) * Math.min(9, 70 / total)
  const rad = (a * Math.PI) / 180
  return { tx: Math.sin(rad) * radius, ty: (1 - Math.cos(rad)) * radius + 20, r: a, z: i, hidden: false }
}

// Largest angle of a fan of `total` cards, used to fit the arc in the available width.
export const fanHalfAngle = (total) => ((total - 1) / 2) * Math.min(9, 70 / total)

// Open (solitaire column): every card shows its top strip.
export const openPose = (i) => ({ tx: 0, ty: i * OPEN_STEP, r: 0, z: i, hidden: false })

export const openHeight = (total) => CARD_H + (total - 1) * OPEN_STEP

const findPair = (synergy, names) => synergy.find(({ techs }) => techs.every((n) => names.includes(n)))

const findGroup = (byCategory, cats) =>
  byCategory.filter((g) => g.cats.every((c) => cats.includes(c))).sort((a, b) => b.cats.length - a.cats.length)[0]

const powerOf = (cards, bonus) => {
  const base = cards.reduce((a, s) => a + TIER_POWER[tier(s.years)], 0) / (cards.length * 4)
  return Math.min(5, Math.max(1, Math.round(base * 3 + bonus + (cards.length - 1) * 0.5)))
}

const synergyKind = (pair, group, count) => {
  if (pair) return 'direct'
  if (group) return 'area'
  return count > 1 ? 'none' : 'single'
}

const fallback = (cards, cats, t) => ({
  title: cats.length === 1 ? fmt(t.specialist, { cat: cards[0].catName }) : t.free,
  builds: [fmt(t.depth, { names: cards.map((c) => c.name).join(` ${t.and} `) })],
})

// What a hand of 1-3 cards builds together. Years are never summed (they overlap in time):
// a specific tech pair wins over a category combo, and the potential (1..5) grows with tier and synergy.
// cards: [{ name, years, cat, catName }]; combos: localized { synergy, byCategory }; t: localized strings.
export function readCombo(cards, combos, t) {
  const names = cards.map((c) => c.name)
  const cats = [...new Set(cards.map((c) => c.cat))]
  const pair = findPair(combos.synergy, names)
  const group = pair ? undefined : findGroup(combos.byCategory, cats)
  const picked = pair || group
  const text = picked ? { title: picked.title, builds: picked.builds } : fallback(cards, cats, t)
  const bonus = pair ? 2 : group ? 1 : 0
  return { ...text, power: powerOf(cards, bonus), synergy: synergyKind(pair, group, cards.length) }
}

// Hand keeps the last three distinct cards.
export const addCard = (hand, card) => (hand.some((c) => c.name === card.name) ? hand : [...hand.slice(-2), card])
