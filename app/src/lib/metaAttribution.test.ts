/**
 * Meta Pixel + CAPI guards (2026-09-24 re-enable).
 * 1) Load order: nothing queues fbq('consent','revoke') before fbevents.js loads
 *    (fbevents pauses the queue on a queued revoke and never runs grant/init/track).
 * 2) Scope: public signup pages only (/app/signup, /app/signup/:sport) for the SPA,
 *    the marketing script, and the CAPI function (server-side allowlist).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { installPixel, isMetaSafeLocation, metaBrowserIds, validFbp, validFbc } from './metaAttribution'

const REPO = resolve(__dirname, '../../..')
const PIXEL = '2284396799046573'

const OFF_PATHS = [
  '/', '/legal', '/legal.html', '/beta', '/universe', '/index.html', '/signup',
  '/app', '/app/', '/app/login', '/app/dashboard/my-body', '/app/dashboard/my-protocol',
  '/app/onboarding/assessment', '/app/onboarding/results', '/app/unlock/abc', '/app/auth/callback',
  '/app/signup/extra/deep', '/app/signupx',
]
const ON_PATHS = ['/app/signup', '/app/signup/', '/app/signup/bjj']

type Call = unknown[]
function fakeDoc() {
  const appended: { src: string; attrs: Record<string, string> }[] = []
  const doc = {
    appended,
    createElement: () => {
      const el: any = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { el.attrs[k] = v } }
      return el
    },
    head: { appendChild: (el: any) => { appended.push({ src: el.src, attrs: el.attrs }) } },
    querySelector: (sel: string) =>
      sel.includes('data-rx-meta-pixel') ? appended.find((a) => a.attrs['data-rx-meta-pixel']) ?? null : null,
    readyState: 'complete',
    addEventListener: () => {},
  }
  return doc
}
function queueOf(w: any): Call[] { return (w.fbq.queue as ArrayLike<unknown>[]).map((a) => Array.from(a)) }

describe('SPA path allowlist (signup only)', () => {
  it.each(ON_PATHS)('allows %s', (p) => expect(isMetaSafeLocation({ pathname: p, search: '' })).toBe(true))
  it.each(OFF_PATHS)('blocks %s', (p) => expect(isMetaSafeLocation({ pathname: p, search: '' })).toBe(false))
  it('allows utm/fbclid/add query on signup', () => {
    expect(isMetaSafeLocation({ pathname: '/app/signup', search: '?utm_source=x&fbclid=y&add=bjj' })).toBe(true)
  })
  it('blocks /app/signup?email=… and lead/name tokens', () => {
    expect(isMetaSafeLocation({ pathname: '/app/signup', search: '?email=a%40b.co' })).toBe(false)
    expect(isMetaSafeLocation({ pathname: '/app/signup', search: '?lead=t&name=n' })).toBe(false)
  })
})

describe('SPA load order (installPixel)', () => {
  it('queues no consent call before fbevents loads; init before script', () => {
    const w: any = {}
    const doc = fakeDoc()
    installPixel(w, doc as any, PIXEL)
    const q = queueOf(w)
    expect(q.some((c) => c[0] === 'consent')).toBe(false)
    expect(q).toEqual([['set', 'autoConfig', false, PIXEL], ['init', PIXEL]])
    expect(w.fbq.disablePushState).toBe(true)
    expect(doc.appended).toHaveLength(1)
    expect(doc.appended[0].src).toBe('https://connect.facebook.net/en_US/fbevents.js')
  })
  it('re-grant after a revoke sends grant to the live fbevents instance', () => {
    const calls: Call[] = []
    const live: any = (...a: unknown[]) => calls.push(a)
    live.callMethod = () => {}
    const w: any = { fbq: live }
    installPixel(w, fakeDoc() as any, PIXEL)
    expect(calls[0]).toEqual(['consent', 'grant'])
    expect(calls.some((c) => c[0] === 'consent' && c[1] === 'revoke')).toBe(false)
  })
  it('source has no pre-load revoke', () => {
    const src = readFileSync(join(REPO, 'app/src/lib/metaAttribution.ts'), 'utf8')
    const body = src.slice(src.indexOf('export function installPixel'), src.indexOf('function ensurePixelLoaded'))
    expect(body).not.toMatch(/'consent',\s*'revoke'/)
  })
})

/** Run assets/meta-attribution.js in a sandbox with the hard flag forced ON. */
function runMarketing(pathname: string, opts: { consent?: string; gpc?: boolean; search?: string; cookie?: string; lang?: string } = {}) {
  let src = readFileSync(join(REPO, 'assets/meta-attribution.js'), 'utf8')
  src = src.replace('var META_ATTRIBUTION_ENABLED = false;', 'var META_ATTRIBUTION_ENABLED = true;')
  expect(src).toContain('var META_ATTRIBUTION_ENABLED = true;')
  const doc: any = fakeDoc()
  doc.cookie = opts.cookie ?? ''
  const timers: (() => void)[] = []
  const fetches: { url: string; body: any }[] = []
  const store: Record<string, string> = {}
  if (opts.consent) store['romrx.consent.v1'] = JSON.stringify({ state: opts.consent })
  const window: any = {
    location: { pathname, search: opts.search ?? '', origin: 'https://romrx.io' },
    addEventListener: () => {},
  }
  const ctx: any = {
    window,
    document: doc,
    navigator: { globalPrivacyControl: opts.gpc === true, languages: [opts.lang ?? 'en-US'], language: opts.lang ?? 'en-US' },
    localStorage: { getItem: (k: string) => store[k] ?? null },
    fetch: (url: string, init: any) => { fetches.push({ url, body: JSON.parse(init.body) }); return Promise.resolve({}) },
    crypto: { randomUUID: () => 'eid-test-1' },
    setTimeout: (fn: () => void) => { timers.push(fn) },
    console,
  }
  vm.runInNewContext(src, ctx)
  // Drain the short _fbp wait (fbevents never loads in the sandbox).
  for (let i = 0; i < 50 && timers.length; i++) timers.shift()!()
  return { window, doc, fetches }
}

describe('marketing meta-attribution.js (flag forced on)', () => {
  it.each(['/', '/legal', '/legal.html', '/beta', '/universe', '/faq', '/app/login', '/app/dashboard/my-body'])(
    'granted consent on %s: no fbevents, no CAPI', (p) => {
      const r = runMarketing(p, { consent: 'granted' })
      expect(r.doc.appended).toHaveLength(0)
      expect(r.fetches).toHaveLength(0)
      expect(r.window.fbq).toBeUndefined()
    })
  it('granted on /app/signup: fbevents loads, no queued consent, CAPI shares eid, no health data', () => {
    const r = runMarketing('/app/signup', { consent: 'granted' })
    expect(r.doc.appended).toHaveLength(1)
    const q = queueOf(r.window)
    expect(q.some((c) => c[0] === 'consent')).toBe(false)
    expect(q[0]).toEqual(['set', 'autoConfig', false, PIXEL])
    expect(q[1]).toEqual(['init', PIXEL])
    expect(q[2][0]).toBe('track')
    expect((q[2][3] as any).eventID).toBe('eid-test-1')
    expect(r.fetches).toHaveLength(1)
    expect(r.fetches[0].body.event_id).toBe('eid-test-1')
    expect(r.fetches[0].body.event_source_url).toBe('https://romrx.io/app/signup')
    expect(JSON.stringify(r.fetches[0].body)).not.toMatch(/rom_?score|band|joint|protocol|@/i)
  })
  it.each([
    ['GPC', { consent: 'granted', gpc: true }],
    ['denied (Reject / Don\'t Sell)', { consent: 'denied' }],
    ['revoked', { consent: 'revoked' }],
    ['no consent, EU/UK visitor (opt-in)', { lang: 'de-DE' }],
    ['no consent, UK visitor (opt-in)', { lang: 'en-GB' }],
    ['US Reject then GPC', { consent: 'denied', gpc: true }],
    ['?email= on signup', { consent: 'granted', search: '?email=a%40b.co' }],
  ])('%s on /app/signup: zero Meta', (_n, opts) => {
    const r = runMarketing('/app/signup', opts as any)
    expect(r.doc.appended).toHaveLength(0)
    expect(r.fetches).toHaveLength(0)
  })
})

/** Load netlify/functions/meta-capi.js with the hard flag forced ON. */
function loadCapi() {
  let src = readFileSync(join(REPO, 'netlify/functions/meta-capi.js'), 'utf8')
  src = src.replace('const META_ATTRIBUTION_ENABLED = false;', 'const META_ATTRIBUTION_ENABLED = true;')
  expect(src).toContain('const META_ATTRIBUTION_ENABLED = true;')
  const dir = mkdtempSync(join(tmpdir(), 'capi-'))
  const file = join(dir, 'meta-capi.cjs')
  writeFileSync(file, src)
  return createRequire(import.meta.url)(file)
}
function capiEvent(url: unknown, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'https://romrx.io', 'user-agent': 'test', ...headers },
    body: JSON.stringify({
      event_name: 'PageView', event_id: `e-${Math.random()}`, event_source_url: url,
      consent_state: 'granted', consent_version: '2026-09-21-privacy-b', properties: {}, ...extra,
    }),
  }
}

describe('CAPI function server-side signup allowlist (flag forced on)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it.each([
    'https://romrx.io/', 'https://romrx.io/legal', 'https://romrx.io/beta', 'https://romrx.io/app/',
    'https://romrx.io/app/login', 'https://romrx.io/app/dashboard/my-body', 'https://romrx.io/app/onboarding/results',
    'https://evil.example/app/signup', 'http://romrx.io/app/signup', 'not a url', undefined,
  ])('rejects %s without contacting Meta', async (url) => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    const res = await handler(capiEvent(url))
    expect(JSON.parse(res.body)).toMatchObject({ dispatched: false, reason: 'path_not_allowed' })
    expect(f).not.toHaveBeenCalled()
  })
  it('dispatches /app/signup with path-only URL, no custom health data', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    const res = await handler(capiEvent('https://romrx.io/app/signup?email=a%40b.co#x',
      { properties: { content_name: 'signup', rom_score: 91, band: 'Steady', joint: 'hip' } }))
    expect(JSON.parse(res.body)).toMatchObject({ dispatched: true })
    const sent = JSON.parse(f.mock.calls[0][1].body)
    expect(sent.data[0].event_source_url).toBe('https://romrx.io/app/signup')
    expect(sent.data[0].custom_data).toEqual({ content_name: 'signup' })
    expect(JSON.stringify(sent)).not.toMatch(/rom_score|Steady|hip|@/)
  })
  it('GPC header and non-granted consent still block', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', {}, { 'sec-gpc': '1' }))).body).reason).toBe('gpc_opt_out')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', { consent_state: 'denied' }))).body).reason).toBe('consent_blocked')
    expect(f).not.toHaveBeenCalled()
  })
  it('shipped file keeps flag state consistent across the 3 files', () => {
    const a = /META_ATTRIBUTION_ENABLED: boolean = (true|false)/.exec(readFileSync(join(REPO, 'app/src/lib/metaAttribution.ts'), 'utf8'))![1]
    const b = /var META_ATTRIBUTION_ENABLED = (true|false);/.exec(readFileSync(join(REPO, 'assets/meta-attribution.js'), 'utf8'))![1]
    const c = /const META_ATTRIBUTION_ENABLED = (true|false);/.exec(readFileSync(join(REPO, 'netlify/functions/meta-capi.js'), 'utf8'))![1]
    expect(new Set([a, b, c]).size).toBe(1)
  })
})

const FBP = 'fb.1.1596403881668.1116446470'
const FBC_COOKIE = 'fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'

describe('fbp/fbc format validation', () => {
  it.each([FBP, 'fb.2.1596403881668.1116446470', 'fb.1.1596403881668.1116446470.ABcDEFGh'])('valid fbp %s', (v) =>
    expect(validFbp(v)).toBe(true))
  it.each([
    '', 'fb.1.123.456', 'fb.3.1596403881668.1', 'xx.1.1596403881668.1', 'fb.1.1596403881668.abc',
    'fb.1.1596403881668.1;evil', 'a@b.co', `fb.1.1596403881668.${'1'.repeat(200)}`, 42, null,
  ])('invalid fbp %s', (v) => expect(validFbp(v)).toBe(false))
  it.each([FBC_COOKIE, 'fb.1.1554763741205.test123', `${FBC_COOKIE}.ABcDEFGh`])('valid fbc %s', (v) =>
    expect(validFbc(v)).toBe(true))
  it.each([
    'fb.1.1554763741205.', 'fb.1.1554763741205.a b', 'fb.1.1554763741205.<script>', 'https://romrx.io/?fbclid=x',
    `fb.1.1554763741205.${'a'.repeat(600)}`, 'fb.1.1554763741205.a%40b', {},
  ])('invalid fbc %s', (v) => expect(validFbc(v)).toBe(false))
  it('metaBrowserIds reads cookies, builds fbc from ?fbclid, drops junk', () => {
    expect(metaBrowserIds(`a=1; _fbp=${FBP}; _fbc=${FBC_COOKIE}`, '')).toEqual({ fbp: FBP, fbc: FBC_COOKIE })
    expect(metaBrowserIds(`_fbp=${FBP}`, '?fbclid=test123', 1700000000123)).toEqual({ fbp: FBP, fbc: 'fb.1.1700000000123.test123' })
    // cookie already holds this click -> keep the cookie value
    expect(metaBrowserIds('_fbc=fb.1.1554763741205.test123', '?fbclid=test123').fbc).toBe('fb.1.1554763741205.test123')
    // newer click in URL beats an older cookie
    expect(metaBrowserIds(`_fbc=${FBC_COOKIE}`, '?fbclid=newclick', 1700000000123).fbc).toBe('fb.1.1700000000123.newclick')
    expect(metaBrowserIds('_fbp=bogus; _fbc=a@b.co', '?fbclid=bad%20value')).toEqual({})
  })
})

describe('marketing meta-attribution.js fbp/fbc (flag forced on)', () => {
  it('Allow on /app/signup?fbclid=test123: CAPI body has fbp + fbc, URL has no fbclid', () => {
    const r = runMarketing('/app/signup', { consent: 'granted', search: '?fbclid=test123', cookie: `_fbp=${FBP}` })
    expect(r.fetches).toHaveLength(1)
    const b = r.fetches[0].body
    expect(b.fbp).toBe(FBP)
    expect(b.fbc).toMatch(/^fb\.1\.\d{13}\.test123$/)
    expect(b.event_source_url).toBe('https://romrx.io/app/signup')
    expect(JSON.stringify(b)).not.toMatch(/fbclid|@/)
  })
  it('invalid cookies are dropped, event still sent', () => {
    const r = runMarketing('/app/signup', { consent: 'granted', cookie: '_fbp=evil<script>; _fbc=a@b.co' })
    expect(r.fetches).toHaveLength(1)
    expect(r.fetches[0].body.fbp).toBeUndefined()
    expect(r.fetches[0].body.fbc).toBeUndefined()
  })
  it.each([
    ['GPC', { consent: 'granted', gpc: true }],
    ['denied (Reject / Don\'t Sell)', { consent: 'denied' }],
    ['revoked', { consent: 'revoked' }],
    ['no consent, EU/UK visitor (opt-in)', { lang: 'de-DE' }],
    ['no consent, UK visitor (opt-in)', { lang: 'en-GB' }],
    ['US Reject then GPC', { consent: 'denied', gpc: true }],
  ])('%s: no CAPI, so no fbp/fbc', (_n, opts) => {
    const r = runMarketing('/app/signup', { ...(opts as any), search: '?fbclid=test123', cookie: `_fbp=${FBP}; _fbc=${FBC_COOKIE}` })
    expect(r.fetches).toHaveLength(0)
  })
  it.each(['/', '/legal', '/app/login'])('off-allowlist %s: no CAPI, so no fbp/fbc', (p) => {
    const r = runMarketing(p, { consent: 'granted', cookie: `_fbp=${FBP}; _fbc=${FBC_COOKIE}` })
    expect(r.fetches).toHaveLength(0)
  })
})

/** SPA trackMetaEvent with stubbed browser globals (node env). */
async function runSpa(opts: { consent?: string; gpc?: boolean; pathname?: string; search?: string; cookie?: string; lang?: string }) {
  vi.resetModules()
  vi.stubEnv('VITE_META_PIXEL_ID', PIXEL)
  const store: Record<string, string> = {}
  if (opts.consent) store['romrx.consent.v1'] = JSON.stringify({ state: opts.consent, policy_version: 'x', updated_at: 'x' })
  const doc: any = fakeDoc()
  doc.cookie = opts.cookie ?? ''
  const fetches: any[] = []
  vi.stubGlobal('window', {
    location: { pathname: opts.pathname ?? '/app/signup', search: opts.search ?? '', origin: 'https://romrx.io' },
    dispatchEvent: () => true,
  })
  vi.stubGlobal('document', doc)
  vi.stubGlobal('localStorage', { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v } })
  vi.stubGlobal('navigator', { globalPrivacyControl: opts.gpc === true, languages: [opts.lang ?? 'en-US'], language: opts.lang ?? 'en-US' })
  vi.stubGlobal('fetch', (url: string, init: any) => { fetches.push({ url, body: JSON.parse(init.body) }); return Promise.resolve({ ok: true }) })
  const mod = await import('./metaAttribution')
  const eid = mod.trackMetaEvent('PageView')
  await new Promise((r) => setTimeout(r, 20))
  return { eid, fetches }
}

describe('SPA trackMetaEvent fbp/fbc (shipped flag)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })
  const cookie = `_fbp=${FBP}; _fbc=${FBC_COOKIE}`
  it('Allow on /app/signup?fbclid=test123: CAPI body carries fbp + fbc and same event_id', async () => {
    const { eid, fetches } = await runSpa({ consent: 'granted', search: '?fbclid=test123', cookie: `_fbp=${FBP}` })
    expect(eid).toBeTruthy()
    expect(fetches).toHaveLength(1)
    const b = fetches[0].body
    expect(b.event_id).toBe(eid)
    expect(b.fbp).toBe(FBP)
    expect(b.fbc).toMatch(/^fb\.1\.\d{13}\.test123$/)
    expect(b.event_source_url).toBe('https://romrx.io/app/signup')
    expect(JSON.stringify(b)).not.toMatch(/fbclid|@|rom_?score|band|joint|protocol/i)
  })
  it('Allow with cookies only: forwards cookie fbp/fbc', async () => {
    const { fetches } = await runSpa({ consent: 'granted', cookie })
    expect(fetches[0].body).toMatchObject({ fbp: FBP, fbc: FBC_COOKIE })
  })
  it.each([
    ['GPC', { consent: 'granted', gpc: true }],
    ['denied (Reject / Don\'t Sell)', { consent: 'denied' }],
    ['revoked', { consent: 'revoked' }],
    ['no consent, EU/UK visitor (opt-in)', { lang: 'de-DE' }],
    ['no consent, UK visitor (opt-in)', { lang: 'en-GB' }],
    ['US Reject then GPC', { consent: 'denied', gpc: true }],
    ['off-allowlist /app/login', { consent: 'granted', pathname: '/app/login' }],
    ['off-allowlist /app/dashboard/my-body', { consent: 'granted', pathname: '/app/dashboard/my-body' }],
    ['?email= on signup', { consent: 'granted', search: '?email=a%40b.co' }],
  ])('%s: no CAPI POST, no fbp/fbc', async (_n, opts) => {
    const { eid, fetches } = await runSpa({ ...(opts as any), cookie })
    expect(eid).toBeNull()
    expect(fetches).toHaveLength(0)
  })
})

describe('CAPI function fbp/fbc (flag forced on)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })
  it('passes valid fbp/fbc as user_data, drops invalid/oversized', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    await handler(capiEvent('https://romrx.io/app/signup', { fbp: FBP, fbc: 'fb.1.1554763741205.test123' }))
    const ud = JSON.parse(f.mock.calls[0][1].body).data[0].user_data
    expect(ud.fbp).toBe(FBP)
    expect(ud.fbc).toBe('fb.1.1554763741205.test123')
    expect(ud.em).toBeUndefined(); expect(ud.ph).toBeUndefined()
    await handler(capiEvent('https://romrx.io/app/signup', { fbp: 'a@b.co', fbc: `fb.1.1554763741205.${'a'.repeat(600)}` }))
    const ud2 = JSON.parse(f.mock.calls[1][1].body).data[0].user_data
    expect(ud2.fbp).toBeUndefined(); expect(ud2.fbc).toBeUndefined()
    await handler(capiEvent('https://romrx.io/app/signup', { fbp: { x: 1 }, fbc: ['fb.1.1554763741205.x'] }))
    const ud3 = JSON.parse(f.mock.calls[2][1].body).data[0].user_data
    expect(ud3.fbp).toBeUndefined(); expect(ud3.fbc).toBeUndefined()
  })
  it('gates run before fbp/fbc: GPC, denied, off-path never contact Meta', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    const ids = { fbp: FBP, fbc: FBC_COOKIE }
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', ids, { 'sec-gpc': '1' }))).body).reason).toBe('gpc_opt_out')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', { ...ids, consent_state: 'denied' }))).body).reason).toBe('consent_blocked')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/legal', ids))).body).reason).toBe('path_not_allowed')
    expect(f).not.toHaveBeenCalled()
  })
})

describe('US opt-out default (Jim LOCK 2026-09-24 5:38 PM ET)', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })
  it('marketing: US, no choice yet, /app/signup: Pixel loads, CAPI sends us_default, path only', () => {
    const r = runMarketing('/app/signup', { search: '?utm_source=x' })
    expect(r.doc.appended).toHaveLength(1)
    expect(r.fetches).toHaveLength(1)
    expect(r.fetches[0].body.consent_state).toBe('us_default')
    expect(r.fetches[0].body.event_source_url).toBe('https://romrx.io/app/signup')
  })
  it.each(['/', '/legal', '/beta', '/app/login', '/app/dashboard/my-body', '/app/onboarding/results'])(
    'marketing: US default on %s: zero Meta', (p) => {
      const r = runMarketing(p)
      expect(r.doc.appended).toHaveLength(0)
      expect(r.fetches).toHaveLength(0)
    })
  it('SPA: US, no choice yet, /app/signup: CAPI POST with us_default and no health data', async () => {
    const { eid, fetches } = await runSpa({ cookie: `_fbp=${FBP}` })
    expect(eid).toBeTruthy()
    expect(fetches).toHaveLength(1)
    expect(fetches[0].body.consent_state).toBe('us_default')
    expect(fetches[0].body.event_source_url).toBe('https://romrx.io/app/signup')
    expect(JSON.stringify(fetches[0].body)).not.toMatch(/rom_?score|band|joint|protocol|injur|assess|@/i)
  })
  it.each([
    ['US default on /app/dashboard/my-body', { pathname: '/app/dashboard/my-body' }],
    ['US default on /app/onboarding/assessment', { pathname: '/app/onboarding/assessment' }],
    ['US default with ?email=', { search: '?email=a%40b.co' }],
    ['US default + GPC', { gpc: true }],
  ])('SPA: %s: zero Meta', async (_n, opts) => {
    const { eid, fetches } = await runSpa(opts as any)
    expect(eid).toBeNull()
    expect(fetches).toHaveLength(0)
  })
  it('server: us_default dispatches only with US geo; non-US, unknown geo, GPC all block', async () => {
    vi.stubEnv('META_PIXEL_ID', PIXEL); vi.stubEnv('META_CAPI_TOKEN', 'test-token')
    const f = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', f)
    const { handler } = loadCapi()
    const us = { consent_state: 'us_default' }
    const geo = (c: string) => Buffer.from(JSON.stringify({ country: { code: c } })).toString('base64')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', us, { 'x-country': 'DE' }))).body).reason).toBe('consent_blocked_non_us')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', us, { 'x-nf-geo': geo('GB') }))).body).reason).toBe('consent_blocked_non_us')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', us))).body).reason).toBe('consent_blocked_non_us')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', us, { 'x-country': 'US', 'sec-gpc': '1' }))).body).reason).toBe('gpc_opt_out')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', { consent_state: 'unknown' }, { 'x-country': 'US' }))).body).reason).toBe('consent_blocked')
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/dashboard/my-body', us, { 'x-country': 'US' }))).body).reason).toBe('path_not_allowed')
    expect(f).not.toHaveBeenCalled()
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup', us, { 'x-country': 'US' }))).body).dispatched).toBe(true)
    expect(JSON.parse((await handler(capiEvent('https://romrx.io/app/signup/bjj', us, { 'x-nf-geo': geo('US') }))).body).dispatched).toBe(true)
    expect(f).toHaveBeenCalledTimes(2)
  })
})

describe('PageView dedupe + ?add= strip (Grant GO 2026-09-24)', () => {
  it('treats /app/signup/:sport as redirect-only', async () => {
    const { isSignupRedirectPath } = await import('./metaAttribution')
    expect(isSignupRedirectPath('/app/signup/bjj')).toBe(true)
    expect(isSignupRedirectPath('/app/signup/bodybuilding/')).toBe(true)
    expect(isSignupRedirectPath('/app/signup')).toBe(false)
    expect(isSignupRedirectPath('/app/signup/')).toBe(false)
  })
  it('removes only add, keeps utm/fbclid and hash, saves sport', async () => {
    const { stripAddParam, SIGNUP_ADD_KEY } = await import('./metaAttribution')
    const store: Record<string, string> = {}
    const calls: string[] = []
    const w: any = {
      location: { pathname: '/app/signup', search: '?utm_source=x&add=BJJ&fbclid=abc', hash: '#h' },
      history: { state: { k: 1 }, replaceState: (_s: unknown, _t: string, url: string) => calls.push(url) },
      sessionStorage: { setItem: (k: string, v: string) => { store[k] = v } },
    }
    stripAddParam(w)
    expect(calls).toEqual(['/app/signup?utm_source=x&fbclid=abc#h'])
    expect(store[SIGNUP_ADD_KEY]).toBe('bjj')
  })
  it('no add: leaves URL alone', async () => {
    const { stripAddParam } = await import('./metaAttribution')
    const calls: string[] = []
    stripAddParam({ location: { pathname: '/app/signup', search: '?utm_source=x', hash: '' }, history: { state: null, replaceState: (_a: unknown, _b: string, u: string) => calls.push(u) } } as any)
    expect(calls).toHaveLength(0)
  })
})
