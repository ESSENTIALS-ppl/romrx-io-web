import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { scoreToTier, tierLabel } from '../lib/tier'
import { STEPS } from './assessmentSteps'
import { AssessmentPhases } from './AssessmentPhases'

// Authenticated Base HQ → submit-assessment (great-job). Lead path unchanged.
const SUBMIT_ASSESSMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-assessment`
const SUBMIT_LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead-assessment`

export function Assessment() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'setup' | 'measure' | 'lead' | 'done' | 'lead-done'>('setup')
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (key: string, val: string) => setValues(p => ({ ...p, [key]: val }))

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (session) {
      submit()
    } else {
      setPhase('lead')
    }
  }

  function computeAssessmentData() {
    const data: Record<string, number | null> = {}
    for (const [k, v] of Object.entries(values)) {
      data[k] = v === '' ? null : parseFloat(v)
    }
    return data
  }

  const submit = async (leadEmail?: string, leadName?: string) => {
    setLoading(true); setError('')
    const assessment_data = computeAssessmentData()

    // Logged-in Base HQ path: same edge as sport apps (insert + great-job email).
    // Payload is flat ROM fields; submit-assessment reads active_sport for brand.
    if (session) {
      if (!session.access_token) {
        setLoading(false)
        setError('Session expired - please sign in again.')
        return
      }
      try {
        const res = await fetch(SUBMIT_ASSESSMENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(assessment_data),
        })
        const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
        setLoading(false)
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Submission failed (HTTP ${res.status}). Please try again.`)
          return
        }
        setPhase('done')
        setTimeout(() => navigate('/onboarding/results', { replace: true }), 2000)
      } catch {
        setLoading(false)
        setError('Something went wrong. Please try again.')
      }
      return
    }

    // Unauthenticated lead capture (marketing funnel) — keep lead edge.
    const prs_score = 100 // TODO(phase1): server computes authoritative PRS; client sends raw data only.
    const body: Record<string, unknown> = {
      assessment_data,
      prs_score,
      tier: tierLabel(scoreToTier(prs_score)),
      email: leadEmail,
      full_name: leadName,
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    }

    try {
      const res = await fetch(SUBMIT_LEAD_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      setLoading(false)
      if (!data.ok) { setError(data.error ?? 'Submission failed. Please try again.'); return }
      setPhase('lead-done')
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  const handleLeadSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    submit(email, fullName)
  }

  return (
    <AssessmentPhases
      phase={phase}
      stepIdx={stepIdx}
      values={values}
      email={email}
      fullName={fullName}
      loading={loading}
      error={error}
      setPhase={setPhase}
      setStepIdx={setStepIdx}
      setEmail={setEmail}
      setFullName={setFullName}
      handleChange={handleChange}
      handleNext={handleNext}
      handleLeadSubmit={handleLeadSubmit}
    />
  )
}
