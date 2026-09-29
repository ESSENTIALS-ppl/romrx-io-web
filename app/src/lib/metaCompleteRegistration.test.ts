/**
 * CompleteRegistration on signup success (Jim standing lock 2026-09-29).
 * Browser Pixel + CAPI share one event_id; same gates as every Meta event;
 * no PII / health data; once per signup; fire and forget.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { describe, expect, it, vi, afterEach } from 'vitest'

const REPO = resolve(__dirname, '../../..')
const PIXEL = '2284396799046573'
const FBP = 'fb.1.1727000000000.1234567890'
const USER_ID = '11111111-2222-3333-4444-555555555555'
const ALLOWED_BODY_KEYS = ['event_name', 'event_id', 'event_time', 'action_source', 'event_source_url',
  'consent_version', 'consent_state', 'properties', 'fbp', 'fbc']

function fakeDoc() {
  const appended: any[] = []
  return {
    appended, cookie: '',
    createElement: () => { const el: any = { attrs: {}, setAttribute(k: string, v: string) { el.attrs[k] = v } }; return el },
    head: { appendChild: (el: any) => { appended.push(el) } },
    querySelector: (sel: string) => sel.includes('data-rx-meta-pixel') ? appended.find((a) => a.attrs['data-rx-meta-pixel']) ?? null : null,
    readyState: 'complete', addEventListener: () => {},
  }
}

async function setup(opts: { consent?: string; gpc?: boolean; pathname?: string; search?: string; lang?: string; fetchFails?: boolean } = {}) {
  vi.resetModules()
  vi.stubEnv('VITE_META_PIXEL_ID', PIXEL)
  const store: Record<string, string> = {}
  const session: Record<string, string> = {}
  if (opts.consent) store['romrx.consent.v1'] = JSON.stringify({ state: opts.consent, policy_version: 'x', updated_at: 'x' })
  const doc: any = fakeDoc(); doc.cookie = `_fbp=${FBP}`
  const fetches: any[] = []
  const win: any = {
    location: { pathname: opts.pathname ?? '/app/signup', search: opts.search ?? '', origin: 'https://romrx.io' },
    dispatchEvent: () => true,
    sessionStorage: { getItem: (k: string) => session[k] ?? null, setItem: (k: string, v: string) => { session[k] = v } },
  }
  vi.stubGlobal('window', win)
  vi.stubGlobal('document', doc)
  vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v } })
  vi.stubGlobal('navigator', { globalPrivacyControl: opts.gpc === true, languages: [opts.lang ?? 'en-US'], language: opts.lang ?? 'en-US' })
  vi.stubGlobal('fetch', (url: string, init: any) => {
    fetches.push({ url, body: JSON.parse(init.body), init })
    return opts.fetchFails ? Promise.reject(new Error('blocked by client')) : Promise.resolve({ ok: true })
  })
  const mod = await import('./metaAttribution')
  const meta = () => fetches.filter((f) => f.url !== '/api/consent')
  const pixelTracks = () => ((win.fbq?.queue ?? []) as ArrayLike<unknown>[]).map((a) => Array.from(a)).filter((c) => c[0] === 'track')
  return { mod, win, fetches, meta, pixelTracks, session }
}
const tick = () => new Promise((r) => setTimeout(r, 30))

describe('SPA trackMetaCompleteRegistration', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

  it('US default on /app/signup: Pixel + CAPI with the same event_id, minimal payload', async () => {
    const t = await setup({ search: '?utm_source=owned&utm_medium=ig_bio' })
    const eid = t.mod.trackMetaCompleteRegistration(USER_ID)
    await tick()
    expect(eid).toBeTruthy()
    expect(t.pixelTracks()).toEqual([['track', 'CompleteRegistration', {}, { eventID: eid }]])
    const m = t.meta()
    expect(m).toHaveLength(1)
    expect(m[0].url).toBe('/api/attribution/meta')
    const b = m[0].body
    expect(b).toMatchObject({ event_name: 'CompleteRegistration', event_id: eid, action_source: 'website',
      event_source_url: 'https://romrx.io/app/signup', consent_state: 'us_default', fbp: FBP })
    expect(Object.keys(b).every((k) => ALLOWED_BODY_KEYS.includes(k))).toBe(true)
    expect(b.properties).toEqual({})
    const s = JSON.stringify(b)
    expect(s).not.toContain(USER_ID)
    expect(s).not.toMatch(/@|email|"em"|"ph"|full_name|gender|age_bucket|user_id|rom_?score|band|joint|protocol|injur|assess|utm_/i)
    expect(m[0].init.keepalive).toBe(true)
    expect(m[0].init.signal).toBeDefined()
  })

  it('fires once per signup (double submit / re-render is a no-op)', async () => {
    const t = await setup({ consent: 'granted' })
    const a = t.mod.trackMetaCompleteRegistration(USER_ID)
    const b = t.mod.trackMetaCompleteRegistration(USER_ID)
    await tick()
    expect(a).toBeTruthy()
    expect(b).toBeNull()
    expect(t.meta()).toHaveLength(1)
    expect(t.pixelTracks()).toHaveLength(1)
    expect(t.session[`${t.mod.CR_SENT_KEY}:${USER_ID}`]).toBe('1')
  })

  it.each([
    ['GPC', { gpc: true }],
    ['GPC after an Accept', { consent: 'granted', gpc: true }],
    ['Declined / Don\'t Sell', { consent: 'denied' }],
    ['revoked', { consent: 'revoked' }],
    ['EU visitor, no choice (opt-in)', { lang: 'de-DE' }],
    ['UK visitor, no choice (opt-in)', { lang: 'en-GB' }],
    ['off-allowlist /app/onboarding/assessment', { consent: 'granted', pathname: '/app/onboarding/assessment' }],
    ['?email= on signup URL', { consent: 'granted', search: '?email=a%40b.co' }],
  ])('%s: nothing sent to Meta', async (_n, opts) => {
    const t = await setup(opts as any)
    expect(t.mod.trackMetaCompleteRegistration(USER_ID)).toBeNull()
    await tick()
    expect(t.meta()).toHaveLength(0)
    expect(t.pixelTracks()).toHaveLength(0)
  })

  it('Meta blocked / failing: never throws, signup flow unaffected', async () => {
    const t = await setup({ consent: 'granted', fetchFails: true })
    expect(() => t.mod.trackMetaCompleteRegistration(USER_ID)).not.toThrow()
    await tick()
    expect(t.meta()).toHaveLength(1)
  })
})

describe('Signup wiring and scope', () => {
  const signup = readFileSync(join(REPO, 'app/src/pages/Signup.tsx'), 'utf8')
  it('CompleteRegistration fires only after a successful supabase signUp', () => {
    const calls = signup.split('trackMetaCompleteRegistration(data.user.id)').length - 1
    expect(calls).toBe(2)
    const firstCall = signup.indexOf('trackMetaCompleteRegistration(data.user.id)')
    expect(signup.indexOf('if (signUpErr)')).toBeLessThan(firstCall)
    expect(signup.indexOf('supabase.auth.signUp(')).toBeLessThan(firstCall)
  })
  it('no assessment-complete or other health event is sent to Meta anywhere', () => {
    const lib = readFileSync(join(REPO, 'app/src/lib/metaAttribution.ts'), 'utf8')
    expect(lib).toMatch(/export type MetaEventName = 'PageView' \| 'Lead' \| 'CompleteRegistration'/)
    const cap = readFileSync(join(REPO, 'netlify/functions/meta-capi.js'), 'utf8')
    expect(cap).toMatch(/new Set\(\['PageView', 'Lead', 'CompleteRegistration'\]\)/)
  })
})

function loadCapi() {
  const src = readFileSync(join(REPO, 'netlify/functions/meta-capi.js'), 'utf8')
  const dir = mkdtempSync(join(tmpdir(), 'capi-cr-'))
  const file = join(dir, 'meta-capi.cjs')
  writeFileSync(file, src)
  return createRequire(import.meta.url)(file)
}
function crEvent(extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'https://romrx.io', 'user-agent': 'UA-test', 'x-nf-client-connection-ip': '203.0.113.9', 'x-country': 'US', ...headers },
    body: JSON.stringify({
      event_name: 'CompleteRegistration', event_id: `cr-${Math.random()}`, event_time: Math.floor(Date.now() / 1000),
      event_source_url: 'https://romrx.io/app/signup?utm_source=x&email=a%40b.co', consent_state: 'us_default',
      consent_version: '2026-09-21-privacy-b', properties: {}, fbp: FBP, email: 'a@b.co', user_id: USER_ID, ...extra,
    }),
  }
}

describe('CAPI function: CompleteRegistration', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it('sends exactly the allowed fields, path-only URL, no PII', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    const res = await handler(crEvent())
    expect(JSON.parse(res.body)).toMatchObject({ dispatched: true, event_name: 'CompleteRegistration' })
    const sent = JSON.parse(f.mock.calls[0][1].body)
    expect(sent.test_event_code).toBeUndefined()
    const ev = sent.data[0]
    expect(Object.keys(ev).sort()).toEqual(['action_source', 'event_id', 'event_name', 'event_source_url', 'event_time', 'user_data'])
    expect(ev.event_source_url).toBe('https://romrx.io/app/signup')
    expect(ev.user_data).toEqual({ client_ip_address: '203.0.113.9', client_user_agent: 'UA-test', fbp: FBP })
    expect(JSON.stringify(sent)).not.toMatch(/@|email|em"|ph"|user_id|1111-/)
    expect(f.mock.calls[0][1].signal).toBeDefined()
  })
  it('META_TEST_EVENT_CODE env adds test_event_code', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token'); vi.stubEnv('META_TEST_EVENT_CODE', 'TEST123')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    await handler(crEvent())
    expect(JSON.parse(f.mock.calls[0][1].body).test_event_code).toBe('TEST123')
  })
  it('META_CAPI_DRY_RUN=1 logs the shape and never contacts Meta or logs the token', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'secret-token'); vi.stubEnv('META_CAPI_DRY_RUN', '1')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { handler } = loadCapi()
    const res = await handler(crEvent())
    expect(JSON.parse(res.body)).toMatchObject({ dispatched: false, reason: 'dry_run' })
    expect(f).not.toHaveBeenCalled()
    const line = log.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(line).toContain('"event_name":"CompleteRegistration"')
    expect(line).not.toMatch(/secret-token|203\.0\.113\.9|UA-test/)
    log.mockRestore()
  })
  it('missing token: clean no-op (browser-only), declined/GPC/non-US never dispatch', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', '')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    expect(JSON.parse((await handler(crEvent())).body).reason).toBe('missing_config')
    vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    expect(JSON.parse((await handler(crEvent({ consent_state: 'denied' }))).body).reason).toBe('consent_blocked')
    expect(JSON.parse((await handler(crEvent({}, { 'sec-gpc': '1' }))).body).reason).toBe('gpc_opt_out')
    expect(JSON.parse((await handler(crEvent({}, { 'x-country': 'DE' }))).body).reason).toBe('consent_blocked_non_us')
    expect(f).not.toHaveBeenCalled()
  })
  it('upstream failure or timeout never errors the request', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { handler } = loadCapi()
    const res = await handler(crEvent())
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body)).toMatchObject({ dispatched: false, reason: 'fetch_failed' })
    err.mockRestore()
  })
})
