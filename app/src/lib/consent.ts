/** First-party ads-measurement consent (Privacy B 2026-09-21).
 * Shared storage key with /assets/consent.js on marketing pages.
 * Terms checkbox is NOT tracking consent.
 */
export type ConsentState = 'unknown' | 'granted' | 'denied' | 'revoked'

export interface ConsentRecord {
  state: ConsentState
  policy_version: string
  updated_at: string
  region?: 'us' | 'eu_uk'
}

export const CONSENT_STORAGE_KEY = 'romrx.consent.v1'
export const CONSENT_POLICY_VERSION = '2026-09-21-privacy-b'
export const PRIVACY_POLICY_URL = 'https://romrx.io/legal#privacy'

const LISTENERS = new Set<(r: ConsentRecord) => void>()

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function detectRegion(): 'us' | 'eu_uk' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Europe/') || tz === 'Atlantic/Reykjavik' || tz === 'Atlantic/Faroe') {
      return 'eu_uk'
    }
    const lang = (navigator.languages && navigator.languages[0]) || navigator.language || ''
    if (/^(en-GB|en-IE|cy|gd|ga|fr|de|es|it|nl|pt|pl|sv|da|fi|nb|nn|cs|sk|hu|ro|bg|hr|sl|et|lv|lt|el|mt)/i.test(lang)) {
      return 'eu_uk'
    }
  } catch { /* ignore */ }
  return 'us'
}

export function gpcEnabled(): boolean {
  try {
    return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  } catch {
    return false
  }
}

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentRecord
    if (!parsed || typeof parsed.state !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function writeConsent(state: ConsentState): ConsentRecord {
  // Stacy GPC Field-test C.3: banner OK must not override Global Privacy Control.
  const effective: ConsentState = gpcEnabled() && state === 'granted' ? 'denied' : state
  const rec: ConsentRecord = {
    state: effective,
    policy_version: CONSENT_POLICY_VERSION,
    updated_at: new Date().toISOString(),
    region: detectRegion(),
  }
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(rec))
  } catch { /* private mode */ }
  LISTENERS.forEach((fn) => {
    try { fn(rec) } catch { /* ignore */ }
  })
  try {
    window.dispatchEvent(new CustomEvent('romrx:consent', { detail: rec }))
  } catch { /* ignore */ }
  return rec
}

/** Effective state after GPC. GPC forces denied for ads measurement. */
export function effectiveConsentState(): ConsentState {
  if (gpcEnabled()) {
    const existing = readConsent()
    if (!existing || existing.state === 'granted' || existing.state === 'unknown') {
      writeConsent('denied')
    }
    return 'denied'
  }
  return readConsent()?.state ?? 'unknown'
}

/**
 * Jim LOCK 2026-09-24 5:38 PM ET (US opt-out, Stacy confirmed):
 * US visitors with no choice yet ('unknown') are ON by default.
 * Reject, Don't Sell or Share, and GPC write 'denied'/'revoked' and kill it.
 * EU/UK stays opt-in: only an explicit 'granted' counts.
 */
export function metaConsentAllows(
  state: ConsentState,
  region: 'us' | 'eu_uk' = detectRegion(),
  gpc: boolean = gpcEnabled(),
): boolean {
  if (gpc) return false
  if (state === 'granted') return true
  return state === 'unknown' && region === 'us'
}

/** Consent label sent to CAPI: 'granted' (explicit) or 'us_default' (US, no choice yet). */
export function metaConsentLabel(state: ConsentState): 'granted' | 'us_default' | null {
  if (!metaConsentAllows(state)) return null
  return state === 'granted' ? 'granted' : 'us_default'
}

/** True when ads measurement may run: explicit grant, or US default with no opt-out and no GPC. */
export function isAdsMeasurementAllowed(): boolean {
  return metaConsentAllows(effectiveConsentState())
}

export function subscribeConsent(fn: (r: ConsentRecord) => void): () => void {
  LISTENERS.add(fn)
  return () => { LISTENERS.delete(fn) }
}

export function newEventId(): string {
  return uuid()
}

export const OPT_OUT_CONFIRM =
  'Got it. We turned off Meta ads measurement for this browser, including Pixel and related Conversions API events. Essential cookies still work. Email privacy@romrx.io if you need help.'
