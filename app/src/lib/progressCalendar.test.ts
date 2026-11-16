import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { PROGRESS_COPY, milestoneStats, earnedMilestones, monthGrid, shiftMonth, weekdayInitials, monthTitle } from './progressCalendar'

describe('P1-10 progress calendar', () => {
  it('month grid: Sunday first, done and today marked', () => {
    const w = monthGrid('2026-11-01', new Set(['2026-11-03', '2026-11-15']), '2026-11-15')
    expect(w[0][0]?.iso).toBe('2026-11-01') // Nov 1 2026 is a Sunday
    const flat = w.flat().filter(Boolean)
    expect(flat).toHaveLength(30)
    expect(flat.filter(c => c!.done).map(c => c!.iso)).toEqual(['2026-11-03', '2026-11-15'])
    expect(flat.find(c => c!.today)?.iso).toBe('2026-11-15')
    expect(monthGrid('2026-12-01', new Set(), '')[0].slice(0, 2)).toEqual([null, null]) // Dec 1 is a Tuesday
  })
  it('month navigation across a year end', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01')
    expect(monthTitle('2026-11-01')).toBe('November 2026')
    expect(weekdayInitials()).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })
  it('milestones from logged days only', () => {
    expect(milestoneStats([])).toEqual({ total: 0, bestStreak: 0, firstWeek: 0 })
    const s = milestoneStats(['2026-11-01', '2026-11-02', '2026-11-02', '2026-11-04', '2026-11-10'])
    expect(s).toEqual({ total: 4, bestStreak: 2, firstWeek: 3 })
    expect(earnedMilestones(['2026-11-01', '2026-11-02', '2026-11-04'])).toEqual(['first_session', 'week1_three'])
    const seven = Array.from({ length: 7 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`)
    expect(earnedMilestones(seven)).toContain('streak_7')
  })
  it('Stacy words in place; screen-reader state slots empty until supplied', () => {
    expect(PROGRESS_COPY?.title).toBe('Your sessions')
    expect(PROGRESS_COPY?.badges.week1_three).toBe('3 days in your first week')
    expect(Object.keys(PROGRESS_COPY!.badges).sort()).toEqual(['first_session', 'sessions_14', 'sessions_30', 'sessions_42', 'streak_7', 'week1_three'])
    expect(PROGRESS_COPY?.earned).toBeUndefined()
    expect(PROGRESS_COPY?.notYet).toBeUndefined()
  })
  it('badges differ by shape and state, not colour alone', () => {
    const c = readFileSync(join(process.cwd(), 'src', 'components', 'ProgressCalendar.tsx'), 'utf8')
    expect(c).toContain('{got ? <CheckCircle2 size={11} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}')
    expect(c).toContain('aria-disabled={got ? undefined : true}')
    expect(c).toContain('{state && <span className="sr-only">')
  })
})
