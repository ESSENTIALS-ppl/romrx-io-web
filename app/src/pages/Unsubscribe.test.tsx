// @vitest-environment jsdom
/**
 * /app/unsubscribe link handling (FG-09/10/11, F2). ?email= keeps today's request exactly; ?t= sends the
 * signed token the way unsubscribe v9 expects (token in the query string, one-click form body);
 * with neither the page shows its existing "Invalid link." state and sends nothing.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Unsubscribe } from './Unsubscribe'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const flag = vi.hoisted(() => ({ on: false }))
vi.mock('../lib/marketingToggle', () => ({ get SHOW_MARKETING_TOGGLE() { return flag.on } }))

let root: Root, host: HTMLDivElement
const fetchMock = vi.fn()
const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const SECOND_SENTENCE = "You will no longer receive follow-up or renewal reminder emails."
const WITH_NAME_TEXT = "a@b.co has been removed from ROMRx marketing emails. You will no longer receive follow-up or renewal reminder emails."

async function mount(search: string) {
  window.history.pushState({}, '', `/app/unsubscribe${search}`)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => { root.render(createElement(Unsubscribe)) })
  await act(async () => { await Promise.resolve() })
}

beforeEach(() => {
  flag.on = false
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(reply(200, { ok: true }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

describe('Unsubscribe link handling', () => {
  it('?email= posts the JSON email body exactly as before and shows the email', async () => {
    await mount('?email=Jim%40Example.com')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url).endsWith('/functions/v1/unsubscribe')).toBe(true)
    expect(String(url)).not.toContain('?')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ email: 'jim@example.com' }))
    expect(host.textContent).toContain("You're unsubscribed.")
    expect(host.textContent).toContain('jim@example.com')
  })

  it('?t= sends the token in the query string with the one-click form body', async () => {
    await mount('?t=abc.DEF-123_xyz')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url).endsWith('/functions/v1/unsubscribe?t=abc.DEF-123_xyz')).toBe(true)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(init.body).toBe('List-Unsubscribe=One-Click')
    expect(host.textContent).toContain("You're unsubscribed.")
  })

  it('?t= is URL-encoded when it carries special characters', async () => {
    await mount('?t=a%2Bb%3Dc')
    expect(String(fetchMock.mock.calls[0][0]).endsWith('?t=a%2Bb%3Dc')).toBe(true)
  })

  it('both t and email: the token request is sent once (no email body) and the email is shown', async () => {
    await mount('?t=tok123&email=Jim%40Example.com')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('?t=tok123')
    expect(init.body).toBe('List-Unsubscribe=One-Click')
    expect(host.textContent).toContain('jim@example.com')
    expect(host.textContent).toContain("You're unsubscribed.")
  })

  it('neither: shows Invalid link. and sends nothing', async () => {
    await mount('')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(host.textContent).toContain('Invalid link.')
    expect(host.textContent).toContain('This unsubscribe link is missing the email address.')
  })

  it('no name or email (token link): no bold element and only the second sentence is shown (exact text)', async () => {
    await mount('?t=goodtoken')
    expect(host.querySelector('strong')).toBeNull()
    const p = host.querySelectorAll('p')[0]
    const text = p.textContent!.replace(/\s+/g, ' ').trim()
    expect(text).toBe(SECOND_SENTENCE)
    expect(host.textContent).toContain("You're unsubscribed.")
  })

  it('with an email the bold element still shows it', async () => {
    await mount('?email=a%40b.co')
    expect(host.querySelector('strong')!.textContent).toBe('a@b.co')
    expect(host.querySelectorAll('p')[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(WITH_NAME_TEXT)
  })

  it('good token: 200 with ok:true shows success', async () => {
    fetchMock.mockResolvedValue(reply(200, { ok: true }))
    await mount('?t=goodtoken')
    expect(host.textContent).toContain("You're unsubscribed.")
    expect(host.textContent).not.toContain('Something went wrong.')
  })

  it.each([400, 401, 403, 404, 410, 422, 429, 500])('other failure: HTTP %i (not invalid_token) shows Something went wrong. and never success', async (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(status, { error: 'x' }))
    await mount('?t=badtoken')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
  })

  it('bad token: 200 with ok:false in the body shows Something went wrong. and never success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(200, { ok: false }))
    await mount('?t=badtoken')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
  })

  it('v9 bad token: 400 {ok:false,error:invalid_token} shows the existing Invalid link. state, never success', async () => {
    fetchMock.mockResolvedValue(reply(400, { ok: false, error: 'invalid_token' }))
    await mount('?t=forged')
    expect(host.textContent).toContain('Invalid link.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
    expect(host.textContent).not.toContain('Something went wrong.')
    expect(host.querySelector('h1')?.textContent).toBe('Invalid link.')
    expect(host.textContent).not.toContain('missing the email address')
    expect(host.textContent).not.toContain('Please use the link')
    expect(host.querySelector('p')).toBeNull()
  })

  it('v9 unavailable: 503 {ok:false,error:unavailable} shows the existing Something went wrong. state, never success', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(503, { ok: false, error: 'unavailable' }))
    await mount('?t=goodtoken')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
    expect(host.textContent).not.toContain('Invalid link.')
  })

  it('v9 wrong body: 400 {error:"One-click body required"} (no invalid_token) is Something went wrong., not Invalid link.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(400, { error: 'One-click body required' }))
    await mount('?t=tok')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain('Invalid link.')
  })

  it.each([[{}], [null], [{ ok: 'true' }], [{ ok: 1 }]])('success needs body.ok === true: a 200 with body %j is Something went wrong.', async (body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(200, body))
    await mount('?t=tok')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
  })

  it('invalid_token with a non-400 status is still Something went wrong.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValue(reply(503, { ok: false, error: 'invalid_token' }))
    await mount('?t=tok')
    expect(host.textContent).toContain('Something went wrong.')
  })

  it('email link still succeeds on the v8 200 {ok:true}', async () => {
    fetchMock.mockResolvedValue(reply(200, { ok: true }))
    await mount('?email=a%40b.co')
    expect(host.textContent).toContain("You're unsubscribed.")
  })

  it('network error shows Something went wrong. for t and for email links', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockRejectedValue(new Error('offline'))
    await mount('?t=tok')
    expect(host.textContent).toContain('Something went wrong.')
    expect(host.textContent).not.toContain("You're unsubscribed.")
  })

  it('success: the Changed your mind / Re-enable emails line is hidden while SHOW_MARKETING_TOGGLE is false (name, no name, email)', async () => {
    await mount('?t=goodtoken')
    expect(host.textContent).not.toContain('Changed your mind?')
    expect(host.textContent).not.toContain('Re-enable emails anytime')
    expect(host.querySelector('a')).toBeNull()
    expect(host.querySelectorAll('p')).toHaveLength(1)
    expect(host.querySelectorAll('p')[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(SECOND_SENTENCE)
  })

  it('success with a name: exact text is unchanged and the line is still hidden', async () => {
    await mount('?email=a%40b.co')
    expect(host.querySelectorAll('p')[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(WITH_NAME_TEXT)
    expect(host.textContent).not.toContain('Re-enable emails anytime')
    expect(host.querySelector('a')).toBeNull()
  })

  it('the line comes back with the toggle: exact text and the account settings link', async () => {
    flag.on = true
    await mount('?t=goodtoken')
    const note = host.querySelectorAll('p')[1]
    expect(note.textContent!.replace(/\s+/g, ' ').trim()).toBe('Changed your mind? Re-enable emails anytime in your account settings.')
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/app/dashboard/settings')
  })

  it('the shared constant is false in src/lib/marketingToggle.ts', async () => {
    const { readFileSync } = await import('node:fs')
    expect(readFileSync(new URL('../lib/marketingToggle.ts', import.meta.url), 'utf8')).toMatch(/^export const SHOW_MARKETING_TOGGLE = false$/m)
  })
})
