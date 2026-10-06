import { useState } from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PhoneMeter } from '../components/PhoneMeter'
import { meterLikelyAvailable } from '../lib/meterSensor'
import { METHOD_LINE } from './assessmentMeta'
import { ROMETER_COPY as R } from '../lib/rometerCopy'

/**
 * Standalone ROMeter (Jim, Oct 6): a raw phone angle meter with no joint attached, for informal checks.
 * Same meter as the assessment (components/PhoneMeter: 5-4-3-2-1 beeps, GO zeroes, lock on hold + ding),
 * without Use this number. The number is the angle moved since Start.
 *
 * NOTHING IS SAVED OR SENT: readings live only in PhoneMeter's React state and are gone when you leave.
 * This page and everything it imports must never use supabase, fetch, track, localStorage or
 * sessionStorage, and never show a range, band or comparison (Stacy, Oct 6). Guarded by
 * src/lib/rometer.test.tsx. The global page view (path only, never a reading) stays (Jim, Oct 6).
 */
export function ROMeter() {
  const [avail] = useState(meterLikelyAvailable)
  return (
    <div className="max-w-lg mx-auto space-y-4" data-rometer-page>
      <PageHeader title={R.title} subtitle={R.subtitle} />
      <p className="text-sm text-slate-600 leading-snug">{R.intro}</p>
      <div className="flex gap-2 items-start bg-cobalt-light rounded-card px-3 py-2">
        <Info size={16} className="text-cobalt mt-0.5 shrink-0" />
        <p className="text-sm font-semibold text-cobalt" data-method-line>{METHOD_LINE}</p>
      </div>

      {avail ? (
        <PhoneMeter movement={R.title} sideLabel="" headerLabel={R.meterHeader} grip={R.grip} gripNote={R.tiltOnly} lockedLine={R.locked} />
      ) : (
        <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-card px-3 py-3" data-rometer-desktop>{R.desktop}</p>
      )}

      <div className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
        <p className="flex gap-1.5 items-start" data-rometer-privacy><ShieldCheck size={14} className="text-slate-400 mt-0.5 shrink-0" />{R.privacy}</p>
        <p data-rometer-not-assessment>{R.notAssessment}</p>
        <p className="font-semibold text-cobalt-ink" data-rometer-disclaimer>{R.disclaimer}</p>
      </div>
    </div>
  )
}
