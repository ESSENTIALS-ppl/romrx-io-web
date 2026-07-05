import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, UserPlus } from 'lucide-react'

export function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!agreedToTerms) { setError('You must agree to the Terms of Service to continue.'); return }
    setLoading(true); setError('')

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Upsert user profile row. Account is created 'pending' / 'inactive'.
      // The user must complete Stripe checkout from /onboarding/results
      // before ProtectedRoute will admit them to any /dashboard/* page.
      // Do NOT seed 'trialing' or 'active' here - that bypasses the paywall.
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        portal_role: 'athlete',
        subscription_status: 'pending',
        base_status: 'inactive',
        platforms: [],
        sports_enabled: [],
      }, { onConflict: 'id' })

      // TODO(phase1): no lib/terms.ts / recordConsent helper exists yet in the
      // HQ app. Re-add consent logging here once that helper is ported.

      navigate('/onboarding/assessment', { replace: true })
      return
    }

    setLoading(false)
    setError('Something went wrong. Please try again.')
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-cobalt text-3xl">ROMRx</h1>
          <p className="text-slate-500 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
            <input
              type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="First Last" required autoFocus
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters" required
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm password</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" required
              className="input"
            />
          </div>

          {/* Terms of Service checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-cobalt/20 accent-cobalt shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-500 leading-relaxed">
              I have read and agree to the{' '}
              <a href="/legal" target="_blank" rel="noopener noreferrer" className="text-cobalt underline font-medium">
                ROMRx LLC Terms of Service, Privacy Policy &amp; Refund Policy
              </a>
              {' '}- a company-wide agreement with ROMRx LLC (parent of ROMRx+BJJ, ROMRx+BodyBuilding, and other ROMRx products) - including the collection and anonymized use of my ROM data for research and product development. All sales are final.
            </span>
          </label>

          {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || !agreedToTerms} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Create account & start assessment
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-cobalt underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-6">Position Readiness Protocol™ by ROMRx</p>
      </div>
    </div>
  )
}
