import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { ExternalLink, Trophy, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CHECKOUT_URL } from '../lib/stripe'
import { BASE_UNAVAILABLE_CODE, BASE_UNAVAILABLE_MESSAGE, PACKS_CLOSED_MESSAGE } from '../lib/checkoutErrors'
import { withStripeTestFlag } from '../lib/stripeTestMode'
import { CARD_LINE_SHORT } from '../lib/cardLine'

// Sport app URLs. Each sport add-on ships its own dashboard.
const SPORT_APPS: Record<string, string> = {
  bjj: 'https://romrxbjj.com/dashboard',
  bodybuilding: 'https://romrxbodybuilding.com/dashboard',
}

const SPORT_LABELS: Record<string, string> = {
  bjj: 'ROMRx+BJJ',
  bodybuilding: 'ROMRx+BodyBuilding',
}

const AVAILABLE_SPORTS: Array<{ slug: string; label: string; price: string }> = [
  { slug: 'bjj', label: 'ROMRx+BJJ', price: '$149/yr' },
  { slug: 'bodybuilding', label: 'ROMRx+BodyBuilding', price: '$149/yr' },
]

export function MySport() {
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const [busy, setBusy] = useState(false)
  const [baseNotice, setBaseNotice] = useState<string | null>(null)

  if (loading) return <Spinner />

  const entitlements = profile?.sport_entitlements ?? []
  const ownedSlugs = new Set(entitlements.map(e => e.sport))
  const addable = AVAILABLE_SPORTS.filter(s => !ownedSlugs.has(s.slug))
  const baseActive = profile?.base_status === 'active'

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    return headers
  }

  async function startBaseCheckout() {
    if (!user) return
    setBusy(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(withStripeTestFlag({ mode: 'base', user_id: user.id, email: user.email })),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else if (data.error === BASE_UNAVAILABLE_CODE) setBaseNotice(BASE_UNAVAILABLE_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  async function openSportApp(sport: string) {
    const base = SPORT_APPS[sport]
    if (!base) return
    let url = base
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      url = `${base}#access_token=${session.access_token}&refresh_token=${session.refresh_token}&type=sso`
    }
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Sport" subtitle="Your sport add-ons and available upgrades" />

      {entitlements.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center text-center py-8 px-4">
            <div className="w-14 h-14 bg-cobalt-light rounded-card flex items-center justify-center mb-4">
              <Trophy size={24} className="text-cobalt" />
            </div>
            <h3 className="font-display font-bold text-base text-cobalt-ink mb-1">No sport add-ons yet</h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              {PACKS_CLOSED_MESSAGE}
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Your sports">
          <div className="divide-y divide-cobalt/10">
            {entitlements.map(e => (
              <div key={e.sport} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-cobalt-ink">{SPORT_LABELS[e.sport] ?? e.sport}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{e.status}{e.expires_at ? ` - renews ${new Date(e.expires_at).toLocaleDateString()}` : ''}</p>
                </div>
                <a
                  href={SPORT_APPS[e.sport] ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={evt => { evt.preventDefault(); openSportApp(e.sport) }}
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  Open {SPORT_LABELS[e.sport]?.replace('ROMRx+', '') ?? e.sport} app <ExternalLink size={13} />
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {!baseActive ? (
        <SectionCard title="Add a sport">
          <div className="border border-cobalt/10 rounded-card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-cobalt" />
              <p className="text-sm font-semibold text-cobalt-ink">Start with ROMRx Base</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ROMRx Base unlocks your Assessment history, ROMBot, and sport packs when they open in January 2027. Free through Dec 31, 2026. {CARD_LINE_SHORT} Then $60 a year unless you cancel. Cancel online anytime.
            </p>
            <button
              onClick={startBaseCheckout}
              disabled={busy}
              className="btn-primary text-sm text-center mt-1 disabled:opacity-60"
            >
              Continue
            </button>
            {baseNotice && <p role="alert" className="text-xs text-slate-600 mt-1">{baseNotice}</p>}
          </div>
        </SectionCard>
      ) : addable.length > 0 && (
        <SectionCard title="Add a sport">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addable.map(s => (
              <div key={s.slug} className="border border-cobalt/10 rounded-card p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                <p className="text-xs text-slate-500">{PACKS_CLOSED_MESSAGE}</p>
                {/* Packs are closed during beta (Jim, Oct 6): no checkout from here. Stacy PASS R8 Oct 6. */}
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="btn-primary text-sm text-center mt-1 opacity-60 cursor-not-allowed"
                >
                  Coming January 2027
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
