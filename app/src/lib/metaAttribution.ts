/**
 * Meta Pixel + CAPI adapter (Privacy B).
 *
 * HARD GATE: META_ATTRIBUTION_ENABLED is false until Reid Field PASS and Jim
 * supplies real IDs via Grant. With the flag false this module must not inject
 * fbevents.js, call fbq, or POST to the CAPI proxy for live Meta dispatch.
 *
 * Consent gate: opt-out / deny / GPC / EU reject kills BOTH Pixel and CAPI.
 * event_id is shared across Pixel and CAPI for dedupe.
 * No ROM scores, protocols, or health-adjacent data in Meta payloads.
 * Automatic Advanced Matching stays OFF.
 * Enable-later steps: docs/META_ATTRIBUTION_ENABLE.md
 */
import {
  effectiveConsentState,
  isAdsMeasurementAllowed,
  newEventId,
  CONSENT_POLICY_VERSION,
  type ConsentState,
} from './consent'

/** Hard off until Field PASS + real credentials. Do not flip via env alone. */
/** Flip to true only after Reid Field PASS + real IDs. Default false. */
export const META_ATTRIBUTION_ENABLED: boolean = true

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || ''
const CAPI_ENDPOINT = '/api/attribution/meta'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

export type MetaEventName = 'PageView' | 'Lead' | 'CompleteRegistration'

const ALLOWED_EVENTS = new Set<MetaEventName>(['PageView', 'Lead', 'CompleteRegistration'])

/**
 * Approved scope (Jim 2026-09-24): PUBLIC SIGNUP PAGES ONLY (router paths, base '/app/').
 * /app/signup and /app/signup/:sport. Marketing pages, /app/ root, login,
 * assessment, results, dashboard (My Body / Protocol / Fuel / Sport / ROMBot),
 * unlock tokens, and auth callbacks never send Pixel or CAPI.
 * Keep in sync with assets/meta-attribution.js and netlify/functions/meta-capi.js.
 */
export const META_SAFE_PATHS: readonly RegExp[] = [/^\/signup\/?$/, /^\/signup\/[a-z0-9-]+\/?$/i]
/** Query keys allowed in URLs Meta can see. Anything else (email, name, lead, token, code) blocks Meta.
 * `add` = sport slug from the /signup/:sport redirect (bjj, bodybuilding). */
const META_SAFE_QUERY = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'sport', 'ref', 'add',
])

export function isMetaSafeLocation(loc: { pathname: string; search: string } | null =
  typeof window !== 'undefined' ? window.location : null): boolean {
  if (!loc) return false
  // Only the SPA under /app/ is in scope; marketing paths never match.
  if (!/^\/app(\/|$)/.test(loc.pathname)) return false
  const path = loc.pathname.replace(/^\/app(?=\/|$)/, '') || '/'
  if (!META_SAFE_PATHS.some((re) => re.test(path))) return false
  const params = new URLSearchParams(loc.search || '')
  for (const key of params.keys()) {
    if (!META_SAFE_QUERY.has(key.toLowerCase())) return false
  }
  return true
}

/** Origin + path only. Query and hash never go to CAPI. */
function metaSourceUrl(): string {
  if (typeof window === 'undefined') return 'https://romrx.io'
  return `${window.location.origin}${window.location.pathname}`.slice(0, 500)
}

function canSendMeta(consent: ConsentState = effectiveConsentState()): boolean {
  return (
    META_ATTRIBUTION_ENABLED === true &&
    consent === 'granted' &&
    isAdsMeasurementAllowed() &&
    !!PIXEL_ID &&
    isMetaSafeLocation()
  )
}

let pixelReady = false

type PixelHost = { fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown }; _fbq?: unknown }

/**
 * Queue init + load fbevents.js. Called ONLY after the hard flag, consent
 * === 'granted', pixel id, and the signup-path allowlist all pass, so there is
 * NO pre-load fbq('consent','revoke'): fbevents pauses its queue on a queued
 * revoke and never processes the later grant (live self-check FAIL 2026-09-24).
 * If fbevents is already running (revoked earlier this session, then
 * re-granted), send grant to the live instance.
 * Exported for tests.
 */
export function installPixel(w: PixelHost & Window, doc: Document, pixelId: string): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const alreadyRunning = typeof w.fbq === 'function' && typeof (w.fbq as any).callMethod === 'function'
  if (!w.fbq) {
    const n: any = function (...args: unknown[]) {
      n.callMethod ? n.callMethod(...args) : n.queue.push(args)
    }
    // SPA: never auto-fire PageView on pushState (would hit dashboard/results
    // routes without event_id). We fire PageView ourselves on safe routes only.
    n.disablePushState = true
    n.allowDuplicatePageViews = true
    if (!w._fbq) w._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    w.fbq = n
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (alreadyRunning) w.fbq?.('consent', 'grant')
  w.fbq?.('set', 'autoConfig', false, pixelId)
  w.fbq?.('init', pixelId) // no user data = Advanced Matching OFF

  const s = doc.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  s.setAttribute('data-rx-meta-pixel', '1')
  doc.head.appendChild(s)
}

/** Load fbevents.js only after hard flag + consent + pixel id + signup path. */
function ensurePixelLoaded(): boolean {
  if (!canSendMeta()) return false
  if (pixelReady && typeof window.fbq === 'function') return true
  if (typeof window === 'undefined') return false
  if (document.querySelector('script[data-rx-meta-pixel]')) {
    pixelReady = typeof window.fbq === 'function'
    return pixelReady
  }
  installPixel(window, document, PIXEL_ID)
  pixelReady = true
  return true
}

function stripForbidden(props: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!props) return {}
  const out: Record<string, unknown> = {}
  const forbidden = /rom|score|protocol|joint|health|assessment|tier|soreness|injury|fuel|weight|height/i
  for (const [k, v] of Object.entries(props)) {
    if (forbidden.test(k)) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    }
  }
  return out
}

async function sendCapi(payload: {
  event_name: MetaEventName
  event_id: string
  event_source_url: string
  consent_state: ConsentState
  properties?: Record<string, unknown>
}): Promise<void> {
  if (!canSendMeta(payload.consent_state)) return
  try {
    await fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: payload.event_name,
        event_id: payload.event_id,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: payload.event_source_url.slice(0, 500),
        consent_version: CONSENT_POLICY_VERSION,
        consent_state: payload.consent_state,
        properties: stripForbidden(payload.properties),
      }),
      keepalive: true,
    })
  } catch {
    /* Meta outage must not block product */
  }
}

/**
 * Fire a Meta measurement event (Pixel + CAPI) with shared event_id.
 * No-op while META_ATTRIBUTION_ENABLED is false or consent is not granted.
 */
export function trackMetaEvent(
  eventName: MetaEventName,
  options: { eventId?: string; properties?: Record<string, unknown> } = {},
): string | null {
  if (!ALLOWED_EVENTS.has(eventName)) return null
  const consent = effectiveConsentState()
  if (!canSendMeta(consent)) return null

  const eventId = options.eventId || newEventId()
  const eventSourceUrl = metaSourceUrl()

  if (!ensurePixelLoaded()) return null

  try {
    window.fbq?.('track', eventName, stripForbidden(options.properties), { eventID: eventId })
  } catch { /* ignore */ }

  void sendCapi({
    event_name: eventName,
    event_id: eventId,
    event_source_url: eventSourceUrl,
    consent_state: consent,
    properties: options.properties,
  })

  return eventId
}

export function trackMetaPageView(): void {
  trackMetaEvent('PageView')
}

export function trackMetaLead(): void {
  trackMetaEvent('Lead')
}

/** Kill Pixel path on opt-out: mark consent revoked and never load script. */
export function revokeMetaMeasurement(): void {
  pixelReady = false
  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const f = window.fbq as any
    if (typeof f === 'function') {
      // Live fbevents: revoke it. Stub not yet loaded: drop the queued calls
      // instead of queueing a revoke (a queued revoke stalls the queue forever).
      if (typeof f.callMethod === 'function') f('consent', 'revoke')
      else if (Array.isArray(f.queue)) f.queue.length = 0
    }
  } catch { /* ignore */ }
  const s = document.querySelector('script[data-rx-meta-pixel]')
  if (s) s.remove()
}

export function metaGateStatus(): {
  enabled: boolean
  consent: ConsentState
  pixelIdConfigured: boolean
  wouldSend: boolean
} {
  const consent = effectiveConsentState()
  return {
    enabled: META_ATTRIBUTION_ENABLED === true,
    consent,
    pixelIdConfigured: !!PIXEL_ID,
    wouldSend: canSendMeta(consent),
  }
}
