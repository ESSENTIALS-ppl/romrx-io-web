// Stripe TEST mode request flag for fixture accounts (CA ARL audit, Sep 29, 2026).
// This only ASKS for test mode. The edge functions (create-checkout-session, create-portal-session) honor
// stripe_test_mode: true only when the signed-in user's email passes public.is_test_account(email) AND a
// sk_test_ key is configured. For every other account the flag is ignored and the live key is used, so a
// real customer can never be moved to test mode from the browser.
// Turn on:  any app URL with ?stripe_test=1 (kept for this browser tab via sessionStorage)
// Turn off: ?stripe_test=0, or close the tab
const KEY = 'romrx_stripe_test'

function storage(): Storage | null {
  try { return typeof window !== 'undefined' ? window.sessionStorage : null } catch { return null }
}

/** Reads ?stripe_test=1 / 0 from the current URL (if any) and returns whether test mode is requested. */
export function isStripeTestRequested(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  const s = storage()
  const v = new URLSearchParams(search).get('stripe_test')
  try {
    if (v === '1') s?.setItem(KEY, '1')
    else if (v === '0') s?.removeItem(KEY)
    return s?.getItem(KEY) === '1'
  } catch {
    return v === '1'
  }
}

/** Adds stripe_test_mode: true to a checkout/portal request body only when test mode was requested. */
export function withStripeTestFlag<T extends Record<string, unknown>>(body: T, search?: string): T & { stripe_test_mode?: true } {
  return isStripeTestRequested(search) ? { ...body, stripe_test_mode: true as const } : body
}
