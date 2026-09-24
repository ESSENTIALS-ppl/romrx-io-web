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
import { installPixel, isMetaSafeLocation } from './metaAttribution'

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
function runMarketing(pathname: string, opts: { consent?: string; gpc?: boolean; search?: string } = {}) {
  let src = readFileSync(join(REPO, 'assets/meta-attribution.js'), 'utf8')
  src = src.replace('var META_ATTRIBUTION_ENABLED = false;', 'var META_ATTRIBUTION_ENABLED = true;')
  expect(src).toContain('var META_ATTRIBUTION_ENABLED = true;')
  const doc = fakeDoc()
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
    navigator: { globalPrivacyControl: opts.gpc === true },
    localStorage: { getItem: (k: string) => store[k] ?? null },
    fetch: (url: string, init: any) => { fetches.push({ url, body: JSON.parse(init.body) }); return Promise.resolve({}) },
    crypto: { randomUUID: () => 'eid-test-1' },
    console,
  }
  vm.runInNewContext(src, ctx)
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
    ['no consent', {}],
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
