// P1-14: push and notificationclick handlers in the one P1-26 worker (app/public/sw.js), loaded with a fake `self`.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(__dirname, '../../public/sw.js'), 'utf8')
type Listener = (e: unknown) => void

function loadWorker(windows: Array<{ url: string; focus?: () => unknown }> = []) {
  const listeners: Record<string, Listener> = {}
  const showNotification = vi.fn(async (_t: string, _o: { body: string }) => undefined)
  const openWindow = vi.fn(async (_u: string) => ({}))
  const matchAll = vi.fn(async () => windows)
  const self = {
    addEventListener: (type: string, fn: Listener) => { listeners[type] = fn },
    registration: { showNotification },
    clients: { matchAll, openWindow, claim: async () => undefined },
    location: { origin: 'https://romrx.io' },
    skipWaiting: async () => undefined,
  }
  new Function('self', 'caches', 'fetch', SRC)(self, {}, async () => new Response(''))
  return { listeners, showNotification, openWindow, matchAll }
}

async function push(listeners: Record<string, Listener>, data: unknown) {
  let p: Promise<unknown> = Promise.resolve()
  listeners.push({ data, waitUntil: (x: Promise<unknown>) => { p = x } })
  await p
}
const jsonData = (v: unknown) => ({ json: () => (typeof v === 'string' ? JSON.parse(v) : v) })

describe('P1-14 sw.js push handlers', () => {
  it('keeps the P1-26 listeners (install, activate, fetch) and adds push + notificationclick', () => {
    const { listeners } = loadWorker()
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'fetch', 'install', 'notificationclick', 'push'])
  })

  it('good payload: shows the sent title and body inside waitUntil', async () => {
    const { listeners, showNotification } = loadWorker()
    await push(listeners, jsonData('{"title":"ROMRx Base","body":"Your weekly summary is ready. See this week\'s sessions."}'))
    expect(showNotification).toHaveBeenCalledWith('ROMRx Base', { body: "Your weekly summary is ready. See this week's sessions." })
  })

  it('missing data: Stacy-cleared title "ROMRx Base", empty body, no invented words', async () => {
    const { listeners, showNotification } = loadWorker()
    await push(listeners, null)
    expect(showNotification).toHaveBeenCalledWith('ROMRx Base', { body: '' })
  })

  it('invalid JSON, non-object, wrong types or blank title: safe fallback, never throws', async () => {
    for (const bad of ['{not json', '"just a string"', '[1,2]', '{"title":5,"body":{}}', '{"title":"  ","body":"x"}']) {
      const { listeners, showNotification } = loadWorker()
      await push(listeners, jsonData(bad))
      const [title, opts] = showNotification.mock.calls[0]
      expect(title).toBe('ROMRx Base')
      expect(typeof opts.body).toBe('string')
    }
    const { listeners, showNotification } = loadWorker()
    await push(listeners, { json: () => { throw new SyntaxError('bad') } })
    expect(showNotification).toHaveBeenCalledWith('ROMRx Base', { body: '' })
  })

  it('notificationclick: closes, focuses an existing /app/ window, does not open a new one', async () => {
    const appFocus = vi.fn(() => 'focused'); const otherFocus = vi.fn()
    const { listeners, openWindow } = loadWorker([{ url: 'https://romrx.io/pricing', focus: otherFocus }, { url: 'https://romrx.io/app/dashboard', focus: appFocus }])
    const close = vi.fn(); let p: Promise<unknown> = Promise.resolve()
    listeners.notificationclick({ notification: { close }, waitUntil: (x: Promise<unknown>) => { p = x } })
    expect(await p).toBe('focused')
    expect(close).toHaveBeenCalledTimes(1); expect(appFocus).toHaveBeenCalledTimes(1); expect(otherFocus).not.toHaveBeenCalled(); expect(openWindow).not.toHaveBeenCalled()
  })

  it('notificationclick with no /app/ window: opens /app/', async () => {
    const { listeners, openWindow } = loadWorker([{ url: 'https://romrx.io/', focus: vi.fn() }])
    const close = vi.fn(); let p: Promise<unknown> = Promise.resolve()
    listeners.notificationclick({ notification: { close }, waitUntil: (x: Promise<unknown>) => { p = x } })
    await p
    expect(close).toHaveBeenCalledTimes(1)
    expect(openWindow).toHaveBeenCalledWith('/app/')
  })
})
