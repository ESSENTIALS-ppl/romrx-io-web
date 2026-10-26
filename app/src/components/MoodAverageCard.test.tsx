// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
vi.mock('../lib/supabase', () => ({ supabase: {} }))
const track = vi.fn()
vi.mock('../lib/track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
import { MoodAverageCard, halfDialPoint } from './MoodAverageCard'
import { computeMoodAverage, moodAverageSince } from '../lib/romood'
import { ROMOOD_MYBODY_CONFIG, ROMOOD_MYBODY_COPY } from '../lib/romoodCopy'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null; let host: HTMLDivElement
afterEach(() => { act(() => root?.unmount()); root = null; host?.remove() })
async function mount(props: Parameters<typeof MoodAverageCard>[0]) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root!.render(createElement(MemoryRouter, null, createElement(MoodAverageCard, props))) })
  await act(async () => {})
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`)

describe('My Body mood average', () => {
  it('flag OFF: empty state only, never loads rows', async () => {
    const load = vi.fn(async () => [{ energy: 90, pleasantness: 90, created_at: '2026-10-01' }])
    await mount({ userId: 'u', saveEnabled: false, loadRows: load })
    expect(q('mood-average-empty')).toBeTruthy(); expect(q('mood-average-gauge')).toBeNull(); expect(load).not.toHaveBeenCalled()
    expect(q('mood-average-reflection')!.textContent).toBe('For your own reflection. Not medical advice.')
  })
  it('flag ON with rows: gauge, word, count; no analytics', async () => {
    const load = vi.fn(async () => [{ energy: 80, pleasantness: 80, created_at: '2026-10-01' }, { energy: 60, pleasantness: 80, created_at: '2026-10-02' }])
    await mount({ userId: 'u', saveEnabled: true, loadRows: load })
    expect(q('mood-average-gauge')).toBeTruthy(); expect(q('mood-average-dial')!.getAttribute('data-value')).toBe('70')
    expect(host.textContent).toContain('Based on 2 check-ins'); expect(host.textContent).toContain('Your average so far')
    expect(track).not.toHaveBeenCalled()
  })
  it('flag ON, no rows (all deleted): empty state, average recomputed from live rows', async () => {
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [] })
    expect(q('mood-average-empty')).toBeTruthy()
  })
  it('no red or alarm colors in the mood card', async () => {
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [{ energy: 0, pleasantness: 0, created_at: '2026-10-01' }] })
    expect(host.innerHTML).not.toMatch(/red|#e[0-9a-f]{2}4|danger|alert/i)
  })
  it('pure average, window and retention', () => {
    expect(computeMoodAverage([])).toBeNull()
    const now = new Date('2026-10-26T00:00:00Z')
    expect(moodAverageSince('all_time', 84, 'until_delete', now)).toBeNull()
    expect(moodAverageSince('recent', 84, 'until_delete', now)?.toISOString()).toBe('2026-08-03T00:00:00.000Z')
    expect(moodAverageSince('all_time', 84, '12_months', now)?.toISOString()).toBe('2025-10-26T00:00:00.000Z')
    expect(computeMoodAverage([{ energy: 10, pleasantness: 10, created_at: '2026-01-01' }, { energy: 50, pleasantness: 50, created_at: '2026-10-01' }], new Date('2026-08-03'))).toEqual({ energy: 50, pleasantness: 50, count: 1 })
    expect(halfDialPoint(0).x).toBeCloseTo(20); expect(halfDialPoint(100).x).toBeCloseTo(180)
  })
  it('config defaults for Jim open items', () => {
    expect(ROMOOD_MYBODY_CONFIG.averageLabel).toBe('word'); expect(ROMOOD_MYBODY_CONFIG.averageWindow).toBe('all_time')
    expect(ROMOOD_MYBODY_COPY.divider).toBe('Mood is not part of your body score')
  })
  it('mood never feeds the score: mobilityBands has no mood reference; MyBody order is mood, divider, body gauge, radar', () => {
    expect(readFileSync(__dirname + '/../lib/mobilityBands.ts', 'utf8')).not.toMatch(/mood/i)
    const mb = readFileSync(__dirname + '/../pages/MyBody.tsx', 'utf8')
    const idx = ['<MoodAverageCard', '<MoodScoreDivider', 'body-score-dial', '<BaseRadar'].map(s => mb.indexOf(s))
    expect(idx.every(i => i > 0)).toBe(true); expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(mb).not.toContain('w-16 h-16 rounded-full')
  })
  it('no em dashes in My Body mood copy', () => { expect(Object.values(ROMOOD_MYBODY_COPY).filter(v => typeof v === 'string').join(' ')).not.toContain('\u2014') })
})
