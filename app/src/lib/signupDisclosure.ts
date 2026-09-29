// CA auto-renewal (ARL) disclosure shown next to the signup button.
// Copy is Legal's locked section 3b text (ca-arl-plan-20260929.md). Static is fine here because it matches
// the locked beta terms; the Stripe Checkout page pulls live prices at runtime.
// Keep all prices in this one constant.
export const SIGNUP_PRICES_USD = { base: 60, pack: 149 } as const

export const SPORT_PACK_NAMES: Record<string, string> = {
  bjj: 'ROMRx+BJJ',
  bodybuilding: 'ROMRx+BodyBuilding',
}

/** Pack display name for a ?add= value, or null when there is no recognized sport pack. */
export function sportPackName(add: string | null | undefined): string | null {
  return SPORT_PACK_NAMES[(add ?? '').trim().toLowerCase()] ?? null
}

/** Section 3b disclosure: Base-only line, or the Base plus sport pack line when the signup carries a pack. */
export function signupDisclosure(add: string | null | undefined): string {
  const pack = sportPackName(add)
  const { base, pack: packPrice } = SIGNUP_PRICES_USD
  const charge = pack
    ? `$${base} per year for Base plus $${packPrice} per year for ${pack}`
    : `$${base} per year`
  return `Free through December 31, 2026. Then ${charge}, charged to your card on January 1, 2027 and every year after until you cancel. Cancel online anytime in Settings. Cancel before January 1, 2027 and you pay nothing.`
}

/** Last sentence(s) of the signup terms checkbox label (Legal ruling, Sep 29, 2026). One constant so it changes in one place. */
export const SIGNUP_TERMS_SALES_SENTENCE =
  'Cancel anytime in Settings to stop future renewals. After a charge, all sales are final, except where the law requires a refund.'
