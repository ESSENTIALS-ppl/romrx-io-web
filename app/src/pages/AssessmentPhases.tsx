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
                  <p className="text-sm font-medium text-cobalt-ink">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { p.setPhase('measure'); p.setStepIdx(0) }}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            Start Assessment <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'measure') {
    return (
      <AssessmentMeasureScreen
        stepIdx={stepIdx}
        values={values}
        error={error}
        handleChange={p.handleChange}
        handleNext={p.handleNext}
      />
    )
  }

  if (phase === 'lead') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-cobalt mx-auto mb-2" />
            <h1 className="font-display font-bold text-cobalt text-2xl">Almost done</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your details to see your results.</p>
          </div>
          <form onSubmit={p.handleLeadSubmit} className="card p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Full name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={fullName}
                onChange={e => p.setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={email}
                onChange={e => p.setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full btn-primary flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              See my results
            </button>
          </form>
          <p className="text-xs text-slate-400 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            We use this only to deliver your score and follow-ups you can opt out of.
          </p>
        </div>
      </div>
    )
  }

  return null
}
