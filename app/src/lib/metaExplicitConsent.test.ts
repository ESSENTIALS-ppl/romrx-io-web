import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { metaConsentAllows, META_REQUIRES_EXPLICIT_CONSENT } from './consent'

// Oct 19 2026, HELD for Jim's yes: the Meta pixel and CAPI run only after 'Allow ads cookies', in every region.
describe('Meta pixel only after explicit consent', () => {
  it('flag is on', () => { expect(META_REQUIRES_EXPLICIT_CONSENT).toBe(true) })
  it('US and EU/UK with no choice yet: off; explicit grant: on; GPC: off', () => {
    expect(metaConsentAllows('unknown', 'us', false)).toBe(false)
    expect(metaConsentAllows('unknown', 'eu_uk', false)).toBe(false)
    expect(metaConsentAllows('granted', 'us', false)).toBe(true)
    expect(metaConsentAllows('granted', 'eu_uk', false)).toBe(true)
    expect(metaConsentAllows('granted', 'us', true)).toBe(false)
  })
  it('marketing script and CAPI function carry the same gate', () => {
    const root = join(__dirname, '..', '..', '..')
    expect(readFileSync(join(root, 'assets', 'meta-attribution.js'), 'utf8')).toMatch(/META_REQUIRES_EXPLICIT_CONSENT = true;\s*\n\s*if \(META_REQUIRES_EXPLICIT_CONSENT\) return null;/)
    expect(readFileSync(join(root, 'netlify', 'functions', 'meta-capi.js'), 'utf8')).toMatch(/consent_blocked_explicit_only/)
  })
})
