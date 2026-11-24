// @vitest-environment jsdom
// FG-08: the trend shows each point's date and % as text; the comparison shows Where you started / Where you are now
// with dates, the Body score and each joint. Values are text, not colour only.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { JointTrend, StartedVsNowTable, assessmentDate } from './MyBodyProgress'

const host = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; return d }

describe('FG-08 JointTrend', () => {
  it('lists every point with its date and value under the line', () => {
    const d = host(renderToStaticMarkup(createElement(JointTrend, { label: 'Hip ER', n: 3, points: [
      { date: '2026-10-04T15:00:00Z', pct: 50, i: 0 },
      { date: '2026-11-10T15:00:00Z', pct: 70, i: 1 },
      { date: '2026-11-17T15:00:00Z', pct: 95, i: 2 },
    ] })))
    const items = [...d.querySelectorAll('[data-trend-points] li')].map(li => li.textContent)
    expect(items).toEqual([`${assessmentDate('2026-10-04T15:00:00Z')} 50%`, `${assessmentDate('2026-11-10T15:00:00Z')} 70%`, `${assessmentDate('2026-11-17T15:00:00Z')} 95%`])
    expect(d.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
    expect(d.querySelectorAll('circle')).toHaveLength(3)
    expect(d.querySelector('[data-trend="Hip ER"] p')!.textContent).toBe('Hip ER')
  })
  it('a gap point is not listed and not drawn', () => {
    const d = host(renderToStaticMarkup(createElement(JointTrend, { label: 'Ankle DF', n: 3, points: [
      { date: '2026-10-04T15:00:00Z', pct: 40, i: 0 }, { date: '2026-11-17T15:00:00Z', pct: 80, i: 2 },
    ] })))
    expect(d.querySelectorAll('[data-trend-points] li')).toHaveLength(2)
    expect(d.querySelectorAll('polyline')).toHaveLength(0)
  })
})

describe('FG-08 StartedVsNowTable', () => {
  const data = {
    started: { date: '2026-10-04T15:00:00Z', total: 50 },
    now: { date: '2026-11-17T15:00:00Z', total: 94 },
    delta: 44,
    joints: [
      { key: 'hip_er', label: 'Hip ER', started: 50, now: 95 },
      { key: 'hip_flex', label: 'Hip Flexion', started: null, now: 92 },
    ],
  }
  it('shows both headings with their dates, Body score and each joint as text', () => {
    const d = host(renderToStaticMarkup(createElement(StartedVsNowTable, { data })))
    const ths = [...d.querySelectorAll('thead th')]
    expect(ths.map(t => t.getAttribute('scope'))).toEqual(['col', 'col'])
    expect(ths[0].textContent).toBe(`Where you started${assessmentDate(data.started.date)}`)
    expect(ths[1].textContent).toBe(`Where you are now${assessmentDate(data.now.date)}`)
    const rows = [...d.querySelectorAll('tbody tr')].map(r => [...r.children].map(c => c.textContent))
    expect(rows).toEqual([['Body score', '50/100', '94/100'], ['Hip ER', '50%', '95%'], ['Hip Flexion', '-', '92%']])
    expect(d.innerHTML).not.toContain('\u2014')
  })
  it('dates use the radar legend format', () => {
    expect(assessmentDate('2026-11-17T15:00:00Z')).toBe('Nov 17, 2026')
  })
})
