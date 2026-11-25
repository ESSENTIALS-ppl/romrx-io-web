// @vitest-environment jsdom
// ROMBot iPhone layout (Grant, Nov 24 2026): the chat column fits the visible screen (dvh with a vh fallback, safe-area
// padding, visualViewport while the keyboard is open); the messages list is the only scroller; the page does not scroll.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function builder() {
  const b: Record<string, unknown> = {}
  for (const op of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'in', 'contains']) b[op] = () => b
  b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res)
  return b
}
vi.mock('../lib/supabase', () => ({ supabase: { from: () => builder() } }))
vi.mock('../lib/track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' }, session: { access_token: 't' }, signOut: async () => {} }) }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ profile: { full_name: 'Sam Lee', age_bucket: '30-39' }, loading: false }) }))

import { ROMBot } from './ROMBot'
import { fitLayout, MIN_LIST_PX } from '../hooks/useFitToViewport'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class FakeVV extends EventTarget { height = 700; offsetTop = 0; width = 390 }
let vv: FakeVV
const realRect = Element.prototype.getBoundingClientRect
let root: Root | null = null
let host: HTMLDivElement
beforeEach(() => {
  vv = new FakeVV()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  window.scrollTo = () => {}
  Element.prototype.getBoundingClientRect = function () { return { top: (this as HTMLElement).classList?.contains('rombot-chat') ? 120 : 0, height: 0 } as DOMRect }
})
afterEach(() => { act(() => root?.unmount()); root = null; host?.remove(); vi.unstubAllGlobals(); Element.prototype.getBoundingClientRect = realRect })
async function mount() {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root!.render(createElement(MemoryRouter, null, createElement(ROMBot))) })
  for (let i = 0; i < 4; i++) await act(async () => {})
}
const chat = () => host.querySelector('.rombot-chat') as HTMLElement

describe('ROMBot layout', () => {
  it('fitLayout: fits the visible space; on a short screen covers the visible area so the input stays above the keyboard', () => {
    expect(fitLayout(120, { height: 844, offsetTop: 0 }, 300)).toEqual({ height: 724, overlay: false })
    expect(fitLayout(120, { height: 508, offsetTop: 0 }, 300)).toEqual({ height: 388, overlay: false })
    // 375x667 with the keyboard: not enough room under the app header, so the chat covers the visible area
    expect(fitLayout(181, { height: 407, offsetTop: 0 }, 231)).toEqual({ height: 407, overlay: true })
    expect(fitLayout(181, { height: 407, offsetTop: 0 }, 226 - MIN_LIST_PX)).toEqual({ height: 226, overlay: false })
    expect(fitLayout(120, { height: 508, offsetTop: 40 }, 300)).toEqual({ height: 428, overlay: false }) // iOS panned the visual viewport
  })
  it('column height follows the visual viewport, including when the keyboard opens', async () => {
    await mount()
    expect(chat().dataset.vv).toBe('1')
    expect(chat().style.getPropertyValue('--rombot-top')).toBe('120px')
    expect(chat().style.getPropertyValue('--rombot-h')).toBe('580px')
    await act(async () => { vv.height = 400; vv.dispatchEvent(new Event('resize')) })
    expect(chat().style.getPropertyValue('--rombot-h')).toBe('280px')
    // the input row is inside the fitted column and does not shrink; the messages list is the scroller
    const input = host.querySelector('[data-testid="rombot-input"]') as HTMLElement
    expect(chat().contains(input)).toBe(true)
    expect(input.className).toContain('shrink-0')
    expect(input.querySelector('textarea')).not.toBeNull()
    const list = host.querySelector('[data-testid="rombot-messages"]') as HTMLElement
    expect(list.className).toMatch(/\bflex-1\b.*\boverflow-y-auto\b.*\bmin-h-0\b/)
  })
  it('short screen with the keyboard open: the chat covers the visible area (overlay), and returns when it closes', async () => {
    Element.prototype.getBoundingClientRect = function () {
      const el = this as HTMLElement
      if (el.classList?.contains('rombot-chat')) return { top: 181, height: 0 } as DOMRect
      if (el.dataset?.testid === 'rombot-input') return { top: 0, height: 230 } as DOMRect
      return { top: 0, height: 0 } as DOMRect
    }
    vv.height = 667
    await mount()
    expect(chat().dataset.overlay).toBeUndefined()
    await act(async () => { vv.height = 407; vv.dispatchEvent(new Event('resize')) })
    expect(chat().dataset.overlay).toBe('1')
    expect(chat().style.getPropertyValue('--rombot-h')).toBe('407px')
    await act(async () => { vv.height = 667; vv.dispatchEvent(new Event('resize')) })
    expect(chat().dataset.overlay).toBeUndefined()
    expect(chat().style.getPropertyValue('--rombot-h')).toBe('486px')
  })
  it('the page does not scroll while ROMBot is open, and is restored after', async () => {
    await mount()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    act(() => root!.unmount()); root = null
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
  })
  it('CSS: 100dvh after the 100vh fallback, safe-area bottom padding; viewport-fit=cover in the meta', () => {
    const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')
    const block = css.slice(css.indexOf('.rombot-chat {'))
    expect(block.indexOf('100vh')).toBeGreaterThan(-1)
    expect(block.indexOf('100dvh')).toBeGreaterThan(block.indexOf('100vh'))
    expect(block).toContain('padding-bottom: env(safe-area-inset-bottom, 0px)')
    expect(block).toMatch(/\.rombot-chat\[data-overlay\] \{[^}]*position: fixed;[^}]*top: var\(--rombot-vv-top, 0px\)/)
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/)
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'ROMBot.tsx'), 'utf8')
    expect(page).not.toContain("calc(100vh - 7rem)")
    expect(page).not.toContain('.scrollIntoView(')
  })
})
