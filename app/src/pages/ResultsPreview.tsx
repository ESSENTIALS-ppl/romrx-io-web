import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { AlertTriangle, CheckCircle, Unlock, TrendingUp } from 'lucide-react'
import { cn } from '../lib/cn'
import { bandScoreFromAggregate, bandFull, bandChip, BAND_DESC } from '../lib/mobilityBands'
import { track } from '../lib/track'

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`
const BETA_ACTIVATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-beta-base`
/** Exclusive end of free Base beta (UTC). Billing starts 2027-01-01. */
const BETA_ENDS_AT_MS = Date.parse('2027-01-01T00:00:00.000Z')

function isBetaFreeWindow(now = Date.now()): boolean {
  return now < BETA_ENDS_AT_MS
}

type PendingSport = 'bjj' | 'bodybuilding'

const SPORT_LABELS: Record<PendingSport, { short: string; wordmark: string }> = {
  bjj: { short: 'BJJ', wordmark: 'ROMRx+BJJ' },
  bodybuilding: { short: 'BodyBuilding', wordmark: 'ROMRx+BodyBuilding' },
}

function normalizePendingSport(raw: unknown): PendingSport | null {
  const v = String(raw ?? '').toLowerCase().trim()
  if (v === 'bjj' || v === 'bodybuilding') return v
  return null
}

// -- PRS scoring algorithm ------------------------------------------------------
const BILATERAL_JOINTS = [
  { l: 'hip_er_l', r: 'hip_er_r', riskBelow: 40, normalMin: 40 },
  { l: 'hip_ir_l', r: 'hip_ir_r', riskBelow: 30, normalMin: 30 },
  { l: 'hip_abd_l', r: 'hip_abd_r', riskBelow: 30, normalMin: 40 },
  { l: 'hip_flex_l', r: 'hip_flex_r', riskBelow: 100, normalMin: 100 },
  { l: 'shoulder_er_l', r: 'shoulder_er_r', riskBelow: 60, normalMin: 60 },
  { l: 'shoulder_flex_l', r: 'shoulder_flex_r', riskBelow: 120, normalMin: 140 },
  { l: 'ankle_df_l', r: 'ankle_df_r', riskBelow: 10, normalMin: 10 },
  { l: 'cervical_lat_l', r: 'cervical_lat_r', riskBelow: 30, normalMin: 40 },
]
const UNILATERAL_JOINTS = [
  { key: 'lumbar_flex', riskBelow: 40, normalMin: 40 },
  { key: 'lumbar_ext', riskBelow: 15, normalMin: 20 },
  { key: 'cervical_flex', riskBelow: 35, normalMin: 45 },
  { key: 'cervical_ext', riskBelow: 40, normalMin: 55 },
]
const JOINT_LABELS: Record<string, string> = {
  hip_er: 'Hip External Rotation', hip_ir: 'Hip Internal Rotation',
  hip_abd: 'Hip Abduction', hip_flex: 'Hip Flexion',
  shoulder_er: 'Shoulder External Rotation', shoulder_flex: 'Shoulder Flexion',
  ankle_df: 'Ankle Dorsiflexion', cervical_lat: 'Cervical Lateral Flex',
  lumbar_flex: 'Lumbar Flexion', lumbar_ext: 'Lumbar Extension',
}

function computePRS(assessment: Record<string, number | null>): number {
  let score = 100
  for (const j of BILATERAL_JOINTS) {
    const l = assessment[j.l], r = assessment[j.r]
    if (l != null && r != null) {
      const minVal = Math.min(l, r)
      const gap = Math.abs(l - r)
      if (minVal < j.riskBelow) score -= 8
      else if (minVal < j.normalMin) score -= 4
      if (gap >= 15) score -= 6
      else if (gap >= 8) score -= 3
    }
  }
  for (const j of UNILATERAL_JOINTS) {
    const v = assessment[j.key]
    if (v != null) {
      if (v < j.riskBelow) score -= 6
      else if (v < j.normalMin) score -= 3
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getPRSTier(score: number): { label: string; color: string; bg: string; desc: string } {
  // Locked Base bands: 1 Needs focus / 2 Building / 3 Steady (progress-needed tone)
  const band = bandScoreFromAggregate(score)
  if (band === 3) return { label: bandFull(3), color: 'text-cobalt', bg: 'bg-cobalt-light', desc: BAND_DESC[3] }
  if (band === 2) return { label: bandFull(2), color: 'text-yellow-700', bg: 'bg-yellow-50', desc: BAND_DESC[2] }
  return { label: bandFull(1), color: 'text-red-700', bg: 'bg-red-50', desc: BAND_DESC[1] }
}

function getTopAsymmetries(assessment: Record<string, number | null>): Array<{ joint: string; gap: number; left: number; right: number }> {
  return BILATERAL_JOINTS
    .map(j => {
      const l = assessment[j.l], r = assessment[j.r]
      if (l == null || r == null) return null
      return { joint: JOINT_LABELS[j.l.replace('_l', '')] ?? j.l, gap: Math.abs(l - r), left: l, right: r }
    })
    .filter((x): x is { joint: string; gap: number; left: number; right: number } => x !== null)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3)
}

export function ResultsPreview() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [assessment, setAssessment] = useState<Record<string, number | null> | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  // Pending sport from signup metadata (raw_user_meta_data.add_sport) or URL ?add=
  // URL wins if both are present so a shared results link can override.
  const pendingSport = useMemo(() => {
    const fromUrl = normalizePendingSport(searchParams.get('add'))
    if (fromUrl) return fromUrl
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
    return normalizePendingSport(meta.add_sport ?? meta.active_sport)
  }, [searchParams, user])

  const sportCopy = pendingSport ? SPORT_LABELS[pendingSport] : null

  useEffect(() => {
    // Once per browser tab session (survives React StrictMode remount).
    // Live cut Tue AM: results_viewed 6322 vs signup_completed 26 — mount spam.
    try {
      const key = 'romrx.hq.results_viewed'
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        track('results_viewed', { authenticated: !!user, pending_sport: pendingSport ?? null })
      }
    } catch {
      track('results_viewed', { authenticated: !!user, pending_sport: pendingSport ?? null })
    }
    if (!user) { setLoading(false); return }
    ;(async () => {
      // Check if base subscription is already active
      const { data: userRow } = await supabase
        .from('users')
        .select('base_status')
        .eq('id', user.id)
        .maybeSingle()

      // Only 'active' unlocks the dashboard. Set by Stripe webhook OR
      // activate-beta-base during free beta. Never set client-side (incident 2026-06-10).
      if (userRow?.base_status === 'active') {
        navigate('/dashboard/my-body', { replace: true })
        return
      }

      // Load latest assessment
      const { data } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('assessed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setAssessment(data ?? null)
      setLoading(false)
    })()
  }, [user, navigate])

  const handleUnlock = async (includePendingSport: boolean) => {
    track('results_unlock_clicked', {
      include_pending_sport: includePendingSport,
      pending_sport: pendingSport ?? null,
      beta_free: isBetaFreeWindow(),
    })
    if (!session || !user) return
    setPaying(true)
    setError('')
    try {
      // Beta free path (through Dec 31 2026 UTC): server-side activate-beta-base
      // sets base_status=active via service_role. Never set active client-side
      // (incident 2026-06-10 / guard_users_protected_columns).
      // Sport packs are NOT invented here — Base only. Dual CTA still unlocks Base.
      if (isBetaFreeWindow()) {
        const res = await fetch(BETA_ACTIVATE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({}),
        })
        const data = await res.json().catch(() => ({} as Record<string, unknown>))
        if (res.ok && (data as { ok?: boolean; base_status?: string }).ok) {
          navigate('/dashboard/my-body', { replace: true })
          return
        }
        // beta_ended or other failure → fall through to Stripe checkout
        if ((data as { error?: string }).error !== 'beta_ended' && (data as { checkout_required?: boolean }).checkout_required !== true) {
          setError((data as { message?: string; error?: string }).message
            ?? (data as { error?: string }).error
            ?? 'Unlock failed. Please try again.')
          return
        }
      }

      const body: Record<string, string> = {
        mode: 'base',
        user_id: user.id,
        email: user.email ?? '',
      }
      // create-checkout-session v22+ accepts pending_sport / add on Base mode.
      // Carries sport intent into Stripe metadata + success URL ?add=.
      if (includePendingSport && pendingSport) {
        body.pending_sport = pendingSport
        body.add = pendingSport
      }

      const res = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      })
      const { url, error: err } = await res.json()
      if (url) { window.location.href = url; return }
      setError(err ?? 'Payment setup failed. Please try again.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <Spinner />

  if (!assessment) return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center max-w-sm space-y-4">
        <p className="text-cobalt-ink font-semibold">No assessment found.</p>
        <button onClick={() => navigate('/onboarding/assessment')} className="btn-primary">Take Assessment</button>
      </div>
    </div>
  )

  const prs = computePRS(assessment)
  const tier = getPRSTier(prs)
  const asymmetries = getTopAsymmetries(assessment)

  return (
    <div className="min-h-screen bg-cobalt-ink py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="font-display font-bold text-white text-2xl">Your Results Are In</h1>
          <p className="text-sm text-white/60 mt-1">ROMRx mobility</p>
        </div>

        {/* PRS Score Card */}
        <div className="bg-white/5 rounded-card border border-cobalt/30 p-6 text-center">
          <p className="text-xs font-bold text-cobalt-light uppercase tracking-widest mb-4">Mobility band</p>
          <div className={cn('inline-flex items-center justify-center w-32 h-32 rounded-full border-4 mb-4', tier.bg, tier.color === 'text-cobalt' ? 'border-cobalt/40' : tier.color === 'text-yellow-700' ? 'border-yellow-400/40' : 'border-red-400/40')}>
            <div>
              <span className={cn('font-display font-bold text-5xl leading-none block', tier.color)}>{prs}</span>
              <span className={cn('text-xs font-bold uppercase tracking-wide', tier.color)}>/ 100</span>
            </div>
          </div>
          <div className={cn('inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-3', tier.bg, tier.color)}>
            <TrendingUp size={14} />
            {tier.label}
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{tier.desc}</p>
        </div>

        {/* Top asymmetries */}
        {asymmetries.length > 0 && (
          <div className="bg-white/5 rounded-card border border-yellow-400/30 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={15} className="text-yellow-400" />
              <p className="text-sm font-bold text-yellow-400">Top Asymmetry Flags</p>
            </div>
            {asymmetries.map((a, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-white/80">{a.joint}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">L {a.left}° / R {a.right}°</span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', a.gap >= 15 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400')}>
                    {a.gap}° gap
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-white/40 pt-1">Asymmetry is one of the top predictors of injury risk in athletes.</p>
          </div>
        )}

        {/* Teaser - locked content */}
        <div className="bg-white/5 rounded-card border border-cobalt/20 p-5 space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-cobalt-ink/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-card">
            <div className="text-center space-y-2">
              <Unlock size={28} className="text-white mx-auto" />
              <p className="text-sm font-bold text-white">Unlock Your Dashboard</p>
              <p className="text-xs text-white/60">Full joint breakdown, personalized protocol, ROMBot</p>
            </div>
          </div>
          <p className="text-xs font-bold text-cobalt-light uppercase tracking-wide mb-2">My Body - Mobility bands</p>
          <div className="flex gap-2">
            <span className="text-xs bg-red-500/20 text-red-400 px-3 py-1 rounded-full font-bold">{bandChip(1)}</span>
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold">{bandChip(2)}</span>
            <span className="text-xs bg-cobalt/20 text-cobalt-light px-3 py-1 rounded-full font-bold">{bandChip(3)}</span>
          </div>
          <div className="space-y-2">
            {[
              'My Protocol - Top 3 Priority Joints',
              ...(sportCopy
                ? [`My Sport - ${sportCopy.wordmark} (after Base)`]
                : []),
              'ROMBot - Ask anything about your data',
            ].map(item => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-cobalt/40" />
                <span className="text-sm text-white/40 blur-sm select-none">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {error && <p className="text-xs text-center text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}

        {pendingSport && sportCopy ? (
          <div className="space-y-3">
            <button
              onClick={() => handleUnlock(true)}
              disabled={paying}
              className="w-full py-4 bg-white text-cobalt-ink font-display font-bold text-base rounded-card hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {paying ? (isBetaFreeWindow() ? 'Unlocking…' : 'Setting up payment...') : <>
                <Unlock size={18} /> Unlock Base + {sportCopy.short} (free through Dec 31, 2026)
              </>}
            </button>
            <button
              onClick={() => handleUnlock(false)}
              disabled={paying}
              className="w-full py-3 bg-transparent border border-white/25 text-white font-display font-semibold text-sm rounded-card hover:bg-white/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              Unlock Base only (free through Dec 31, 2026)
            </button>
            <p className="text-center text-xs text-white/40">
              Base is free through December 31, 2026 (billing starts January 1, 2027). {sportCopy.wordmark} is an add-on after Base.
              Combo checkout starts Base and carries your sport intent for the next step.
            </p>
          </div>
        ) : (
          <button
            onClick={() => handleUnlock(false)}
            disabled={paying}
            className="w-full py-4 bg-white text-cobalt-ink font-display font-bold text-base rounded-card hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {paying ? (isBetaFreeWindow() ? 'Unlocking…' : 'Setting up payment...') : <>
              <Unlock size={18} /> Unlock My Dashboard (free through Dec 31, 2026)
            </>}
          </button>
        )}

        <p className="text-center text-xs text-white/30">
          ROMRx Base is free through December 31, 2026. Billing starts January 1, 2027. Cancel anytime. Results saved permanently.
        </p>
      </div>
    </div>
  )
}
