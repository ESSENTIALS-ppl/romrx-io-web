import { Loader2, ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, SkipForward } from 'lucide-react'
import { cn } from '../lib/cn'
import { STEPS } from './assessmentSteps'
import { MeasureInput } from './AssessmentMeasure'
import { HIP_FLEX_LEFT_RIGHT_DIFFERENT, HIP_FLEX_RANGE_SOURCE, HIP_FLEX_TYPICAL_RANGE, SHOW_SLR_TYPICAL_RANGE, hipFlexScreenCopy } from '../lib/hipFlexCopy'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { PhoneMeter } from '../components/PhoneMeter'
import { meterLikelyAvailable } from '../lib/meterSensor'
import { METER_COPY, MEASUREMENTS_HEADER, MORE_HELP_LABEL } from '../lib/meterCopy'
import type { Field } from './assessmentMeta'

/** Safety, not-medical-advice or warm-up wording that must never fold under More help (Stacy, Oct 6). */
export const SAFETY_TEXT = /pain|stop if|hurt|medical|advice|warm[ -]?up|injur|doctor/i

export function AssessmentMeasureScreen(p: {
  stepIdx: number
  values: Record<string, string>
  loading: boolean
  error: string
  setPhase: (ph: 'setup' | 'measure' | 'lead' | 'done' | 'lead-done') => void
  setStepIdx: Dispatch<SetStateAction<number>>
  handleChange: (key: string, val: string) => void
  handleNext: () => void
  /** Profile gender, when signed in. Only male or female counts as sex known. */
  gender?: string | null
}) {
  const { stepIdx, values, loading, error } = p
  const step = STEPS[stepIdx]
  const isHip = step.fields.some(f => f.unscored)
  const hipCopy = hipFlexScreenCopy(p.gender, parseFloat(values.hip_flex_l ?? ''), parseFloat(values.hip_flex_r ?? ''))
  const totalMeasureSteps = STEPS.length
  const progress = Math.round((stepIdx / totalMeasureSteps) * 100)
  // Phone meter: one side at a time on this screen. Entering a meter step opens it on the first empty
  // side; Use this number fills THAT side (same path as typing), collapses it to "Saved: Left 48°",
  // and moves the meter to the next empty side. Switching steps resets this.
  const [meterAvail] = useState(meterLikelyAvailable)
  const meterFields = step.meter ? step.fields.filter(f => f.unit === '°') : []
  const meterOn = meterAvail && meterFields.length > 0
  const [active, setActive] = useState<{ step: number; key: string | null; notice?: string } | null>(null)
  const [savedByMeter, setSavedByMeter] = useState<Record<string, true>>({})
  if (meterOn && active?.step !== stepIdx) {
    const first = meterFields.find(f => (values[f.key] ?? '') === '')
    setActive({ step: stepIdx, key: first?.key ?? null })
  }
  const activeKey = active?.step === stepIdx ? active.key : null
  const canMeter = (f: Field) => meterOn && meterFields.includes(f)
  const useFromMeter = (f: Field, deg: number) => {
    p.handleChange(f.key, String(deg))                    // exactly the typed-entry path
    setSavedByMeter(s => ({ ...s, [f.key]: true }))
    const next = meterFields.find(o => o !== f && (values[o.key] ?? '') === '')
    setActive({ step: stepIdx, key: next?.key ?? null, notice: next ? METER_COPY.nextReady(next.label) : undefined })
  }
  // Layout item 7: the typical range shows once per step, on the side being measured now (or the first
  // side still open), never repeated on the other side. Only real "Typical range" notes move; other
  // notes (ankle "Best of 3, in cm", the SLR sex note when the range switch is off) are untouched.
  const isRangeNote = (f: Field) => f.unscored ? SHOW_SLR_TYPICAL_RANGE
    : !f.referenceNote && !!f.rangeSource && f.normalLow != null && f.normalHigh != null
  const isCollapsed = (f: Field) => canMeter(f) && activeKey !== f.key && (values[f.key] ?? '') !== '' && !!savedByMeter[f.key]
  const rangeOpen = step.fields.filter(f => isRangeNote(f) && !isCollapsed(f))
  const rangeKey = (rangeOpen.find(f => f.key === activeKey) ?? rangeOpen[0])?.key
  // Layout item 9: on meter steps, How to Measure + Common mistake + the lock tip fold under one
  // "More help" toggle (closed when a step opens). Setup stays open. Typed-only steps are unchanged.
  // Stacy guardrail (Oct 6, 11:43): Setup and any safety, not-medical-advice or warm-up text stay visible,
  // never under More help. A step whose How to Measure / Common mistake carries such a line (the SLR's
  // "Stop if you feel sharp pain.") keeps them open, like typed-only steps. Words unchanged.
  const safetyInHelp = [...step.howTo, step.mistake, step.mistakeFix].some(l => SAFETY_TEXT.test(l))
  const moreHelp = !!step.meter && meterAvail && !safetyInHelp
  const [help, setHelp] = useState<{ step: number; open: boolean }>({ step: stepIdx, open: false })
  const helpOpen = help.step === stepIdx && help.open
  const allMeterSaved = meterOn && meterFields.every(f => (values[f.key] ?? '') !== '') && meterFields.some(f => savedByMeter[f.key])
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
            <p className="text-cobalt-light text-xs mt-0.5">{isHip ? hipCopy.why : step.why}</p>
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

            {moreHelp && (
              <button type="button" onClick={() => setHelp({ step: stepIdx, open: !helpOpen })}
                aria-expanded={helpOpen} aria-controls="more-help" data-more-help
                className="flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-cobalt hover:underline">
                {MORE_HELP_LABEL}
                <ChevronDown size={16} aria-hidden className={cn('transition-transform', helpOpen && 'rotate-180')} />
              </button>
            )}
            {(!moreHelp || helpOpen) && (<div id={moreHelp ? 'more-help' : undefined} className="space-y-5" data-help-body>
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

            {/* Hands-free tip on meter steps: the meter locks on hold (moved under More help, item 9) */}
            {moreHelp && (
              <p className="text-xs text-slate-500" data-lock-tip>🔒 Can't see the screen at the end? Hold still. The number locks and chimes, so you can read it after.</p>
            )}
            </div>)}

            {/* Input fields */}
            <div className="space-y-4 pt-2 border-t border-cobalt/10">
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide" data-measurements-header>{MEASUREMENTS_HEADER}</p>
              {step.meter && !meterAvail && <p className="text-xs text-slate-500" data-desktop-note>{METER_COPY.desktopNote}</p>}
              {step.fields.map(f => {
                const v = values[f.key] ?? ''
                const isActive = activeKey === f.key && !!step.meter
                if (canMeter(f) && !isActive && v !== '' && savedByMeter[f.key]) {
                  return (
                    <div key={f.key} data-saved-row={f.key}
                      className="flex items-center gap-2 rounded-card border border-meter-text/20 bg-meter-tint pl-3 pr-1 min-h-[44px]">
                      <CheckCircle2 size={16} className="text-meter-text shrink-0" />
                      <span className="text-sm font-bold text-cobalt-ink">{METER_COPY.saved(f.label, v)}</span>
                      <button type="button" onClick={() => setActive({ step: stepIdx, key: f.key })}
                        className="ml-auto min-h-[44px] px-2 text-sm font-semibold text-meter-text hover:underline">{METER_COPY.measureAgain}</button>
                    </div>
                  )
                }
                return (
                  <div key={f.key} className="space-y-3">
                    <MeasureInput field={f.unscored ? { ...f, referenceNote: SHOW_SLR_TYPICAL_RANGE ? HIP_FLEX_TYPICAL_RANGE : hipCopy.inputNote } : f} value={v} onChange={p.handleChange}
                      onMeasure={canMeter(f) ? () => setActive({ step: stepIdx, key: f.key }) : undefined} measuring={isActive}
                      upNext={canMeter(f) && !isActive && activeKey != null && v === ''}
                      hideRange={isRangeNote(f) && f.key !== rangeKey} />
                    {isActive && step.meter && (
                      <PhoneMeter key={`${stepIdx}-${f.key}`} movement={step.title} sideLabel={f.label} grip={step.meter.grip}
                        notice={active?.notice}
                        onUse={deg => useFromMeter(f, deg)} onClose={() => setActive({ step: stepIdx, key: null })} />
                    )}
                  </div>
                )
              })}
              {allMeterSaved && activeKey == null && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-meter-text" role="status" data-all-saved>
                  <CheckCircle2 size={16} /> {METER_COPY.allSaved(meterFields.map(f => f.label))}
                </p>
              )}
              {(() => {
                const src = [...new Set(step.fields.filter(f => f.rangeSource && f.normalLow != null).map(f => f.rangeSource!))]
                return src.length ? <p className="text-[11px] text-slate-400" data-range-source>Source: {src.join('; ')}</p> : null
              })()}
              {isHip && (
                <div className="text-xs text-slate-500 space-y-1" data-unscored-note>
                  {SHOW_SLR_TYPICAL_RANGE && <p data-range-source>{HIP_FLEX_RANGE_SOURCE}</p>}
                  {hipCopy.lines.map(l => (
                    <p key={l} className={l === HIP_FLEX_LEFT_RIGHT_DIFFERENT ? 'font-semibold text-slate-600' : undefined}>{l}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Typed-only angle steps (and no-meter devices) keep the screenshot tip here; on meter steps
                the lock tip lives under More help (item 9). */}
            {moreHelp ? null : step.fields.some(f => f.unit === '°') ? (
              <p className="text-center text-xs text-slate-500">
                📸 Can't tap the screen? Say <span className="font-semibold">&ldquo;Hey Siri, take a screenshot&rdquo;</span> (iPhone) or <span className="font-semibold">&ldquo;Hey Google, take a screenshot&rdquo;</span> (Android).
              </p>
            ) : null}

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
                  onClick={() => { for (const f of step.fields) p.handleChange(f.key, ''); p.handleNext() }}
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
