// P1-09: weekly goal header and picker on the Today card. Renders nothing until WEEKLY_GOAL_COPY has Stacy's words;
// the Today card then keeps its "Session N/42" counter.
import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/cn'
import { track } from '../lib/track'
import { WEEKLY_GOAL_COPY, GOAL_OPTIONS, daysThisWeek, weeklyStreak, readWeeklyGoal, weeklyGoalKey, weekStart } from '../lib/weeklyGoal'

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function WeeklyGoal({ userId, refreshKey }: { userId: string; refreshKey: number }) {
  const copy = WEEKLY_GOAL_COPY
  const [goal, setGoal] = useState<number | null>(() => readWeeklyGoal(userId))
  const [picking, setPicking] = useState(false)
  const [dates, setDates] = useState<string[]>([])
  const todayIso = localIso()

  useEffect(() => {
    if (!copy || !userId) return
    let cancelled = false
    const since = weekStart(todayIso)
    const from = new Date(`${since}T00:00:00Z`); from.setUTCDate(from.getUTCDate() - 7 * 52)
    supabase.from('protocol_sessions').select('session_date').eq('user_id', userId).gte('session_date', from.toISOString().slice(0, 10))
      .then(({ data }) => { if (!cancelled && data) setDates(data.map(r => r.session_date as string)) })
    return () => { cancelled = true }
  }, [copy, userId, refreshKey, todayIso])

  if (!copy) return null

  const choose = (n: number) => {
    try { localStorage.setItem(weeklyGoalKey(userId), String(n)) } catch { /* ignore */ }
    setGoal(n); setPicking(false)
    track('weekly_goal_set', { goal: n })
  }

  if (goal === null || picking) {
    return (
      <div className="rounded-lg bg-cobalt-light px-3 py-2 mt-2" data-testid="weekly-goal-picker">
        <p className="text-xs font-semibold text-cobalt-ink mb-1.5">{copy.pickerTitle}</p>
        <div role="radiogroup" aria-label={copy.pickerTitle} className="grid grid-cols-5 gap-1.5">
          {GOAL_OPTIONS.map(n => (
            <button key={n} type="button" role="radio" aria-checked={goal === n} onClick={() => choose(n)}
              className={cn('rounded-md py-1.5 text-xs font-bold border', goal === n ? 'bg-cobalt text-white border-cobalt' : 'bg-white text-cobalt-ink border-slate-200')}>
              {copy.pickerOption(n)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const done = daysThisWeek(dates, todayIso)
  const streak = weeklyStreak(dates, goal, todayIso)
  return (
    <div className="flex items-center justify-between gap-3 mt-2 rounded-lg bg-cobalt-light px-3 py-2" data-testid="weekly-goal">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-cobalt-ink">{copy.thisWeek(Math.min(done, goal), goal)}</p>
        {streak > 0 && <p className="text-[11px] text-slate-600 flex items-center gap-1"><Flame size={11} className="text-orange-500" />{copy.streak(streak)}</p>}
      </div>
      <button type="button" className="text-[11px] font-semibold text-cobalt shrink-0" onClick={() => setPicking(true)}>{copy.change}</button>
    </div>
  )
}
