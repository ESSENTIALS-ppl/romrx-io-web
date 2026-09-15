// track.ts - Supabase-native product analytics (ROMRx Base audit 2026-09-15)
//
// Writes UI funnel steps to public.product_events. Server-side triggers already record the durable
// events (signup_completed, assessment_submitted, base_activated, protocol_session_logged,
// rombot_message_sent, consent_signed, checkout_started/completed), so this helper is only for
// steps the database cannot see: page views, assessment starts and per-joint progress, results
// views, and drop-off points.
//
// Rules:
//   - fire-and-forget: never awaited by UI code, never throws
//   - no PII in props (no emails, no names); user_id is the only identity
//   - anonymous visitors get a stable anon_id in localStorage so pre-signup steps can be stitched
//     to the account later by session_id
import { supabase } from './supabase'

const ANON_KEY = 'romrx.hq.anon_id'
const SESSION_KEY = 'romrx.hq.session_id'
const SESSION_TTL_MS = 30 * 60 * 1000

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function anonId(): string {
  try {
    let v = localStorage.getItem(ANON_KEY)
    if (!v) { v = uuid(); localStorage.setItem(ANON_KEY, v) }
    return v
  } catch { return 'no-storage' }
}

function sessionId(): string {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const now = Date.now()
    if (raw) {
      const [id, ts] = raw.split('|')
      if (id && ts && now - Number(ts) < SESSION_TTL_MS) {
        sessionStorage.setItem(SESSION_KEY, `${id}|${now}`)
        return id
      }
    }
    const id = uuid()
    sessionStorage.setItem(SESSION_KEY, `${id}|${now}`)
    return id
  } catch { return 'no-storage' }
}

export type TrackProps = Record<string, string | number | boolean | null | undefined>

/**
 * Record a product event. Safe to call anywhere; resolves immediately.
 * Example: track('assessment_started', { sport_intent: 'bjj' })
 */
export function track(event: string, props: TrackProps = {}, sport?: string | null): void {
  try {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props)) if (v !== undefined) clean[k] = v
    void (async () => {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id ?? null
      const { error } = await supabase.from('product_events').insert({
        user_id: userId,
        anon_id: userId ? null : anonId(),
        session_id: sessionId(),
        event: event.slice(0, 64),
        props: clean,
        sport: sport ?? null,
        source: 'web',
        path: typeof window !== 'undefined' ? window.location.pathname.slice(0, 200) : null,
      })
      if (error && import.meta.env.DEV) console.warn('[track]', event, error.message)
    })()
  } catch {
    /* analytics must never break the app */
  }
}

/** Page view helper for route changes. */
export function trackPageView(path: string): void {
  track('page_view', { path: path.slice(0, 200) })
}
