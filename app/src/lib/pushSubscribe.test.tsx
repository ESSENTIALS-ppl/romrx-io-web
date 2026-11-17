// @vitest-environment jsdom
// P1-14 web push client (contract d4f72a35). Flag-on paths are tested here with mocks; Settings (flag off) in Settings.pushFlag.test.tsx.
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  urlBase64ToUint8Array, enablePush, disablePush, makePushPost, pushResultFromResponse, browserPushEnv, PUSH_FUNCTION, type PushEnv,
} from './pushSubscribe'
import { PUSH_COPY, pushMessageFor } from './pushCopy'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const KEY = 'AQID' // base64url for [1, 2, 3]
function fakeEnv(opts: { permission?: string; noWorker?: boolean; existing?: boolean } = {}) {
  const sub = { endpoint: 'https://push.example.test/abc', toJSON: () => ({ endpoint: 'https://push.example.test/abc', keys: { p256dh: 'p'.repeat(40), auth: 'a'.repeat(16) } }), unsubscribe: vi.fn(async () => true) }
  const pushManager = { subscribe: vi.fn(async () => sub), getSubscription: vi.fn(async () => (opts.existing === false ? null : sub)) }
  const env: PushEnv = {
    requestPermission: vi.fn(async () => opts.permission ?? 'granted'),
    getRegistration: vi.fn(async () => (opts.noWorker ? undefined : { pushManager })),
  }
  return { env, sub, pushManager }
}
const postWith = (status: number, json: unknown = null) => vi.fn(async (_b: Record<string, unknown>) => ({ status, json }))

describe('P1-14 pushSubscribe', () => {
  it('decodes a base64url VAPID key', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })

  it('unsupported browser: no prompt, no request', async () => {
    const post = postWith(200)
    expect(await enablePush({ post, vapidPublicKey: KEY, env: null })).toEqual({ ok: false, reason: 'unsupported' })
    expect(post).not.toHaveBeenCalled()
    expect(browserPushEnv()).toBeNull() // jsdom has no PushManager / serviceWorker
  })

  it('missing or bad VAPID key: fails quietly, never prompts or subscribes', async () => {
    for (const k of [undefined, '', '%%%']) {
      const { env, pushManager } = fakeEnv(); const post = postWith(200)
      expect(await enablePush({ post, vapidPublicKey: k, env })).toEqual({ ok: false, reason: 'no_key' })
      expect(env.requestPermission).not.toHaveBeenCalled(); expect(pushManager.subscribe).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled()
    }
    expect(pushMessageFor('no_key')).toBeNull()
  })

  it('no registered worker: fails quietly before any prompt', async () => {
    const { env } = fakeEnv({ noWorker: true }); const post = postWith(200)
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: false, reason: 'no_worker' })
    expect(env.requestPermission).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled()
    expect(pushMessageFor('no_worker')).toBeNull()
  })

  it('permission denied: no subscribe, no request', async () => {
    const { env, pushManager } = fakeEnv({ permission: 'denied' }); const post = postWith(200)
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: false, reason: 'denied' })
    expect(pushManager.subscribe).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled()
    expect(pushMessageFor('denied')).toBe(PUSH_COPY.denied)
  })

  it('200: prompts, subscribes with the VAPID key bytes, POSTs {subscription: sub.toJSON()}', async () => {
    const { env, sub, pushManager } = fakeEnv(); const post = postWith(200, { success: true })
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: true })
    expect(env.requestPermission).toHaveBeenCalledTimes(1)
    const arg = (pushManager.subscribe.mock.calls[0] as unknown as [{ userVisibleOnly: boolean; applicationServerKey: Uint8Array }])[0]
    expect(arg.userVisibleOnly).toBe(true)
    expect(Array.from(arg.applicationServerKey)).toEqual([1, 2, 3])
    expect(post).toHaveBeenCalledWith({ subscription: sub.toJSON() })
    expect(sub.unsubscribe).not.toHaveBeenCalled()
  })

  it('409 device_limit_reached: device_limit, browser subscription removed', async () => {
    const { env, sub } = fakeEnv(); const post = postWith(409, { error: 'device_limit_reached' })
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: false, reason: 'device_limit' })
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
    expect(pushMessageFor('device_limit')).toBe(PUSH_COPY.deviceLimit)
  })

  it('500 save_failed: failed, browser subscription removed, generic message', async () => {
    const { env, sub } = fakeEnv(); const post = postWith(500, { error: 'save_failed' })
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: false, reason: 'failed' })
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
    expect(pushMessageFor('failed')).toBe(PUSH_COPY.genericError)
  })

  it('maps 400, 401, 405 and other 409 per the contract', () => {
    expect(pushResultFromResponse(400, { error: 'invalid' })).toEqual({ ok: false, reason: 'invalid' })
    expect(pushResultFromResponse(401, null)).toEqual({ ok: false, reason: 'unauthorized' })
    expect(pushResultFromResponse(405, null)).toEqual({ ok: false, reason: 'failed' })
    expect(pushResultFromResponse(409, { error: 'other' })).toEqual({ ok: false, reason: 'failed' })
    expect(pushResultFromResponse(200, { success: true })).toEqual({ ok: true })
  })

  it('a network error after subscribe: failed and the browser subscription is removed', async () => {
    const { env, sub } = fakeEnv(); const post = vi.fn(async () => { throw new Error('offline') })
    expect(await enablePush({ post, vapidPublicKey: KEY, env })).toEqual({ ok: false, reason: 'failed' })
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe: browser unsubscribe, then POST {unsubscribe: true, endpoint}', async () => {
    const { env, sub } = fakeEnv(); const post = postWith(200, { success: true })
    expect(await disablePush({ post, env })).toEqual({ ok: true })
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith({ unsubscribe: true, endpoint: 'https://push.example.test/abc' })
    expect(env.requestPermission).not.toHaveBeenCalled()
  })

  it('unsubscribe with no subscription on this device: ok, no request', async () => {
    const { env } = fakeEnv({ existing: false }); const post = postWith(200)
    expect(await disablePush({ post, env })).toEqual({ ok: true })
    expect(post).not.toHaveBeenCalled()
  })

  it('makePushPost: POST to save-push-subscription with the user JWT; no token = 401 without a request', async () => {
    const fetchFn = vi.fn(async (_u: string, _i: RequestInit) => new Response(JSON.stringify({ success: true }), { status: 200 }))
    const post = makePushPost({ supabaseUrl: 'https://example.supabase.co/', anonKey: 'anon', getAccessToken: () => 'tok', fetchFn })
    expect(await post({ subscription: { endpoint: 'https://x' } })).toEqual({ status: 200, json: { success: true } })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe(`https://example.supabase.co/functions/v1/${PUSH_FUNCTION}`)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(String(init.body))).toEqual({ subscription: { endpoint: 'https://x' } })
    const none = makePushPost({ supabaseUrl: 'https://example.supabase.co', anonKey: 'anon', getAccessToken: () => null, fetchFn })
    expect(await none({})).toEqual({ status: 401, json: null })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('flag on, tap harness: the permission prompt happens only after the tap, never on render', async () => {
    const { env } = fakeEnv(); const post = postWith(200, { success: true })
    function Toggle() { return <button data-testid="push-tap" onClick={() => { void enablePush({ post, vapidPublicKey: KEY, env }) }}>t</button> }
    const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host)
    await act(async () => { root.render(<Toggle />) })
    expect(env.requestPermission).not.toHaveBeenCalled()
    await act(async () => { (host.querySelector('[data-testid="push-tap"]') as HTMLElement).click() })
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(env.requestPermission).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    act(() => root.unmount()); host.remove()
  })

  it('every client push string is a NEEDS STACY placeholder (no invented words)', () => {
    for (const v of Object.values(PUSH_COPY)) expect(v.startsWith('NEEDS STACY')).toBe(true)
  })
})
