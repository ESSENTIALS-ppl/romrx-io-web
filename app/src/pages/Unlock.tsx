import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`

// Maps sport slugs (as used in MySport.tsx "Add a sport" cards) to their
// Stripe price IDs. TODO(phase1): replace placeholders with real Stripe
// price IDs once the sport-pack products are created in Stripe.
const SPORT_PRICE_IDS: Record<string, string> = {
  bjj: 'price_bjj_annual_placeholder',
  bodybuilding: 'price_bodybuilding_annual_placeholder',
}

export function Unlock() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'redirecting' | 'error'>('redirecting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Missing unlock token.'); return }

    const priceId = SPORT_PRICE_IDS[token] ?? null

    ;(async () => {
      try {
        const res = await fetch(CHECKOUT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token, price_id: priceId, mode: 'unlock' }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
        setStatus('error')
        setMessage(data.error ?? 'This unlock link is invalid or has expired.')
      } catch {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      }
    })()
  }, [token])

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
