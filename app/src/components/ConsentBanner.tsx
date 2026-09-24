import { useEffect, useState, useCallback } from 'react'
import {
  applyGpcIfPresent,
  detectRegion,
  gpcEnabled,
  GPC_HONORED_NOTE,
  OPT_OUT_CONFIRM,
  PRIVACY_POLICY_URL,
  readConsent,
  recordConsentChoice,
  shouldShowBanner,
  type ConsentState,
} from '../lib/consent'
import { revokeMetaMeasurement } from '../lib/metaAttribution'
import { syncConsentFromProfile, wireConsentAuth } from '../lib/consentProfile'

type Phase = 'hidden' | 'banner' | 'toast'

// Wire the Supabase session into consent logging before any effect can log.
wireConsentAuth()

const DNS_EVENT = 'romrx:dns-opt-out'

export function ConsentBanner() {
  const [phase, setPhase] = useState<Phase>('hidden')
  const [region, setRegion] = useState<'us' | 'eu_uk'>('us')
  const [toast, setToast] = useState('')

  const deny = useCallback((method: 'banner' | 'footer' = 'banner') => {
    const prev = readConsent()?.state as ConsentState | undefined
    // Logged server-side (Legal 2026-09-24) whether tracking was on or off.
    recordConsentChoice(prev === 'granted' ? 'revoked' : 'denied', method)
    revokeMetaMeasurement()
    setToast(OPT_OUT_CONFIRM)
    setPhase('toast')
    window.setTimeout(() => setPhase('hidden'), 7000)
  }, [])

  useEffect(() => {
    const r = detectRegion()
    setRegion(r)

    if (gpcEnabled()) {
      // Logs one 'gpc' row only if the stored state changes (not every load).
      applyGpcIfPresent()
      revokeMetaMeasurement()
      setPhase('hidden')
      return
    }

    setPhase(shouldShowBanner() ? 'banner' : 'hidden')
    // Signed in on a new browser: adopt the saved profile choice so a person who
    // declined is not re-prompted (12-month quiet period).
    let alive = true
    void syncConsentFromProfile().then(() => {
      if (alive && !shouldShowBanner()) setPhase((p) => (p === 'banner' ? 'hidden' : p))
    })

    const onHash = () => {
      const hash = (window.location.hash || '').toLowerCase()
      if (hash === '#do-not-sell' || hash === '#dns' || hash === '#do-not-sell-or-share') {
        deny('footer')
      }
    }
    const onDns = () => deny('footer')
    window.addEventListener('hashchange', onHash)
    window.addEventListener(DNS_EVENT, onDns)
    onHash()
    return () => {
      alive = false
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener(DNS_EVENT, onDns)
    }
  }, [deny])

  const grant = () => {
    recordConsentChoice('granted', 'banner')
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
  // US opt-out copy: Stacy exact text 2026-09-24, Jim GO. EU/UK unchanged.
  const body = isEu
    ? 'We use Meta Pixel cookies and limited event data to measure ads. This is optional. Essential cookies still work either way.'
    : 'We use essential cookies so ROMRx works. On signup pages, we also use Meta Pixel cookies and limited event data to measure our ads. We do not sell your personal information, but California law may call this a "sale" or "share." Decline turns ads measurement off for this browser. Essential cookies still work either way.'

  const equalBtn =
    'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50'

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
      {isEu ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary" onClick={grant}>
            Allow ads cookies
          </button>
          <button type="button" className="btn-ghost" onClick={() => deny('banner')}>
            Reject ads cookies
          </button>
          <a href={PRIVACY_POLICY_URL} className="text-sm text-cobalt underline font-medium ml-1">
            Privacy Policy
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {/* Jim GO 5:47 PM ET: Decline | Privacy Policy | Accept, identical style (11 CCR 7004). Footer DNS link carries CCPA 1798.135. */}
          <button type="button" className={equalBtn} onClick={() => deny('banner')}>
            Decline
          </button>
          <a href={PRIVACY_POLICY_URL} className={equalBtn}>
            Privacy Policy
          </a>
          <button type="button" className={equalBtn} onClick={grant}>
            Accept
          </button>
        </div>
      )}
    </div>
  )
}

/** Persistent footer / settings control for DNS/S. */
export function DoNotSellLink({ className = '' }: { className?: string }) {
  const gpc = gpcEnabled()
  return (
    <div className={className}>
      {gpc && (
        <p role="status" className="mb-1.5 mx-auto max-w-md text-[11px] leading-snug text-slate-600">
          {GPC_HONORED_NOTE}
        </p>
      )}
      <button
        type="button"
        className="text-xs underline text-slate-500 hover:text-slate-800"
        onClick={() => {
          window.dispatchEvent(new Event(DNS_EVENT))
        }}
      >
        {"Don't Sell or Share My Personal Information"}
      </button>
      <p className="mt-1.5 mx-auto max-w-md text-[11px] leading-snug text-slate-500">
        We do not sell your personal information. This turns off limited uses that help us reach people who need ROMRx. California may call those a &quot;sale&quot; or &quot;share.&quot;
      </p>
    </div>
  )
}
