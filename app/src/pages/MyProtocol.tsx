import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { ClipboardList, RefreshCw, Loader2 } from 'lucide-react'

// My Protocol - Phase 1 (rebuilt v2)
// Reads real data from `technique_eligibility` (the table compute-tiers writes to).
// "Generate protocol" fetches the latest assessment and passes the full record
// to compute-tiers (which is how the DB trigger normally invokes it).
const COMPUTE_TIERS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compute-tiers`

interface EligibilityRow {
  id: string
  technique_code: string
  tier: 'RED' | 'YELLOW' | 'GREEN'
  limiting_joints: string[] | null
  flag: string | null
  sport: string
}

interface TierCounts { green: number; yellow: number; red: number; delay: number }

export function MyProtocol() {
  const { user, session } = useAuth()
  const [rows, setRows] = useState<EligibilityRow[]>([])
  const [counts, setCounts] = useState<TierCounts>({ green: 0, yellow: 0, red: 0, delay: 0 })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function loadEligibility() {
    if (!user) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('technique_eligibility')
      .select('id, technique_code, tier, limiting_joints, flag, sport')
      .eq('user_id', user.id)
      .order('tier', { ascending: true })
    if (err) {
      console.error('technique_eligibility load error:', err.message)
    }
    const list = (data ?? []) as EligibilityRow[]
    setRows(list)
    const c: TierCounts = { green: 0, yellow: 0, red: 0, delay: 0 }
    for (const r of list) {
      if (r.flag === 'DELAY_TECHNIQUE') c.delay++
      else if (r.tier === 'RED') c.red++
      else if (r.tier === 'YELLOW') c.yellow++
      else if (r.tier === 'GREEN') c.green++
    }
    setCounts(c)
    setLoading(false)
  }

  useEffect(() => { loadEligibility() }, [user])

  const handleGenerate = async () => {
    if (!session || !user) return
    setGenerating(true); setError('')
    try {
      // Fetch the user's latest assessment so we can pass the full record
      // to compute-tiers (matches DB-trigger invocation shape).
      const { data: assessment, error: aerr } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (aerr || !assessment) {
        throw new Error('No assessment found. Complete your ROM assessment first.')
      }

      const res = await fetch(COMPUTE_TIERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ record: assessment }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Could not generate protocol.')
      await loadEligibility()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <Spinner />

  const priority = rows
    .filter(r => r.tier === 'RED' || r.flag === 'DELAY_TECHNIQUE')
    .slice(0, 20)

  const totalRated = counts.red + counts.yellow + counts.green + counts.delay

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Protocol"
        subtitle="Technique readiness based on your latest ROM assessment"
        action={
          <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm flex items-center gap-1.5">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {rows.length ? 'Recompute' : 'Generate protocol'}
          </button>
        }
      />

      {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {totalRated === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No protocol yet"
          description="Generate your personalized protocol from your latest ROM assessment to see technique readiness and priority joints."
          action={<button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm">Generate protocol</button>}
        />
      ) : (
        <>
          <SectionCard title="Technique Readiness" subtitle={`${totalRated} techniques rated`}>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-card bg-green-50 p-3 text-center">
                <p className="text-2xl font-extrabold text-green-700">{counts.green}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 mt-0.5">Green</p>
              </div>
              <div className="rounded-card bg-yellow-50 p-3 text-center">
                <p className="text-2xl font-extrabold text-yellow-700">{counts.yellow}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 mt-0.5">Yellow</p>
              </div>
              <div className="rounded-card bg-red-50 p-3 text-center">
                <p className="text-2xl font-extrabold text-red-700">{counts.red}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 mt-0.5">Red</p>
              </div>
              <div className="rounded-card bg-slate-100 p-3 text-center">
                <p className="text-2xl font-extrabold text-slate-600">{counts.delay}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">Delay</p>
              </div>
            </div>
          </SectionCard>

          {priority.length > 0 && (
            <SectionCard title="Priority Techniques" subtitle="Techniques flagged RED or DELAY - work on limiting joints first">
              <div className="divide-y divide-cobalt/10">
                {priority.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold text-cobalt-ink">{p.technique_code}</p>
                      {p.limiting_joints && p.limiting_joints.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Limiting: {p.limiting_joints.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.flag === 'DELAY_TECHNIQUE'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {p.flag === 'DELAY_TECHNIQUE' ? 'DELAY' : p.tier}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
