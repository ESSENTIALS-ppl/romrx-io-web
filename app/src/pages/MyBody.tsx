import { LOW_BACK_NOT_MEASURED, baseLumbarRemoved, isLumbarKey } from '../lib/lumbarFlag'
import { Link } from 'react-router-dom'
import { ROMOOD_QUICK_COPY } from '../lib/romoodCopy'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { BaseRadar, type EarlierShape } from '../components/BaseRadar'
import { cn } from '../lib/cn'
import { MoodAverageCard, MoodScoreDivider, HalfDial } from '../components/MoodAverageCard'
import {
  bandChip,
  jointBandsForAssessment,
  jointKeyBase,
  jointDisplayRowsForAssessment,
  radarSideRowsForAssessment,
  formatMeasure,
  formatScoreBand,
  mobilityScoreForAssessment,
  overallBandForAssessment,
  topProblemAreasForAssessment,
  BAND_TONE,
  BAND_LEGEND,
  type BandScore,
  type JointDisplayRow,
} from '../lib/mobilityBands'
import { buildJointTrends, buildStartVsNowTrends, useJointHistory, type TrendPoint, type TrendSeries } from '../lib/jointHistory'
import { AlertTriangle, Activity, TrendingUp, Flame, CheckCircle2, Clock, Calendar } from 'lucide-react'

// Local helper: BJJ's lib/utils.ts had formatJoint(); HQ's lib/ is locked, so
// we keep a small local copy here instead of touching app/src/lib/.
// Preserves L/R side as a suffix so bilateral joints don't render as duplicates.
// Also uppercases common acronyms (ER/IR/DF/Flex/Ext/Abd/Lat).
const JOINT_ACRONYMS: Record<string, string> = {
  er: 'ER', ir: 'IR', df: 'DF', abd: 'Abd', ext: 'Ext', flex: 'Flex', lat: 'Lat', rot: 'Rot',
}
function formatJoint(key: string): string {
  const sideMatch = key.match(/_(l|r)$/)
  const side = sideMatch ? sideMatch[1].toUpperCase() : null
  const base = key.replace(/_(l|r)$/, '')
  const label = base
    .split('_')
    .map(w => JOINT_ACRONYMS[w] ?? (w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
  return side ? `${label} (${side})` : label
}

// Compute current streak: consecutive days ending today or yesterday with a logged session.
// Grace of 1 day (yesterday counts) so a user missing today doesn't insta-break their streak.
function computeStreak(sessionDates: string[]): number {
  if (sessionDates.length === 0) return 0
  const set = new Set(sessionDates)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  // Find anchor: today or yesterday. If neither logged, streak = 0.
  let cursor = new Date(today)
  if (!set.has(iso(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(iso(cursor))) return 0
  }
  let count = 0
  while (set.has(iso(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

// Base radar + Joint Breakdown use the SAME rows (lib/mobilityBands):
// bars = jointDisplayRowsForAssessment, radar = radarSideRowsForAssessment
// (Left/Right outlines; worse side === bar %, same joints, same order, same band).
// No elite sport-pack targets on Base (Fix A, Jim LOCK 2026-09-24).

function JointBar({ row }: { row: JointDisplayRow }) {
  const { label, left, right, midline, band: jointBand, unit } = row
  const pct = row.pct ?? 0
  const asym = left != null && right != null ? Math.abs(left - right) : 0

  // Single source of truth: band from joint_scores / compute_joint_scores formula.
  // Name, bar, % and chip colours all derive from this band (no separate threshold).
  const tone = jointBand != null ? BAND_TONE[jointBand] : null

  // Layout: phones (< sm) use a 2-row grid so the row never needs more width than the card:
  // [label ......... chip] then [bar | value | %], with fixed value/% columns so every bar
  // lines up. sm and up keep the original single row (label w-32 | bar | value w-20 | % w-8 | chip w-20).
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_4.5rem_2.5rem] items-center gap-x-3 gap-y-1.5 py-2 sm:flex sm:gap-3"
      data-joint={row.key} data-pct={pct} data-band={jointBand ?? ''}
    >
      <div className="col-start-1 row-start-1 min-w-0 sm:w-32 sm:shrink-0">
        <p className={cn('text-xs font-medium', tone ? tone.label : 'text-slate-500')}>{label}</p>
        {asym > 10 && (
          <p className="text-xs text-yellow-600 flex items-center gap-0.5 mt-0.5">
            <AlertTriangle size={9} /> {formatMeasure(asym)}{unit} gap
          </p>
        )}
      </div>
      <div className="col-start-1 row-start-2 min-w-0 h-2 bg-gray-100 rounded-full overflow-hidden sm:flex-1">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone ? tone.bar : 'bg-slate-300')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="col-start-2 row-start-2 text-right whitespace-nowrap text-xs text-slate-500 sm:w-20 sm:shrink-0">
        {midline != null
          ? `${formatMeasure(midline)}${unit}`
          : `${formatMeasure(left ?? 0)}${unit} / ${formatMeasure(right ?? 0)}${unit}`}
      </div>
      <div className="col-start-3 row-start-2 justify-self-end w-8 text-right sm:shrink-0">
        <span className={cn('text-xs font-bold', tone ? tone.color : 'text-slate-500')}>
          {pct}%
        </span>
      </div>
      <div className="col-start-2 col-end-4 row-start-1 justify-self-end flex justify-end sm:w-20 sm:shrink-0">
        {jointBand != null && tone && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap',
            tone.chip,
          )}>
            {bandChip(jointBand)}
          </span>
        )}
      </div>
    </div>
  )
}

export function MyBody() {
  const { user } = useAuth()
  const { assessment, assessments, jointScores, sessionDates, loading } = useProfile(user?.id)
  const { history: rpcHistory, startNow: rpcStartNow } = useJointHistory() // FG-08: my_joint_history / my_joint_start_vs_now

  if (loading) return <Spinner />

  if (!assessment) return (
    <EmptyState
      icon={Activity}
      title="No assessment on file"
      description="Complete your ROM self-assessment to see your body map, joint breakdown, and mobility bands."
      action={<Link to="/onboarding/assessment" className="btn-primary text-sm">Get started</Link>}
    />
  )

  // Low-back flag ON (lib/lumbarFlag.ts): an unmeasured lumbar axis is left out (never drawn at 0).
  const lumbarOff = baseLumbarRemoved()
  const radarRows = radarSideRowsForAssessment(assessment, jointScores).filter(r => r.key !== 'hip_flex' || r.measured) // FG-36: hip flexion only where it was measured and counts (not on older assessments)
    .filter(r => !(lumbarOff && isLumbarKey(r.key))) // Grant Oct 21 2026 7:10 PM: no lumbar axis for anyone
  // FG-07: up to 3 earlier assessments on the radar (assessments are newest first; legend is dates only).
  const radarDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const earlierShapes: EarlierShape[] = assessments.slice(1, 4).map(a => ({
    label: radarDate(a.assessed_at),
    rows: radarSideRowsForAssessment(a, null),
  }))
  const prs = mobilityScoreForAssessment(assessment, jointScores)
  const scoreMap = jointBandsForAssessment(assessment, jointScores)
  const allJointRows = jointDisplayRowsForAssessment(assessment, jointScores)
  // Grant Oct 21 2026 7:10 PM: 'Low back: not measured' for ALL users; old saved lumbar values stay in the data, bars hidden.
  const hideLumbar = lumbarOff
  const jointRows = (hideLumbar ? allJointRows.filter(r => !isLumbarKey(r.key)) : allJointRows)
    .filter(r => r.key !== 'hip_flex' || r.left != null || r.right != null) // FG-36: the Hip Flexion bar is hidden on assessments before the cutover
  // FG-08: worse-side % per joint for every loaded assessment, oldest first. Only joints with 2+ measured points get a chart.
  const trendAssessments = assessments.length > 0 ? [...assessments].reverse() : []
  const trendRowsByAssessment = trendAssessments.map(a => ({
    date: a.assessed_at,
    rows: radarSideRowsForAssessment(a, a.id === assessment.id ? jointScores : null),
  }))
  const localTrends: TrendSeries[] = trendAssessments.length < 2 ? [] : jointRows.map(jr => ({
    key: jr.key,
    n: trendAssessments.length,
    points: trendRowsByAssessment
      .map((t, i) => { const r = t.rows.find(x => x.key === jr.key); return r && r.measured && !r.unscored ? { date: t.date, pct: r.worse, i } : null })
      .filter((x): x is TrendPoint => x !== null),
  }))
  // Source order: the signed-in history rpc, then first-vs-latest, then the assessments already on this page (silent fallback).
  const rpcTrends: TrendSeries[] | null = rpcHistory && rpcHistory.length > 0 ? buildJointTrends(rpcHistory)
    : rpcStartNow && rpcStartNow.length > 0 ? buildStartVsNowTrends(rpcStartNow) : null
  const trendSource = rpcTrends ?? localTrends
  const trendRows = jointRows
    .map(jr => ({ key: jr.key, label: jr.label, series: trendSource.find(t => t.key === jr.key) }))
    .filter((t): t is { key: string; label: string; series: TrendSeries } => !!t.series && t.series.points.length >= 2)
  const overallBand: BandScore = overallBandForAssessment(assessment, jointScores) ?? 3
  const problemAreas = topProblemAreasForAssessment(assessment)

  // Delta vs previous assessment (index 1 = second-newest, since assessments are DESC)
  const previousAssessment = assessments.length > 1 ? assessments[1] : null
  const previousPrs = previousAssessment ? mobilityScoreForAssessment(previousAssessment) : null
  const prsDelta = previousPrs != null ? prs - previousPrs : null
  const previousDateStr = previousAssessment
    ? new Date(previousAssessment.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  // Streak + session totals
  const streak = computeStreak(sessionDates)
  const totalSessions = sessionDates.length

  // Retest countdown: 42 days after most recent assessment
  const assessedAtMs = new Date(assessment.assessed_at).getTime()
  const retestDate = new Date(assessedAtMs + 42 * 24 * 60 * 60 * 1000)
  const daysUntilRetest = Math.ceil((retestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const retestDateStr = retestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const retestDue = daysUntilRetest <= 0

  // Estimated protocol duration: base 6 min + 1 min per priority joint (cap 15)
  const priorityCount = problemAreas.length
  const estMinutes = Math.min(15, 6 + priorityCount)

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Body"
        subtitle={`Assessed ${new Date(assessment.assessed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      {/* ROMood average: visually separate, never feeds the body score (Stacy conditions). */}
      <Link to="/dashboard/mood" className="btn-secondary text-sm inline-block" data-testid="mybody-quick-mood">{ROMOOD_QUICK_COPY.myBodyButton}</Link>
      <MoodAverageCard userId={user?.id} />
      <MoodScoreDivider />

      {/* Mobility band: approved Oct 26 concept mockup (white card, red to yellow to blue dial, dark text).
          The band tone lives only in the chips below, never as a card tint or solid dial color. */}
      <div className="rounded-card border border-slate-200 bg-white p-4 text-center" data-testid="body-score-card">
        <div className="flex justify-between items-center text-left">
          <span className="text-xs font-bold tracking-wider uppercase text-cobalt">Mobility band</span>
          <span className="text-[10px] text-slate-500">Body score</span>
        </div>
        <div className="relative" data-testid="body-score-gauge">
          <HalfDial value={prs} gradient="body" testid="body-score-dial" label={`Body score ${prs} out of 100`} />
          <p className="text-xl font-bold leading-tight text-slate-900 -mt-1" data-testid="body-score-band">{formatScoreBand(prs, overallBand)}</p>
        </div>
        <div className="mt-1">
          {prsDelta != null && previousDateStr && (
            <span className={cn(
              'inline-block mb-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
              prsDelta > 0 ? 'bg-green-50 text-green-700' : prsDelta < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
            )}>
              {prsDelta > 0 ? '▲' : prsDelta < 0 ? '▼' : '-'} {prsDelta > 0 ? '+' : ''}{prsDelta} vs {previousDateStr}
            </span>
          )}
          <p className="text-xs text-slate-500">Retest every 6 weeks to track progress</p>
        </div>
        {/* Band legend: always show Needs focus · Building · Steady */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {BAND_LEGEND.map(entry => (
            <span
              key={entry.score}
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded-full border',
                BAND_TONE[entry.score].chip,
                overallBand === entry.score ? 'ring-1 ring-offset-1 ring-current' : 'opacity-90',
              )}
            >
              {entry.full}
            </span>
          ))}
        </div>
      </div>


      {/* Data-first: second assessment enables improvements-over-time research */}
      {assessments.length === 1 && (
        <div className="flex items-start gap-3 rounded-card border border-cobalt/20 bg-cobalt-light p-4">
          <TrendingUp size={18} className="text-cobalt mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cobalt-ink">Want to see how your ROM is changing?</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You have one assessment on file. A second snapshot unlocks progress tracking on this page.
            </p>
            <Link
              to="/onboarding/assessment"
              className="inline-block mt-2 text-xs font-semibold text-cobalt hover:underline"
            >
              Reassess when ready
            </Link>
          </div>
        </div>
      )}

      {assessment.red_flag_triggered && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-card p-4">
          <AlertTriangle size={18} className="text-red-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Movement red flags detected</p>
            <p className="text-xs text-red-700/80 mt-0.5 leading-relaxed">
              {assessment.red_flag_reasons?.join(' - ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="ROM Profile">
          <BaseRadar rows={radarRows} earlier={earlierShapes} latestLabel={radarDate(assessment.assessed_at)} />
          <p className="text-[11px] text-slate-500 mt-1.5 text-center">
            Each line is one side of your body, as a % of your Base target. The dashed circle is <span className={cn('font-semibold', BAND_TONE[3].color)}>Steady</span>. Dents and gaps between the lines show where to focus.
          </p>
        </SectionCard>

        <SectionCard title="Summary">
          <div className="space-y-3 mt-2">
            {problemAreas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top problem areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {problemAreas.map(j => {
                    const jb = scoreMap.get(jointKeyBase(j)) ?? 1
                    const tone = BAND_TONE[jb]
                    return (
                      <span
                        key={j}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full font-medium border inline-flex items-center gap-1.5',
                          tone.chip,
                        )}
                      >
                        {formatJoint(j)}
                        <span className="font-bold">{bandChip(jb)}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {assessment.rom_percentile != null && (
              <div className="flex justify-between items-center py-2.5 border-t border-cobalt/10">
                <span className="text-sm text-slate-500">Percentile</span>
                <span className="text-sm font-bold text-cobalt-ink">{assessment.rom_percentile}th</span>
              </div>
            )}

            {/* Consistency block */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cobalt/10">
              <div className="rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-600">
                  <Flame size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Streak</span>
                </div>
                <p className="text-lg font-bold text-orange-700 leading-tight mt-0.5">{streak}</p>
                <p className="text-[10px] text-orange-600/70">day{streak === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-lg bg-cobalt/5 border border-cobalt/10 px-2.5 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-cobalt">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Logged</span>
                </div>
                <p className="text-lg font-bold text-cobalt-ink leading-tight mt-0.5">{totalSessions}</p>
                <p className="text-[10px] text-slate-500">total</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-600">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Today</span>
                </div>
                <p className="text-lg font-bold text-slate-700 leading-tight mt-0.5">~{estMinutes}</p>
                <p className="text-[10px] text-slate-500">min</p>
              </div>
            </div>

            <Link
              to="/dashboard/my-protocol"
              className="btn-primary text-sm w-full text-center block"
            >
              Start Today's Session →
            </Link>

            {/* Retest countdown */}
            <div className={cn(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2',
              retestDue ? 'bg-cobalt/5 border-cobalt/30' : 'bg-slate-50 border-slate-200'
            )}>
              <div className="flex items-center gap-2 min-w-0">
                <Calendar size={14} className={retestDue ? 'text-cobalt' : 'text-slate-500'} />
                <div className="min-w-0">
                  <p className={cn('text-xs font-semibold', retestDue ? 'text-cobalt-ink' : 'text-slate-600')}>
                    {retestDue ? 'Retest available now' : `Next retest: ${retestDateStr}`}
                  </p>
                  {!retestDue && (
                    <p className="text-[10px] text-slate-500">{daysUntilRetest} day{daysUntilRetest === 1 ? '' : 's'} to go</p>
                  )}
                </div>
              </div>
              <Link
                to="/onboarding/assessment"
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-md shrink-0',
                  retestDue ? 'bg-cobalt text-white hover:bg-cobalt/90' : 'text-cobalt hover:bg-cobalt/10'
                )}
              >
                {retestDue ? 'Retest now' : 'Retest early'}
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Joint Breakdown" subtitle="Worse side shown - % of your Base target">
        <div className="divide-y divide-cobalt/10">
          {jointRows.map(row => <JointBar key={row.key} row={row} />)}
          {hideLumbar && <p className="py-2 text-xs text-slate-500" data-low-back-not-measured>{LOW_BACK_NOT_MEASURED}</p>}
        </div>
        {/* FG-08: per-joint trend across assessments. Headings are the existing joint names; no axis text; each point's native tooltip is its date and %. */}
        {trendRows.length > 0 && (
          <div className="mt-3 border-t border-cobalt/10 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3" data-joint-trends>
            {trendRows.map(t => <JointTrend key={t.key} label={t.label} points={t.series.points} n={t.series.n} />)}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

/** FG-08: tiny trend line for one joint (no axis text). Heading is the existing joint name. */
function JointTrend({ label, points, n }: { label: string; points: TrendPoint[]; n: number }) {
  const W = 120, H = 32, pad = 3
  const xs = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const ys = (v: number) => H - pad - (Math.max(0, Math.min(100, v)) * (H - 2 * pad)) / 100
  // A missing assessment is a gap in the line (never a zero): split into runs of neighbouring assessments.
  const runs: TrendPoint[][] = []
  for (const p of points) {
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1].i === p.i - 1) last.push(p)
    else runs.push([p])
  }
  return (
    <div data-trend={label}>
      <p className="text-xs font-semibold text-slate-600 mb-0.5">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" role="img" aria-label={label}>
        <line x1={pad} x2={W - pad} y1={ys(90)} y2={ys(90)} stroke="#cbd5e1" strokeWidth={0.75} strokeDasharray="2 2" />
        {runs.filter(r => r.length > 1).map(r => (
          <polyline key={r[0].i} points={r.map(p => `${xs(p.i).toFixed(1)},${ys(p.pct).toFixed(1)}`).join(' ')} fill="none" stroke="#1D4ED8" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        {points.map(p => (
          <circle key={p.date} cx={xs(p.i)} cy={ys(p.pct)} r={2.2} fill="#1D4ED8">
            <title>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: {p.pct}%</title>
          </circle>
        ))}
      </svg>
    </div>
  )
}
