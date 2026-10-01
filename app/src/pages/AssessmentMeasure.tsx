import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { type Field, getScore } from './assessmentMeta'
import { bandFull, BAND_TONE } from '../lib/mobilityBands'

// -- Single field input ----------------------------------------------------------
export function MeasureInput({ field, value, onChange }: {
  field: Field; value: string; onChange: (k: string, v: string) => void
}) {
  const score = getScore(value, field)
  const tone = score != null ? BAND_TONE[score] : null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-cobalt-ink">{field.label}</label>
        <span className="text-xs text-slate-500">Normal: {field.normalLow}-{field.normalHigh}{field.unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number" min="0" max="360" step="0.5"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder=""
          className={cn(
            'w-24 px-3 py-2.5 rounded-card border text-sm text-center font-mono font-bold transition-all focus:outline-none',
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
      </div>
    </div>
  )
}

