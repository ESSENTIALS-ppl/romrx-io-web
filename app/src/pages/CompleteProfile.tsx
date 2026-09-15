import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'
import { Save, Loader2 } from 'lucide-react'

const GENDERS = [
  { v: 'male', l: 'Male' },
  { v: 'female', l: 'Female' },
  { v: 'other', l: 'Other' },
  { v: 'prefer_not_to_say', l: 'Prefer not to say' },
] as const

const AGE_BUCKETS = [
  { v: '13-17', l: '13 to 17' },
  { v: '18-29', l: '18 to 29' },
  { v: '30-44', l: '30 to 44' },
  { v: '45-59', l: '45 to 59' },
  { v: '60+', l: '60 and over' },
] as const

/** Required age_bucket + gender wall. Writes existing users columns only. */
export function CompleteProfile() {
  const { user } = useAuth()
  const [gender, setGender] = useState('')
  const [ageBucket, setAgeBucket] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    if (!user) return
    if (!gender || !ageBucket) {
      setErr('Age group and gender are required.')
      return
    }
    setSaving(true)
    setErr('')
    const { error } = await supabase.from('users').update({
      gender,
      age_bucket: ageBucket,
    }).eq('id', user.id)
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    window.location.assign('/app/dashboard/my-body')
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Finish your profile" subtitle="Age group and gender help us interpret your ROM scores" />
      <SectionCard title="Required details">
        <div className="space-y-4">
          <div className="rounded-card border border-cobalt/30 bg-cobalt-light px-4 py-3 text-sm text-cobalt-ink">
            <p className="font-semibold">One-time setup</p>
            <p className="text-xs text-slate-600 mt-1">Required once, then you are set. Same fields live in Settings later.</p>
          </div>

          <div>
            <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gender <span className="normal-case font-normal text-slate-400">(required)</span></p>
            <div className="flex gap-2 flex-wrap">
              {GENDERS.map(g => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGender(g.v)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    gender === g.v
                      ? 'bg-cobalt text-white'
                      : 'bg-white text-cobalt-ink border border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Age group <span className="normal-case font-normal text-slate-400">(required)</span></label>
            <select value={ageBucket} onChange={e => setAgeBucket(e.target.value)} className="input" required>
              <option value="">Select...</option>
              {AGE_BUCKETS.map(b => (<option key={b.v} value={b.v}>{b.l}</option>))}
            </select>
          </div>

          {err && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{err}</p>}
          <button onClick={handleSave} disabled={saving || !gender || !ageBucket} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save and continue
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
