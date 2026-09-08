import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Loader2, ChevronRight, CheckCircle2, Info } from 'lucide-react'
import { SETUP_STEPS } from './assessmentMeta'
import { AssessmentMeasureScreen } from './AssessmentMeasureScreen'

type Phase = 'setup' | 'measure' | 'lead' | 'done' | 'lead-done'

export function AssessmentPhases(p: {
  phase: Phase
  stepIdx: number
  values: Record<string, string>
  email: string
  fullName: string
  loading: boolean
  error: string
  setPhase: (ph: Phase) => void
  setStepIdx: Dispatch<SetStateAction<number>>
  setEmail: (v: string) => void
  setFullName: (v: string) => void
  handleChange: (key: string, val: string) => void
  handleNext: () => void
  handleLeadSubmit: (e: FormEvent) => void
}) {
  const { phase, stepIdx, values, email, fullName, loading, error } = p

if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="text-center">
            <h1 className="font-display font-bold text-cobalt text-2xl">ROM Self-Assessment</h1>
            <p className="text-sm text-slate-500 mt-1">15 minutes - Smartphone inclinometer - No equipment needed</p>
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-cobalt-ink">Before you start:</p>
            {SETUP_STEPS.map(s => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-cobalt-light rounded-card p-4">
            <div className="flex gap-2 items-start">
              <Info size={16} className="text-cobalt mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-cobalt">The method in 4 words: Place. Zero. Move. Read.</p>
                <p className="text-xs text-cobalt/80 mt-1 leading-relaxed">
                  Hold phone flat against the body part. Tap screen to zero it. Move slowly to your end range. Read the number - ignore any minus sign. Each step tells you exactly where to hold the phone and which direction to move.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => p.setPhase('measure')} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
            I'm ready - Start assessment <ChevronRight size={18} />
          </button>
          <p className="text-center text-xs text-slate-500">You can skip any measurement you can't do and retest later.</p>
        </div>
      </div>
    )
  }

  if (phase === 'lead') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="font-display font-bold text-cobalt text-2xl">Almost done!</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your email to see your results.</p>
          </div>
          <form onSubmit={p.handleLeadSubmit} className="card p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
              <input type="text" value={fullName} onChange={e => p.setFullName(e.target.value)} placeholder="First Last" className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => p.setEmail(e.target.value)} placeholder="you@example.com" required autoFocus className="input" />
            </div>
            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              See my results
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (phase === 'lead-done') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4 px-4 max-w-sm">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-cobalt" fill="currentColor" strokeWidth={0} />
          </div>
          <h2 className="font-display font-bold text-xl text-cobalt-ink">Check your email!</h2>
          <p className="text-sm text-slate-500">We sent your Position Readiness results and a link to unlock your full dashboard to <strong>{email}</strong>.</p>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-cobalt" fill="currentColor" strokeWidth={0} />
          </div>
          <h2 className="font-display font-bold text-xl text-cobalt-ink">Assessment complete!</h2>
          <p className="text-sm text-slate-500">Computing your Position Readiness Score...</p>
          <div className="w-6 h-6 border-[3px] border-cobalt/30 border-t-cobalt rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <AssessmentMeasureScreen
      stepIdx={stepIdx}
      values={values}
      loading={loading}
      error={error}
      setPhase={p.setPhase}
      setStepIdx={p.setStepIdx}
      handleChange={p.handleChange}
      handleNext={p.handleNext}
    />
  )
}
