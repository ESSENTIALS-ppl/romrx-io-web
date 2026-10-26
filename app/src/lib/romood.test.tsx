// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const insert = vi.fn(async (_row: Record<string, unknown>) => ({ error: null as null }))
vi.mock('./supabase', () => ({ supabase: { from: () => ({ insert, delete: () => ({ eq: async () => ({ error: null }) }) }) } }))
const track = vi.fn()
vi.mock('./track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
let mockSession: { user: { id: string } } | null = { user: { id: 'u1' } }
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: mockSession, loading: false }) }))

import { ROMood } from '../pages/ROMood'
import { ROMOOD_COPY, FEELING_WORDS } from './romoodCopy'
import { quadrantFor, positionFor, shouldSaveMood, romoodSaveEnabled } from './romood'
import { META_FORBIDDEN_KEYS } from './metaAttribution'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement; let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); insert.mockClear(); track.mockClear(); mockSession = { user: { id: 'u1' } } })
afterEach(() => { act(() => root.unmount()); host.remove() })

function mount(saveEnabled: boolean, nav = vi.fn<(to: string) => void>()) {
  act(() => root.render(createElement(MemoryRouter, null, createElement(ROMood, { saveEnabled, onNavigate: nav }))))
  return nav
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement
const click = async (el: HTMLElement) => { await act(async () => { el.click() }) }

describe('ROMood copy (spec rev 5)', () => {
  it('exact lines', () => {
    expect(ROMOOD_COPY.encouragement).toBe("No matter where you're starting today, we're in this together.")
    expect(ROMOOD_COPY.optInBefore + ROMOOD_COPY.optInLink + ROMOOD_COPY.optInAfter).toBe('Save my mood check-ins so ROMRx can show me patterns over time. See the Privacy Policy.')
    expect(FEELING_WORDS).toHaveLength(16)
    expect(FEELING_WORDS.find(w => w.word === 'Upset')?.description).toBe('Heated, and hard to settle.')
    expect(FEELING_WORDS.find(w => w.word === 'Anxious')?.description).toBe('Wired, and on edge.')
  })
  it('no em dashes, no banned words, no diagnose/predict/screen claims', () => {
    const all = JSON.stringify(ROMOOD_COPY) + JSON.stringify(FEELING_WORDS)
    expect(all).not.toMatch(/\u2014/)
    expect(all).not.toMatch(/\b(normal|required|limited|tight|injury|risk|prevent|improve|proven|diagnos\w*|predict\w*|screen\w*)\b/i)
  })
})

describe('ROMood logic', () => {
  it('bubble positions land in their quadrant', () => {
    for (const w of FEELING_WORDS) { const p = positionFor(w); expect(quadrantFor(p.energy, p.pleasantness)).toBe(w.quadrant) }
  })
  it('save gate needs opt-in, sign-in and flag', () => {
    expect(shouldSaveMood({ optIn: false, signedIn: true, saveEnabled: true })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: false, saveEnabled: true })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: true, saveEnabled: false })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: true, saveEnabled: true })).toBe(true)
  })
  it('save flag defaults OFF', () => {
    expect(romoodSaveEnabled({})).toBe(false)
    expect(romoodSaveEnabled({ VITE_ROMOOD_SAVE: 'on' })).toBe(true)
  })
  it("'mood' keys never go to Meta", () => { expect(META_FORBIDDEN_KEYS.test('mood_word')).toBe(true) })
})

describe('ROMood screen', () => {
  it('opt-in unchecked by default', () => { mount(true); expect((q('romood-optin') as HTMLInputElement).checked).toBe(false) })
  it('Next with box unticked saves nothing', async () => { const nav = mount(true); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled(); expect(nav).toHaveBeenCalledWith('/onboarding/assessment') })
  it('Skip saves nothing even when ticked, and tracks no mood values', async () => {
    const nav = mount(true); await click(q('romood-optin')); await click(q('romood-skip'))
    expect(insert).not.toHaveBeenCalled(); expect(track).toHaveBeenCalledWith('romood_skipped'); expect(nav).toHaveBeenCalled()
  })
  it('Next with box ticked but save flag OFF saves nothing', async () => { mount(false); await click(q('romood-optin')); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled() })
  it('Next with box ticked, signed in, flag ON saves one entry', async () => {
    mount(true)
    const calm = [...host.querySelectorAll('button')].find(b => b.textContent === 'Calm')!
    await click(calm); expect(q('romood-description').textContent).toBe('Steady and unruffled.')
    await click(q('romood-optin')); await click(q('romood-next'))
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', word: 'Calm', quadrant: 'low_pleasant', context: 'onboarding', opted_in: true })
  })
  it('signed out: never saves', async () => { mockSession = null; mount(true); await click(q('romood-optin')); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled() })
})

describe('mood_entries migration', () => {
  const sql = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261026220000_romood_mood_entries.sql'), 'utf8')
  it('own table, RLS, opt-in enforced, delete allowed, no update', () => {
    expect(sql).toMatch(/enable row level security/)
    expect(sql).toMatch(/check \(opted_in = true\)/)
    expect(sql).toMatch(/for delete to authenticated/)
    expect(sql).not.toMatch(/for update/)
    expect(sql).not.toMatch(/assessments?\s*\(/i)
  })
})
