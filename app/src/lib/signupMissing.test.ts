/**
 * Jim 2026-10-05: the signup button looked dead on a phone. Guards the missing-field hint copy
 * and that Signup.tsx shows it under the button and scrolls to the first missing field on tap.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SIGNUP_HINT_AGE, SIGNUP_HINT_BOTH, SIGNUP_HINT_TERMS, signupMissing, signupMissingHint,
} from './signupMissing'

const s = readFileSync(join(resolve(__dirname, '..'), 'pages/Signup.tsx'), 'utf8')

describe('signup missing-field hint', () => {
  it('lists missing fields in page order (Age group above the Terms box)', () => {
    expect(signupMissing({ ageBucket: '', agreedToTerms: false })).toEqual(['age', 'terms'])
    expect(signupMissing({ ageBucket: '', agreedToTerms: true })).toEqual(['age'])
    expect(signupMissing({ ageBucket: '30-44', agreedToTerms: false })).toEqual(['terms'])
    expect(signupMissing({ ageBucket: '30-44', agreedToTerms: true })).toEqual([])
  })

  it('names what is missing in plain words', () => {
    expect(signupMissingHint(['age', 'terms'])).toBe('Choose your age group and check the box to continue.')
    expect(signupMissingHint(['age'])).toBe('Choose your age group to continue.')
    expect(signupMissingHint(['terms'])).toBe('Check the box to continue.')
    expect(signupMissingHint([])).toBe('')
  })

  it('copy has no em or en dash and uses American spelling', () => {
    for (const c of [SIGNUP_HINT_BOTH, SIGNUP_HINT_AGE, SIGNUP_HINT_TERMS]) {
      expect(c).not.toMatch(/[\u2013\u2014]/)
      expect(c).not.toMatch(/colour|tick|organis|favour/i)
    }
  })

  it('Signup.tsx renders the hint under the button and scrolls to the first missing field', () => {
    expect(s).toContain('data-testid="signup-missing-hint"')
    expect(s.indexOf('data-testid="signup-missing-hint"')).toBeGreaterThan(s.indexOf('type="submit"'))
    expect(s).toContain('onClick={handleSubmitClick}')
    expect(s).toMatch(/scrollIntoView\(\{ behavior: 'smooth', block: 'center' \}\)/)
    expect(s).toContain("if (!ageBucket) { setError('Age group is required.'); return }")
  })

  it('Terms box starts unchecked and is never auto-checked by the tap-to-scroll path', () => {
    expect(s).toContain('const [agreedToTerms, setAgreedToTerms] = useState(false)')
    // Only the checkbox's own onChange (the person's tap on the box) may set it.
    const setters = s.match(/setAgreedToTerms\(/g) ?? []
    expect(setters.length).toBe(1)
    expect(s).toContain('onChange={e => { setAgreedToTerms(e.target.checked);')
    expect(s).not.toMatch(/setAgreedToTerms\(true\)/)
    expect(s).not.toMatch(/defaultChecked/)
    const tap = s.slice(s.indexOf('const handleSubmitClick'), s.indexOf('const handleSubmit = async'))
    expect(tap).not.toMatch(/setAgreedToTerms|\.checked\s*=|\.click\(\)/)
  })

  it('hint strings match Stacy-approved copy exactly (Oct 5)', () => {
    expect(SIGNUP_HINT_BOTH).toBe('Choose your age group and check the box to continue.')
    expect(SIGNUP_HINT_AGE).toBe('Choose your age group to continue.')
    expect(SIGNUP_HINT_TERMS).toBe('Check the box to continue.')
  })
})
