// P1-01 (Base engagement): one-tap "remind me" with a time the user picks.
// Shown on the results screen and after a completed session until the user opts in or taps not now.
// Words: Stacy's P1-01 file, character for character, via lib/reminderCopy.ts. Jim yes needed before live (NEEDS JIM WORDING).
import { useEffect, useMemo, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { cn } from '../lib/cn'
import { OPT_IN_COPY as C, PRIVACY_URL, friendlyTimeZone, displayTime } from '../lib/reminderCopy'
import {
  reminderStateFromRow,
  saveReminderChanges,
  shouldOfferOptIn,
  optInTarget,
  toWholeHour,
  saveReminderTime,
  isValidReminderTime,
  optInDismissKey,
  OPT_IN_DEFAULT_TIME,
  type OptInPlacement,
  type ReminderState,
} from '../lib/reminderOptIn'

export function ReminderOptIn({ userId, placement, dark = false }: { userId: string; placement: OptInPlacement; dark?: boolean }) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const [state, setState] = useState<ReminderState | null>(null)
  const [time, setTime] = useState(OPT_IN_DEFAULT_TIME)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(optInDismissKey(userId, placement)) === '1' } catch { return false }
  })

  useEffect(() => {
    if (!userId || dismissed) return
    let cancelled = false
    supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return
        setState(reminderStateFromRow(data))
        const t = (data as { reminder_time?: string } | null)?.reminder_time
        if (t && isValidReminderTime(t.slice(0, 5))) setTime(toWholeHour(t.slice(0, 5)))
      })
    return () => { cancelled = true }
  }, [userId, dismissed])

  if (dismissed || (!saved && !shouldOfferOptIn(state))) return null

  const handleYes = async () => {
    if (!isValidReminderTime(time) || !state) return
    setSaving(true); setErr('')
    track('reminder_optin_clicked', { placement })
    // Time and timezone first (existing columns, same write Settings does); the opt-in itself only through the RPC.
    const { error: pErr } = await saveReminderTime(
      row => supabase.from('notification_preferences').upsert(row, { onConflict: 'user_id' }),
      userId, time, timezone,
    )
    if (pErr) { setSaving(false); setErr(C.error); return }
    const res = await saveReminderChanges((fn, args) => supabase.rpc(fn, args), state, optInTarget(state))
    setSaving(false)
    if (!res.ok) { setState(res.applied); setErr(C.error); return }
    setState(res.applied)
    setSaved(true)
    track('reminder_optin_saved', { placement })
  }

  const handleNotNow = () => {
    try { localStorage.setItem(optInDismissKey(userId, placement), '1') } catch { /* ignore */ }
    setDismissed(true)
    track('reminder_optin_dismissed', { placement })
  }

  return (
    <div
      data-testid={`reminder-optin-${placement}`}
      className={cn('rounded-card border p-4 space-y-3', dark ? 'bg-white/5 border-white/20 text-white' : 'bg-white border-cobalt/20 text-cobalt-ink')}
    >
      <div className="flex items-start gap-2">
        <Bell size={16} className={cn('mt-0.5 shrink-0', dark ? 'text-white' : 'text-cobalt')} />
        <div className="min-w-0">
          <p className="text-sm font-bold">{saved ? C.confirmation(displayTime(toWholeHour(time))) : C[placement].heading}</p>
          {!saved && <p className={cn('text-xs mt-1', dark ? 'text-white/70' : 'text-slate-600')}>{C[placement].body}</p>}
        </div>
      </div>
      {!saved && (
        <>
          <div className="flex items-center gap-3">
            <label htmlFor={`optin-time-${placement}`} className={cn('text-xs font-semibold uppercase tracking-wide', dark ? 'text-white/70' : 'text-slate-500')}>
              {C.timeLabel}
            </label>
            <input
              id={`optin-time-${placement}`}
              type="time"
              step={3600}
              value={time}
              onChange={e => setTime(toWholeHour(e.target.value))}
              className="input max-w-[8rem] text-cobalt-ink"
            />
          </div>
          <p className={cn('text-xs', dark ? 'text-white/50' : 'text-slate-500')}>{C.timeHelper(friendlyTimeZone(timezone))}</p>
          {/* Consent line: shown in full right above the button, never collapsed (Stacy A). Links the Privacy Policy. */}
          <p data-testid="reminder-optin-consent" className={cn('text-xs leading-relaxed', dark ? 'text-white/80' : 'text-slate-600')}>
            {C.consentBefore}<a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">{C.consentLink}</a>{C.consentAfter}
          </p>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleYes}
              disabled={saving || !isValidReminderTime(time)}
              className={cn('flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60', dark ? 'bg-white text-cobalt-ink' : 'bg-cobalt text-white')}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {C.primary}
            </button>
            <button
              type="button"
              onClick={handleNotNow}
              className={cn('rounded-xl px-3 py-2.5 text-sm font-semibold', dark ? 'text-white/70 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100')}
            >
              {C.secondary}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
