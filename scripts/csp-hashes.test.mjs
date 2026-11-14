import { describe, expect, it } from 'vitest'
import { hashInline, missingFrom } from './csp-hashes.mjs'

const page = '<script>a()</script><script>window.va=1</script><script src="/x.js"></script>'

describe('csp-hashes', () => {
  it('hashes inline scripts only', () => {
    expect(hashInline(page)).toHaveLength(2)
  })

  it('leaves out the Vercel snippet when checking the build', () => {
    expect(hashInline(page, { skipVercel: true })).toHaveLength(1)
  })

  it('reports the hashes the policy lacks, once each', () => {
    const [own] = hashInline(page)
    expect(missingFrom(`script-src 'self'`, [own, own])).toEqual([own])
    expect(missingFrom(`script-src ${own}`, [own])).toEqual([])
  })
})
