/**
 * Terms acceptance record (Stacy ruling, Oct 5 2026, 9:25 PM ET; correction 9:30 PM).
 *
 * The signup checkbox accepts the single /legal page (Terms, Privacy, Refund; the
 * not-medical-advice / own-choice language is Terms section 3). One version string covers it.
 * Change TERMS_VERSION whenever the /legal "Effective" date changes (a test pins them together),
 * and change the matching value in public.current_terms_version() in the same batch.
 *
 * The record is written by the database in the same step as the account (trigger on auth.users
 * reads these signUp metadata keys), so it cannot silently fail the way a separate client write can.
 * No IP address is recorded.
 */
export const TERMS_VERSION = '2026-10-03'
/** Terms section 3 is accepted by the same checkbox, so the waiver version equals the terms version. */
export const MEDICAL_WAIVER_VERSION = TERMS_VERSION
/** Id for the exact signup checkbox wording (Stacy, Oct 5). Bump it if that wording changes. */
export const SIGNUP_CONSENT_TEXT_VERSION = 'signup-checkbox-2026-10-05'
export const SIGNUP_CONSENT_SOURCE = 'romrx.io/app/signup'
export const REACCEPT_CONSENT_SOURCE = 'romrx.io/app/reaccept'

export function clipUserAgent(ua: string | undefined | null): string {
  return (ua ?? '').slice(0, 512)
}

/** Keys the auth.users trigger reads to create the consents row. Only send when the box was checked. */
export function signupConsentMetadata(agreedToTerms: boolean, userAgent: string | undefined | null) {
  if (!agreedToTerms) return {}
  return {
    terms_accepted: true,
    terms_version: TERMS_VERSION,
    consent_text_version: SIGNUP_CONSENT_TEXT_VERSION,
    consent_source: SIGNUP_CONSENT_SOURCE,
    consent_user_agent: clipUserAgent(userAgent),
  } as const
}

/**
 * Re-accept gate feature flag. Default OFF. Turn on for production with VITE_TERMS_REACCEPT_GATE=on
 * (Sunday batch, after the migration is applied). On non-production hosts only, ?reaccept_gate=1
 * latches it on for this tab so Field can review the screen on a preview.
 */
export const REACCEPT_GATE_LATCH_KEY = 'romrx.reacceptGatePreview'
export function isReacceptGateEnabled(
  envFlag: string | undefined,
  hostname: string,
  search: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
): boolean {
  if ((envFlag ?? '').toLowerCase() === 'on') return true
  const isProdHost = hostname === 'romrx.io' || hostname === 'www.romrx.io'
  if (isProdHost) return false
  try {
    if (new URLSearchParams(search).get('reaccept_gate') === '1') storage?.setItem(REACCEPT_GATE_LATCH_KEY, '1')
    return storage?.getItem(REACCEPT_GATE_LATCH_KEY) === '1'
  } catch {
    return false
  }
}

/** Routes where the gate never shows (signed-out flows, auth hops, opt-out links). */
export function reacceptGateSkipsPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  return ['/login', '/signup', '/auth/callback', '/auth/confirm', '/unsubscribe'].some(
    (x) => p === x || p.startsWith(x + '/'),
  )
}
