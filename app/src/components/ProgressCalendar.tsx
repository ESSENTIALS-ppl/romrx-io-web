// P1-10: calendar of done days plus milestone badges on My Body. Renders nothing until PROGRESS_COPY has Stacy's words.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Award } from 'lucide-react'
import { cn } from '../lib/cn'
import { PROGRESS_COPY, MILESTONES, earnedMilestones, monthGrid, shiftMonth, weekdayInitials, monthTitle } from '../lib/progressCalendar'

function localIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ProgressCalendar({ sessionDates }: { sessionDates: string[] }) {
  const copy = PROGRESS_COPY
  const todayIso = localIso()
  const [month, setMonth] = useState(todayIso.slice(0, 7) + '-01')
  const done = useMemo(() => new Set(sessionDates), [sessionDates])
  const weeks = useMemo(() => monthGrid(month, done, todayIso), [month, done, todayIso])
  const earned = useMemo(() => new Set(earnedMilestones(sessionDates)), [sessionDates])
  if (!copy) return null
  const initials = weekdayInitials()
  return (
    <div className="rounded-card bg-white border border-slate-200 p-4 space-y-3" data-testid="progress-calendar">
      <div>
        <p className="text-sm font-bold text-cobalt-ink">{copy.title}</p>
        {copy.subtitle && <p className="text-xs text-slate-500">{copy.subtitle}</p>}
      </div>
      <div className="flex items-center justify-between">
        <button type="button" aria-label={copy.prevMonth} className="p-1 rounded hover:bg-slate-100" onClick={() => setMonth(m => shiftMonth(m, -1))}><ChevronLeft size={16} /></button>
        <p className="text-xs font-semibold text-slate-600">{monthTitle(month)}</p>
        <button type="button" aria-label={copy.nextMonth} className="p-1 rounded hover:bg-slate-100" onClick={() => setMonth(m => shiftMonth(m, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {initials.map((w, i) => <span key={i} className="text-[10px] font-semibold text-slate-400">{w}</span>)}
        {weeks.flat().map((c, i) => c ? (
          <span
            key={c.iso}
            data-done={c.done ? 'true' : 'false'}
            className={cn('h-7 flex items-center justify-center rounded-full text-[11px]',
              c.done ? 'bg-cobalt text-white font-semibold' : 'text-slate-600',
              c.today && !c.done && 'ring-1 ring-cobalt')}
          >
            {c.day}
          </span>
        ) : <span key={`e${i}`} />)}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {MILESTONES.map(m => (
          <span
            key={m.id}
            data-earned={earned.has(m.id) ? 'true' : 'false'}
            className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border',
              earned.has(m.id) ? 'bg-cobalt-light text-cobalt-ink border-cobalt/30' : 'bg-slate-50 text-slate-400 border-slate-200')}
          >
            <Award size={11} /> {copy.badges[m.id]}
          </span>
        ))}
      </div>
    </div>
  )
}
