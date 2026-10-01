/**
 * Consent log client (Legal: Stacy memo 2026-09-24).
 * Every consent write the user makes (banner, footer Don't Sell, /legal
 * #do-not-sell, Settings) and a GPC-driven state change is POSTed to
 * /api/consent. The server stores only an HMAC of anon_id, never the raw id.
 *
 * - Fire and forget: fetch keepalive, never awaited by the UI, never throws.
 * - Runs whether ads measurement is on or off (a Decline must be recorded).
 * - Compliance only. This module never sends anything to Meta or analytics.
 * - No module imports from ./consent here (avoids a cycle); consent.ts calls in.
 */

export const ANON_ID_KEY = 'romrx.anon_id'
export const CONSENT_LOG_ENDPOINT = '/api/consent'

export type LoggedState = 'granted' | 'denied' | 'revoked'
export type ConsentMethod = 'banner' | 'footer' | 'settings' | 'gpc'

const ANON_RE = /^[A-Za-z0-9-]{16,64}$/

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch { /* ignore */ }
  try {
    const b = new Uint8Array(16)
    crypto.getRandomValues(b)
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  } catch {
    return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  }
}

/** Random per-browser id shared with the marketing site (same localStorage key). */
export function getAnonId(storage: Storage | null = safeLocalStorage()): string {
  try {
    const existing = storage?.getItem(ANON_ID_KEY)
    if (existing && ANON_RE.test(existing)) return existing
  } catch { /* private mode */ }
  const id = randomId()
  try { storage?.setItem(ANON_ID_KEY, id) } catch { /* private mode */ }
  return id
}

function safeLocalStorage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

/** Path only. Query strings and hashes can carry fbclid, UTM tags, emails or tokens. */
export function sanitizePagePath(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '/'
  let p = raw.trim()
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) p = new URL(p).pathname
  } catch { return '/' }
  p = p.split('#')[0].split('?')[0]
  // eslint-disable-next-line no-control-regex
  p = p.replace(/[\u0000-\u001f\u007f\s]/g, '')
  if (!p.startsWith('/')) p = `/${p}`
  p = p.replace(/\/{2,}/g, '/')
  return p.slice(0, 512) || '/'
}

export interface ConsentLogEvent {
  state: LoggedState
  method: ConsentMethod
  policyVersion: string
  bannerVersion: string
  gpcPresent: boolean
  conflictWithPriorAccept?: boolean
  pagePath?: string
  /** Which notice the visitor saw: 'us' opt-out or 'eu_uk' opt-in (the UI's region decision). */
  bannerRegion?: 'us' | 'eu_uk'
}

type TokenGetter = () => Promise<string | null>
let tokenGetter: TokenGetter | null = null

/** App wires the Supabase session in (lib/consentProfile.ts). Tests inject a stub. */
export function setConsentTokenGetter(fn: TokenGetter | null): void {
  tokenGetter = fn
}

async function currentToken(): Promise<string | null> {
  if (!tokenGetter) return null
  try {
    return await Promise.race([
      tokenGetter(),
      new Promise<null>((r) => setTimeout(() => r(null), 800)),
    ])
  } catch {
    return null
  }
}

export function buildConsentPayload(e: ConsentLogEvent, anonId: string): Record<string, unknown> {
  return {
    anon_id: anonId,
    state: e.state,
    method: e.method,
    gpc_present: e.gpcPresent === true,
    conflict_with_prior_accept: e.method === 'gpc' && e.conflictWithPriorAccept === true,
    policy_version: e.policyVersion,
    banner_version: e.bannerVersion,
    ...(e.bannerRegion === 'us' || e.bannerRegion === 'eu_uk' ? { banner_region: e.bannerRegion } : {}),
    page_path: sanitizePagePath(e.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')),
  }
}

/** Fire and forget. Resolves when the request was handed off; never rejects. */
export async function logConsentEvent(e: ConsentLogEvent): Promise<void> {
  try {
    if (typeof fetch !== 'function') return
    const payload = buildConsentPayload(e, getAnonId())
    const token = await currentToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    await fetch(CONSENT_LOG_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined)
  } catch { /* never block UI */ }
}
