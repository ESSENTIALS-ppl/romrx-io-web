/** First-party ads-measurement consent (Privacy B 2026-09-21).
 * Shared storage key with /assets/consent.js on marketing pages.
 * Terms checkbox is NOT tracking consent.
 * Every user-made choice and every GPC-driven change is logged server-side
 * via lib/consentLog.ts (Legal 2026-09-24). A missing GPC signal is never consent.
 */
import { logConsentEvent, type ConsentMethod, type LoggedState } from './consentLog'

export type ConsentState = 'unknown' | 'granted' | 'denied' | 'revoked'

export interface ConsentRecord {
  state: ConsentState
  policy_version: string
  updated_at: string
  region?: 'us' | 'eu_uk'
  /** Last Decline / Reject / Don't Sell / GPC date. Suppresses re-prompts for 12 months. */
  declined_at?: string
}

export const CONSENT_STORAGE_KEY = 'romrx.consent.v1'
export const CONSENT_POLICY_VERSION = '2026-09-21-privacy-b'
export const PRIVACY_POLICY_URL = 'https://romrx.io/legal#privacy'
/** Which consent UI the person saw (logged with each row). Bump when copy or layout changes. */
export const APP_BANNER_VERSION = 'app-banner-2026-09-24-us-optout'
export const SETTINGS_UI_VERSION = 'app-settings-2026-09-24'
/** No banner or opt-back-in prompt for 12 months after a decline (11 CCR 7026(k)). */
export const REPROMPT_QUIET_MS = 365 * 24 * 60 * 60 * 1000

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

export function writeConsent(state: ConsentState, opts: { declinedAt?: string } = {}): ConsentRecord {
  // Stacy GPC Field-test C.3: banner OK must not override Global Privacy Control.
  const effective: ConsentState = gpcEnabled() && state === 'granted' ? 'denied' : state
  const now = new Date().toISOString()
  const rec: ConsentRecord = {
    state: effective,
    policy_version: CONSENT_POLICY_VERSION,
    updated_at: now,
    region: detectRegion(),
  }
  if (effective === 'denied' || effective === 'revoked') rec.declined_at = opts.declinedAt || now
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

/**
 * A user click changed consent: store it and log it (whether tracking is on or off).
 * Returns the stored record (GPC may have turned a grant into denied).
 */
export function recordConsentChoice(
  state: Exclude<ConsentState, 'unknown'>,
  method: Exclude<ConsentMethod, 'gpc'>,
  bannerVersion: string = method === 'settings' ? SETTINGS_UI_VERSION : APP_BANNER_VERSION,
): ConsentRecord {
  const rec = writeConsent(state)
  void logConsentEvent({
    state: rec.state as LoggedState,
    method,
    policyVersion: CONSENT_POLICY_VERSION,
    bannerVersion,
    gpcPresent: gpcEnabled(),
    bannerRegion: rec.region ?? detectRegion(),
  })
  return rec
}

/**
 * GPC present: force denied. Writes and logs ONE 'gpc' row only when the stored
 * state actually changes (no choice / unknown / granted), never on every page load.
 * Returns true when it changed state.
 */
export function applyGpcIfPresent(): boolean {
  if (!gpcEnabled()) return false
  const existing = readConsent()
  if (existing && existing.state !== 'granted' && existing.state !== 'unknown') return false
  const rec = writeConsent('denied')
  void logConsentEvent({
    state: rec.state as LoggedState,
    method: 'gpc',
    policyVersion: CONSENT_POLICY_VERSION,
    bannerVersion: APP_BANNER_VERSION,
    gpcPresent: true,
    conflictWithPriorAccept: existing?.state === 'granted',
    bannerRegion: rec.region ?? detectRegion(),
  })
  return true
}

/** Effective state after GPC. GPC forces denied for ads measurement. */
export function effectiveConsentState(): ConsentState {
  if (gpcEnabled()) {
    applyGpcIfPresent()
    return 'denied'
  }
  return readConsent()?.state ?? 'unknown'
}

/** True while inside the 12-month no-reprompt window after a decline. */
export function inRepromptQuietPeriod(rec: ConsentRecord | null = readConsent(), now: number = Date.now()): boolean {
  if (!rec?.declined_at) return false
  const t = Date.parse(rec.declined_at)
  return Number.isFinite(t) && now - t < REPROMPT_QUIET_MS
}

/**
 * Show the banner only to someone who has never chosen. Never after a decline
 * (and never inside the 12-month quiet window), never when GPC is on.
 * The person can still choose Accept themselves in Settings.
 */
export function shouldShowBanner(
  rec: ConsentRecord | null = readConsent(),
  gpc: boolean = gpcEnabled(),
  now: number = Date.now(),
): boolean {
  if (gpc) return false
  if (inRepromptQuietPeriod(rec, now)) return false
  return !rec || rec.state === 'unknown'
}

/**
 * Signed-in: adopt the choice saved on the profile when this browser has none,
 * or when the profile choice is newer. No log row (not a new choice).
 */
export function adoptProfileChoice(
  profile: { state: string | null; updatedAt: string | null; declinedAt: string | null } | null,
): ConsentRecord | null {
  if (!profile || (profile.state !== 'granted' && profile.state !== 'denied' && profile.state !== 'revoked')) return null
  const local = readConsent()
  const profT = Date.parse(profile.updatedAt || '') || 0
  const localT = Date.parse(local?.updated_at || '') || 0
  if (local && local.state !== 'unknown' && localT >= profT) return null
  if (local?.state === profile.state) return null
  return writeConsent(profile.state as ConsentState, { declinedAt: profile.declinedAt || undefined })
}

export const GPC_HONORED_NOTE =
  "Your browser's Global Privacy Control signal was honored. Ads measurement is off."


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
