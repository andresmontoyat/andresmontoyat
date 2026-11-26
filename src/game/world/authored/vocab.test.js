import { describe, it, expect } from 'vitest'
import { vocabularyFrom } from './vocab.js'
import experience from '../../../data/experience.json'
import committed from './career.vocab.json'

const entry = (id, reads, extra = {}) => ({
  id,
  bullets: { en: Array.from({ length: reads }, (_, i) => `b${i}`) },
  ...extra,
})

const input = {
  entries: [entry('b', 3), entry('a', 2), entry('h', 5, { visible: false })],
}

describe('vocabularyFrom', () => {
  it('should list only visible experiences as door values, sorted', () => {
    expect(vocabularyFrom(input).overworld.door.values).toEqual(['a', 'b'])
  })

  it('should give each visible experience its english bullet count', () => {
    expect(vocabularyFrom(input).interiors).toEqual({ a: { reads: 2 }, b: { reads: 3 } })
  })

  it('should mark npc, animal, object, poi as free on the overworld', () => {
    const { overworld } = vocabularyFrom(input)
    for (const kind of ['npc', 'animal', 'object', 'poi']) expect(overworld[kind]).toEqual({ free: true })
    expect(overworld.solid).toEqual({})
    expect(overworld.spawn).toEqual({})
  })

  it('should offer only host as an interior npc', () => {
    const { interior } = vocabularyFrom(input)
    expect(interior.npc).toEqual({ values: ['host'] })
    expect(interior.read).toEqual({ numeric: true })
    expect(interior.exit).toEqual({})
  })

  it('should keep the keys in a fixed order so the file is stable', () => {
    expect(Object.keys(vocabularyFrom(input))).toEqual([
      'vocabVersion', 'consumer', 'overworld', 'interior', 'interiors',
    ])
  })

  it('should match the committed career.vocab.json', () => {
    expect(vocabularyFrom(experience)).toEqual(committed)
  })
})
