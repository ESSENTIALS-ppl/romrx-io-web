// P1-12: web-only .ics download/link. No native calendar APIs.
// Talks to the calendar-ics edge function (JWT). Not for deploy until that function is live
// Words: Stacy STACY-P1-12-P1-29-WORDS-20261116-2032.md (e9809b24): button and file name CLEAR, help and error EDITED (verbatim).

export const ADD_TO_CALENDAR_COPY = {
  button: 'Add to my calendar',
  help: "Download a calendar file with a daily session reminder and your next check-in and retest dates. If those dates change, download it again.",
  error: "The calendar file could not be downloaded. Please try again.",
  filename: 'romrx-base.ics',
} as const

export function calendarIcsUrl(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/calendar-ics`
}

export type CalendarDownloadResult = { ok: true; filename: string; ics: string } | { ok: false; reason: 'unauthorized' | 'failed' }

export type CalendarFetchFn = (input: string, init: RequestInit) => Promise<Response>

/** GET calendar-ics with the signed-in user's token. Returns the .ics text or a reason. No native APIs. */
export async function fetchCalendarIcs(opts: {
  supabaseUrl: string
  anonKey: string
  accessToken: string
  fetchFn?: CalendarFetchFn
}): Promise<CalendarDownloadResult> {
  const fetchFn = opts.fetchFn ?? fetch
  try {
    const res = await fetchFn(calendarIcsUrl(opts.supabaseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        apikey: opts.anonKey,
      },
    })
    if (res.status === 401) return { ok: false, reason: 'unauthorized' }
    if (!res.ok) return { ok: false, reason: 'failed' }
    const ics = await res.text()
    if (!ics.includes('BEGIN:VCALENDAR')) return { ok: false, reason: 'failed' }
    return { ok: true, filename: ADD_TO_CALENDAR_COPY.filename, ics }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

/** Browser-only: save the .ics as a file download (same pattern as export). Not a native calendar add. */
export function saveIcsDownload(filename: string, ics: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
