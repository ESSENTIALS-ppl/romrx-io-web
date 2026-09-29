import { describe, it, expect } from 'vitest'
import { signupDisclosure, sportPackName, SIGNUP_TERMS_SALES_SENTENCE, SIGNUP_PRICES_USD } from './signupDisclosure'

// Exact spec text, section 3b of ca-arl-plan-20260929.md.
const BASE = 'Free through December 31, 2026. Then $60 per year, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Cancel before January 1, 2027 and you pay nothing.'
const combo = (pack: string) => `Free through December 31, 2026. Then $60 per year for Base plus $149 per year for ${pack}, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Cancel before January 1, 2027 and you pay nothing.`

describe('signup ARL disclosure (spec 3b)', () => {
  it('uses the locked prices', () => {
    expect(SIGNUP_PRICES_USD).toEqual({ base: 60, pack: 149 })
  })
  it('Base only when there is no pack', () => {
    expect(signupDisclosure(null)).toBe(BASE)
    expect(signupDisclosure('')).toBe(BASE)
    expect(signupDisclosure('unknown')).toBe(BASE)
  })
  it('combo line with the right pack name', () => {
    expect(signupDisclosure('bjj')).toBe(combo('ROMRx+BJJ'))
    expect(signupDisclosure('BJJ')).toBe(combo('ROMRx+BJJ'))
    expect(signupDisclosure('bodybuilding')).toBe(combo('ROMRx+BodyBuilding'))
    expect(sportPackName('bodybuilding')).toBe('ROMRx+BodyBuilding')
  })
  it('terms sentence matches the Legal ruling', () => {
    expect(SIGNUP_TERMS_SALES_SENTENCE).toBe('Cancel anytime in Settings to stop future renewals. After a charge, all sales are final, except where the law requires a refund.')
  })
  it('no em/en dashes and American spelling', () => {
    for (const s of [signupDisclosure(null), signupDisclosure('bjj'), signupDisclosure('bodybuilding'), SIGNUP_TERMS_SALES_SENTENCE]) {
      expect(s).not.toMatch(/[\u2013\u2014]/)
      expect(s.toLowerCase()).not.toContain('cancell')
    }
  })
})
