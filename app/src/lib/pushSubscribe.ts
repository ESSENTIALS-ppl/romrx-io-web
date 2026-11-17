// P1-14 web push client. Contract: P1-14-CLIENT-CONTRACT-20261116.md (sha256 d4f72a35). Hidden behind SHOW_PUSH = false in Settings.
// Turn on (only from the Settings toggle tap): permission -> pushManager.subscribe with applicationServerKey from
//   VITE_VAPID_PUBLIC_KEY (base64url) -> POST {subscription: sub.toJSON()} with the user JWT to save-push-subscription
//   (live v20 upserts push_subscriptions, cap 10, and sets push_reminders = true).
// Turn off (Jules's choice, r7): pushManager unsubscribe + POST {unsubscribe: true, endpoint} to the same function;
//   Settings still saves push_reminders = false with the form, as before.
// Uses the one P1-26 worker at /app/sw.js (scope /app/); there is no second worker. Never prompts when the key or the worker is missing.
import { SW_SCOPE } from './offlineCachePolicy'

export const PUSH_FUNCTION = 'save-push-subscription'

export type PushFailReason = 'unsupported' | 'no_key' | 'no_worker' | 'denied' | 'invalid' | 'unauthorized' | 'device_limit' | 'failed'
export type PushResult = { ok: true } | { ok: false; reason: PushFailReason }
export type PushPostFn = (body: Record<string, unknown>) => Promise<{ status: number; json: unknown }>

type PushSub = { endpoint: string; toJSON(): unknown; unsubscribe(): Promise<boolean> }
type PushReg = {
  pushManager: {
    subscribe(o: { userVisibleOnly: boolean; applicationServerKey: BufferSource }): Promise<PushSub>
    getSubscription(): Promise<PushSub | null>
  }
}
export type PushEnv = {
  requestPermission: () => Promise<string>
  getRegistration: () => Promise<PushReg | null | undefined>
}

const fail = (reason: PushFailReason): PushResult => ({ ok: false, reason })

export function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** The browser's push pieces, or null when this browser has no Notification / service worker / PushManager. */
export function browserPushEnv(): PushEnv | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return null
  return {
    requestPermission: () => Notification.requestPermission(),
    // getRegistration, not .ready: .ready never settles when no worker is registered (P1-26 flag off).
    getRegistration: async () => (await navigator.serviceWorker.getRegistration(SW_SCOPE)) as unknown as PushReg | undefined,
  }
}

/** Read-only: does this browser have a live push subscription in the /app/ worker? Never prompts, never subscribes
 *  (getRegistration + pushManager.getSubscription only). Settings uses it so the toggle shows ON only on a device that subscribed. */
export async function hasLivePushSubscription(env?: PushEnv | null): Promise<boolean> {
  const e = env === undefined ? browserPushEnv() : env
  if (!e) return false
  try {
    const reg = await e.getRegistration()
    if (!reg?.pushManager) return false
    return (await reg.pushManager.getSubscription()) != null
  } catch {
    return false
  }
}

/** Map a save-push-subscription response (contract section 1) to a result. */
export function pushResultFromResponse(status: number, json: unknown): PushResult {
  if (status === 200) return { ok: true }
  if (status === 400) return fail('invalid')
  if (status === 401) return fail('unauthorized')
  if (status === 409 && (json as { error?: unknown } | null)?.error === 'device_limit_reached') return fail('device_limit')
  return fail('failed') // 405, other 409, 500 save_failed, anything else
}

/** POST to save-push-subscription with the signed-in user's JWT. */
export function makePushPost(opts: {
  supabaseUrl: string
  anonKey: string
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>
  fetchFn?: (input: string, init: RequestInit) => Promise<Response>
}): PushPostFn {
  return async (body) => {
    const token = await opts.getAccessToken()
    if (!token) return { status: 401, json: null }
    const res = await (opts.fetchFn ?? fetch)(`${opts.supabaseUrl.replace(/\/$/, '')}/functions/v1/${PUSH_FUNCTION}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: opts.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    let json: unknown = null
    try { json = await res.json() } catch { json = null }
    return { status: res.status, json }
  }
}

/** Turn push on. Call only from a user tap: this is what shows the browser permission prompt. */
export async function enablePush(opts: { post: PushPostFn; vapidPublicKey: string | undefined; env?: PushEnv | null }): Promise<PushResult> {
  const env = opts.env === undefined ? browserPushEnv() : opts.env
  if (!env) return fail('unsupported')
  if (!opts.vapidPublicKey) return fail('no_key')
  let key: Uint8Array
  try { key = urlBase64ToUint8Array(opts.vapidPublicKey) } catch { return fail('no_key') }
  if (key.length === 0) return fail('no_key')
  let sub: PushSub | null = null
  try {
    const reg = await env.getRegistration()
    if (!reg?.pushManager) return fail('no_worker')
    if ((await env.requestPermission()) !== 'granted') return fail('denied')
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as unknown as BufferSource })
    const res = await opts.post({ subscription: sub.toJSON() })
    const out = pushResultFromResponse(res.status, res.json)
    if (!out.ok) await sub.unsubscribe().catch(() => false) // server did not keep it: do not leave a browser-only subscription
    return out
  } catch {
    if (sub) await sub.unsubscribe().catch(() => false)
    return fail('failed')
  }
}

/** Turn push off on this device: unsubscribe in the browser, then tell the server to drop that endpoint. */
export async function disablePush(opts: { post: PushPostFn; env?: PushEnv | null }): Promise<PushResult> {
  const env = opts.env === undefined ? browserPushEnv() : opts.env
  if (!env) return fail('unsupported')
  try {
    const reg = await env.getRegistration()
    const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null
    if (!sub) return { ok: true }
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const res = await opts.post({ unsubscribe: true, endpoint })
    return pushResultFromResponse(res.status, res.json)
  } catch {
    return fail('failed')
  }
}
