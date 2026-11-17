import { describe, it, expect } from 'vitest'
import { ADD_TO_CALENDAR_COPY, calendarIcsUrl, fetchCalendarIcs } from './addToCalendar'

describe('P1-12 addToCalendar (web download only)', () => {
  it('builds the calendar-ics function URL and keeps the button words in one place', () => {
    expect(calendarIcsUrl('https://example.supabase.co')).toBe('https://example.supabase.co/functions/v1/calendar-ics')
    expect(calendarIcsUrl('https://example.supabase.co/')).toBe('https://example.supabase.co/functions/v1/calendar-ics')
    expect(ADD_TO_CALENDAR_COPY.button).toBe('Add to my calendar')
    expect(ADD_TO_CALENDAR_COPY.filename).toBe('romrx-base.ics')
  })

  it('downloads a valid .ics with the bearer token', async () => {
    const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'
    const res = await fetchCalendarIcs({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      accessToken: 'tok',
      fetchFn: async (url, init) => {
        expect(url).toBe('https://example.supabase.co/functions/v1/calendar-ics')
        expect(init.method).toBe('GET')
        const h = init.headers as Record<string, string>
        expect(h.Authorization).toBe('Bearer tok')
        expect(h.apikey).toBe('anon')
        return new Response(ics, { status: 200, headers: { 'Content-Type': 'text/calendar; charset=utf-8' } })
      },
    })
    expect(res).toEqual({ ok: true, filename: 'romrx-base.ics', ics })
  })

  it('returns unauthorized on 401 and failed on a non-calendar body', async () => {
    const unauth = await fetchCalendarIcs({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      accessToken: 'tok',
      fetchFn: async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    })
    expect(unauth).toEqual({ ok: false, reason: 'unauthorized' })
    const bad = await fetchCalendarIcs({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'anon',
      accessToken: 'tok',
      fetchFn: async () => new Response('<!doctype html>', { status: 200 }),
    })
    expect(bad).toEqual({ ok: false, reason: 'failed' })
  })

  it('help and error words are Stacy e9809b24, verbatim', () => {
    expect(ADD_TO_CALENDAR_COPY.help).toBe("Download a calendar file with a daily session reminder and your next check-in and retest dates. If those dates change, download it again.")
    expect(ADD_TO_CALENDAR_COPY.error).toBe("The calendar file could not be downloaded. Please try again.")
  })
})
