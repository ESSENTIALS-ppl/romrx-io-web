/**
 * Consent log (Legal 2026-09-24): sanitizer, anon_id, logging calls, GPC
 * change-only logic, 12-month no-reprompt, Settings copy, marketing mirror,
 * and the Netlify function's validation / server-side-only insert.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { createHmac } from 'node:crypto'
import vm from 'node:vm'
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'

const REPO = resolve(__dirname, '../../..')
const UUID = '3f2b8c1e-9a7d-4e21-b0c4-5d6e7f8a9b0c'

function memStore(init: Record<string, string> = {}) {
  const store: Record<string, string> = { ...init }
  return {
    store,
    api: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v) },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { for (const k of Object.keys(store)) delete store[k] },
      key: () => null,
      length: 0,
    } as unknown as Storage,
  }
}

interface Env { gpc?: boolean; consent?: Record<string, unknown>; lang?: string; path?: string }
function stubBrowser(env: Env = {}) {
  const init: Record<string, string> = {}
  if (env.consent) init['romrx.consent.v1'] = JSON.stringify(env.consent)
  const ls = memStore(init)
  const fetches: { url: string; init: any; body: any }[] = []
  vi.stubGlobal('localStorage', ls.api)
  vi.stubGlobal('navigator', { globalPrivacyControl: env.gpc === true, languages: [env.lang ?? 'en-US'], language: env.lang ?? 'en-US' })
  vi.stubGlobal('window', {
    location: { pathname: env.path ?? '/app/signup', search: '?utm_source=x&fbclid=abc', hash: '#top', origin: 'https://romrx.io' },
    dispatchEvent: () => true,
  })
  vi.stubGlobal('CustomEvent', class { type: string; detail: unknown; constructor(t: string, i?: { detail?: unknown }) { this.type = t; this.detail = i?.detail } })
  vi.stubGlobal('fetch', vi.fn((url: string, init: any) => { fetches.push({ url, init, body: JSON.parse(init.body) }); return Promise.resolve({ ok: true, status: 204 }) }))
  return { ls, fetches }
}
const flush = () => new Promise((r) => setTimeout(r, 5))

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('sanitizePagePath', () => {
  it('keeps path only: strips query, hash, host, whitespace; caps length', async () => {
    const { sanitizePagePath } = await import('./consentLog')
    expect(sanitizePagePath('/app/signup?utm_source=x&fbclid=abc#dns')).toBe('/app/signup')
    expect(sanitizePagePath('https://romrx.io/legal?email=a@b.com#do-not-sell')).toBe('/legal')
    expect(sanitizePagePath('legal')).toBe('/legal')
    expect(sanitizePagePath('//a//b')).toBe('/a/b')
    expect(sanitizePagePath('/a b\n')).toBe('/ab')
    expect(sanitizePagePath(undefined)).toBe('/')
    expect(sanitizePagePath('/' + 'x'.repeat(900)).length).toBe(512)
    expect(sanitizePagePath('/?#')).toBe('/')
  })
})

describe('anon_id', () => {
  it('creates one random UUID in romrx.anon_id and reuses it', async () => {
    const { getAnonId, ANON_ID_KEY } = await import('./consentLog')
    const ls = memStore()
    const a = getAnonId(ls.api)
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(ls.store[ANON_ID_KEY]).toBe(a)
    expect(getAnonId(ls.api)).toBe(a)
  })
  it('replaces a malformed stored value', async () => {
    const { getAnonId } = await import('./consentLog')
    const ls = memStore({ 'romrx.anon_id': 'bad value!' })
    expect(getAnonId(ls.api)).not.toBe('bad value!')
  })
})

describe('logging calls (mock fetch)', () => {
  it('Decline on the banner stores denied + declined_at and POSTs /api/consent with keepalive', async () => {
    const { fetches, ls } = stubBrowser()
    const c = await import('./consent')
    const rec = c.recordConsentChoice('denied', 'banner')
    await flush()
    expect(rec.state).toBe('denied')
    expect(rec.declined_at).toBeTruthy()
    expect(fetches).toHaveLength(1)
    const f = fetches[0]
    expect(f.url).toBe('/api/consent')
    expect(f.init.method).toBe('POST')
    expect(f.init.keepalive).toBe(true)
    expect(f.init.headers.Authorization).toBeUndefined()
    expect(f.body).toEqual({
      anon_id: ls.store['romrx.anon_id'], state: 'denied', method: 'banner', gpc_present: false,
      conflict_with_prior_accept: false, policy_version: c.CONSENT_POLICY_VERSION,
      banner_version: c.APP_BANNER_VERSION, banner_region: 'us', page_path: '/app/signup',
    })
    // Never sends user_id, email, fbp/fbc, or the query string.
    expect(JSON.stringify(f.body)).not.toMatch(/user_id|email|fbp|fbc|fbclid|utm/)
  })
  it('Accept is logged too, and Settings uses the settings UI version', async () => {
    const { fetches } = stubBrowser()
    const c = await import('./consent')
    c.recordConsentChoice('granted', 'settings')
    await flush()
    expect(fetches[0].body.state).toBe('granted')
    expect(fetches[0].body.method).toBe('settings')
    expect(fetches[0].body.banner_version).toBe(c.SETTINGS_UI_VERSION)
  })
  it('signed in: sends the access token as Bearer, never user_id in the body', async () => {
    const { fetches } = stubBrowser()
    const log = await import('./consentLog')
    log.setConsentTokenGetter(async () => 'jwt.token.value-1234567890')
    const c = await import('./consent')
    c.recordConsentChoice('denied', 'settings')
    await flush()
    expect(fetches[0].init.headers.Authorization).toBe('Bearer jwt.token.value-1234567890')
    expect(fetches[0].body.user_id).toBeUndefined()
  })
  it('a failing endpoint never throws into the UI', async () => {
    stubBrowser()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    const c = await import('./consent')
    expect(() => c.recordConsentChoice('denied', 'footer')).not.toThrow()
    await flush()
  })
  it('GPC on: an Accept click is stored and logged as denied', async () => {
    const { fetches } = stubBrowser({ gpc: true, consent: { state: 'denied', policy_version: 'x', updated_at: 'x' } })
    const c = await import('./consent')
    c.recordConsentChoice('granted', 'settings')
    await flush()
    expect(fetches.map((f) => [f.body.state, f.body.method, f.body.gpc_present])).toEqual([['denied', 'settings', true]])
  })
})

describe('GPC logs only when the stored state changes', () => {
  it('first GPC visit: one gpc row; later loads: none', async () => {
    const { fetches } = stubBrowser({ gpc: true })
    const c = await import('./consent')
    expect(c.effectiveConsentState()).toBe('denied')
    expect(c.effectiveConsentState()).toBe('denied')
    expect(c.applyGpcIfPresent()).toBe(false)
    await flush()
    expect(fetches).toHaveLength(1)
    expect(fetches[0].body).toMatchObject({ state: 'denied', method: 'gpc', gpc_present: true, conflict_with_prior_accept: false })
  })
  it('GPC over an earlier Accept: conflict_with_prior_accept true', async () => {
    const { fetches } = stubBrowser({ gpc: true, consent: { state: 'granted', policy_version: 'x', updated_at: 'x' } })
    const c = await import('./consent')
    c.effectiveConsentState()
    await flush()
    expect(fetches).toHaveLength(1)
    expect(fetches[0].body.conflict_with_prior_accept).toBe(true)
  })
  it('already declined: GPC writes and logs nothing', async () => {
    const { fetches } = stubBrowser({ gpc: true, consent: { state: 'revoked', policy_version: 'x', updated_at: 'x' } })
    const c = await import('./consent')
    expect(c.effectiveConsentState()).toBe('denied')
    await flush()
    expect(fetches).toHaveLength(0)
  })
  it('no GPC: reading state never logs', async () => {
    const { fetches } = stubBrowser()
    const c = await import('./consent')
    c.effectiveConsentState()
    await flush()
    expect(fetches).toHaveLength(0)
  })
})

describe('no re-prompt after a decline (12 months) and profile sync', () => {
  beforeEach(() => { stubBrowser() })
  it('banner only for someone who never chose; never after decline; never with GPC', async () => {
    const c = await import('./consent')
    const now = Date.parse('2026-09-24T12:00:00Z')
    expect(c.shouldShowBanner(null, false, now)).toBe(true)
    expect(c.shouldShowBanner({ state: 'unknown', policy_version: 'x', updated_at: 'x' }, false, now)).toBe(true)
    expect(c.shouldShowBanner(null, true, now)).toBe(false)
    const declined = { state: 'denied' as const, policy_version: 'x', updated_at: 'x', declined_at: '2026-01-01T00:00:00Z' }
    expect(c.inRepromptQuietPeriod(declined, now)).toBe(true)
    expect(c.shouldShowBanner(declined, false, now)).toBe(false)
    // Even a stale 'unknown' record with a recent decline date is suppressed.
    expect(c.shouldShowBanner({ ...declined, state: 'unknown' }, false, now)).toBe(false)
    expect(c.shouldShowBanner({ ...declined, state: 'denied', declined_at: '2024-01-01T00:00:00Z' }, false, now)).toBe(false)
  })
  it('adopts a profile decline on a fresh browser without logging; keeps a newer local choice', async () => {
    const c = await import('./consent')
    const rec = c.adoptProfileChoice({ state: 'denied', updatedAt: '2026-09-01T00:00:00Z', declinedAt: '2026-09-01T00:00:00Z' })
    expect(rec?.state).toBe('denied')
    expect(rec?.declined_at).toBe('2026-09-01T00:00:00Z')
    expect(c.shouldShowBanner()).toBe(false)
    expect((fetch as any).mock.calls).toHaveLength(0)
    // Local choice newer than profile: leave it.
    c.writeConsent('granted')
    expect(c.adoptProfileChoice({ state: 'denied', updatedAt: '2020-01-01T00:00:00Z', declinedAt: null })).toBeNull()
    expect(c.readConsent()?.state).toBe('granted')
  })
})

describe('Settings copy', () => {
  it('plain words, equal labels by region, GPC locks it off, no em dashes', async () => {
    const { adsSettingsView, ADS_GPC_LOCKED_NOTE, ADS_SETTINGS_INTRO } = await import('./adsSettings')
    const { GPC_HONORED_NOTE } = await import('./consent')
    expect(adsSettingsView('unknown', 'us', false)).toMatchObject({ on: true, locked: false, acceptLabel: 'Accept', declineLabel: 'Decline' })
    expect(adsSettingsView('unknown', 'eu_uk', false)).toMatchObject({ on: false, acceptLabel: 'Allow', declineLabel: 'Reject' })
    expect(adsSettingsView('granted', 'us', false).summary).toMatch(/^On\./)
    expect(adsSettingsView('revoked', 'us', false).summary).toMatch(/^Off\./)
    expect(adsSettingsView('granted', 'us', true)).toMatchObject({ on: false, locked: true })
    const all = [ADS_GPC_LOCKED_NOTE, ADS_SETTINGS_INTRO, GPC_HONORED_NOTE,
      ...(['unknown', 'granted', 'denied', 'revoked'] as const).flatMap((s) => (['us', 'eu_uk'] as const).flatMap((r) => [true, false].map((g) => adsSettingsView(s, r, g).summary)))]
    for (const t of all) expect(t).not.toMatch(/\u2014|\u2013/)
    const src = readFileSync(join(REPO, 'app/src/components/AdsMeasurementSettings.tsx'), 'utf8')
    expect(src).not.toMatch(/\u2014/)
    // Both buttons share one class string (neither highlighted).
    expect(src.match(/className=\{btn\}/g)).toHaveLength(2)
  })
})

/* ── Marketing mirror: assets/consent.js ─────────────────────────────── */
function runSiteConsent(env: { gpc?: boolean; consent?: Record<string, unknown>; hash?: string; auth?: Record<string, unknown> } = {}) {
  const init: Record<string, string> = {}
  if (env.consent) init['romrx.consent.v1'] = JSON.stringify(env.consent)
  if (env.auth) init['romrx.hq.auth'] = JSON.stringify(env.auth)
  const ls = memStore(init)
  const fetches: any[] = []
  const listeners: Record<string, ((e: any) => void)[]> = {}
  const el = () => ({
    setAttribute() {}, remove() {}, appendChild() {}, addEventListener() {}, style: { cssText: '' },
    querySelector: () => el(), parentNode: null as any, insertBefore() {}, textContent: '', innerHTML: '',
  })
  const body = { appendChild: (n: any) => { (body as any).children.push(n) }, children: [] as any[] }
  const doc = {
    readyState: 'complete', head: { appendChild() {} }, body,
    querySelector: () => null, getElementById: () => null,
    createElement: () => el(),
    addEventListener: (t: string, fn: any) => { (listeners[t] ||= []).push(fn) },
  }
  const ctx: any = {
    window: { addEventListener() {}, dispatchEvent: () => true },
    document: doc, localStorage: ls.api,
    navigator: { globalPrivacyControl: env.gpc === true, languages: ['en-US'], language: 'en-US' },
    location: { pathname: '/legal', search: '?utm_source=x', hash: env.hash ?? '' },
    crypto: { randomUUID: () => UUID },
    CustomEvent: class { constructor(public type: string, public init?: any) {} },
    Intl, JSON, Date, Math, setTimeout, Promise,
    fetch: (url: string, init: any) => { fetches.push({ url, init, body: JSON.parse(init.body) }); return Promise.resolve({ ok: true }) },
  }
  vm.runInNewContext(readFileSync(join(REPO, 'assets/consent.js'), 'utf8'), ctx)
  const click = (target: any) => (listeners.click || []).forEach((fn) => fn({ target, preventDefault() {} }))
  return { ls, fetches, ctx, click }
}

describe('marketing assets/consent.js mirror', () => {
  it('footer Don\'t Sell logs method footer with the shared anon_id and path only', () => {
    const r = runSiteConsent()
    r.click({ closest: (sel: string) => (sel === '[data-rx-dns]' ? {} : null) })
    expect(r.fetches).toHaveLength(1)
    expect(r.fetches[0].url).toBe('/api/consent')
    expect(r.fetches[0].init.keepalive).toBe(true)
    expect(r.fetches[0].body).toMatchObject({ anon_id: UUID, state: 'denied', method: 'footer', page_path: '/legal', gpc_present: false })
    expect(r.ls.store['romrx.anon_id']).toBe(UUID)
    expect(JSON.parse(r.ls.store['romrx.consent.v1']).declined_at).toBeTruthy()
  })
  it('#do-not-sell on load after an Accept logs revoked', () => {
    const r = runSiteConsent({ hash: '#do-not-sell', consent: { state: 'granted', policy_version: 'x', updated_at: 'x' } })
    expect(r.fetches.map((f) => [f.body.state, f.body.method])).toEqual([['revoked', 'footer']])
  })
  it('GPC: one gpc row on change (conflict flagged), none when already denied', () => {
    const a = runSiteConsent({ gpc: true, consent: { state: 'granted', policy_version: 'x', updated_at: 'x' } })
    expect(a.fetches.map((f) => [f.body.state, f.body.method, f.body.conflict_with_prior_accept])).toEqual([['denied', 'gpc', true]])
    const b = runSiteConsent({ gpc: true, consent: { state: 'denied', policy_version: 'x', updated_at: 'x' } })
    expect(b.fetches).toHaveLength(0)
  })
  it('signed-in session token is sent as Bearer; expired token is not', () => {
    const exp = Math.floor(Date.now() / 1000) + 600
    const a = runSiteConsent({ auth: { access_token: 'tok.abc.def-1234567890', expires_at: exp } })
    a.ctx.window.RomrxConsent.deny()
    expect(a.fetches[0].init.headers.Authorization).toBe('Bearer tok.abc.def-1234567890')
    const b = runSiteConsent({ auth: { access_token: 'tok.abc.def-1234567890', expires_at: 1 } })
    b.ctx.window.RomrxConsent.deny()
    expect(b.fetches[0].init.headers.Authorization).toBeUndefined()
  })
  it('never contacts Meta or anything but /api/consent', () => {
    const src = readFileSync(join(REPO, 'assets/consent.js'), 'utf8')
    expect(src).not.toMatch(/facebook|fbq\(|graph\.|sendBeacon/)
  })
})

/* ── Netlify function: netlify/functions/consent-log.js ──────────────── */
const fn = createRequire(import.meta.url)(join(REPO, 'netlify/functions/consent-log.js'))
const KEY = 'k'.repeat(64)
const geo = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
function ev(body: unknown, headers: Record<string, string> = {}, method = 'POST') {
  return { httpMethod: method, headers: { origin: 'https://romrx.io', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }
}
const good = { anon_id: UUID, state: 'denied', method: 'banner', gpc_present: false, policy_version: '2026-09-21-privacy-b', banner_version: 'app-banner-2026-09-24-us-optout', page_path: '/app/signup?fbclid=abc#x' }

describe('consent-log function validation', () => {
  const { validateBody, sanitizePagePath, regionFromHeaders, hashAnonId } = fn._test
  it('whitelists fields, strips query/hash, ignores user_id and extra fields', () => {
    const v = validateBody({ ...good, user_id: '00000000-0000-0000-0000-000000000000', email: 'a@b.com', fbp: 'fb.1.x', region: 'eu_uk' }, {})
    expect(v.ok).toBe(true)
    expect(v.row.page_path).toBe('/app/signup')
    expect(v.row).not.toHaveProperty('user_id')
    expect(v.row).not.toHaveProperty('email')
    expect(v.row).not.toHaveProperty('fbp')
    expect(v.row.action_taken).toBe('meta_pixel_capi_off')
    expect(v.row.site).toBe('romrx.io')
    expect(sanitizePagePath('https://romrx.io/x?y#z')).toBe('/x')
  })
  it('rejects bad values', () => {
    expect(validateBody({ ...good, anon_id: 'short' }, {}).error).toBe('invalid_anon_id')
    expect(validateBody({ ...good, anon_id: "x'; drop table--" }, {}).error).toBe('invalid_anon_id')
    expect(validateBody({ ...good, state: 'unknown' }, {}).error).toBe('invalid_state')
    expect(validateBody({ ...good, method: 'email' }, {}).error).toBe('invalid_method')
    expect(validateBody({ ...good, policy_version: 'a b' }, {}).error).toBe('invalid_policy_version')
    expect(validateBody({ ...good, banner_version: 'x'.repeat(65) }, {}).error).toBe('invalid_banner_version')
    expect(validateBody({ ...good, method: 'gpc' }, {}).error).toBe('gpc_method_without_signal')
    expect(validateBody([], {}).error).toBe('invalid_body')
  })
  it('GPC (body or Sec-GPC header) turns a grant into denied; conflict only for gpc rows', () => {
    expect(validateBody({ ...good, state: 'granted' }, { 'sec-gpc': '1' }).row).toMatchObject({ state: 'denied', gpc_present: true, action_taken: 'meta_pixel_capi_off' })
    expect(validateBody({ ...good, state: 'granted', gpc_present: false }, {}).row.action_taken).toBe('meta_pixel_capi_on')
    expect(validateBody({ ...good, conflict_with_prior_accept: true }, {}).row.conflict_with_prior_accept).toBe(false)
    expect(validateBody({ ...good, method: 'gpc', gpc_present: true, conflict_with_prior_accept: true }, {}).row.conflict_with_prior_accept).toBe(true)
  })
  it('region: country + state from Netlify geo only', () => {
    expect(regionFromHeaders({ 'x-nf-geo': geo({ country: { code: 'US' }, subdivision: { code: 'CA' }, city: 'LA', latitude: 1 }) })).toEqual({ region_country: 'US', region_state: 'CA' })
    expect(regionFromHeaders({ 'x-country': 'gb' })).toEqual({ region_country: 'GB', region_state: null })
    expect(regionFromHeaders({})).toEqual({ region_country: null, region_state: null })
  })
  it('anon id is HMAC-SHA256 hex', () => {
    expect(hashAnonId(KEY, UUID)).toBe(createHmac('sha256', KEY).update(UUID).digest('hex'))
  })
})

describe('consent-log handler', () => {
  let calls: { url: string; init: any }[] = []
  beforeEach(() => {
    calls = []
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
    process.env.CONSENT_ANON_HMAC_KEY = KEY
  })
  afterEach(() => {
    for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'CONSENT_ANON_HMAC_KEY']) delete process.env[k]
  })
  function mockFetch(userOk = true) {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any = {}) => {
      calls.push({ url, init })
      if (url.endsWith('/auth/v1/user')) return userOk ? { ok: true, json: async () => ({ id: '11111111-2222-4333-8444-555555555555', email: 'x@y.z' }) } : { ok: false, json: async () => ({}) }
      return { ok: true, status: 201 }
    }))
  }
  it('anonymous: one service-role insert, hashed anon id, user_id null, 204', async () => {
    mockFetch()
    const res = await fn.handler(ev(good, { 'x-nf-geo': geo({ country: { code: 'US' }, subdivision: { code: 'NY' } }), 'x-nf-client-connection-ip': '1.2.3.4', 'user-agent': 'UA' }))
    expect(res.statusCode).toBe(204)
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://proj.supabase.co/rest/v1/consent_events')
    expect(calls[0].init.headers.Authorization).toBe('Bearer service-role-key')
    const row = JSON.parse(calls[0].init.body)
    expect(row.user_id).toBeNull()
    expect(row.anon_id_hash).toBe(createHmac('sha256', KEY).update(UUID).digest('hex'))
    expect(row).not.toHaveProperty('anon_id')
    expect(row).toMatchObject({ region_country: 'US', region_state: 'NY', page_path: '/app/signup', honored: true })
    expect(JSON.stringify(row)).not.toMatch(/1\.2\.3\.4|UA|email/)
  })
  it('signed in: user_id only from the verified JWT; profile updated with service role', async () => {
    mockFetch()
    const res = await fn.handler(ev({ ...good, user_id: '99999999-9999-4999-8999-999999999999' }, { authorization: 'Bearer eyJhbGciOi.payload.sig-1234567890' }))
    expect(res.statusCode).toBe(204)
    expect(calls.map((c) => c.url)).toEqual([
      'https://proj.supabase.co/auth/v1/user',
      'https://proj.supabase.co/rest/v1/consent_events',
      'https://proj.supabase.co/rest/v1/user_ads_consent?on_conflict=user_id',
    ])
    expect(calls[0].init.headers.apikey).toBe('anon-key')
    expect(JSON.parse(calls[1].init.body).user_id).toBe('11111111-2222-4333-8444-555555555555')
    expect(calls[2].init.method).toBe('POST')
    expect(calls[2].init.headers.Prefer).toContain('resolution=merge-duplicates')
    expect(JSON.parse(calls[2].init.body)).toMatchObject({ user_id: '11111111-2222-4333-8444-555555555555', state: 'denied' })
    expect(JSON.parse(calls[2].init.body).declined_at).toBeTruthy()
  })
  it('invalid JWT: stored as anonymous, no profile write', async () => {
    mockFetch(false)
    await fn.handler(ev(good, { authorization: 'Bearer eyJhbGciOi.payload.sig-1234567890' }))
    expect(calls.map((c) => c.url.split('/').slice(-2).join('/'))).toEqual(['v1/user', 'v1/consent_events'])
    expect(JSON.parse(calls[1].init.body).user_id).toBeNull()
  })
  it('rejects non-POST, bad origin, big bodies, bad JSON, bad fields; fails closed without HMAC key', async () => {
    mockFetch()
    expect((await fn.handler(ev(good, {}, 'GET'))).statusCode).toBe(405)
    expect((await fn.handler(ev(good, {}, 'OPTIONS'))).statusCode).toBe(204)
    expect((await fn.handler(ev(good, { origin: 'https://evil.example' }))).statusCode).toBe(403)
    expect((await fn.handler(ev({ ...good, pad: 'x'.repeat(3000) }))).statusCode).toBe(413)
    expect((await fn.handler(ev('{nope'))).statusCode).toBe(400)
    expect((await fn.handler(ev({ ...good, state: 'maybe' }))).statusCode).toBe(400)
    delete process.env.CONSENT_ANON_HMAC_KEY
    expect((await fn.handler(ev(good))).statusCode).toBe(503)
    expect(calls).toHaveLength(0)
  })
  it('talks only to Supabase (never Meta or analytics)', () => {
    const src = readFileSync(join(REPO, 'netlify/functions/consent-log.js'), 'utf8')
    expect(src).not.toMatch(/facebook|graph\.|google-analytics|segment|x-nf-client-connection-ip|user-agent/i)
  })
})

describe('banner reacts in the same session', () => {
  it('a Settings choice notifies consent subscribers and the banner rule turns off', async () => {
    stubBrowser()
    const c = await import('./consent')
    expect(c.shouldShowBanner()).toBe(true)
    const seen: string[] = []
    const unsub = c.subscribeConsent((r) => { seen.push(r.state) })
    c.recordConsentChoice('denied', 'settings')
    unsub()
    expect(seen).toEqual(['denied'])
    expect(c.shouldShowBanner()).toBe(false)
  })
  it('ConsentBanner subscribes to consent changes, storage, and romrx:consent', () => {
    const src = readFileSync(join(REPO, 'app/src/components/ConsentBanner.tsx'), 'utf8')
    expect(src).toMatch(/subscribeConsent\(hideIfChosen\)/)
    expect(src).toMatch(/addEventListener\('storage'/)
    expect(src).toMatch(/addEventListener\('romrx:consent', hideIfChosen\)/)
  })
})

describe('Settings reacts to banner choices in the same session', () => {
  it('AdsMeasurementSettings subscribes to consent changes and re-reads state', () => {
    const src = readFileSync(join(REPO, 'app/src/components/AdsMeasurementSettings.tsx'), 'utf8')
    expect(src).toMatch(/subscribeConsent\(sync\)/)
    expect(src).toMatch(/addEventListener\('romrx:consent', sync\)/)
    expect(src).toMatch(/addEventListener\('storage', onStorage\)/)
  })
  it('a banner Decline reaches subscribers so Settings shows Off', async () => {
    stubBrowser()
    const c = await import('./consent')
    const { adsSettingsView } = await import('./adsSettings')
    let shown = adsSettingsView(c.effectiveConsentState(), 'us', false).summary
    expect(shown).toMatch(/not made a choice/)
    const unsub = c.subscribeConsent(() => { shown = adsSettingsView(c.effectiveConsentState(), 'us', false).summary })
    c.recordConsentChoice('denied', 'banner')
    unsub()
    expect(shown).toBe('Off. You turned ads measurement off.')
  })
})

describe('banner_region (which notice the visitor saw)', () => {
  it('app: US and EU/UK visitors send the UI region on banner, settings and gpc rows', async () => {
    const { fetches } = stubBrowser({ lang: 'de-DE' })
    const c = await import('./consent')
    c.recordConsentChoice('denied', 'banner')
    c.recordConsentChoice('granted', 'settings')
    await flush()
    expect(fetches.map((f) => f.body.banner_region)).toEqual(['eu_uk', 'eu_uk'])
    vi.resetModules()
    const g = stubBrowser({ gpc: true })
    const c2 = await import('./consent')
    c2.effectiveConsentState()
    await flush()
    expect(g.fetches[0].body).toMatchObject({ method: 'gpc', banner_region: 'us' })
  })
  it('marketing consent.js sends banner_region', () => {
    const r = runSiteConsent()
    r.ctx.window.RomrxConsent.deny()
    expect(r.fetches[0].body.banner_region).toBe('us')
  })
  it('function whitelists banner_region; anything else becomes null, row still stored', () => {
    const { validateBody } = fn._test
    expect(validateBody({ ...good, banner_region: 'eu_uk' }, {}).row.banner_region).toBe('eu_uk')
    expect(validateBody({ ...good, banner_region: 'us' }, {}).row.banner_region).toBe('us')
    const bad = validateBody({ ...good, banner_region: 'mars' }, {})
    expect(bad.ok).toBe(true)
    expect(bad.row.banner_region).toBeNull()
    expect(validateBody(good, {}).row.banner_region).toBeNull()
  })
})
