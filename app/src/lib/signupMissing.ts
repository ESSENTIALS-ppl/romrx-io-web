/**
 * Jim bug report 2026-10-05: on a phone the "Create account & start assessment" button looked dead.
 * It stays inactive until Age group is chosen and the Terms box is checked, and nothing said why.
 * These helpers name what is missing (in page order) and the one-line hint shown under the button.
 */
export type SignupMissingField = 'age' | 'terms'

export function signupMissing(state: { ageBucket: string; agreedToTerms: boolean }): SignupMissingField[] {
  const missing: SignupMissingField[] = []
  if (!state.ageBucket) missing.push('age')
  if (!state.agreedToTerms) missing.push('terms')
  return missing
}

export const SIGNUP_HINT_BOTH = 'Choose your age group and check the box to continue.'
export const SIGNUP_HINT_AGE = 'Choose your age group to continue.'
export const SIGNUP_HINT_TERMS = 'Check the box to continue.'

export function signupMissingHint(missing: SignupMissingField[]): string {
  const age = missing.includes('age')
  const terms = missing.includes('terms')
  if (age && terms) return SIGNUP_HINT_BOTH
  if (age) return SIGNUP_HINT_AGE
  if (terms) return SIGNUP_HINT_TERMS
  return ''
}
