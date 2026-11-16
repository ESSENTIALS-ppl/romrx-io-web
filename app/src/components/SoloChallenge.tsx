// P1-21: solo 14-day challenge card under the Today card. Renders nothing until CHALLENGE_COPY has words.
import { useCallback, useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { CHALLENGE_COPY, CHALLENGE_DAYS, CHALLENGE_GOAL_DAYS, challengeEnd, challengeStatus, readChallenge, saveChallenge, type ChallengeState } from '../lib/challenge'

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function SoloChallenge({ userId, jointKey, jointLabel }: { userId: string; jointKey: string | null; jointLabel: string | null }) {
  const copy = CHALLENGE_COPY
  const [state, setState] = useState<ChallengeState | null>(() => readChallenge(userId))
  const [dates, setDates] = useState<string[]>([])
  const todayIso = localIso()

  const load = useCallback(() => {
    if (!copy || !state) return
    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId)
      .gte('session_date', state.start).lt('session_date', challengeEnd(state.start))
      .then(({ data }) => { if (data) setDates(data.map(r => r.session_date as string)) })
  }, [copy, state, userId])

  useEffect(() => {
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [load])

  if (!copy || !jointKey || !jointLabel) return null

  const start = () => {
    const next = { start: todayIso, joint: jointKey }
    saveChallenge(userId, next); setState(next); setDates([])
    track('challenge_started', { joint: jointKey, days: CHALLENGE_DAYS })
  }

  const status = challengeStatus(state, dates, todayIso)
  return (
    <div className="rounded-card border border-cobalt/20 bg-white p-4 mt-3" data-testid="solo-challenge">
      <p className="text-sm font-bold text-cobalt-ink">{copy.title(jointLabel)}</p>
      {status.kind === 'none' && (
        <>
          <p className="text-xs text-slate-600 mt-1">{copy.pitch}</p>
          <button type="button" onClick={start} className="mt-3 w-full rounded-xl bg-cobalt text-white font-bold py-2.5 text-sm">{copy.start}</button>
        </>
      )}
      {status.kind === 'active' && (
        <>
          <p className="text-xs text-slate-600 mt-1">{copy.progress(status.done, CHALLENGE_GOAL_DAYS, status.day)}</p>
          <div className="mt-2 grid grid-cols-7 gap-1" aria-hidden="true">
            {Array.from({ length: CHALLENGE_DAYS }, (_, k) => {
              const d = new Date(`${state!.start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + k)
              const iso = d.toISOString().slice(0, 10)
              return <span key={iso} className={`h-2 rounded-full ${dates.includes(iso) ? 'bg-cobalt' : iso <= todayIso ? 'bg-slate-200' : 'bg-slate-100'}`} />
            })}
          </div>
        </>
      )}
      {status.kind === 'won' && (
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Award size={18} />{copy.badge}</p>
      )}
      {status.kind === 'expired' && (
        <>
          <p className="text-xs text-slate-600 mt-1">{copy.expired}</p>
          <button type="button" onClick={start} className="mt-3 w-full rounded-xl border-2 border-cobalt text-cobalt font-bold py-2.5 text-sm">{copy.restart}</button>
        </>
      )}
    </div>
  )
}
