process.env.TZ = 'America/New_York'
// P1-04: 3-in-week-1 goal helpers and their use on the Today card.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WEEK1_GOAL, WEEK1_COPY, week1Window, isInWeek1, week1Done, week1LocalDate, week1StartFrom, week1CountEnd } from './week1Goal'

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
    expect(week1Done(['2026-11-14', '2026-11-23', '2026-11-17'], w)).toBe(1)
    expect(week1Done(['2026-11-22'], w)).toBe(1) // day after week 1: an evening day-7 session stored on the UTC day (pre P1-05)
    expect(week1Done(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'], w)).toBe(3)
  })
  it('works across a month end', () => {
    expect(week1Window('2026-11-28')).toEqual({ start: '2026-11-28', end: '2026-12-05' })
  })
  it("Today card shows 3 dots in week 1 with Stacy's words", () => {
    const s = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(s).toMatch(/\{showWeek1 && \(/)
    expect(s).not.toMatch(/\{\{P1-04/)
    expect(s).toContain('WEEK1_COPY.done : WEEK1_COPY.label')
    expect(s).toContain('WEEK1_COPY.progress(week1Count)')
    expect(s).toMatch(/refreshCount\(\); refreshWeek1\(\)/)
    expect(WEEK1_COPY.label).toBe('Week 1 goal: 3 sessions')
    expect(WEEK1_COPY.done).toBe('Week 1 goal done: 3 of 3')
    expect(WEEK1_COPY.progress(2)).toBe('2 of 3 this week')
  })
  it('an 8 PM ET session counts in today\'s week 1, in either P1-05 ship order', () => {
    const assessedAt = '2026-11-16T00:30:00+00:00' // 7:30 PM ET Sun Nov 15 (UTC already says Nov 16)
    const w = week1Window(week1StartFrom(assessedAt))
    expect(w.start).toBe('2026-11-15') // local day, not the UTC day
    const eightPm = new Date('2026-11-15T20:00:00-05:00')
    const today = week1LocalDate(eightPm)
    expect(today).toBe('2026-11-15')
    expect(isInWeek1(today, w)).toBe(true) // the card shows that evening
    expect(week1Done([today], w)).toBe(1) // with P1-05: stored as the local day
    expect(week1Done([eightPm.toISOString().slice(0, 10)], w)).toBe(1) // without P1-05: stored as the UTC day (Nov 16)
    expect(week1CountEnd(w)).toBe('2026-11-23')
    expect(isInWeek1(week1LocalDate(new Date('2026-11-22T08:00:00-05:00')), w)).toBe(false) // day 8: card hidden
  })
  it('MyProtocol uses the local day for week 1, not toISOString', () => {
    const s = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(s).toContain('isInWeek1(week1LocalDate(), week1)')
    expect(s).toContain('week1Window(week1StartFrom(assessedAt))')
    expect(s).not.toMatch(/isInWeek1\(new Date\(\)\.toISOString/)
  })
})

describe('P1-04 keeps the Session N/42 count on load (Vera F0)', () => {
  it('Today card runs both load effects: refreshCount (N/42) and refreshWeek1', () => {
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('useEffect(() => { refreshCount() }, [refreshCount])')
    expect(page).toContain('useEffect(() => { refreshWeek1() }, [refreshWeek1])')
    expect(page).toContain("if (!error || error.code === '23505') { refreshCount(); refreshWeek1() }")
  })
})
