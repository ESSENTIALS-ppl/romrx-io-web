import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { Save, Loader2, ExternalLink, LogOut } from 'lucide-react'

// Working shell for Phase 1: Account, Subscription, and Notifications
// sections wired to real data via useProfile / Supabase. The full BJJ
// Settings.tsx (coach roster tools, belt management, school linking) is
// BJJ-specific and stays in the BJJ sport add-on app.
const PORTAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`

export function Settings() {
  const { user, session, signOut } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
  }, [profile?.full_name])

  const handleSaveAccount = async () => {
    if (!user) return
    setSaving(true); setSaved(false)
    const { error: err } = await supabase.from('users').update({ full_name: fullName }).eq('id', user.id)
    setSaving(false)
    if (!err) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const handleManageBilling = async () => {
    if (!session) return
    setPortalLoading(true); setError('')
    try {
      const res = await fetch(PORTAL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: user?.id }),
      })
      const { url, error: err } = await res.json()
      if (url) { window.location.href = url; return }
      setError(err ?? 'Could not open billing portal.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleToggleMarketing = async (checked: boolean) => {
    setMarketingOptOut(checked)
    if (!user?.email) return
    await supabase.from('profiles').update({ marketing_opt_out: checked }).eq('email', user.email)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Manage your account, subscription, and notifications" />

      <SectionCard title="Account">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={profile?.email ?? user?.email ?? ''} disabled className="input opacity-60" />
          </div>
          <button onClick={handleSaveAccount} disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Subscription">
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-cobalt/10">
            <span className="text-sm text-slate-500">Base plan</span>
            <span className="text-sm font-semibold text-cobalt-ink capitalize">{profile?.base_status ?? 'inactive'}</span>
          </div>
          {profile?.sport_entitlements && profile.sport_entitlements.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sport packs</p>
              {profile.sport_entitlements.map(e => (
                <div key={e.sport} className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-cobalt-ink capitalize">{e.sport}</span>
                  <span className="text-xs font-bold bg-cobalt-light text-cobalt px-2 py-0.5 rounded-full capitalize">{e.status}</span>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button onClick={handleManageBilling} disabled={portalLoading} className="btn-ghost text-sm flex items-center gap-1.5">
            {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            Manage billing
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Notifications">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!marketingOptOut}
            onChange={e => handleToggleMarketing(!e.target.checked)}
            className="h-4 w-4 rounded border-cobalt/20 accent-cobalt cursor-pointer"
          />
          <span className="text-sm text-cobalt-ink">Receive product updates and tips by email</span>
        </label>
      </SectionCard>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 text-sm text-red-700 hover:bg-red-50 px-3 py-2 rounded-card transition-colors"
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  )
}
