import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { ExternalLink, Trophy, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CHECKOUT_URL, SPORT_PRICE_IDS } from '../lib/stripe'

// Sport app URLs. Each sport add-on ships its own dashboard.
const SPORT_APPS: Record<string, string> = {
  bjj: 'https://bjj.romrx.io/dashboard',
  bodybuilding: 'https://bb.romrx.io/dashboard',
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
        body: JSON.stringify({ mode: 'base', user_id: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setBusy(false)
    }
  }

  async function startSportCheckout(slug: string) {
    if (!user) return
    setBusy(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'unlock', token: slug, price_id: SPORT_PRICE_IDS[slug] }),
      })
      const data = await res.json()
      if (res.status === 409 && data.error === 'base_required') {
        await startBaseCheckout()
        return
      }
      if (data.url) window.location.href = data.url
    } finally {
      setBusy(false)
    }
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
              Add a sport below to unlock its dedicated training dashboard.
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
              The $60/yr Base membership unlocks your Assessment history, ROMBot, and the ability to add any Sport pack. Free during beta with the ambassador program.
            </p>
            <button
              onClick={startBaseCheckout}
              disabled={busy}
              className="btn-primary text-sm text-center mt-1 disabled:opacity-60"
            >
              Continue
            </button>
          </div>
        </SectionCard>
      ) : addable.length > 0 && (
        <SectionCard title="Add a sport">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addable.map(s => (
              <div key={s.slug} className="border border-cobalt/10 rounded-card p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                <p className="text-xs text-slate-500">Free during beta with the ambassador program - or {s.price} at checkout.</p>
                <button
                  onClick={() => startSportCheckout(s.slug)}
                  disabled={busy}
                  className="btn-primary text-sm text-center mt-1 disabled:opacity-60"
                >
                  Add {s.label.replace('ROMRx+', '')}
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
