// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
vi.mock('../lib/track', () => ({ track: vi.fn(), trackPageView: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: vi.fn(() => { throw new Error('no db') }), rpc: vi.fn() } }))
import * as track from '../lib/track'
import { supabase } from '../lib/supabase'
import { CrisisLine, CrisisHelp } from './CrisisLine'
import { CRISIS_SCREEN_INTENT, CRISIS_SCREEN_LINE, CRISIS_HELP_INTRO, CRISIS_HELP_ITEMS, CRISIS_HELP_DANGER, CRISIS_HELP_TITLE } from '../lib/crisisCopy'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
let roots: Root[] = []
function render(el: ReactElement) { const container = document.createElement('div'); document.body.appendChild(container); const r = createRoot(container); act(() => r.render(el)); roots.push(r)
  return { container, getByTestId: (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement } }
function cleanup() { roots.forEach(r => act(() => r.unmount())); roots = []; document.body.innerHTML = '' }
const fireEvent = { click: (a: Element) => act(() => { a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })) }) }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('crisis line (Stacy final text, option A)', () => {
  it('screen text is word for word', () => {
    const { getByTestId } = render(<CrisisLine />)
    expect(getByTestId('crisis-intent').textContent).toBe(CRISIS_SCREEN_INTENT)
    expect(getByTestId('crisis-text').textContent).toBe(CRISIS_SCREEN_LINE)
  })
  it('Help text is word for word', () => {
    const t = render(<CrisisHelp />).getByTestId('crisis-help').textContent
    expect(t).toBe(CRISIS_HELP_TITLE + CRISIS_HELP_INTRO + CRISIS_HELP_ITEMS.join('') + CRISIS_HELP_DANGER)
  })
  it('links: tel/sms 988, tel 116123 (phone only), findahelpline', () => {
    const { container } = render(<CrisisLine />)
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(hrefs).toEqual(['tel:988', 'sms:988', 'tel:988', 'tel:116123', 'https://findahelpline.com'])
    expect(hrefs).not.toContain('sms:116123')
  })
  it('tapping any link makes no track, Meta, analytics or event insert call', () => {
    const w = window as any; w.fbq = vi.fn(); w.gtag = vi.fn(); w.dataLayer = []; const f = vi.spyOn(globalThis, 'fetch').mockImplementation(vi.fn() as any)
    const { container } = render(<><CrisisLine /><CrisisHelp /></>)
    container.querySelectorAll('a').forEach(a => { a.addEventListener('click', e => e.preventDefault()); fireEvent.click(a) })
    for (const k of Object.keys(track)) { const fn = (track as any)[k]; if (vi.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled() }
    expect(w.fbq).not.toHaveBeenCalled(); expect(w.gtag).not.toHaveBeenCalled(); expect(w.dataLayer).toEqual([])
    expect(f).not.toHaveBeenCalled(); expect(supabase.from).not.toHaveBeenCalled()
    container.querySelectorAll('a').forEach(a => expect(a.getAttribute('onclick')).toBeNull())
    f.mockRestore()
  })
  it('does not depend on mood: no props, identical output', () => {
    expect(CrisisLine.length).toBe(0)
    const a = render(<CrisisLine {...({ mood: 1 } as any)} />).container.innerHTML; cleanup()
    const b = render(<CrisisLine {...({ mood: 5, average: 1 } as any)} />).container.innerHTML
    expect(a).toBe(b)
  })
  it('no em dashes, text only (no images)', () => {
    const all = [CRISIS_SCREEN_INTENT, CRISIS_SCREEN_LINE, CRISIS_HELP_TITLE, CRISIS_HELP_INTRO, ...CRISIS_HELP_ITEMS, CRISIS_HELP_DANGER].join(' ')
    expect(all).not.toMatch(/\u2014/)
    const { container } = render(<><CrisisLine /><CrisisHelp /></>)
    expect(container.querySelectorAll('img,svg').length).toBe(0)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
describe('legal.html crisis lines', () => {
  const html = readFileSync(resolve(__dirname, '../../../legal.html'), 'utf8')
  it('Terms section 3 rule (no numbers) and Privacy 7A line, word for word', () => {
    expect(html).toContain('<p>ROMRx is not a crisis service. We do not monitor what you enter in the app and cannot respond to emergencies.</p>')
    expect(html).toContain('ROMRx does not monitor your check-ins and cannot respond to emergencies. If you need help now, call or text 988 (US), call Samaritans on 116 123 (UK and Ireland), or call your local emergency number.')
    expect(html.indexOf('ROMRx is not a crisis service.')).toBeLessThan(html.indexOf('3A. Training risk'))
  })
})

import { CRISIS_LINE_PARTS, CRISIS_HELP_US_PARTS, CRISIS_HELP_UK_PARTS, CRISIS_HELP_ELSE_PARTS } from '../lib/crisisCopy'
describe('single source', () => {
  it('link parts join to the full strings', () => {
    expect(CRISIS_LINE_PARTS.join('')).toBe(CRISIS_SCREEN_LINE)
    expect([CRISIS_HELP_US_PARTS, CRISIS_HELP_UK_PARTS, CRISIS_HELP_ELSE_PARTS].map(p => p.join(''))).toEqual(CRISIS_HELP_ITEMS)
  })
  it('CrisisLine.tsx holds no copy of its own', () => {
    const src = readFileSync(resolve(__dirname, 'CrisisLine.tsx'), 'utf8')
    for (const w of ['Having a really hard time', 'Samaritans', 'not a crisis service', 'emergency number', 'Need to talk']) expect(src).not.toContain(w)
  })
  it('legal: no 30-day or encrypted-backups claim (Free plan)', () => {
    const html = readFileSync(resolve(__dirname, '../../../legal.html'), 'utf8')
    expect(html).not.toMatch(/encrypted backups|up to 30 days/)
  })
  it('legal: backup line sits right before the 7A crisis line', () => {
    const html = readFileSync(resolve(__dirname, '../../../legal.html'), 'utf8')
    expect(html).toContain('<p>When you delete your check-ins or your account, we delete them from our database right away. ROMRx does not keep separate backup copies of them. Results emails we already sent you stay in your inbox, and our email provider may keep a copy of sent emails for a limited time.</p>\n        <p>ROMRx does not monitor your check-ins and cannot respond to emergencies.')
  })
})
