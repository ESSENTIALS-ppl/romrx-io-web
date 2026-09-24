import { useEffect, useState } from 'react'
import {
  adoptProfileChoice,
  detectRegion,
  effectiveConsentState,
  gpcEnabled,
  readConsent,
  recordConsentChoice,
  type ConsentState,
} from '../lib/consent'
import { revokeMetaMeasurement } from '../lib/metaAttribution'
import { fetchProfileConsent } from '../lib/consentProfile'
import { ADS_GPC_LOCKED_NOTE, ADS_SETTINGS_INTRO, adsSettingsView } from '../lib/adsSettings'
import { SectionCard } from './SectionCard'

/**
 * Settings > Ads measurement (Legal 2026-09-24). Signed in: current choice comes
 * from the profile (public.user_ads_consent), else from this browser.
 * Accept and Decline (EU/UK: Allow and Reject) look identical; neither is highlighted.
 * Each click is logged with method 'settings' whether tracking is on or off.
 */
export function AdsMeasurementSettings({ userId }: { userId?: string | null }) {
  const [region] = useState<'us' | 'eu_uk'>(() => detectRegion())
  const [gpc] = useState<boolean>(() => gpcEnabled())
  const [state, setState] = useState<ConsentState>(() => effectiveConsentState())
  const [saved, setSaved] = useState('')

  useEffect(() => {
    if (!userId) return
    let alive = true
    void fetchProfileConsent(userId).then((prof) => {
      if (!alive || !prof?.state) return
      adoptProfileChoice(prof)
      setState(gpcEnabled() ? 'denied' : prof.state)
    })
    return () => { alive = false }
  }, [userId])

  const view = adsSettingsView(state, region, gpc)

  const choose = (allow: boolean) => {
    if (view.locked) return
    const prev = readConsent()?.state
    const rec = recordConsentChoice(allow ? 'granted' : prev === 'granted' ? 'revoked' : 'denied', 'settings')
    if (rec.state !== 'granted') revokeMetaMeasurement()
    setState(rec.state)
    setSaved(rec.state === 'granted' ? 'Saved. Ads measurement is on.' : 'Saved. Ads measurement is off.')
  }

  const btn =
    'flex-1 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <SectionCard title="Ads measurement">
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{ADS_SETTINGS_INTRO}</p>
      <p className="text-sm text-cobalt-ink mb-3" data-testid="ads-choice">
        <span className="font-semibold">Current choice: </span>{view.summary}
      </p>
      {view.locked && (
        <p role="status" className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-card px-3 py-2 mb-3">
          {ADS_GPC_LOCKED_NOTE}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={view.locked} onClick={() => choose(false)}>
          {view.declineLabel}
        </button>
        <button type="button" className={btn} disabled={view.locked} onClick={() => choose(true)}>
          {view.acceptLabel}
        </button>
      </div>
      {saved && <p role="status" className="text-xs text-slate-500 mt-2">{saved}</p>}
    </SectionCard>
  )
}
