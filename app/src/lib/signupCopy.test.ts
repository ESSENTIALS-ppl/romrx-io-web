/**
 * Stacy's signup copy (Jim go 2026-10-05). Guards the exact checkbox text and welcome note on
 * /app/signup, and that the billing (ARL) paragraph and the cancel/sales sentence stay off this
 * screen. ARL stays on Stripe Checkout; src/lib/signupDisclosure.ts remains the source of truth there.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const s = readFileSync(join(resolve(__dirname, '..'), 'pages/Signup.tsx'), 'utf8')
// JSX text with whitespace collapsed, so line breaks in the markup do not matter.
const flat = s.replace(/\{' '\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

const CHECKBOX = 'I have read and agree to the ROMRx LLC Terms of Service, Privacy Policy & Refund Policy , a company-wide agreement with ROMRx LLC and its products.'
const WELCOME = 'Creating a profile does not require payment. Next you take the assessment and get your results by email, free. You pay only if you choose Base app access.'

describe('signup copy (Stacy, Oct 5)', () => {
  it('checkbox reads exactly as approved, with the three policy names linked to /legal', () => {
    expect(flat).toContain(CHECKBOX)
    expect(s).toMatch(/<a href="https:\/\/romrx\.io\/legal"[^>]*className="text-cobalt underline[^"]*">\s*Terms of Service, Privacy Policy & Refund Policy\s*<\/a>/)
  })

  it('welcome note is present exactly, above the submit button', () => {
    expect(flat).toContain(WELCOME)
    expect(s.indexOf(WELCOME)).toBeLessThan(s.indexOf('type="submit"'))
  })

  it('checkbox starts unchecked and blocks Create account until checked; age still required', () => {
    expect(s).toMatch(/useState\(false\)/)
    expect(s).toMatch(/const \[agreedToTerms, setAgreedToTerms\] = useState\(false\)/)
    // Oct 5 fix: the button stays tappable (disabled only while loading) and looks inactive until
    // both are done; a tap scrolls to the missing field and the submit handler still refuses.
    expect(s).toMatch(/disabled=\{loading\}/)
    expect(s).toMatch(/aria-disabled=\{missing\.length > 0 \? true : undefined\}/)
    expect(s).toContain("if (!agreedToTerms) { setError('You must agree to the Terms of Service to continue.'); return }")
    expect(s).toContain("if (!ageBucket) { setError('Age group is required.'); return }")
  })

  it('drops the ARL paragraph, the sales sentence and the product list from this screen', () => {
    expect(s).not.toMatch(/signupDisclosure|SIGNUP_TERMS_SALES_SENTENCE|signup-arl-disclosure/)
    for (const gone of ['Free through', '$60', '$149', 'Cancel anytime', 'sales are final', 'anonymized use of my ROM data']) {
      expect(flat, gone).not.toContain(gone)
    }
    // The product list is gone from the checkbox (the sport Protocol label under the form is separate and stays).
    const box = s.slice(s.indexOf('I have read and agree'), s.indexOf('</span>', s.indexOf('I have read and agree')))
    for (const gone of ['ROMRx Base', 'ROMRx+BJJ', 'ROMRx+BodyBuilding', 'other ROMRx products', 'Cancel', 'final']) {
      expect(box, gone).not.toContain(gone)
    }
  })

  it('customer copy has no em or en dash', () => {
    expect(CHECKBOX + WELCOME).not.toMatch(/[\u2013\u2014]/)
  })
})
