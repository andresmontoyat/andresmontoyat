// @vitest-environment node
import { describe, expect, it } from 'vitest'
import combosData from '../data/skill-combos.json'
import skills from '../data/skills.json'
import {
  addCard, fanPose, matchesTech, openHeight, openPose, readCombo, sortChips, stackPose, tier,
} from './skill-deck-logic.js'

const localize = (lang) => ({
  synergy: combosData.synergy.map((s) => ({ techs: s.techs, title: s.title[lang], builds: s.builds.map((b) => b[lang]) })),
  byCategory: combosData.byCategory.map((g) => ({ cats: g.cats, title: g.title[lang], builds: g.builds.map((b) => b[lang]) })),
})
const strings = (lang) => Object.fromEntries(Object.entries(skills.decks).map(([k, v]) => [k, v[lang]]))
const card = (name, years, cat, catName = cat) => ({ name, years, cat, catName })

const JAVA = card('Java', 18, 'backend', 'Backend')
const KAFKA = card('Kafka', 6, 'backend', 'Backend')
const AWS = card('AWS', 10, 'cloud', 'Cloud')
const GCP = card('GCP', 6, 'cloud', 'Cloud')
const JENKINS = card('Jenkins', 10, 'devops', 'DevOps')
const HIBERNATE = card('Hibernate', 14, 'backend', 'Backend')
const JUNIE = card('JetBrains Junie', 1, 'ai', 'AI')
const AZURE = card('Azure', 4, 'cloud', 'Cloud')

describe('tier', () => {
  it.each([[1, 'common'], [5, 'common'], [6, 'rare'], [9, 'rare'], [10, 'epic'], [14, 'epic'], [15, 'legendary'], [18, 'legendary']])(
    'should rate %i years as %s',
    (years, expected) => expect(tier(years)).toBe(expected),
  )
})

describe('sortChips', () => {
  it('should put core cards first then sort by years', () => {
    const sorted = sortChips([{ label: 'a', years: 3 }, { label: 'b', years: 9 }, { label: 'c', years: 2, core: true }, { label: 'd', years: 9 }])
    expect(sorted.map((c) => c.label)).toEqual(['c', 'b', 'd', 'a'])
  })
})

describe('readCombo', () => {
  it('should prefer the tech pair synergy over the category combo', () => {
    const r = readCombo([JAVA, KAFKA, AWS], localize('en'), strings('en'))
    expect(r.title).toBe('Event-driven systems')
    expect(r.synergy).toBe('direct')
  })

  it('should read Java + Kafka in Spanish', () => {
    const r = readCombo([JAVA, KAFKA], localize('es'), strings('es'))
    expect(r.title).toBe('Sistemas orientados a eventos')
    expect(r.builds[0]).toMatch(/outbox/)
  })

  it('should pick the widest category combo when there is no pair', () => {
    const r = readCombo([HIBERNATE, GCP, JENKINS], localize('en'), strings('en'))
    expect(r.title).toBe('End-to-end platform')
    expect(r.synergy).toBe('area')
  })

  it('should call a single-category hand a specialist', () => {
    const r = readCombo([HIBERNATE], localize('en'), strings('en'))
    expect(r.title).toBe('Backend specialist')
    expect(r.synergy).toBe('single')
  })

  it('should fall back to a free combination without synergy', () => {
    const r = readCombo([JUNIE, AZURE], localize('es'), strings('es'))
    expect(r.title).toBe('Combinación libre')
    expect(r.synergy).toBe('none')
    expect(r.builds[0]).toBe('Profundidad en JetBrains Junie y Azure')
  })

  it.each([[[JUNIE]], [[JAVA]], [[JAVA, KAFKA, AWS]], [[JUNIE, AZURE]], [[HIBERNATE, GCP, JENKINS]]])(
    'should keep the potential within 1..5',
    (hand) => {
      const { power } = readCombo(hand, localize('en'), strings('en'))
      expect(power).toBeGreaterThanOrEqual(1)
      expect(power).toBeLessThanOrEqual(5)
    },
  )

  it('should never sum years into the result', () => {
    const r = readCombo([JAVA, KAFKA], localize('en'), strings('en'))
    expect(JSON.stringify(r)).not.toMatch(/\b24\b/)
    expect(Object.keys(r).sort()).toEqual(['builds', 'power', 'synergy', 'title'])
  })
})

describe('addCard', () => {
  it('should keep the last three distinct cards', () => {
    const hand = [JAVA, KAFKA, AWS].reduce(addCard, [])
    expect(addCard(hand, GCP).map((c) => c.name)).toEqual(['Kafka', 'AWS', 'GCP'])
    expect(addCard(hand, JAVA)).toBe(hand)
  })
})

describe('poses', () => {
  it('should hide cards deeper than the sixth in the closed pile', () => {
    expect(stackPose(5).hidden).toBe(false)
    expect(stackPose(6).hidden).toBe(true)
    expect(stackPose(0).z).toBeGreaterThan(stackPose(1).z)
  })

  it('should centre the fan and open the column by fixed steps', () => {
    expect(fanPose(1, 3, 300).tx).toBeCloseTo(0)
    expect(fanPose(0, 3, 300).tx).toBeLessThan(0)
    expect(openPose(2).ty).toBe(88)
    expect(openHeight(11)).toBe(290 + 10 * 44)
  })
})

describe('matchesTech', () => {
  it('should match a card by whole words, case insensitive', () => {
    expect(matchesTech('Kafka', 'kafka')).toBe(true)
    expect(matchesTech('REST / gRPC', 'grpc')).toBe(true)
    expect(matchesTech('Oracle SQL', 'oracle sql')).toBe(true)
    expect(matchesTech('Spring Boot', 'spring')).toBe(true)
  })

  it('should not match a different tech that merely shares letters', () => {
    expect(matchesTech('JavaScript', 'java')).toBe(false)
    expect(matchesTech('Java', 'javascript')).toBe(false)
    expect(matchesTech('Kafka', '')).toBe(false)
  })
})
