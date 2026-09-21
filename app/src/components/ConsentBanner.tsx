import { useEffect, useState, useCallback } from 'react'
import {
  detectRegion,
  effectiveConsentState,
  gpcEnabled,
  OPT_OUT_CONFIRM,
  PRIVACY_POLICY_URL,
  readConsent,
  writeConsent,
  type ConsentState,
} from '../lib/consent'
import { revokeMetaMeasurement } from '../lib/metaAttribution'

type Phase = 'hidden' | 'banner' | 'toast'

const DNS_EVENT = 'romrx:dns-opt-out'

export function ConsentBanner() {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [region, setRegion] = useState<'us' | 'eu_uk'>('us')
  const [toast, setToast] = useState('')

  const deny = useCallback(() => {
    const prev = readConsent()?.state as ConsentState | undefined
    writeConsent(prev === 'granted' ? 'revoked' : 'denied')
    revokeMetaMeasurement()
    setToast(OPT_OUT_CONFIRM)
    setPhase('toast')
    window.setTimeout(() => setPhase('hidden'), 7000)
  }, [])

  useEffect(() => {
    const r = detectRegion()
    setRegion(r)

    if (gpcEnabled()) {
      writeConsent('denied')
      revokeMetaMeasurement()
      setPhase('hidden')
      return
    }

    const state = effectiveConsentState()
    if (state === 'unknown') setPhase('banner')
    else setPhase('hidden')

    const onHash = () => {
      const hash = (window.location.hash || '').toLowerCase()
      if (hash === '#do-not-sell' || hash === '#dns' || hash === '#do-not-sell-or-share') {
        deny()
      }
    }
    const onDns = () => deny()
    window.addEventListener('hashchange', onHash)
    window.addEventListener(DNS_EVENT, onDns)
    onHash()
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener(DNS_EVENT, onDns)
    }
  }, [deny])

  const grant = () => {
    writeConsent('granted')
    setPhase('hidden')
  }

  if (phase === 'toast') {
    return (
      <div
        role="status"
        className="fixed left-4 right-4 bottom-4 z-[10001] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-xl"
      >
        {toast}
      </div>
    )
  }

  if (phase !== 'banner') return null

  const isEu = region === 'eu_uk'
  const title = isEu ? 'Ads cookies' : 'Cookies and ads measurement'
  const body = isEu
    ? 'We use Meta Pixel cookies and limited event data to measure ads. This is optional. Essential cookies still work either way.'
    : 'We use essential cookies to run ROMRx. We also use Meta (Facebook and Instagram) tools to measure our ads. That can include cookies such as _fbp and _fbc and limited event data. We do not sell your data for money. You can opt out of sharing for ads measurement anytime.'
  const primary = isEu ? 'Allow ads cookies' : 'OK'
  const secondary = isEu ? 'Reject ads cookies' : 'Do Not Sell or Share'

  return (
    <div
      role="dialog"
      aria-labelledby="rx-app-consent-title"
      aria-describedby="rx-app-consent-body"
      className="fixed left-4 right-4 bottom-4 z-[10000] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      <p id="rx-app-consent-title" className="text-base font-bold text-slate-900 mb-2">
        {title}
      </p>
      <p id="rx-app-consent-body" className="text-sm text-slate-600 mb-3 leading-relaxed">
        {body}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary" onClick={grant}>
          {primary}
        </button>
        <button type="button" className="btn-ghost" onClick={deny}>
          {secondary}
        </button>
        <a href={PRIVACY_POLICY_URL} className="text-sm text-cobalt underline font-medium ml-1">
          Privacy Policy
        </a>
      </div>
    </div>
  )
}

/** Persistent footer / settings control for DNS/S. */
export function DoNotSellLink({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      className={`text-xs underline text-slate-500 hover:text-slate-800 ${className}`}
      onClick={() => {
        window.dispatchEvent(new Event(DNS_EVENT))
      }}
    >
      Do Not Sell or Share My Personal Information
    </button>
  )
}
