// CA auto-renewal (ARL) disclosure shown next to the signup button.
// S2 from STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md (sha256 55c49a8c...), S1 word for word with $${base}.
// This module is not imported by the app today (Stacy 1518 A6). Do not wire it in here.
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

/** S2 (1459): Base trial disclosure. Always Base only; the combo case is retired (Stacy 1518 C9). */
export function signupDisclosure(_add?: string | null): string {
  const { base } = SIGNUP_PRICES_USD
  return `ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $${base} per year, charged to your card on March 1, 2027 and on March 1 every year after until you cancel. Your plan renews automatically for one year at a time. Cancel online anytime in Settings at https://romrx.io/app/dashboard/settings, or email hello@romrx.io. Cancel before March 1, 2027 and you pay nothing. Canceling ends your access right away and stops future charges. All sales are final. We do not refund charges already made, except where the law requires a refund. We will email you before your first charge and before each yearly renewal.`
}

/** Last sentence(s) of the signup terms checkbox label (Legal ruling, Sep 29, 2026; updated for Jim decision (c): cancel ends access immediately). One constant so it changes in one place. */
export const SIGNUP_TERMS_SALES_SENTENCE =
  'Cancel anytime in Settings. Canceling ends your access right away and stops future charges. After a charge, all sales are final, except where the law requires a refund.'
