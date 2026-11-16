// @vitest-environment jsdom
// TZ fallback v2: the opt-in button with no device zone saves America/New_York through saveReminderTime.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const upserts: Record<string, unknown>[] = []
vi.mock('../lib/track', () => ({ track: vi.fn(), trackPageView: vi.fn() }))
vi.mock('../lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: { email_reminders: false, retest_reminders: false, weekly_digest: false, reminder_time: '19:00:00' }, error: null }),
  }
  return {
    supabase: {
      from: () => ({ ...chain, upsert: (row: Record<string, unknown>) => { upserts.push(row); return Promise.resolve({ error: null }) } }),
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  }
})
const realDTF = Intl.DateTimeFormat
vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(((...args: ConstructorParameters<typeof realDTF>) => {
  const f = new realDTF(...args)
  const ro = f.resolvedOptions()
  // Device zone unavailable: resolvedOptions().timeZone is empty.
  return { format: (d?: Date | number) => f.format(d), formatToParts: (d?: Date | number) => f.formatToParts(d), resolvedOptions: () => ({ ...ro, timeZone: '' }) }
}) as unknown as typeof Intl.DateTimeFormat)

import { ReminderOptIn } from './ReminderOptIn'
import { OPT_IN_COPY as C } from '../lib/reminderCopy'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
afterEach(() => { if (root) act(() => root!.unmount()); root = null; document.body.innerHTML = '' })

describe('ReminderOptIn with no device time zone', () => {
  it('the yes button saves timezone America/New_York (not UTC)', async () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('')
    const el = document.createElement('div'); document.body.appendChild(el)
    root = createRoot(el)
    await act(async () => { root!.render(<ReminderOptIn userId="u1" placement="results" />) })
    const yes = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes(C.primary))
    expect(yes).toBeTruthy()
    await act(async () => { yes!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(upserts.length).toBe(1)
    expect(upserts[0].timezone).toBe('America/New_York')
    expect(upserts[0].user_id).toBe('u1')
  })
})
