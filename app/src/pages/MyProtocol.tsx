import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { cn } from '../lib/cn'
import { scoreToTier, tierColor, tierBg, tierLabel } from '../lib/tier'
import {
  AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Circle,
  ClipboardList, Dumbbell, Flame, PersonStanding,
  RefreshCw, CheckCircle, Clock, TrendingUp, BookOpen,
} from 'lucide-react'

// =============================================================================
// My Protocol (Base / HQ)
// -----------------------------------------------------------------------------
// This is the sport-agnostic mobility protocol shown to every Base subscriber.
// It surfaces the user's Position Readiness Score, tier, top-3 priority joints,
// asymmetry flags, and a personalized daily / full mobility plan pulled from
// the `exercises` table (filtered to sports @> ['general']).
//
// Sport add-ons (BJJ, BB, etc.) get their own "My Game" surface elsewhere and
// read from `technique_eligibility`. This page does NOT touch that table.
// =============================================================================

// ---- Types -----------------------------------------------------------------
interface Rx {
  id: string
  name: string
  dose: string
  cue: string
  equipment: string
  video_url: string | null
}
interface Prescription {
  exercises: Rx[]
  stretches: Rx[]
  foam: Rx[]
}
interface DbExercise {
  id: string
  joint_key: string
  exercise_type: string
  name: string
  sets: number | null
  reps: string | null
  coaching_cue: string | null
  video_url: string | null
}

interface SessionLog {
  sessions: string[]
  cycleStart: string
}

// ---- Rotation --------------------------------------------------------------
const ROTATION: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2, 0: 0,
}
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CYCLE_TARGET = 42

// ---- PRS scoring (mirrors MyBody) ------------------------------------------
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
  const rec = a as unknown as Record<string, number | null>
  for (const j of PRS_BILATERAL) {
    const l = rec[j.l]; const r = rec[j.r]
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
    const v = rec[j.key]
    if (v != null) {
      if (v < j.riskBelow) score -= 6
      else if (v < j.normalMin) score -= 3
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

// ---- Joint config ----------------------------------------------------------
interface JointDef {
  key: string
  label: string
  why: string
  leftKey?: string
  rightKey?: string
  singleKey?: string
  normalMin: number
  normalMax: number
  riskBelow: number
  unit: string
  rxKey: string
}
const JOINTS: JointDef[] = [
  {
    key: 'hip_er', label: 'Hip External Rotation',
    why: 'Deep squats, wide stances, hip mobility for everyday movement and lower-back protection.',
    leftKey: 'hip_er_l', rightKey: 'hip_er_r',
    normalMin: 40, normalMax: 60, riskBelow: 40, unit: '°', rxKey: 'hip_er',
  },
  {
    key: 'hip_ir', label: 'Hip Internal Rotation',
    why: 'Rotational sports, walking gait, knee tracking, and lower-back health.',
    leftKey: 'hip_ir_l', rightKey: 'hip_ir_r',
    normalMin: 30, normalMax: 45, riskBelow: 30, unit: '°', rxKey: 'hip_ir',
  },
  {
    key: 'hip_abd', label: 'Hip Abduction',
    why: 'Lateral stability, glute strength, single-leg balance, and pelvic control.',
    leftKey: 'hip_abd_l', rightKey: 'hip_abd_r',
    normalMin: 40, normalMax: 50, riskBelow: 30, unit: '°', rxKey: 'hip_abd',
  },
  {
    key: 'hip_flex', label: 'Hip Flexion',
    why: 'Squat depth, stair climbing, sitting posture, and low-back load management.',
    leftKey: 'hip_flex_l', rightKey: 'hip_flex_r',
    normalMin: 100, normalMax: 120, riskBelow: 100, unit: '°', rxKey: 'hip_flex',
  },
  {
    key: 'shoulder_er', label: 'Shoulder External Rotation',
    why: 'Overhead pressing, throwing, rotator cuff health, and shoulder injury prevention.',
    leftKey: 'shoulder_er_l', rightKey: 'shoulder_er_r',
    normalMin: 60, normalMax: 90, riskBelow: 60, unit: '°', rxKey: 'shoulder_er',
  },
  {
    key: 'shoulder_flex', label: 'Shoulder Flexion',
    why: 'Reaching overhead, pressing, pulling, and thoracic-spine coupled movement.',
    leftKey: 'shoulder_flex_l', rightKey: 'shoulder_flex_r',
    normalMin: 140, normalMax: 180, riskBelow: 120, unit: '°', rxKey: 'shoulder_flex',
  },
  {
    key: 'ankle_df', label: 'Ankle Dorsiflexion',
    why: 'Squat depth, balance, walking mechanics, and knee-joint protection.',
    leftKey: 'ankle_df_l', rightKey: 'ankle_df_r',
    normalMin: 10, normalMax: 20, riskBelow: 10, unit: 'cm', rxKey: 'ankle_df',
  },
  {
    key: 'lumbar_flex', label: 'Lumbar Flexion',
    why: 'Bending forward, deadlift setup, and functional daily movement patterns.',
    singleKey: 'lumbar_flex',
    normalMin: 40, normalMax: 60, riskBelow: 40, unit: '°', rxKey: 'lumbar_flex',
  },
  {
    key: 'lumbar_ext', label: 'Lumbar Extension',
    why: 'Standing posture, back-strength foundation, and disc health.',
    singleKey: 'lumbar_ext',
    normalMin: 20, normalMax: 35, riskBelow: 15, unit: '°', rxKey: 'lumbar_ext',
  },
  {
    key: 'cervical_rot', label: 'Cervical Rotation',
    why: 'Driving safety, situational awareness, and reducing neck strain from screens.',
    leftKey: 'cervical_rot_l', rightKey: 'cervical_rot_r',
    normalMin: 70, normalMax: 90, riskBelow: 60, unit: '°', rxKey: 'cervical_rot',
  },
]

// ---- Scoring ---------------------------------------------------------------
interface ScoredJoint {
  def: JointDef
  left: number | null
  right: number | null
  single: number | null
  asymmetry: number
  severity: number
  atRisk: boolean
  gap: string
}
function scoreJoints(assessment: Assessment): ScoredJoint[] {
  const rec = assessment as unknown as Record<string, number | null>
  return JOINTS.map(def => {
    const left   = def.leftKey   ? (rec[def.leftKey]   ?? null) : null
    const right  = def.rightKey  ? (rec[def.rightKey]  ?? null) : null
    const single = def.singleKey ? (rec[def.singleKey] ?? null) : null

    let asymmetry = 0
    let severity  = 0
    let atRisk    = false
    let gap       = ''

    if (left !== null && right !== null) {
      asymmetry = Math.abs(left - right)
      const worst = Math.min(left, right)
      severity = Math.max(0, def.normalMin - worst)
      atRisk   = worst < def.riskBelow
      gap = `L ${left}${def.unit} vs R ${right}${def.unit} · ${asymmetry}${def.unit} gap`
    } else if (single !== null) {
      severity = Math.max(0, def.normalMin - single)
      atRisk   = single < def.riskBelow
      gap = `${single}${def.unit} (normal >= ${def.normalMin}${def.unit})`
    }
    return { def, left, right, single, asymmetry, severity, atRisk, gap }
  })
}

// ---- DB drill loader -------------------------------------------------------
// Some joints have both short (`hip_flex`) and long (`hip_flexion`) rows.
// We accept both, prefer short-form rows, and always fall back to long-form.
const JOINT_KEY_ALIASES: Record<string, string[]> = {
  hip_er:        ['hip_er'],
  hip_ir:        ['hip_ir'],
  hip_abd:       ['hip_abd', 'hip_abduction'],
  hip_flex:      ['hip_flex', 'hip_flexion'],
  shoulder_er:   ['shoulder_er'],
  shoulder_flex: ['shoulder_flex', 'shoulder_flexion'],
  ankle_df:      ['ankle_df'],
  lumbar_flex:   ['lumbar_flex', 'lumbar_flexion'],
  lumbar_ext:    ['lumbar_ext', 'lumbar_extension'],
  cervical_rot:  ['cervical_rot', 'cervical_rotation'],
}

function toRx(row: DbExercise): Rx {
  const dose = row.sets && row.reps ? `${row.sets} sets x ${row.reps}` : (row.reps ?? '')
  return {
    id: row.id,
    name: row.name,
    dose,
    cue: row.coaching_cue ?? '',
    equipment: '',
    video_url: row.video_url,
  }
}

function groupByJoint(rows: DbExercise[]): Record<string, Prescription> {
  const out: Record<string, Prescription> = {}
  for (const rxKey of Object.keys(JOINT_KEY_ALIASES)) {
    const aliases = JOINT_KEY_ALIASES[rxKey]
    const scoped = rows.filter(r => aliases.includes(r.joint_key))
    if (scoped.length === 0) continue
    out[rxKey] = {
      exercises: scoped.filter(r => r.exercise_type === 'resistance').map(toRx),
      stretches: scoped.filter(r => r.exercise_type === 'stretch').map(toRx),
      foam:      scoped.filter(r => r.exercise_type === 'foam_roll').map(toRx),
    }
  }
  return out
}

// ---- Retest banner ---------------------------------------------------------
function RetestBanner({ assessedAt }: { assessedAt: string }) {
  const navigate = useNavigate()
  const now = new Date()
  const assessed = new Date(assessedAt)
  const daysSince = Math.floor((now.getTime() - assessed.getTime()) / (1000 * 60 * 60 * 24))
  const weeksSince = daysSince / 7

  const retestDate = new Date(assessed.getTime() + 42 * 24 * 60 * 60 * 1000)
  const daysUntilRetest = Math.ceil((retestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const retestDateStr = retestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const assessedDateStr = assessed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  let status: 'green' | 'yellow' | 'red'
  let Icon: React.ElementType
  let message: string
  let subtext: string

  if (weeksSince < 4) {
    status = 'green'; Icon = CheckCircle
    message = `Assessed ${assessedDateStr}`
    subtext = `Next retest in ${daysUntilRetest} days · ${retestDateStr}`
  } else if (weeksSince < 6) {
    status = 'yellow'; Icon = Clock
    message = `Reassessment due ${retestDateStr}`
    subtext = 'Your ROM may have shifted. Retest to update your protocol.'
  } else {
    status = 'red'; Icon = RefreshCw
    message = `Retest overdue by ${Math.abs(daysUntilRetest)} days`
    subtext = "Retake now to see how much you've improved and update your protocol."
  }

  const styles = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  const iconStyles = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  }

  return (
    <button
      onClick={() => navigate('/onboarding/assessment')}
      className={cn(
        'w-full flex items-start gap-3 rounded-card border px-4 py-3.5 text-left transition-opacity hover:opacity-80',
        styles[status]
      )}
    >
      <Icon className={cn('shrink-0 mt-0.5', iconStyles[status])} size={16} />
      <div className="min-w-0">
        <p className="text-sm font-bold leading-snug">{message}</p>
        <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{subtext}</p>
      </div>
      <span className="ml-auto shrink-0 text-xs font-semibold underline underline-offset-2 opacity-70 mt-0.5">Retest</span>
    </button>
  )
}

// ---- Why statement card ----------------------------------------------------
function WhyStatement({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-card border border-cobalt/20 bg-cobalt-light p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-cobalt mb-3">
        {heading}
      </p>
      <p className="text-sm text-cobalt-ink leading-relaxed">
        {body}
      </p>
    </div>
  )
}

// ---- Today movement card ---------------------------------------------------
function TodayMovementCard({ rx, index }: { rx: Rx; index: number }) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const labels = ['Movement 1', 'Movement 2', 'Movement 3']

  return (
    <div className={cn(
      'rounded-xl border transition-colors overflow-hidden',
      checked ? 'border-cobalt/20 bg-cobalt/[0.03]' : 'border-cobalt/10 bg-white'
    )}>
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          onClick={() => setChecked(c => !c)}
          className="mt-0.5 shrink-0 text-cobalt hover:scale-110 transition-transform"
        >
          {checked
            ? <CheckCircle2 size={17} fill="currentColor" strokeWidth={0} />
            : <Circle size={17} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] text-cobalt font-bold uppercase tracking-wider mb-0.5">{labels[index]}</p>
              <p className={cn('text-sm font-semibold leading-snug', checked ? 'line-through text-slate-400' : 'text-cobalt-ink')}>
                {rx.name}
              </p>
            </div>
            <button
              onClick={() => setOpen(o => !o)}
              className="text-slate-400 hover:text-cobalt transition-colors mt-0.5 shrink-0"
            >
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          {rx.dose && (
            <span className="inline-block text-xs bg-cobalt-light text-cobalt font-semibold px-2.5 py-0.5 rounded-full mt-1.5">
              {rx.dose}
            </span>
          )}
          {open && rx.cue && (
            <div className="mt-2.5 pt-2.5 border-t border-cobalt/10 space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-cobalt-ink">Coaching cue: </span>{rx.cue}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface TodayCardProps {
  ranked: ScoredJoint[]
  rxLibrary: Record<string, Prescription>
  assessedAt: string
  userId: string
}
function TodayCard({ ranked, rxLibrary, assessedAt, userId }: TodayCardProps) {
  const todayDow = new Date().getDay()
  const todayPriorityIndex = ROTATION[todayDow]
  const todayPriority = ranked[Math.min(todayPriorityIndex, ranked.length - 1)]
  const dayName = DAY_NAMES[todayDow]

  const storageKey = `romrx_hq_sessions_${userId}`
  const getLog = useCallback((): SessionLog => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw) as SessionLog
    } catch { /* ignore */ }
    return { sessions: [], cycleStart: assessedAt }
  }, [storageKey, assessedAt])

  const [log, setLog] = useState<SessionLog>(getLog)
  const [completedToday, setCompletedToday] = useState(false)
  const [dbSessionCount, setDbSessionCount] = useState(0)
  const [cycleStartDate, setCycleStartDate] = useState(() => assessedAt.slice(0, 10))

  useEffect(() => {
    if (!userId) return
    supabase
      .from('assessments')
      .select('assessed_at')
      .eq('user_id', userId)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.assessed_at) setCycleStartDate(data.assessed_at.slice(0, 10))
      })
  }, [userId])

  const refreshCount = useCallback(() => {
    if (!userId) return
    supabase
      .from('protocol_sessions')
      .select('session_date', { count: 'exact' })
      .eq('user_id', userId)
      .gte('session_date', cycleStartDate)
      .then(({ count }) => { if (count !== null) setDbSessionCount(count) })
  }, [userId, cycleStartDate])

  useEffect(() => { refreshCount() }, [refreshCount])

  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    setCompletedToday(log.sessions.includes(todayIso))
  }, [log])

  const handleMarkComplete = useCallback(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const protocolDay = `P${todayPriorityIndex + 1}`
    setLog(prev => {
      const sessions = prev.sessions.includes(todayIso)
        ? prev.sessions
        : [...prev.sessions, todayIso]
      const next: SessionLog = { ...prev, sessions }
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setCompletedToday(true)
    supabase.from('protocol_sessions').upsert({
      user_id: userId,
      session_date: todayIso,
      protocol_day: protocolDay,
    }, { onConflict: 'user_id,session_date' }).then(({ error }) => {
      if (!error) refreshCount()
    })
  }, [storageKey, userId, todayPriorityIndex, refreshCount])

  const sessionsThisCycle = Math.min(dbSessionCount, CYCLE_TARGET)
  const progressPct = Math.min(100, Math.round((sessionsThisCycle / CYCLE_TARGET) * 100))

  const now = new Date()
  const retestDate = new Date(new Date(assessedAt).getTime() + 42 * 24 * 60 * 60 * 1000)
  const daysUntilRetest = Math.ceil((retestDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const retestDateStr = retestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const rx = todayPriority ? rxLibrary[todayPriority.def.rxKey] : null
  const todayMovements: Rx[] = rx
    ? [rx.exercises[0], rx.stretches[0], rx.foam[0]].filter(Boolean) as Rx[]
    : []

  return (
    <div className="rounded-card border-2 border-cobalt bg-white shadow-md overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cobalt">TODAY · {dayName.toUpperCase()}</p>
            <h2 className="font-display font-bold text-cobalt-ink text-xl leading-tight mt-0.5">
              {todayPriority ? todayPriority.def.label : 'Recovery Day'}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Session</p>
            <p className="text-lg font-bold text-cobalt leading-tight">{sessionsThisCycle}<span className="text-sm font-normal text-slate-400">/{CYCLE_TARGET}</span></p>
          </div>
        </div>

        <div className="mt-3 mb-2">
          <div className="w-full bg-cobalt-light rounded-full h-2">
            <div
              className="bg-cobalt h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <TrendingUp size={11} className="text-cobalt shrink-0" />
          {daysUntilRetest > 0
            ? <span>Retest in <strong className="text-cobalt-ink">{daysUntilRetest} days</strong> · {retestDateStr}</span>
            : <span className="text-red-600 font-semibold">Retest due</span>
          }
        </div>
      </div>

      {todayMovements.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Today's movements</p>
          {todayMovements.map((m, i) => (
            <TodayMovementCard key={m.id} rx={m} index={i} />
          ))}
        </div>
      )}

      <div className="px-5 pb-5">
        {completedToday ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 py-3.5 text-green-700 font-semibold text-sm">
            <CheckCircle2 size={16} fill="currentColor" strokeWidth={0} />
            Completed today
          </div>
        ) : (
          <button
            onClick={handleMarkComplete}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98] bg-cobalt"
          >
            Mark Today Complete
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Rx item (full protocol) -----------------------------------------------
function RxItem({
  label, icon: Icon, color, items,
}: {
  label: string
  icon: React.ElementType
  color: string
  items: Rx[]
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))

  const toggle = (i: number) => setOpenIdx(o => o === i ? null : i)
  const check  = (i: number) => setChecked(c => c.map((v, idx) => idx === i ? !v : v))

  if (items.length === 0) return null

  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-2.5', color)}>
        <Icon size={14} className="shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="space-y-2">
        {items.map((rx, i) => (
          <div key={rx.id} className={cn(
            'rounded-xl border transition-colors overflow-hidden',
            checked[i] ? 'border-cobalt/20 bg-cobalt/[0.03]' : 'border-cobalt/10 bg-white'
          )}>
            <div className="flex items-start gap-3 px-3.5 py-3">
              <button onClick={() => check(i)} className="mt-0.5 shrink-0 text-cobalt hover:scale-110 transition-transform">
                {checked[i]
                  ? <CheckCircle2 size={17} fill="currentColor" strokeWidth={0} />
                  : <Circle size={17} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-semibold leading-snug', checked[i] ? 'line-through text-slate-400' : 'text-cobalt-ink')}>
                    {rx.name}
                  </p>
                  <button onClick={() => toggle(i)} className="text-slate-400 hover:text-cobalt transition-colors mt-0.5 shrink-0">
                    {openIdx === i ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
                {rx.dose && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-xs bg-cobalt-light text-cobalt font-semibold px-2.5 py-0.5 rounded-full">{rx.dose}</span>
                  </div>
                )}
                {openIdx === i && rx.cue && (
                  <div className="mt-2.5 pt-2.5 border-t border-cobalt/10 space-y-2">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-cobalt-ink">Coaching cue: </span>{rx.cue}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Issue card (full protocol per-joint) ----------------------------------
function IssueCard({ ranked, rxLibrary, rank }: {
  ranked: ScoredJoint
  rxLibrary: Record<string, Prescription>
  rank: number
}) {
  const [open, setOpen] = useState(rank === 1)
  const { def, left, right, single, atRisk, asymmetry, severity } = ranked
  const rx = rxLibrary[def.rxKey]

  const rankLabel = rank === 1 ? '#1 Priority' : rank === 2 ? '#2 Priority' : '#3 Priority'
  const rankColor = rank === 1 ? 'bg-red-600 text-white' : rank === 2 ? 'bg-yellow-500 text-white' : 'bg-cobalt text-white'

  const hasAsymmetry = left !== null && right !== null && asymmetry > 0

  return (
    <div className="bg-white rounded-card border border-cobalt/10 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left"
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', rankColor)}>
                {rankLabel}
              </span>
              {atRisk && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <AlertTriangle size={9} /> AT RISK
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-cobalt-ink text-base leading-snug">{def.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{def.why}</p>
          </div>
          <div className="shrink-0 text-slate-400 mt-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        <div className="px-5 pb-4 flex flex-wrap gap-3">
          {hasAsymmetry ? (
            <>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Left</p>
                <p className={cn('text-sm font-bold', (left ?? 0) < def.riskBelow ? 'text-red-700' : (left ?? 0) < def.normalMin ? 'text-yellow-600' : 'text-cobalt')}>
                  {left}{def.unit}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Right</p>
                <p className={cn('text-sm font-bold', (right ?? 0) < def.riskBelow ? 'text-red-700' : (right ?? 0) < def.normalMin ? 'text-yellow-600' : 'text-cobalt')}>
                  {right}{def.unit}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-xl px-3 py-1.5 text-center">
                <p className="text-[10px] text-yellow-700 font-bold uppercase tracking-wide">Asymmetry</p>
                <p className="text-sm font-bold text-yellow-700">{asymmetry}{def.unit} gap</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50 rounded-xl px-3 py-1.5">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Value</p>
                <p className={cn('text-sm font-bold', (single ?? 0) < def.riskBelow ? 'text-red-700' : (single ?? 0) < def.normalMin ? 'text-yellow-600' : 'text-cobalt')}>
                  {single}{def.unit}
                </p>
              </div>
              {severity > 0 && (
                <div className="bg-red-50 rounded-xl px-3 py-1.5">
                  <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide">Below Normal</p>
                  <p className="text-sm font-bold text-red-700">{severity}{def.unit}</p>
                </div>
              )}
            </>
          )}
          <div className="bg-slate-50 rounded-xl px-3 py-1.5">
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Normal</p>
            <p className="text-xs font-semibold text-cobalt-ink">{def.normalMin}-{def.normalMax}{def.unit}</p>
          </div>
        </div>
      </button>

      {open && rx && (
        <div className="px-5 pb-5 border-t border-cobalt/10 pt-4 space-y-5">
          <RxItem label={`Exercises (${rx.exercises.length})`} icon={Dumbbell} color="text-cobalt" items={rx.exercises} />
          <RxItem label={`Stretches (${rx.stretches.length})`} icon={PersonStanding} color="text-cobalt/70" items={rx.stretches} />
          <RxItem label={`Foam Rolling (${rx.foam.length})`} icon={Flame} color="text-slate-500" items={rx.foam} />
        </div>
      )}
      {open && !rx && (
        <div className="px-5 pb-5 border-t border-cobalt/10 pt-4">
          <p className="text-xs text-slate-500">Prescription library loading. Refresh if this persists.</p>
        </div>
      )}
    </div>
  )
}

// ---- Per-tab why copy ------------------------------------------------------
const DAILY_WHY = "This is your minimum effective dose. Research is clear: short, consistent daily mobility work changes range of motion more than long sessions done occasionally. A few minutes a day, every day, is what actually moves your numbers. Do this and you're covered. Everything else is bonus."
const FULL_WHY  = "Got more time, or want to attack a specific restriction? This is your complete prescription. Every movement from your assessment, organized by the limitations holding back your body. Use it as a deeper session when you can, or as a reference to understand the whole plan. The Daily keeps you progressing. The Full lets you go further."

// ---- Main page -------------------------------------------------------------
export function MyProtocol() {
  const { user } = useAuth()
  const { assessment, loading } = useProfile(user?.id)
  const [tab, setTab] = useState<'daily' | 'full'>('daily')
  const [rxLibrary, setRxLibrary] = useState<Record<string, Prescription>>({})
  const [rxLoading, setRxLoading]  = useState(true)

  const scored = useMemo(() => assessment ? scoreJoints(assessment) : [], [assessment])
  const ranked = useMemo(() => scored
    .filter(s => s.left !== null || s.right !== null || s.single !== null)
    .sort((a, b) => {
      if (b.asymmetry !== a.asymmetry) return b.asymmetry - a.asymmetry
      return b.severity - a.severity
    })
    .slice(0, 3), [scored])

  // Fetch drills for the top-3 priority joints from Supabase.
  useEffect(() => {
    if (ranked.length === 0) { setRxLoading(false); return }
    const wantedAliases = ranked.flatMap(r => JOINT_KEY_ALIASES[r.def.rxKey] ?? [r.def.rxKey])
    if (wantedAliases.length === 0) { setRxLoading(false); return }
    setRxLoading(true)
    supabase
      .from('exercises')
      .select('id, joint_key, exercise_type, name, sets, reps, coaching_cue, video_url, sports')
      .in('joint_key', wantedAliases)
      .contains('sports', ['general'])
      .then(({ data, error }) => {
        if (error) {
          console.error('exercises load error:', error.message)
          setRxLibrary({})
        } else {
          setRxLibrary(groupByJoint((data ?? []) as DbExercise[]))
        }
        setRxLoading(false)
      })
  }, [ranked])

  if (loading) return <Spinner />

  if (!assessment) return (
    <EmptyState
      icon={ClipboardList}
      title="No assessment yet"
      description="Complete your ROM assessment and your personalized mobility protocol will appear here."
      action={<a href="/onboarding/assessment" className="btn-primary text-sm">Start assessment</a>}
    />
  )

  const hasData = scored.some(s => s.left !== null || s.right !== null || s.single !== null)
  if (!hasData) return (
    <EmptyState
      icon={ClipboardList}
      title="Assessment processing"
      description="Your protocol will generate once your assessment data has been processed."
    />
  )

  const assessedAt = assessment.assessed_at
  const dateStr = new Date(assessedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const prs  = computePRS(assessment)
  const tier = scoreToTier(prs)

  return (
    <div className="space-y-5">
      <PageHeader title="My Protocol" subtitle={`Based on assessment · ${dateStr}`} />

      {/* PRS + tier badge (matches MyBody so the two pages read as siblings) */}
      <div className={cn('flex items-center gap-4 rounded-card border p-4 border-cobalt/10', tierBg(tier))}>
        <div className="w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shrink-0 border-cobalt/40">
          <span className={cn('font-display font-bold text-2xl leading-none', tierColor(tier))}>{prs}</span>
          <span className={cn('text-[10px] font-bold', tierColor(tier))}>/100</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={13} className={tierColor(tier)} />
            <span className={cn('text-xs font-bold uppercase tracking-wider', tierColor(tier))}>Position Readiness Score</span>
          </div>
          <p className={cn('text-lg font-bold leading-tight', tierColor(tier))}>{tierLabel(tier)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Your top-3 priority joints inform today's plan</p>
        </div>
      </div>

      {/* Retest banner */}
      <RetestBanner assessedAt={assessedAt} />

      {/* Sub-tab switcher */}
      <div className="flex gap-1 p-1 rounded-card bg-slate-50 border border-cobalt/10">
        {([['daily', 'Daily'], ['full', 'Full']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-bold transition-colors',
              tab === key ? 'bg-cobalt text-white shadow-sm' : 'text-slate-500 hover:text-cobalt'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Daily */}
      {tab === 'daily' && (
        <>
          <WhyStatement heading="WHY DAILY" body={DAILY_WHY} />
          {rxLoading ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : (
            user && (
              <TodayCard
                ranked={ranked}
                rxLibrary={rxLibrary}
                assessedAt={assessedAt}
                userId={user.id}
              />
            )
          )}
        </>
      )}

      {/* Full */}
      {tab === 'full' && (
        <>
          <WhyStatement heading="WHY FULL" body={FULL_WHY} />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-cobalt shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Protocol</p>
            </div>
            {rxLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : (
              <div className="space-y-4">
                {ranked.map((r, i) => (
                  <IssueCard key={r.def.key} ranked={r} rxLibrary={rxLibrary} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-center text-xs text-slate-500 pb-2">
        Protocol auto-updates with each new assessment. Retest every 6 weeks.
      </p>
    </div>
  )
}
