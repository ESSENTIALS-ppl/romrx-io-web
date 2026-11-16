import { StepVideo } from '../components/StepVideo'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { Loader2, ChevronRight, CheckCircle2 } from 'lucide-react'
import { SETUP_STEPS } from './assessmentMeta'
import { STEPS } from './assessmentSteps'
import { AssessmentMeasureScreen } from './AssessmentMeasureScreen'
import { track } from '../lib/track'
import {
  LEAVE_LEAVE, LEAVE_SAVED, LEAVE_SIGNED_OUT, LEAVE_STAY, LEAVE_TITLE, LEAVE_UNSAVED_LAST,
  RESUME_BUTTON, RESUME_RETENTION, RESUME_TITLE, START_OVER_BUTTON, START_OVER_CONFIRM, resumeProgressLine,
} from '../lib/assessmentDraftCopy'
import type { LeaveKind } from '../lib/assessmentDraft'
import { lazy, Suspense } from 'react'
// Lazy so the setup/measure screens do not load the auth client just for ROMood.
const ROMood = lazy(() => import('./ROMood').then(m => ({ default: m.ROMood })))

export type Phase = 'setup' | 'mood' | 'measure' | 'lead' | 'done' | 'lead-done' | 'outro' | 'resume'

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
  handleNext: (opts?: { skipped?: boolean }) => void
  handleLeadSubmit: (e: FormEvent) => void
  gender?: string | null
  /** Outro Continue (signed-in): results or the pack URL. Called only from the outro screen. */
  onOutroContinue?: () => void
  /** Resume screen (signed in, a saved draft with at least one finished step). */
  resume?: { done: number; total: number; startOverArmed: boolean; onResume: () => void; onStartOver: () => void }
  /** Leave sheet over the measure screens (browser Back at step 1, or Back with unsaved work). */
  leave?: { open: boolean; kind: LeaveKind; onStay: () => void; onLeave: () => void }
  saveStatus?: 'idle' | 'saved' | 'failed'
}) {
  const { phase, stepIdx, values, email, fullName, loading, error } = p

if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5">
          {/* Whole-flow counter (Jim Oct 26 8:12 PM ET): setup is Step 1 of STEPS.length + 2. Same style as the measure screen counter. */}
          <div className="flex justify-end">
            <span className="text-xs text-slate-500 whitespace-nowrap" data-testid="flow-counter">Step 1 of {STEPS.length + 2}</span>
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-cobalt text-2xl">ROM Self-Assessment</h1>
            <p className="text-sm text-slate-500 mt-1">Approximately 15 minutes using the ROMeter. Equipment needed: your phone, a chair, a wall, and a tape measure or ruler.</p>
          </div>

          {/* Intro video (Grant Oct 21 2026): /videos/intro.mp4, hidden if missing (components/StepVideo). */}
          <StepVideo stepId="intro" title="ROM Self-Assessment intro" />

          <div className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-cobalt-ink">Before you start:</p>
            {SETUP_STEPS.map(s => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.detail}</p>
                  {s.more && <p className="text-xs text-slate-500 leading-relaxed mt-2" data-method-line>{s.more}</p>}
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => { track('assessment_started'); p.setPhase('mood') }} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
            I'm ready - Start assessment <ChevronRight size={18} />
          </button>
          <p className="text-center text-xs text-slate-500">You can skip any measurement you can't do and retest later.</p>
        </div>
      </div>
    )
  }

  // ROMood check: the very next step after the welcome (intro) video (Jim, Oct 26 2026 6:36 PM ET).
  if (phase === 'mood') {
    return <Suspense fallback={null}><ROMood onBack={() => p.setPhase('setup')} onDone={() => p.setPhase('measure')} /></Suspense>
  }

  // Resume: a signed-in member comes back with a saved draft. Mood is not part of the draft, so Resume goes straight
  // to the measure steps (Stacy Oct 28: do not carry or infer mood).
  if (phase === 'resume' && p.resume) {
    const r = p.resume
    return (
      <div className="min-h-screen bg-surface py-8 px-4" data-resume>
        <div className="max-w-lg mx-auto space-y-5">
          <div className="card p-6 space-y-4 text-center">
            <h1 className="font-display font-bold text-cobalt text-2xl">{RESUME_TITLE}</h1>
            <p className="text-sm text-cobalt-ink" data-resume-progress>{resumeProgressLine(r.done, r.total)}</p>
            <p className="text-sm text-slate-500" data-resume-retention>{RESUME_RETENTION}</p>
            <button type="button" onClick={r.onResume} data-resume-go className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
              {RESUME_BUTTON} <ChevronRight size={18} />
            </button>
            <button type="button" onClick={r.onStartOver} data-resume-start-over className="w-full text-sm text-slate-500 hover:text-cobalt py-2">
              {r.startOverArmed ? START_OVER_CONFIRM : START_OVER_BUTTON}
            </button>
          </div>
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

  // Outro, signed-in (Grant Oct 21 2026). Replaces the 2 s 'done' spinner. Shown only AFTER submit-assessment
  // returned ok, and that edge awaits the great-job email before it replies. The video hides itself if
  // /videos/outro.mp4 is missing or fails; Continue sits outside it and always shows.
  if (phase === 'outro') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4" data-outro>
        <div className="max-w-lg mx-auto space-y-5">
          <StepVideo stepId="outro" title="Assessment complete" />
          <button type="button" onClick={() => p.onOutroContinue?.()} data-outro-continue className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
            Continue <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // Signed-out lead: 'Check your email' is reached only after submit-lead-assessment returned ok, and that
  // edge awaits the results email before it replies. Outro video sits on this screen (Grant Oct 21 2026);
  // hidden on error, Continue always shows.
  if (phase === 'lead-done') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4" data-outro data-lead-done>
        <div className="max-w-lg mx-auto space-y-5">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-cobalt" fill="currentColor" strokeWidth={0} />
            </div>
            <h2 className="font-display font-bold text-xl text-cobalt-ink">Check your email!</h2>
            <p className="text-sm text-slate-500">We sent your Personal Readiness Profile and a link to unlock your full dashboard to <strong>{email}</strong>.</p>
          </div>
          <StepVideo stepId="outro" title="Assessment complete" />
          <a href="/" data-outro-continue className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
            Continue <ChevronRight size={18} />
          </a>
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
          <p className="text-sm text-slate-500">Computing your Personal Readiness Profile...</p>
          <div className="w-6 h-6 border-[3px] border-cobalt/30 border-t-cobalt rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <>
      <AssessmentMeasureScreen
        stepIdx={stepIdx}
        values={values}
        loading={loading}
        error={error}
        setPhase={p.setPhase}
        setStepIdx={p.setStepIdx}
        handleChange={p.handleChange}
        handleNext={p.handleNext}
        gender={p.gender}
        saveStatus={p.saveStatus}
      />
      {p.leave?.open ? (
        <div className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4" role="dialog" aria-modal="true" aria-labelledby="leave-title" data-leave-sheet>
          <div className="w-full max-w-sm bg-white rounded-card p-6 space-y-4 shadow-xl">
            <h2 id="leave-title" className="font-display font-bold text-cobalt-ink text-lg">{LEAVE_TITLE}</h2>
            <p className="text-sm text-slate-600" data-leave-text>
              {p.leave.kind === 'saved' ? LEAVE_SAVED : p.leave.kind === 'unsaved-last' ? LEAVE_UNSAVED_LAST : LEAVE_SIGNED_OUT}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={p.leave.onStay} data-leave-stay className="btn-primary flex-1">{LEAVE_STAY}</button>
              <button type="button" onClick={p.leave.onLeave} data-leave-leave className="flex-1 text-sm text-slate-600 border border-slate-300 rounded-card py-2">{LEAVE_LEAVE}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
