import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '../lib/cn'
import {
  bandFull,
  bandChip,
  jointBandsForAssessment,
  jointKeyBase,
  jointDisplayRowsForAssessment,
  radarDataForAssessments,
  formatMeasure,
  formatScoreBand,
  mobilityScoreForAssessment,
  overallBandForAssessment,
  topProblemAreas,
  BAND_DESC,
  BAND_TONE,
  BAND_LEGEND,
  BAND_HEX,
  type BandScore,
  type JointDisplayRow,
} from '../lib/mobilityBands'
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

function getBandTier(band: BandScore) {
  const tone = BAND_TONE[band]
  return {
    label: bandFull(band),
    color: tone.color,
    bg: tone.bg,
    ring: tone.ring,
    desc: BAND_DESC[band],
  }
}

// Base radar + Joint Breakdown render the SAME rows (lib/mobilityBands
// jointDisplayRowsForAssessment): same joints, same order, same per-joint %
// (worse side / JOINT_SCORE_TARGETS, floored, clamped into the joint's band),
// same band (radarDataForAssessments). Radar scale is fixed 0..100 so the
// outer ring = Steady (100%). No elite sport-pack targets on Base (Fix A, Jim LOCK 2026-09-24).
// Radar series colours: neutral slate so no series reads as a band colour.
// Band lives on the current assessment's dots (BAND_HEX) and in the tooltip.
const RADAR_COLORS = ['#334155', '#94a3b8', '#64748b', '#cbd5e1']

function BandDot(props: { cx?: number; cy?: number; payload?: { band?: BandScore | null } }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return <g />
  const band = payload?.band ?? null
  return (
    <circle
      cx={cx} cy={cy} r={3.5}
      fill={band != null ? BAND_HEX[band] : '#94a3b8'}
      stroke="#fff" strokeWidth={1}
      data-band={band ?? ''}
    />
  )
}

function JointBar({ row }: { row: JointDisplayRow }) {
  const { label, left, right, midline, band: jointBand, pct, unit } = row
  const asym = left != null && right != null ? Math.abs(left - right) : 0

  // Single source of truth: band from joint_scores / compute_joint_scores formula.
  // Name, bar, % and chip colours all derive from this band (no separate threshold).
  const tone = jointBand != null ? BAND_TONE[jointBand] : null

  return (
    <div className="flex items-center gap-3 py-2" data-joint={row.key} data-pct={pct} data-band={jointBand ?? ''}>
      <div className="w-32 shrink-0">
        <p className={cn('text-xs font-medium', tone ? tone.label : 'text-slate-500')}>{label}</p>
        {asym > 10 && (
          <p className="text-xs text-yellow-600 flex items-center gap-0.5 mt-0.5">
            <AlertTriangle size={9} /> {formatMeasure(asym)}{unit} gap
          </p>
        )}
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone ? tone.bar : 'bg-slate-300')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-20 text-right shrink-0 text-xs text-slate-500">
        {midline != null
          ? `${formatMeasure(midline)}${unit}`
          : `${formatMeasure(left ?? 0)}${unit} / ${formatMeasure(right ?? 0)}${unit}`}
      </div>
      <div className="w-8 text-right shrink-0">
        <span className={cn('text-xs font-bold', tone ? tone.color : 'text-slate-500')}>
          {pct}%
        </span>
      </div>
      <div className="w-20 shrink-0 flex justify-end">
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

  if (loading) return <Spinner />

  if (!assessment) return (
    <EmptyState
      icon={Activity}
      title="No assessment on file"
      description="Complete your ROM self-assessment to see your body map, joint breakdown, and mobility bands."
      action={<Link to="/onboarding/assessment" className="btn-primary text-sm">Get started</Link>}
    />
  )

  const radarAssessments = assessments.length > 0 ? assessments : [assessment]
  const radarData = radarDataForAssessments(radarAssessments, assessment, jointScores)
  const RADAR_LABELS = radarAssessments.map(a =>
    new Date(a.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  )
  const prs = mobilityScoreForAssessment(assessment, jointScores)
  const scoreMap = jointBandsForAssessment(assessment, jointScores)
  const jointRows = jointDisplayRowsForAssessment(assessment, jointScores)
  const overallBand: BandScore = overallBandForAssessment(assessment, jointScores) ?? 3
  const problemAreas = topProblemAreas(assessment.worst_joints)
  const tier = getBandTier(overallBand)

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

      {/* Mobility band */}
      <div className={cn('rounded-card border p-4', tier.bg, 'border-cobalt/10')}>
        <div className="flex items-center gap-4">
          <div className={cn('w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0', tier.ring)}>
            <span className={cn('font-display font-bold text-2xl leading-none', tier.color)}>{prs}</span>
            <span className={cn('text-[10px] font-bold', tier.color)}>/100</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <TrendingUp size={13} className={tier.color} />
              <span className={cn('text-xs font-bold tracking-wider', tier.color)}>Mobility band</span>
              {prsDelta != null && previousDateStr && (
                <span className={cn(
                  'text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
                  prsDelta > 0 ? 'bg-green-50 text-green-700' : prsDelta < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {prsDelta > 0 ? '▲' : prsDelta < 0 ? '▼' : '-'} {prsDelta > 0 ? '+' : ''}{prsDelta} vs {previousDateStr}
                </span>
              )}
            </div>
            <p className={cn('text-lg font-bold leading-tight', tier.color)}>{formatScoreBand(prs, overallBand)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Retest every 6 weeks to track progress</p>
          </div>
        </div>
        {/* Band legend: always show Needs focus · Building · Steady */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-cobalt/10">
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
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 4, right: 20, bottom: 4, left: 20 }}>
              <PolarGrid stroke="#dbeafe" />
              <PolarAngleAxis dataKey="joint" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'Inter Tight' }} />
              {/* Fixed 0..100 scale: outer ring = Steady (100% of Base target), never auto-scaled to the data */}
              <PolarRadiusAxis domain={[0, 100]} ticks={[50, 90, 100]} tick={false} axisLine={false} />
              {[...RADAR_LABELS].reverse().map((label, ri) => {
                const i = RADAR_LABELS.length - 1 - ri
                return (
                  <Radar
                    key={`${label}-${i}`}
                    name={label}
                    dataKey={`v${i}`}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={i === 0 ? 0.08 : 0}
                    strokeWidth={i === 0 ? 2 : 1.5}
                    strokeDasharray={i === 0 ? undefined : '5 3'}
                    dot={i === 0 ? <BandDot /> : false}
                    isAnimationActive={false}
                  />
                )
              })}
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #dbeafe', fontFamily: 'Inter Tight' }}
                formatter={(v, name, item) => {
                  const band = (item?.payload as { band?: BandScore | null } | undefined)?.band
                  return [name === RADAR_LABELS[0] && band != null ? `${v}% \u00B7 ${bandFull(band)}` : `${v}%`, name]
                }}
              />
              {RADAR_LABELS.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />}
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-500 mt-1 text-center">
            Worse side, % of your Base target. Outer ring is Steady (100%), next ring in is 90%. Dot color shows the band.
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
        </div>
      </SectionCard>
    </div>
  )
}
