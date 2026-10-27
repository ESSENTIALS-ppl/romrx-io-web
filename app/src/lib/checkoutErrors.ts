// Friendly text for create-checkout-session error codes.
// base_checkout_unavailable: the edge function fails Base checkout closed from 48 hours before the fixed
// Jan 1, 2027 trial end until post-Jan-1 Base terms are approved.
export const BASE_UNAVAILABLE_CODE = 'base_checkout_unavailable'
export const BASE_UNAVAILABLE_MESSAGE = 'Base sign-up is temporarily unavailable. Please check back soon.'
// packs_closed: create-checkout-session v40 refuses sport pack checkouts until packs open (env PACKS_CHECKOUT_OPEN).
export const PACKS_CLOSED_CODE = 'packs_closed'
import { PACK_LAUNCH_DATE, PACK_EMAIL_LINE } from './packLaunch'
// PACK-LAUNCH-DATE: from packLaunch.ts. Must match the edge function packs_gate.ts text (v2 held until consent yes).
export const PACKS_CLOSED_MESSAGE = `Sport packs open in ${PACK_LAUNCH_DATE}. ${PACK_EMAIL_LINE}`

/** Returns the message to show for a checkout response body, or the fallback when there is no better text. */
export function checkoutErrorMessage(
  data: { error?: string | null; message?: string | null } | null | undefined,
  fallback: string,
): string {
  if (data?.error === BASE_UNAVAILABLE_CODE) return BASE_UNAVAILABLE_MESSAGE
  return data?.message || data?.error || fallback
}
