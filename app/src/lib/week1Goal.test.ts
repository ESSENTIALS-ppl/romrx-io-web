// P1-04: 3-in-week-1 goal helpers and their use on the Today card.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WEEK1_GOAL, week1Window, isInWeek1, week1Done } from './week1Goal'

describe('P1-04 week 1 goal', () => {
  const w = week1Window('2026-11-15T23:30:00+00:00')
  it('week 1 is the start day plus 6 more days', () => {
    expect(w).toEqual({ start: '2026-11-15', end: '2026-11-22' })
    expect(isInWeek1('2026-11-15', w)).toBe(true)
    expect(isInWeek1('2026-11-21', w)).toBe(true)
    expect(isInWeek1('2026-11-22', w)).toBe(false)
    expect(isInWeek1('2026-11-14', w)).toBe(false)
  })
  it('counts distinct days inside the window, capped at 3', () => {
    expect(WEEK1_GOAL).toBe(3)
    expect(week1Done([], w)).toBe(0)
    expect(week1Done(['2026-11-15', '2026-11-15', '2026-11-16'], w)).toBe(2)
    expect(week1Done(['2026-11-14', '2026-11-22', '2026-11-17'], w)).toBe(1)
    expect(week1Done(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'], w)).toBe(3)
  })
  it('works across a month end', () => {
    expect(week1Window('2026-11-28')).toEqual({ start: '2026-11-28', end: '2026-12-05' })
  })
  it('Today card shows 3 dots in week 1 with placeholder words only (no final copy)', () => {
    const s = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(s).toMatch(/\{showWeek1 && \(/)
    expect(s).toContain('{{P1-04 WEEK 1 GOAL LABEL, STACY}}')
    expect(s).toContain('{{P1-04 WEEK 1 GOAL DONE, STACY}}')
    expect(s).toMatch(/refreshCount\(\); refreshWeek1\(\)/)
  })
})
