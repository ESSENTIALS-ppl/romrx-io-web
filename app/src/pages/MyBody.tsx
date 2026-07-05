import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '../lib/cn'
import { scoreToTier, tierColor, tierBg, tierLabel } from '../lib/tier'
import { AlertTriangle, Activity, TrendingUp } from 'lucide-react'

// Local helper: BJJ's lib/utils.ts had formatJoint(); HQ's lib/ is locked, so
// we keep a small local copy here instead of touching app/src/lib/.
function formatJoint(key: string): string {
  return key
    .replace(/_l$|_r$/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// -- Position Readiness Score --------------------------------------------------
const PRS_BILATERAL = [
  { l: 'hip_er_l', r: 'hip_er_r', riskBelow: 40, normalMin: 40 },
  { l: 'hip_ir_l', r: 'hip_ir_r', riskBelow: 30, normalMin: 30 },
  { l: 'hip_abd_l', r: 'hip_abd_r', riskBelow: 30, normalMin: 40 },
  { l: 'hip_flex_l', r: 'hip_flex_r', riskBelow: 100, normalMin: 100 },
  { l: 'shoulder_er_l', r: 'shoulder_er_r', riskBelow: 60, normalMin: 60 },
  { l: 'shoulder_flex_l', r: 'shoulder_flex_r', riskBelow: 120, normalMin: 140 },
  { l: 'ankle_df_l', r: 'ankle_df_r', riskBelow: 10, normalMin: 10 },
  { l: 'cervical_lat_l', r: 'cervical_lat_r', riskBelow: 30, normalMin: 40 },
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

function JointBar({ label, left, right, midline, optimal }: {
  label: string; left?: number | null; right?: number | null
  midline?: number | null; optimal: number
}) {
  const best = midline ?? Math.max(left ?? 0, right ?? 0)
  const pct = Math.min(100, Math.round((best / optimal) * 100))
  const asym = left != null && right != null ? Math.abs(left - right) : 0
  const isBad = pct < 75

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
    </div>
  )
}

export function MyBody() {
  const { user } = useAuth()
  const { assessment, assessments, loading } = useProfile(user?.id)

  if (loading) return <Spinner />

  if (!assessment) return (
    <EmptyState
      icon={Activity}
      title="No assessment on file"
      description="Complete your ROM self-assessment to see your body map and joint breakdown."
      action={<a href="/onboarding/assessment" className="btn-primary text-sm">Get started</a>}
    />
  )

  const radarData = buildRadar(assessments.length > 0 ? assessments : [assessment])
  const RADAR_COLORS = ['#1D4ED8', '#f59e0b', '#60a5fa', '#c084fc']
  const RADAR_LABELS = assessments.map(a =>
    new Date(a.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  )
  const prs = computePRS(assessment)
  const tier = scoreToTier(prs)

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Body"
        subtitle={`Assessed ${new Date(assessment.assessed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      />

      {/* Position Readiness Score */}
      <div className={cn('flex items-center gap-4 rounded-card border p-4', tierBg(tier), 'border-cobalt/10')}>
        <div className={cn('w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0 border-cobalt/40')}>
          <span className={cn('font-display font-bold text-2xl leading-none', tierColor(tier))}>{prs}</span>
          <span className={cn('text-[10px] font-bold', tierColor(tier))}>/100</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={13} className={tierColor(tier)} />
            <span className={cn('text-xs font-bold uppercase tracking-wider', tierColor(tier))}>Position Readiness Score</span>
          </div>
          <p className={cn('text-lg font-bold leading-tight', tierColor(tier))}>{tierLabel(tier)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Retest every 6 weeks to track progress</p>
        </div>
      </div>

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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Priority joints</p>
                <div className="flex flex-wrap gap-1.5">
                  {assessment.worst_joints.map(j => (
                    <span key={j} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">
                      {formatJoint(j)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {assessment.rom_total != null && (
              <div className="flex justify-between items-center py-2.5 border-t border-cobalt/10">
                <span className="text-sm text-slate-500">ROM Total Score</span>
                <span className="text-sm font-bold text-cobalt-ink">{assessment.rom_total}</span>
              </div>
            )}
            {assessment.rom_percentile != null && (
              <div className="flex justify-between items-center py-2.5 border-t border-cobalt/10">
                <span className="text-sm text-slate-500">Percentile</span>
                <span className="text-sm font-bold text-cobalt-ink">{assessment.rom_percentile}th</span>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Joint Breakdown" subtitle="Best side shown - % of optimal range">
        <div className="divide-y divide-cobalt/10">
          <JointBar label="Hip ER" left={assessment.hip_er_l} right={assessment.hip_er_r} optimal={OPTIMAL['Hip ER']} />
          <JointBar label="Hip IR" left={assessment.hip_ir_l} right={assessment.hip_ir_r} optimal={OPTIMAL['Hip IR']} />
          <JointBar label="Hip Abduction" left={assessment.hip_abd_l} right={assessment.hip_abd_r} optimal={OPTIMAL['Hip Abd']} />
          <JointBar label="Hip Flexion" left={assessment.hip_flex_l} right={assessment.hip_flex_r} optimal={OPTIMAL['Hip Flex']} />
          <JointBar label="Shoulder ER" left={assessment.shoulder_er_l} right={assessment.shoulder_er_r} optimal={OPTIMAL['Shoulder ER']} />
          <JointBar label="Shoulder Flex" left={assessment.shoulder_flex_l} right={assessment.shoulder_flex_r} optimal={OPTIMAL['Shoulder Flex']} />
          <JointBar label="Ankle DF" left={assessment.ankle_df_l} right={assessment.ankle_df_r} optimal={OPTIMAL['Ankle DF']} />
          <JointBar label="Lumbar Flex" midline={assessment.lumbar_flex} optimal={OPTIMAL['Lumbar Flex']} />
          <JointBar label="Lumbar Ext" midline={assessment.lumbar_ext} optimal={OPTIMAL['Lumbar Ext']} />
          <JointBar label="Cervical Lat Flex" left={assessment.cervical_lat_l} right={assessment.cervical_lat_r} optimal={OPTIMAL['Cervical Lat']} />
          <JointBar label="Cervical Flex" midline={assessment.cervical_flex} optimal={OPTIMAL['Cervical Flex']} />
          <JointBar label="Cervical Ext" midline={assessment.cervical_ext} optimal={OPTIMAL['Cervical Ext']} />
        </div>
      </SectionCard>
    </div>
  )
}
