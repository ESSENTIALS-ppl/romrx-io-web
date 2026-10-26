import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROMOOD_MYBODY_CONFIG, ROMOOD_MYBODY_COPY as C, ROMOOD_COPY, ROMOOD_PLACEHOLDERS, QUADRANT_NAMES } from '../lib/romoodCopy'
import { romoodSaveEnabled, computeMoodAverage, moodAverageSince, fetchMoodRows, nearestWord, quadrantFor, readoutIndex, type MoodAverage } from '../lib/romood'

/** Half-dial geometry shared by mood and body gauges: value 0-100 maps left to right over the top. */
export function halfDialPoint(v: number, r = 80, cx = 100, cy = 100) {
  const a = Math.PI * (1 - Math.max(0, Math.min(100, v)) / 100)
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
}
export function HalfDial({ value, color, label, testid }: { value: number; color: string; label: string; testid: string }) {
  const end = halfDialPoint(value, 80); const tip = halfDialPoint(value, 62)
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[240px] mx-auto" role="img" aria-label={label} data-testid={testid} data-value={value}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
      {value > 0 && <path d={`M20 100 A80 80 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" />}
      <line x1="100" y1="100" x2={tip.x.toFixed(2)} y2={tip.y.toFixed(2)} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="6" fill="#0F172A" />
    </svg>
  )
}

// Calm, non-alarm palette only: no red or danger colors for low mood (Stacy cond. 2).
const MOOD_COLOR = '#38BDF8'

export function MoodEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-cyan-300 bg-cyan-50 p-4 text-center" data-testid="mood-average-empty">
      <p className="text-sm font-semibold text-slate-800">{C.emptyTitle}</p>
      <Link to="/onboarding/assessment" className="btn-primary text-sm inline-block mt-2">{C.emptyCta}</Link>
    </div>
  )
}

export function MoodAverageCard({ userId, saveEnabled = romoodSaveEnabled(), loadRows = fetchMoodRows }: { userId?: string; saveEnabled?: boolean; loadRows?: typeof fetchMoodRows }) {
  const [avg, setAvg] = useState<MoodAverage | null>(null)
  const [loaded, setLoaded] = useState(false)
  const live = saveEnabled && !!userId
  const { averageWindow, recentDays, averageLabel } = ROMOOD_MYBODY_CONFIG
  const retention = ROMOOD_PLACEHOLDERS.retention
  useEffect(() => {
    if (!live) return
    let on = true
    loadRows(userId!).then(rows => { if (on) { setAvg(computeMoodAverage(rows, moodAverageSince(averageWindow, recentDays, retention))); setLoaded(true) } })
    return () => { on = false }
  }, [live, userId, loadRows, averageWindow, recentDays, retention])

  const windowLabel = retention === '12_months' ? C.window12Months : retention === 'rolling_12_weeks' || averageWindow === 'recent' ? C.windowRecent : C.windowAllTime
  const show = live && loaded && avg
  const name = show ? (averageLabel === 'word' ? nearestWord(avg.energy, avg.pleasantness).word : QUADRANT_NAMES[quadrantFor(avg.energy, avg.pleasantness)]) : ''
  return (
    <section className="rounded-card border border-slate-200 bg-white p-4 text-center" data-testid="mood-average" aria-label={C.title}>
      <div className="flex justify-between items-center text-left">
        <span className="text-xs font-bold tracking-wider uppercase text-cobalt">{C.title}</span>
        <span className="text-[10px] text-slate-500">{C.separate}</span>
      </div>
      {show ? (
        <div data-testid="mood-average-gauge">
          <HalfDial value={avg.energy} color={MOOD_COLOR} testid="mood-average-dial" label={`${C.title}: ${name}. ${ROMOOD_COPY.energy.label}: ${ROMOOD_COPY.energy.readout[readoutIndex(avg.energy)]}. ${ROMOOD_COPY.pleasantness.label}: ${ROMOOD_COPY.pleasantness.readout[readoutIndex(avg.pleasantness)]}`} />
          <p className="text-xl font-bold text-slate-900" data-testid="mood-average-name">{name}</p>
          <p className="text-xs text-slate-500">{ROMOOD_COPY.energy.label}: {ROMOOD_COPY.energy.readout[readoutIndex(avg.energy)]}</p>
          <p className="text-xs text-slate-600">{ROMOOD_COPY.pleasantness.label}: {ROMOOD_COPY.pleasantness.readout[readoutIndex(avg.pleasantness)]}</p>
          <p className="text-xs text-slate-700 mt-1"><span className="font-semibold">{windowLabel}</span> · {C.basedOn(avg.count)}</p>
        </div>
      ) : <div className="mt-3"><MoodEmpty /></div>}
      <p className="text-[10px] text-slate-500 mt-2" data-testid="mood-average-reflection">{C.reflection}</p>
    </section>
  )
}

export function MoodScoreDivider() {
  return <p className="text-center text-[11px] text-slate-500" role="separator" aria-label={C.divider} data-testid="mood-divider">{C.divider}</p>
}
