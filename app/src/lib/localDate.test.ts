// P1-05: session days are LOCAL calendar days. Runs in America/New_York (set below) to reproduce Vera's confirmed bug.
process.env.TZ = 'America/New_York'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { localDateIso, localDateOfTimestamp, addDaysIso, isCompletedToday, computeStreak, isUnexpectedSaveError, withoutDay } from './localDate'

const et = (s: string) => new Date(s) // ISO with explicit offset

describe('P1-05 local session date', () => {
  it('an 8 PM ET session counts as today (old code saved tomorrow)', () => {
    const eightPm = et('2026-11-15T20:00:00-05:00')
    expect(eightPm.toISOString().slice(0, 10)).toBe('2026-11-16') // the old, buggy UTC day
    expect(localDateIso(eightPm)).toBe('2026-11-15')
    expect(isCompletedToday(true, [], localDateIso(eightPm))).toBe(true)
    expect(computeStreak([localDateIso(eightPm)], et('2026-11-15T20:30:00-05:00'))).toBe(1)
  })
  it('the next morning is not locked out', () => {
    const lastNight = localDateIso(et('2026-11-15T20:00:00-05:00'))
    const nextMorning = localDateIso(et('2026-11-16T08:00:00-05:00'))
    expect(nextMorning).toBe('2026-11-16')
    expect(isCompletedToday(null, [lastNight], nextMorning)).toBe(false)
    // an OLD cached UTC entry ('2026-11-16' from an 8 PM session) is overridden once the database answers
    expect(isCompletedToday(false, ['2026-11-16'], nextMorning)).toBe(false)
  })
  it('no day is lost or merged across local midnight and the UTC rollover', () => {
    const times = ['2026-11-15T18:30:00-05:00', '2026-11-15T19:30:00-05:00', '2026-11-15T23:59:00-05:00', '2026-11-16T00:01:00-05:00', '2026-11-16T07:00:00-05:00']
    const days = times.map(t => localDateIso(et(t)))
    expect(days).toEqual(['2026-11-15', '2026-11-15', '2026-11-15', '2026-11-16', '2026-11-16'])
    // old code: 7:30 PM Sun and 7 AM Mon both became 2026-11-16, so the unique (user_id, session_date) upsert merged them
    expect(et(times[1]).toISOString().slice(0, 10)).toBe(et(times[4]).toISOString().slice(0, 10))
    expect(days[1]).not.toBe(days[4])
  })
  it('evening sessions on 3 days give a streak of 3 (old code gave 2)', () => {
    const s = ['2026-11-13T20:00:00-05:00', '2026-11-14T20:00:00-05:00', '2026-11-15T20:00:00-05:00'].map(t => localDateIso(et(t)))
    expect(computeStreak(s, et('2026-11-15T21:00:00-05:00'))).toBe(3)
    expect(computeStreak(s, et('2026-11-16T09:00:00-05:00'))).toBe(3) // yesterday grace
    expect(computeStreak(s, et('2026-11-17T09:00:00-05:00'))).toBe(0)
    expect(computeStreak([], new Date())).toBe(0)
  })
  it('works across a DST change and month and year ends', () => {
    expect(localDateIso(et('2026-11-01T23:30:00-05:00'))).toBe('2026-11-01') // day DST ended
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(computeStreak(['2026-02-28', '2026-03-01'], et('2026-03-01T22:00:00-05:00'))).toBe(2)
  })
  it('cycle start is the local day of assessed_at', () => {
    expect(localDateOfTimestamp('2026-11-16T01:00:00+00:00')).toBe('2026-11-15')
    expect(localDateOfTimestamp('bad')).toBe('bad')
  })
  it('MyProtocol writes and reads the local day; MyBody uses the shared streak', () => {
    const mp = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    const mb = readFileSync(join(process.cwd(), 'src', 'pages', 'MyBody.tsx'), 'utf8')
    expect(mp).not.toMatch(/toISOString\(\)\.slice\(0, 10\)/)
    expect(mp).toContain("const todayIso = localDateIso()")
    expect(mp).toMatch(/\.eq\('session_date', todayIso\)/)
    expect(mp).toContain("onConflict: 'user_id,session_date'")
    expect(mb).toContain("import { computeStreak } from '../lib/localDate'")
    expect(mb).not.toMatch(/function computeStreak/)
  })
  it('a failed save (not 23505) undoes the optimistic completed; 23505 keeps it', () => {
    expect(isUnexpectedSaveError(null)).toBe(false)
    expect(isUnexpectedSaveError({ code: '23505' })).toBe(false)
    expect(isUnexpectedSaveError({ code: '42501' })).toBe(true)
    expect(isUnexpectedSaveError({})).toBe(true)
    const today = '2026-11-15'
    const cached = withoutDay(['2026-11-14', today], today)
    expect(cached).toEqual(['2026-11-14'])
    // After the revert the DB answer is false and wins over any cache, so the card is not completed.
    expect(isCompletedToday(false, [today], today)).toBe(false)
    expect(isCompletedToday(null, cached, today)).toBe(false)
    const mp = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(mp).toMatch(/if \(isUnexpectedSaveError\(error\)\) \{\n\s+\/\/ P1-05[^\n]*\n\s+setDbToday\(false\)/)
    expect(mp).toContain('withoutDay(prev.sessions, todayIso)')
  })
})
