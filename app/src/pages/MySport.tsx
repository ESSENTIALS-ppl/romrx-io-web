import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { ExternalLink, Trophy } from 'lucide-react'

// Sport app URLs. Each sport add-on ships its own dashboard.
const SPORT_APPS: Record<string, string> = {
  bjj: 'https://bjj.romrx.io/dashboard',
  bodybuilding: 'https://bb.romrx.io/dashboard',
}

const SPORT_LABELS: Record<string, string> = {
  bjj: 'ROMRx+BJJ',
  bodybuilding: 'ROMRx+BodyBuilding',
}

// Cards for sports the user doesn't yet have. unlock_token is a placeholder
// slug here - the real per-user token is minted server-side and should be
// substituted before linking to /unlock/:token in a later phase.
const AVAILABLE_SPORTS: Array<{ slug: string; label: string; price: string }> = [
  { slug: 'bjj', label: 'ROMRx+BJJ', price: '$149/yr' },
  { slug: 'bodybuilding', label: 'ROMRx+BodyBuilding', price: '$149/yr' },
]

export function MySport() {
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.id)

  if (loading) return <Spinner />

  const entitlements = profile?.sport_entitlements ?? []
  const ownedSlugs = new Set(entitlements.map(e => e.sport))
  const addable = AVAILABLE_SPORTS.filter(s => !ownedSlugs.has(s.slug))

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

      {addable.length > 0 && (
        <SectionCard title="Add a sport">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addable.map(s => (
              <div key={s.slug} className="border border-cobalt/10 rounded-card p-4 flex flex-col gap-2">
                <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                <p className="text-xs text-slate-500">Free during beta with the ambassador program - or {s.price} at checkout.</p>
                <a href={`/unlock/${s.slug}`} className="btn-primary text-sm text-center mt-1">
                  Add {s.label.replace('ROMRx+', '')}
                </a>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
