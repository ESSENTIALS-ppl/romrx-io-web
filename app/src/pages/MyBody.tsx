import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '../lib/cn'
import {
  bandScoreFromAggregate,
  bandScoreFromThresholds,
  bandScoreFromTargetRatio,
  bandFull,
  bandChip,
  worstBandScore,
  overallBandFromJointScores,
  bandMapFromJointScores,
  bandForJointKey,
  JOINT_SCORE_TARGETS,
  BAND_DESC,
  BAND_TONE,
  BAND_LEGEND,
  type BandScore,
  type JointScoreRow,
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

// -- Mobility band (aggregate from joint thresholds) ------------------------------
const PRS_BILATERAL = [
  { l: 'hip_er_l', r: 'hip_er_r', riskBelow: 40, normalMin: 40, base: 'hip_er' },
  { l: 'hip_ir_l', r: 'hip_ir_r', riskBelow: 30, normalMin: 30, base: 'hip_ir' },
  { l: 'hip_abd_l', r: 'hip_abd_r', riskBelow: 30, normalMin: 40, base: 'hip_abd' },
  { l: 'hip_flex_l', r: 'hip_flex_r', riskBelow: 100, normalMin: 100, base: 'hip_flex' },
  { l: 'shoulder_er_l', r: 'shoulder_er_r', riskBelow: 60, normalMin: 60, base: 'shoulder_er' },
  { l: 'shoulder_flex_l', r: 'shoulder_flex_r', riskBelow: 120, normalMin: 140, base: 'shoulder_flex' },
  { l: 'ankle_df_l', r: 'ankle_df_r', riskBelow: 10, normalMin: 10, base: 'ankle_df' },
  { l: 'cervical_lat_l', r: 'cervical_lat_r', riskBelow: 30, normalMin: 40, base: 'cervical_lat' },
]
const PRS_UNILATERAL = [
  { key: 'lumbar_flex', riskBelow: 40, normalMin: 40 },
  { key: 'lumbar_ext', riskBelow: 15, normalMin: 20 },
  { key: 'cervical_flex', riskBelow: 35, normalMin: 45 },
  { key: 'cervical_ext', riskBelow: 40, normalMin: 55 },
]

function computePRS(a: Assessment): number {
  let score = 100
  for (const j of PRS_BILATERAL) {
    const l = (a as unknown as Record<string, number | null>)[j.l]
    const r = (a as unknown as Record<string, number | null>)[j.r]
    if (l != null && r != null) {
      const minVal = Math.min(l, r)
      const gap = Math.abs(l - r)
      if (minVal < j.riskBelow) score -= 8
      else if (minVal < j.normalMin) score -= 4
      if (gap >= 15) score -= 6
      else if (gap >= 8) score -= 3
    }
  }
  for (const j of PRS_UNILATERAL) {
    const v = (a as unknown as Record<string, number | null>)[j.key]
    if (v != null) {
      if (v < j.riskBelow) score -= 6
      else if (v < j.normalMin) score -= 3
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Overall band — shared path with ROMBot:
 * 1) worst persisted joint_scores.score
 * 2) else compute_joint_scores target-ratio on measured ROM
 * 3) else legacy thresholds / PRS only if nothing else available
 */
function overallBandFromJoints(a: Assessment, scores: JointScoreRow[]): BandScore {
  const fromDb = overallBandFromJointScores(scores)
  if (fromDb != null) return fromDb

  const rec = a as unknown as Record<string, number | null>
  const bands: BandScore[] = []
  for (const j of PRS_BILATERAL) {
    const target = JOINT_SCORE_TARGETS[j.base]
    const l = rec[j.l]
    const r = rec[j.r]
    let worse: number | null = null
    if (l != null && r != null) worse = Math.min(l, r)
    else if (l != null) worse = l
    else if (r != null) worse = r
    if (worse == null) continue
    if (target != null) bands.push(bandScoreFromTargetRatio(worse, target))
    else bands.push(bandScoreFromThresholds(worse, j.riskBelow, j.normalMin))
  }
  for (const j of PRS_UNILATERAL) {
    const v = rec[j.key]
    if (v == null) continue
    const target = JOINT_SCORE_TARGETS[j.key]
    if (target != null) bands.push(bandScoreFromTargetRatio(v, target))
    else bands.push(bandScoreFromThresholds(v, j.riskBelow, j.normalMin))
  }
  return worstBandScore(bands) ?? bandScoreFromAggregate(computePRS(a))
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

/** Resolve priority-joint key via joint_scores first (same truth as ROMBot). */
function bandForPriorityJoint(
  a: Assessment,
  jointKey: string,
  scoreMap: Map<string, BandScore>,
): BandScore | null {
  const rec = a as unknown as Record<string, number | null>
  const base = jointKey.replace(/_(l|r)$/, '')
  const bilateral = PRS_BILATERAL.find(j => j.base === base || j.l === jointKey || j.r === jointKey)
  if (bilateral) {
    const sideMatch = jointKey.match(/_(l|r)$/)
    const measured = sideMatch
      ? { left: rec[jointKey], right: null }
      : { left: rec[bilateral.l], right: rec[bilateral.r] }
    return bandForJointKey(jointKey, scoreMap, measured)
  }
  const unilateral = PRS_UNILATERAL.find(j => j.key === base || j.key === jointKey)
  if (unilateral) {
    return bandForJointKey(jointKey, scoreMap, { midline: rec[unilateral.key] })
  }
  return bandForJointKey(jointKey, scoreMap)
}

// Elite athlete targets - scoring against these gives meaningful differentiation.
const OPTIMAL: Record<string, number> = {
  'Hip ER': 80, 'Hip IR': 50, 'Hip Abd': 60, 'Hip Flex': 130,
  'Shoulder ER': 95, 'Shoulder Flex': 180, 'Ankle DF': 20,
  'Lumbar Flex': 70, 'Lumbar Ext': 35,
  'Cervical Lat': 50, 'Cervical Flex': 65, 'Cervical Ext': 75,
}

function norm(val: number, optimal: number) {
  return Math.min(100, Math.round((val / optimal) * 100))
}

const JOINTS = [
  { key: 'Hip ER', get: (a: Assessment) => norm(Math.max(a.hip_er_l ?? 0, a.hip_er_r ?? 0), OPTIMAL['Hip ER']) },
  { key: 'Hip IR', get: (a: Assessment) => norm(Math.max(a.hip_ir_l ?? 0, a.hip_ir_r ?? 0), OPTIMAL['Hip IR']) },
  { key: 'Hip Abd', get: (a: Assessment) => norm(Math.max(a.hip_abd_l ?? 0, a.hip_abd_r ?? 0), OPTIMAL['Hip Abd']) },
  { key: 'Hip Flex', get: (a: Assessment) => norm(Math.max(a.hip_flex_l ?? 0, a.hip_flex_r ?? 0), OPTIMAL['Hip Flex']) },
  { key: 'Shoulder ER', get: (a: Assessment) => norm(Math.max(a.shoulder_er_l ?? 0, a.shoulder_er_r ?? 0), OPTIMAL['Shoulder ER']) },
  { key: 'Shoulder Flex', get: (a: Assessment) => norm(Math.max(a.shoulder_flex_l ?? 0, a.shoulder_flex_r ?? 0), OPTIMAL['Shoulder Flex']) },
  { key: 'Ankle DF', get: (a: Assessment) => norm(Math.max(a.ankle_df_l ?? 0, a.ankle_df_r ?? 0), OPTIMAL['Ankle DF']) },
  { key: 'Lumbar Flex', get: (a: Assessment) => norm(a.lumbar_flex ?? 0, OPTIMAL['Lumbar Flex']) },
  { key: 'Lumbar Ext', get: (a: Assessment) => norm(a.lumbar_ext ?? 0, OPTIMAL['Lumbar Ext']) },
  { key: 'Cerv Lat', get: (a: Assessment) => norm(Math.max(a.cervical_lat_l ?? 0, a.cervical_lat_r ?? 0), OPTIMAL['Cervical Lat']) },
  { key: 'Cerv Flex', get: (a: Assessment) => norm(a.cervical_flex ?? 0, OPTIMAL['Cervical Flex']) },
  { key: 'Cerv Ext', get: (a: Assessment) => norm(a.cervical_ext ?? 0, OPTIMAL['Cervical Ext']) },
]

function buildRadar(assessments: Assessment[]) {
  return JOINTS.map(j => {
    const row: Record<string, string | number> = { joint: j.key }
    assessments.forEach((a, i) => { row[`v${i}`] = j.get(a) })
    return row
  })
}

function JointBar({ label, left, right, midline, optimal, riskBelow, normalMin, jointKey, scoreMap }: {
  label: string; left?: number | null; right?: number | null
  midline?: number | null; optimal: number
  riskBelow: number; normalMin: number
  jointKey?: string
  scoreMap?: Map<string, BandScore>
}) {
  const best = midline ?? Math.max(left ?? 0, right ?? 0)
  const pct = Math.min(100, Math.round((best / optimal) * 100))
  const asym = left != null && right != null ? Math.abs(left - right) : 0
  const isBad = pct < 75

  let measured: number | null = null
  if (midline != null) measured = midline
  else if (left != null && right != null) measured = Math.min(left, right)
  else if (left != null) measured = left
  else if (right != null) measured = right

  // Prefer persisted joint_scores (ROMBot truth); else target-ratio; else legacy thresholds.
  let jointBand: BandScore | null = null
  if (jointKey && scoreMap) {
    jointBand = bandForJointKey(jointKey, scoreMap, { left, right, midline })
  }
  if (jointBand == null && measured != null && jointKey && JOINT_SCORE_TARGETS[jointKey] != null) {
    jointBand = bandScoreFromTargetRatio(measured, JOINT_SCORE_TARGETS[jointKey])
  }
  if (jointBand == null && measured != null) {
    jointBand = bandScoreFromThresholds(measured, riskBelow, normalMin)
  }
  const chipTone = jointBand != null ? BAND_TONE[jointBand] : null

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-32 shrink-0">
        <p className={cn('text-xs font-medium', isBad ? 'text-red-700' : 'text-cobalt-ink')}>{label}</p>
        {asym > 10 && (
          <p className="text-xs text-yellow-600 flex items-center gap-0.5 mt-0.5">
            <AlertTriangle size={9} /> {asym}° gap
          </p>
        )}
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500',
            pct >= 100 ? 'bg-cobalt' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-20 text-right shrink-0 text-xs text-slate-500">
        {midline != null ? `${midline}°` : `${left ?? 0}° / ${right ?? 0}°`}
      </div>
      <div className="w-8 text-right shrink-0">
        <span className={cn('text-xs font-bold',
          pct >= 100 ? 'text-cobalt' : pct >= 75 ? 'text-yellow-600' : 'text-red-700')}>
          {pct}%
        </span>
      </div>
      <div className="w-16 shrink-0 flex justify-end">
        {jointBand != null && chipTone && (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
            chipTone.chip,
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

  const radarData = buildRadar(assessments.length > 0 ? assessments : [assessment])
  const RADAR_COLORS = ['#1D4ED8', '#f59e0b', '#60a5fa', '#c084fc']
  const RADAR_LABELS = assessments.map(a =>
    new Date(a.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  )
  const prs = computePRS(assessment)
  const scoreMap = bandMapFromJointScores(jointScores)
  const overallBand = overallBandFromJoints(assessment, jointScores)
  const tier = getBandTier(overallBand)

  // Delta vs previous assessment (index 1 = second-newest, since assessments are DESC)
  const previousAssessment = assessments.length > 1 ? assessments[1] : null
  const previousPrs = previousAssessment ? computePRS(previousAssessment) : null
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
  const priorityCount = assessment.worst_joints?.length ?? 0
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
            <p className={cn('text-lg font-bold leading-tight', tier.color)}>{tier.label}</p>
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
              {[...RADAR_LABELS].reverse().map((label, ri) => {
                const i = RADAR_LABELS.length - 1 - ri
                return (
                  <Radar
                    key={label}
                    name={label}
                    dataKey={`v${i}`}
                    stroke={RADAR_COLORS[i]}
                    fill={RADAR_COLORS[i]}
                    fillOpacity={i === 0 ? 0.1 : 0}
                    strokeWidth={i === 0 ? 2.5 : 2}
                    strokeDasharray={i === 0 ? undefined : '5 3'}
                    dot={i === 0 ? { fill: RADAR_COLORS[i], r: 3 } : false}
                  />
                )
              })}
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #dbeafe', fontFamily: 'Inter Tight' }}
                formatter={(v, name) => [`${v}%`, name]}
              />
              {RADAR_LABELS.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />}
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Summary">
          <div className="space-y-3 mt-2">
            {assessment.worst_joints && assessment.worst_joints.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Top problem areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.worst_joints.map(j => {
                    const jb = bandForPriorityJoint(assessment, j, scoreMap) ?? 1
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

      <SectionCard title="Joint Breakdown" subtitle="Best side shown - % of optimal range">
        <div className="divide-y divide-cobalt/10">
          <JointBar label="Hip ER" left={assessment.hip_er_l} right={assessment.hip_er_r} optimal={OPTIMAL['Hip ER']} riskBelow={40} normalMin={40} jointKey="hip_er" scoreMap={scoreMap} />
          <JointBar label="Hip IR" left={assessment.hip_ir_l} right={assessment.hip_ir_r} optimal={OPTIMAL['Hip IR']} riskBelow={30} normalMin={30} jointKey="hip_ir" scoreMap={scoreMap} />
          <JointBar label="Hip Abduction" left={assessment.hip_abd_l} right={assessment.hip_abd_r} optimal={OPTIMAL['Hip Abd']} riskBelow={30} normalMin={40} jointKey="hip_abd" scoreMap={scoreMap} />
          <JointBar label="Hip Flexion" left={assessment.hip_flex_l} right={assessment.hip_flex_r} optimal={OPTIMAL['Hip Flex']} riskBelow={100} normalMin={100} jointKey="hip_flex" scoreMap={scoreMap} />
          <JointBar label="Shoulder ER" left={assessment.shoulder_er_l} right={assessment.shoulder_er_r} optimal={OPTIMAL['Shoulder ER']} riskBelow={60} normalMin={60} jointKey="shoulder_er" scoreMap={scoreMap} />
          <JointBar label="Shoulder Flex" left={assessment.shoulder_flex_l} right={assessment.shoulder_flex_r} optimal={OPTIMAL['Shoulder Flex']} riskBelow={120} normalMin={140} jointKey="shoulder_flex" scoreMap={scoreMap} />
          <JointBar label="Ankle DF" left={assessment.ankle_df_l} right={assessment.ankle_df_r} optimal={OPTIMAL['Ankle DF']} riskBelow={10} normalMin={10} jointKey="ankle_df" scoreMap={scoreMap} />
          <JointBar label="Lumbar Flex" midline={assessment.lumbar_flex} optimal={OPTIMAL['Lumbar Flex']} riskBelow={40} normalMin={40} jointKey="lumbar_flex" scoreMap={scoreMap} />
          <JointBar label="Lumbar Ext" midline={assessment.lumbar_ext} optimal={OPTIMAL['Lumbar Ext']} riskBelow={15} normalMin={20} jointKey="lumbar_ext" scoreMap={scoreMap} />
          <JointBar label="Cervical Lat Flex" left={assessment.cervical_lat_l} right={assessment.cervical_lat_r} optimal={OPTIMAL['Cervical Lat']} riskBelow={30} normalMin={40} jointKey="cervical_lat" scoreMap={scoreMap} />
          <JointBar label="Cervical Flex" midline={assessment.cervical_flex} optimal={OPTIMAL['Cervical Flex']} riskBelow={35} normalMin={45} jointKey="cervical_flex" scoreMap={scoreMap} />
          <JointBar label="Cervical Ext" midline={assessment.cervical_ext} optimal={OPTIMAL['Cervical Ext']} riskBelow={40} normalMin={55} jointKey="cervical_ext" scoreMap={scoreMap} />
        </div>
      </SectionCard>
    </div>
  )
}
