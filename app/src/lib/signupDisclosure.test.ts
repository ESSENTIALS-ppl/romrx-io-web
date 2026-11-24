import { describe, it, expect } from 'vitest'
import { signupDisclosure, sportPackName, SIGNUP_TERMS_SALES_SENTENCE, SIGNUP_PRICES_USD } from './signupDisclosure'

// S2 from STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md (sha256 55c49a8c...), S1 with $60 for $${base}.
const S2 = 'ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 per year, charged to your card on March 1, 2027 and on March 1 every year after until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Cancel before March 1, 2027 and you pay nothing. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before your first charge and before each yearly renewal.'

describe('signup ARL disclosure (S2, 1459)', () => {
  it('uses the locked prices', () => {
    expect(SIGNUP_PRICES_USD).toEqual({ base: 60, pack: 149 })
  })
  it('returns S2 word for word, including when a pack is passed (combo disclosure retired)', () => {
    expect(signupDisclosure(null)).toBe(S2)
    expect(signupDisclosure('')).toBe(S2)
    expect(signupDisclosure('unknown')).toBe(S2)
    expect(signupDisclosure('bjj')).toBe(S2)
    expect(signupDisclosure('BJJ')).toBe(S2)
    expect(signupDisclosure('bodybuilding')).toBe(S2)
    expect(sportPackName('bodybuilding')).toBe('ROMRx+BodyBuilding')
    expect(sportPackName('bjj')).toBe('ROMRx+BJJ')
  })
  it('terms sentence matches the Legal ruling', () => {
    expect(SIGNUP_TERMS_SALES_SENTENCE).toBe('Cancel anytime in Settings. Canceling ends your access right away and stops future charges. After a charge, all sales are final, except where the law requires a refund.')
  })
  it('no em/en dashes and American spelling', () => {
    for (const s of [signupDisclosure(null), signupDisclosure('bjj'), signupDisclosure('bodybuilding'), SIGNUP_TERMS_SALES_SENTENCE]) {
      expect(s).not.toMatch(/[\u2013\u2014]/)
      expect(s.toLowerCase()).not.toContain('cancell')
    }
  })
})
