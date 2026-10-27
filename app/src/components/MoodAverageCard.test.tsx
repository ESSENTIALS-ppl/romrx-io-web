// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
vi.mock('../lib/supabase', () => ({ supabase: {} }))
const track = vi.fn()
vi.mock('../lib/track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
import { renderToStaticMarkup } from 'react-dom/server'
import { MoodAverageCard, MoodScoreDivider, HalfDial, halfDialPoint } from './MoodAverageCard'
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
  it('flag OFF: card and divider are hidden entirely (no empty-state promise), rows never load', async () => {
    const load = vi.fn(async () => [{ energy: 90, pleasantness: 90, created_at: '2026-10-01' }])
    await mount({ userId: 'u', saveEnabled: false, loadRows: load })
    expect(q('mood-average')).toBeNull(); expect(q('mood-average-empty')).toBeNull(); expect(load).not.toHaveBeenCalled()
    act(() => root!.render(createElement(MoodScoreDivider as unknown as (p: { saveEnabled?: boolean }) => null, { saveEnabled: false }))); expect(q('mood-divider')).toBeNull()
    act(() => root!.render(createElement(MoodScoreDivider as unknown as (p: { saveEnabled?: boolean }) => null, { saveEnabled: true }))); expect(q('mood-divider')!.textContent).toBe('Mood is not part of your body score')
  })
  it('flag ON shows the reflection line; the stray ENERGY caption under the dial is gone (Jim Oct 27, mockup)', async () => {
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [{ energy: 40, pleasantness: 60, created_at: '2026-10-01' }] })
    expect(q('mood-average-reflection')!.textContent).toBe('For your own reflection. Not medical advice.')
    expect(q('mood-average-dial-caption')).toBeNull()
    expect(host.textContent).not.toMatch(/ENERGY/)
    expect(host.textContent).toMatch(/Energy: \w/)   // the readout line stays
    expect(q('mood-average-dial')!.getAttribute('aria-label')).toContain('Energy:')
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
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [{ energy: 5, pleasantness: 0, created_at: '2026-10-01' }] })
    expect(host.innerHTML).not.toMatch(/red|#e[0-9a-f]{2}4|danger|alert/i)
  })
  it('title reads "ROMood average" exactly as the mockup header (not "Your average mood")', async () => {
    expect(ROMOOD_MYBODY_COPY.title).toBe('ROMood average')
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [{ energy: 40, pleasantness: 60, created_at: '2026-10-01' }] })
    expect(host.textContent).toContain('ROMood average'); expect(host.textContent).not.toContain('Your average mood')
    expect(q('mood-average')!.getAttribute('aria-label')).toBe('ROMood average')
  })
  it('mood dial is a calm slate to cyan gradient with 11 ticks, never a solid fill (mockup)', async () => {
    await mount({ userId: 'u', saveEnabled: true, loadRows: async () => [{ energy: 72, pleasantness: 60, created_at: '2026-10-01' }] })
    const svg = q('mood-average-dial')!
    expect(svg.getAttribute('data-gradient')).toBe('mood')
    const stops = [...svg.querySelectorAll('linearGradient stop')].map(s => [s.getAttribute('offset'), s.getAttribute('stop-color')])
    expect(stops).toEqual([['0', '#94A3B8'], ['1', '#38E8FF']])
    const fill = svg.querySelector('[data-dial-fill]')!
    expect(fill.getAttribute('stroke')).toMatch(/^url\(#.+\)$/)
    expect(svg.querySelectorAll('[data-dial-tick]').length).toBe(11)
  })
  it('body dial is the red to yellow to blue gradient on a white card, not a band-tinted card (mockup)', () => {
    const body = renderToStaticMarkup(createElement(HalfDial, { value: 84, gradient: 'body', testid: 'body-score-dial', label: 'Body score 84 out of 100' }))
    expect(body).toMatch(/offset="0" stop-color="#DC2626"/); expect(body).toMatch(/offset="0.5" stop-color="#EAB308"/); expect(body).toMatch(/offset="1" stop-color="#1D4ED8"/)
    expect(body).toMatch(/stroke="url\(#body-score-dial-grad\)"/); expect(body).not.toContain('currentColor')
    expect((body.match(/data-dial-tick/g) || []).length).toBe(11)
    const mb = readFileSync(__dirname + '/../pages/MyBody.tsx', 'utf8')
    const card = mb.slice(mb.indexOf('data-testid="body-score-card"') - 120, mb.indexOf('data-testid="body-score-card"') + 40)
    expect(card).toContain('bg-white'); expect(card).not.toMatch(/tier\./)
    expect(mb).toContain('gradient="body"'); expect(mb).not.toMatch(/getBandTier|tier\.(bg|color)/)
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
