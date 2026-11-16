// Time zone fallback (Grant, Avery audit TZ-FALLBACK-AUDIT-20261115.md): when the device zone is unknown,
// Settings and saveReminderTime store America/New_York (the column default and the live P1-22 fallback), not UTC.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { saveReminderTime } from './reminderOptIn'

const settingsSrc = readFileSync(join(process.cwd(), 'src', 'pages', 'Settings.tsx'), 'utf8')
// The exact expression Settings memoises for browserTimezone, taken from the source so the test runs the shipped code.
const settingsExpr = settingsSrc.match(/const browserTimezone = useMemo\(\s*\(\) => ([^\n]+),\n\s*\[\],/)?.[1] ?? ''
const settingsTimezone = () => new Function(`return ${settingsExpr}`)() as string

function stubIntlZone(zone: string | undefined) {
  const Real = Intl.DateTimeFormat
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((...args: ConstructorParameters<typeof Real>) => {
    const f = new Real(...args)
    const ro = f.resolvedOptions()
    return { ...f, resolvedOptions: () => ({ ...ro, timeZone: zone as string }) } as Intl.DateTimeFormat
  }) as unknown as typeof Intl.DateTimeFormat)
}

afterEach(() => { vi.restoreAllMocks() })

describe('time zone fallback is America/New_York', () => {
  it('Settings: the shipped expression falls back to America/New_York, never UTC', () => {
    expect(settingsExpr).toBe("Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'")
    expect(settingsSrc).not.toMatch(/timeZone \|\| 'UTC'/)
  })
  it.each([['empty', ''], ['missing', undefined]])('Settings: device zone %s gives America/New_York', (_l, zone) => {
    stubIntlZone(zone)
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone || null).toBeNull()
    expect(settingsTimezone()).toBe('America/New_York')
  })
  it('Settings: a real device zone still wins', () => {
    stubIntlZone('America/Los_Angeles')
    expect(settingsTimezone()).toBe('America/Los_Angeles')
  })
  it.each([['empty', ''], ['missing', undefined]])('saveReminderTime: zone %s stores America/New_York', async (_l, zone) => {
    const rows: { timezone: string }[] = []
    await saveReminderTime(async row => { rows.push(row); return { error: null } }, 'u1', '19:45', zone as unknown as string)
    expect(rows[0].timezone).toBe('America/New_York')
  })
  it('saveReminderTime: a real zone is kept', async () => {
    const rows: { timezone: string }[] = []
    await saveReminderTime(async row => { rows.push(row); return { error: null } }, 'u1', '07:00', 'Europe/London')
    expect(rows[0].timezone).toBe('Europe/London')
  })
})
