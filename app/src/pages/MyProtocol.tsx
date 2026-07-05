import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { ClipboardList, RefreshCw, Loader2 } from 'lucide-react'

// Working shell for Phase 1: lists protocol entries from the `protocols`
// table for the current user and offers a "Generate protocol" action that
// calls the existing `compute-tiers` edge function. The full BJJ prescription
// library (exercise library, daily rotation, session tracking) stays in the
// BJJ sport add-on app - it is BJJ-technique-specific and not sport-agnostic.
const COMPUTE_TIERS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compute-tiers`

interface ProtocolEntry {
  id: string
  joint: string
  priority: number | null
  exercise_name: string | null
  dose: string | null
  created_at: string
}

export function MyProtocol() {
  const { user, session } = useAuth()
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function loadProtocols() {
    if (!user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('protocols')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true })
    if (err) {
      console.error('protocols load error:', err.message)
    }
    setProtocols(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadProtocols() }, [user])

  const handleGenerate = async () => {
    if (!session) return
    setGenerating(true); setError('')
    try {
      const res = await fetch(COMPUTE_TIERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: user?.id }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? 'Could not generate protocol.')
      await loadProtocols()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Protocol"
        subtitle="Personalized mobility plan based on your latest assessment"
        action={
          <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm flex items-center gap-1.5">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Generate protocol
          </button>
        }
      />

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {protocols.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No protocol yet"
          description="Generate your personalized protocol from your latest ROM assessment to see priority joints and daily exercises."
          action={<button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm">Generate protocol</button>}
        />
      ) : (
        <SectionCard title="Priority Joints" subtitle="Ordered by priority - highest first">
          <div className="divide-y divide-cobalt/10">
            {protocols.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-cobalt-ink">{p.joint}</p>
                  {p.exercise_name && <p className="text-xs text-slate-500 mt-0.5">{p.exercise_name}{p.dose ? ` - ${p.dose}` : ''}</p>}
                </div>
                {p.priority != null && (
                  <span className="text-xs font-bold bg-cobalt-light text-cobalt px-2.5 py-1 rounded-full">
                    Priority {p.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
