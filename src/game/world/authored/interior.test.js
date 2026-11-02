import { describe, it, expect } from 'vitest'
import { convertMap } from './convert.js'
import { interiorIdOf, validateInterior, interiorData, interiorCoverage } from './interior.js'

const ID = 'tul-2022'
const lines = n => Array.from({ length: n }, (_, i) => `bullet ${i + 1}`)
const entry = (n, { es = n, visible = true } = {}) => ({
  id: ID, visible, bullets: { en: lines(n), es: lines(es) },
})
const tagged = (kind, id, flags = {}) => ({ uid: `${kind}-${id}`, kind, ...(id ? { id } : {}), x: 0, y: 0, ...flags })
const reads = ns => ns.map(n => tagged('read', String(n)))
const room = (readNs = [1, 2, 3, 4]) => [
  tagged('spawn', null, { spawn: true }),
  tagged('npc', 'host'),
  ...reads(readNs),
  tagged('exit', null, { exit: true }),
]
const validate = (items, e = entry(4), doors = [ID]) => () => validateInterior(ID, items, e, doors)

describe('interiorIdOf', () => {
  it('should name the interior after its map file', () => {
    expect(interiorIdOf('tul-2022.map.json')).toBe(ID)
  })
  it('should ignore a file that is not a map', () => {
    expect(interiorIdOf('tul-2022.manifest.json')).toBeNull()
  })
})

describe('validateInterior', () => {
  it('should accept a complete room', () => {
    expect(validate(room())).not.toThrow()
  })

  it('should refuse an unknown experience id', () => {
    expect(validate(room(), null)).toThrow(/^interior tul-2022: .*no experience entry/)
  })

  it('should refuse a hidden experience entry', () => {
    expect(validate(room(), entry(4, { visible: false }))).toThrow(/^interior tul-2022: .*hidden/)
  })

  // Same rule as the exterior import: only visible: false hides an entry.
  it('should accept an entry that does not say whether it is visible', () => {
    const { visible, ...unsaid } = entry(4)
    expect(validate(room(), unsaid)).not.toThrow()
  })

  it('should refuse an id with no door on the exterior', () => {
    expect(validate(room(), entry(4), [])).toThrow(/^interior tul-2022: .*door/)
  })

  it.each([['spawn'], ['npc:host'], ['exit']])('should refuse a room with no %s', tag => {
    const items = room().filter(i => (i.id ? `${i.kind}:${i.id}` : i.kind) !== tag)
    expect(validate(items)).toThrow(new RegExp(`^interior tul-2022: .*${tag}.*0`))
  })

  it.each([
    ['spawn', tagged('spawn', null, { spawn: true })],
    ['npc:host', tagged('npc', 'host')],
    ['exit', tagged('exit', null, { exit: true })],
  ])('should refuse a room with two %s', (tag, extra) => {
    const items = [...room(), { ...extra, uid: 'again' }]
    expect(validate(items)).toThrow(new RegExp(`^interior tul-2022: .*${tag}.*2`))
  })

  // The import gives an object its first flag as kind, so a solid exit is kind 'solid': the rule
  // must count what the runtime looks for, the flag.
  it.each([['spawn'], ['exit']])('should accept a %s that is also solid', flag => {
    const items = room().map(i => (i[flag] ? { ...i, kind: 'solid', solid: true } : i))
    expect(validate(items)).not.toThrow()
  })

  it.each([['spawn'], ['exit']])('should count a solid %s next to a plain one as two', flag => {
    const extra = { uid: 'again', kind: 'solid', x: 0, y: 0, solid: true, [flag]: true }
    expect(validate([...room(), extra])).toThrow(new RegExp(`^interior tul-2022: .*${flag}.*2`))
  })

  it('should name the bullet nobody reads', () => {
    expect(validate(room([1, 2, 4]))).toThrow(/read:3/)
  })

  it.each([['5'], ['0'], ['x']])('should refuse read:%s for four bullets', n => {
    expect(validate([...room(), tagged('read', n)])).toThrow(new RegExp(`^interior tul-2022: .*read:${n}`))
  })

  it('should refuse a bullet read twice', () => {
    expect(validate([...room(), tagged('read', '2')])).toThrow(/read:2.*twice|twice.*read:2/)
  })

  it('should refuse an npc other than the host', () => {
    expect(validate([...room(), tagged('npc', 'bob')])).toThrow(/npc:bob/)
  })

  it('should refuse EN and ES with different bullet counts', () => {
    expect(validate(room(), entry(4, { es: 3 }))).toThrow(/en 4.*es 3/)
  })
})

describe('interiorData', () => {
  const fixture = tags => ({
    version: 2, tileSize: 16, world: { w: 64, h: 64 }, clips: [],
    slices: { 'Cute_Fantasy/Buildings/House.png': { type: 'single', w: 32, h: 32 } },
    layers: [{
      name: 'Sala',
      type: 'objects',
      objects: [{ frame: 'Cute_Fantasy/Buildings/House.png#0,0', x: 16, y: 32, uid: 'U1', tags }],
    }],
  })
  const convert = () => convertMap(fixture(['spawn']), { dimsOf: () => ({ w: 64, h: 64 }), exists: () => true, interior: true })

  it('should scale the spawn by the world scale of a 16px pack', () => {
    const spawn = convert().interactables.find(i => i.spawn)
    expect([spawn.x, spawn.y]).toEqual([32, 64])
  })

  it('should keep everything but the manifest', () => {
    expect(Object.keys(interiorData(convert())).sort()).toEqual(['clips', 'interactables', 'placements', 'tiles'])
  })
})

describe('interiorCoverage', () => {
  it('should say which houses have an interior and which do not', () => {
    expect(interiorCoverage([ID], ['zeta-2020', ID, 'acme-2019']))
      .toBe('interiors: 1 of 3 houses — with: tul-2022 — without: acme-2019, zeta-2020')
  })

  it('should say none when no house has one', () => {
    expect(interiorCoverage([], ['acme-2019'])).toBe('interiors: 0 of 1 houses — with: none — without: acme-2019')
  })
})
