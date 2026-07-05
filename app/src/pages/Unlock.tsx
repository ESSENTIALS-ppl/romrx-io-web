import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CHECKOUT_URL, SPORT_PRICE_IDS } from '../lib/stripe'

export function Unlock() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'redirecting' | 'error'>('redirecting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Missing unlock token.'); return }
    if (authLoading) return

    // Is this a sport slug (existing path)?
    const isSportSlug = token === 'bjj' || token === 'bodybuilding'

    ;(async () => {
      try {
        if (isSportSlug) {
          // Existing convenience path - handle as sport unlock
          const priceId = SPORT_PRICE_IDS[token] ?? null

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          }
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

          const res = await fetch(CHECKOUT_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ token, price_id: priceId, mode: 'unlock' }),
          })
          const data = await res.json()

          if (res.status === 409 && data.error === 'base_required') {
            if (!user) {
              navigate(`/login?next=/unlock/${token}`)
              return
            }
            const baseRes = await fetch(CHECKOUT_URL, {
              method: 'POST',
              headers,
              body: JSON.stringify({ mode: 'base', user_id: user.id, email: user.email }),
            })
            const baseData = await baseRes.json()
            if (baseData.url) {
              window.location.href = baseData.url
              return
            }
            setStatus('error')
            setMessage(baseData.error ?? 'Could not start Base checkout.')
            return
          }

          if (data.url) {
            window.location.href = data.url
            return
          }
          setStatus('error')
          setMessage(data.error ?? 'This unlock link is invalid or has expired.')
          return
        }

        // NEW: treat as lead UUID
        // Look up the leads row
        const { data: lead, error: leadErr } = await supabase
          .from('leads')
          .select('id, email, full_name, prs_score, tier')
          .eq('unlock_token', token)
          .maybeSingle()

        if (leadErr || !lead) {
          setStatus('error'); setMessage('This unlock link is invalid or has expired.'); return
        }

        // If not signed in: bounce to signup with lead context
        if (!user) {
          // Encode the lead's email so Signup can pre-fill and mark the account as coming from this lead
          const params = new URLSearchParams({
            lead: token,
            email: lead.email,
            name: lead.full_name ?? '',
          })
          navigate(`/signup?${params.toString()}`)
          return
        }

        // Signed in: claim lead (copies assessment_data + marks converted)
        // and start Base checkout in one edge fn call.
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        }
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

        const res = await fetch(CHECKOUT_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: 'base',
            user_id: user.id,
            email: user.email,
            lead_token: token,
          }),
        })

        let data: { url?: string; error?: string; message?: string } = {}
        try { data = await res.json() } catch { /* non-JSON body */ }

        if (data.url) {
          window.location.href = data.url
          return
        }
        setStatus('error')
        setMessage(data.message || data.error || `Could not start Base checkout (HTTP ${res.status}).`)
      } catch (e) {
        setStatus('error')
        setMessage((e as Error)?.message || 'Something went wrong. Please try again.')
      }
    })()
  }, [token, authLoading, user, navigate])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="w-14 h-14 bg-red-50 rounded-card flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-700" />
          </div>
          <h1 className="font-display font-bold text-lg text-cobalt-ink">Link invalid or expired</h1>
          <p className="text-sm text-slate-500">{message}</p>
          <Link to="/onboarding/assessment" className="btn-primary inline-flex">Retake assessment</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Redirecting to secure checkout...</p>
      </div>
    </div>
  )
}
