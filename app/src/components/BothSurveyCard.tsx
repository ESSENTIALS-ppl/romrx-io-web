/**
 * Native Both survey card (NPS micro + optional feedback).
 * Spec: plan-week-20260921/SURVEY-INSTRUMENT-BOTH-SPEC-20260924.md
 *
 * DRAFT — copy awaiting Jim GO. Do not enable live until Jim approves.
 * Gate: BOTH_SURVEY_ENABLED (false by default) AND caller must pass hasAssessment.
 * Completion = submitted NPS (0–10) via submit-feedback instrument=both.
 * Soft claims / Base bands only. No medical tone.
 */
import { useState } from 'react'
import { Loader2, Send, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/cn'

/** Flip to true only after Jim GO on copy + mock. Keep false for draft PR / prod. */
export const BOTH_SURVEY_ENABLED = false

/** Spec draft copy (Jim GO required). Joint draft variants noted in PR body. */
export const BOTH_NPS_QUESTION =
  'How likely are you to recommend ROMRx Base to a friend who wants to stay mobile?'
export const BOTH_FEEDBACK_QUESTION =
  "What's one thing that would make Base more useful for you?"

const MAX_MESSAGE = 1000

type Props = {
  /** Hard gate: only render/submit when user has a completed Base assessment. */
  hasAssessment: boolean
  /** Optional dismiss for post-results soft modal. */
  onDismiss?: () => void
  /** Called after successful completion. */
  onComplete?: () => void
  /** Visual variant: embedded Settings section vs modal shell. */
  variant?: 'settings' | 'modal'
}

export function BothSurveyCard({
  hasAssessment,
  onDismiss,
  onComplete,
  variant = 'settings',
}: Props) {
  const [nps, setNps] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!BOTH_SURVEY_ENABLED || !hasAssessment) return null

  const handleSubmit = async () => {
    if (submitting || nps == null) return
    setSubmitting(true)
    setErr(null)
    try {
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          instrument: 'both',
          nps_score: nps,
          message: message.trim(),
          sport: 'base',
          page_url: window.location.pathname,
          honeypot,
        },
      })
      const payload = data as { error?: string; ok?: boolean } | null
      if (error || payload?.error) {
        if (payload?.error === 'assessment_required') {
          throw new Error('Finish your assessment first, then you can rate Base.')
        }
        throw new Error(error?.message ?? payload?.error ?? 'Submission failed.')
      }
      setDone(true)
      onComplete?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className={cn('rounded-card border border-cobalt/15 bg-white p-5', variant === 'modal' && 'shadow-lg')}>
        <div className="flex items-center gap-2 text-cobalt font-semibold text-sm">
          <CheckCircle2 size={16} />
          Thanks — that helps us improve Base.
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-card border border-cobalt/15 bg-white p-5 space-y-4',
        variant === 'modal' && 'shadow-lg max-w-md w-full',
      )}
      data-testid="both-survey-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-cobalt-ink text-lg leading-tight">
            How&apos;s Base working for you?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">optional · about 20 seconds</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-cobalt p-1 rounded-lg"
            aria-label="Not now"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-cobalt-ink mb-2">{BOTH_NPS_QUESTION}</p>
        <div
          role="radiogroup"
          aria-label="Likelihood 0 to 10"
          className="flex flex-wrap gap-1.5 justify-between"
        >
          {Array.from({ length: 11 }, (_, i) => i).map((v) => {
            const active = nps === v
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setNps(v)}
                className={cn(
                  'w-8 h-8 rounded-lg text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cobalt',
                  active
                    ? 'bg-cobalt text-white'
                    : 'bg-slate-50 text-cobalt-ink border border-slate-200 hover:bg-cobalt-light',
                )}
              >
                {v}
              </button>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-500">0 = not likely</span>
          <span className="text-[10px] text-slate-500">10 = extremely likely</span>
        </div>
      </div>

      <div>
        <label htmlFor="both-feedback" className="text-sm font-semibold text-cobalt-ink block mb-1.5">
          {BOTH_FEEDBACK_QUESTION}
        </label>
        <textarea
          id="both-feedback"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
          maxLength={MAX_MESSAGE}
          rows={3}
          placeholder="(optional)"
          className="input resize-y text-sm"
        />
      </div>

      <input
        type="text"
        name="honeypot"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute w-px h-px -m-px overflow-hidden p-0 border-0"
        style={{ clip: 'rect(0 0 0 0)' }}
      />

      {err && (
        <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{err}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-cobalt"
          >
            Not now
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || nps == null}
          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

/** Soft post-results modal shell. No-op while BOTH_SURVEY_ENABLED is false. */
export function BothSurveyModal({
  hasAssessment,
  open,
  onClose,
}: {
  hasAssessment: boolean
  open: boolean
  onClose: () => void
}) {
  if (!BOTH_SURVEY_ENABLED || !open || !hasAssessment) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <BothSurveyCard
        hasAssessment={hasAssessment}
        variant="modal"
        onDismiss={onClose}
        onComplete={onClose}
      />
    </div>
  )
}
