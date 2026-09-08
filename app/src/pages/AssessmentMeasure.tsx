import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { type Field, getScore } from './assessmentMeta'

// -- Single field input ----------------------------------------------------------
export function MeasureInput({ field, value, onChange }: {
  field: Field; value: string; onChange: (k: string, v: string) => void
}) {
  const score = getScore(value, field)
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
            score === 'risk' ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' :
            score === 'functional' ? 'border-cobalt/40 bg-cobalt/5 text-cobalt focus:border-cobalt' :
            score === 'yellow' ? 'border-yellow-300 bg-yellow-50 text-yellow-700 focus:border-yellow-400' :
            'border-cobalt/10 bg-surface focus:border-cobalt focus:bg-white'
          )}
        />
        <span className="text-sm text-slate-500">{field.unit}</span>
        {score === 'risk' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle size={10} /> AT RISK
          </span>
        )}
        {score === 'functional' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-cobalt bg-cobalt-light px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} /> FUNCTIONAL
          </span>
        )}
        {score === 'yellow' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
            LOW
          </span>
        )}
      </div>
    </div>
  )
}

