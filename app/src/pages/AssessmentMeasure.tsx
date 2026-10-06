import { AlertTriangle, CheckCircle2, Crosshair } from 'lucide-react'
import { cn } from '../lib/cn'
import { type Field, getScore } from './assessmentMeta'
import { bandFull, BAND_TONE } from '../lib/mobilityBands'
import { METER_COPY } from '../lib/meterCopy'

// -- Single field input ----------------------------------------------------------
// Typed entry is always available. When the step has a phone meter, "Measure with phone" opens it;
// "Use this number" calls the same onChange(key, value) as typing, so scoring and saving are identical.
export function MeasureInput({ field, value, onChange, onMeasure, measuring }: {
  field: Field; value: string; onChange: (k: string, v: string) => void
  /** Present only when the phone meter can be used for this field. */
  onMeasure?: () => void
  measuring?: boolean
}) {
  const score = getScore(value, field)
  const tone = score != null ? BAND_TONE[score] : null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={`m-${field.key}`} className="text-sm font-semibold text-cobalt-ink">{field.label}</label>
        {(() => {
          const note = field.referenceNote ?? (!field.unscored && field.normalLow != null && field.normalHigh != null ? `Normal: ${field.normalLow}-${field.normalHigh}${field.unit ?? ''}` : null)
          return note ? <span className="text-xs text-slate-500">{note}</span> : null
        })()}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          id={`m-${field.key}`}
          type="number" min="0" max="360" step="0.5" inputMode="decimal"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={onMeasure ? METER_COPY.manualPlaceholder : ''}
          aria-label={METER_COPY.manualAria(field.label)}
          className={cn(
            'w-24 min-h-[44px] px-3 py-2.5 rounded-card border text-base text-center font-mono font-bold transition-all focus:outline-none placeholder:font-sans placeholder:font-normal placeholder:text-slate-400',
            tone ? cn(tone.chip, 'focus:border-cobalt') : 'border-cobalt/10 bg-surface focus:border-cobalt focus:bg-white'
          )}
        />
        <span className="text-sm text-slate-500">{field.unit}</span>
        {score != null && tone && (
          <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', tone.chip)}>
            {score === 1 && <AlertTriangle size={10} />}
            {score === 3 && <CheckCircle2 size={10} />}
            {bandFull(score)}
          </span>
        )}
        {onMeasure && !measuring && (
          <button type="button" onClick={onMeasure} data-measure-btn={field.key}
            className="ml-auto inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-card border border-cobalt/20 bg-cobalt-light text-cobalt text-sm font-semibold hover:bg-cobalt hover:text-white transition-colors">
            <Crosshair size={15} /> {METER_COPY.measureButton}
          </button>
        )}
      </div>
    </div>
  )
}
