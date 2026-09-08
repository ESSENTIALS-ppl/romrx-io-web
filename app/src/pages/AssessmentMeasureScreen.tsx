import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, SkipForward } from 'lucide-react'
import { cn } from '../lib/cn'
import { STEPS } from './assessmentSteps'
import { MeasureInput } from './AssessmentMeasure'
import type { Dispatch, SetStateAction } from 'react'

export function AssessmentMeasureScreen(p: {
  stepIdx: number
  values: Record<string, string>
  loading: boolean
  error: string
  setPhase: (ph: 'setup' | 'measure' | 'lead' | 'done' | 'lead-done') => void
  setStepIdx: Dispatch<SetStateAction<number>>
  handleChange: (key: string, val: string) => void
  handleNext: () => void
}) {
  const { stepIdx, values, loading, error } = p
  const step = STEPS[stepIdx]
  const totalMeasureSteps = STEPS.length
  const progress = Math.round((stepIdx / totalMeasureSteps) * 100)
  return (
    <div className="min-h-screen bg-surface py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-cobalt-light rounded-full overflow-hidden">
            <div className="h-full bg-cobalt rounded-full transition-all duration-500"
              style={{ width: `${progress + (100 / totalMeasureSteps)}%` }} />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">{stepIdx + 1} / {totalMeasureSteps}</span>
        </div>

        {/* Joint card */}
        <div className="bg-white rounded-card border border-cobalt/10 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-cobalt px-5 py-4">
            <h2 className="font-display font-bold text-xl text-white">{step.title}</h2>
            <p className="text-cobalt-light text-xs mt-0.5">{step.why}</p>
          </div>

          <div className="p-5 space-y-5">
            {/* Tool badge */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-surface rounded-card px-3 py-2">
              <span className="text-base">📐</span>
              <span className="font-medium">{step.tool}</span>
            </div>

            {/* Setup */}
            <div>
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide mb-2">Setup</p>
              <ol className="space-y-1.5">
                {step.position.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-500 leading-snug">
                    <span className="w-5 h-5 bg-cobalt-light text-cobalt text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            {/* How to */}
            <div>
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide mb-2">How to Measure</p>
              <ol className="space-y-1.5">
                {step.howTo.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-500 leading-snug">
                    <span className="w-5 h-5 bg-surface border border-cobalt/10 text-slate-500 text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            {/* Common mistake */}
            <div className="flex gap-2.5 bg-yellow-50 border border-yellow-200 rounded-card p-3">
              <AlertTriangle size={15} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-yellow-700">Common mistake</p>
                <p className="text-xs text-yellow-700 mt-0.5">{step.mistake}</p>
                <p className="text-xs text-yellow-800 font-medium mt-1">Fix: {step.mistakeFix}</p>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4 pt-2 border-t border-cobalt/10">
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide">Enter your measurements</p>
              {step.fields.map(f => (
                <MeasureInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={p.handleChange} />
              ))}
            </div>

            {/* Hands-free screenshot tip */}
            <p className="text-center text-xs text-slate-500">
              📸 Can't tap the screen? Say <span className="font-semibold">&ldquo;Hey Siri, take a screenshot&rdquo;</span> (iPhone) or <span className="font-semibold">&ldquo;Hey Google, take a screenshot&rdquo;</span> (Android).
            </p>

            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { if (stepIdx > 0) { p.setStepIdx(s => s - 1); window.scrollTo({ top: 0 }) } else p.setPhase('setup') }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-cobalt px-3 py-2 rounded-card hover:bg-cobalt-light transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { p.handleChange(step.fields[0].key, ''); p.handleNext() }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-cobalt-ink px-3 py-2 rounded-card hover:bg-surface transition-colors"
                >
                  <SkipForward size={13} /> Skip
                </button>

                <button
                  type="button"
                  onClick={p.handleNext}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                    : stepIdx === STEPS.length - 1
                      ? <><CheckCircle2 size={14} /> Submit</>
                      : <>Next <ChevronRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn(
              'rounded-full transition-all duration-300',
              i === stepIdx ? 'bg-cobalt w-5 h-2' : i < stepIdx ? 'bg-cobalt/40 w-2 h-2' : 'bg-gray-200 w-2 h-2'
            )} />
          ))}
        </div>
      </div>
    </div>
  )
}
