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
  const rec: ConsentRecord = {
    state,
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

/** True only when user affirmatively granted AND GPC is not set. */
export function isAdsMeasurementAllowed(): boolean {
  return effectiveConsentState() === 'granted'
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
