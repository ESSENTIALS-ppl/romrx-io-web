import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, UserPlus, Mail } from 'lucide-react'

export function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadToken = searchParams.get('lead')
  const leadEmail = searchParams.get('email')
  const leadName = searchParams.get('name')
  // Sport intent from the +sport landing pages (/app/signup?add=bjj|bodybuilding).
  // Carried through email confirmation so the sport apps (consumers of the shared
  // Supabase identity) can pick it up later. The base assessment is always the
  // first destination regardless of sport intent.
  const addSport = searchParams.get('add')
  // Base is sport-neutral. When (and only when) the visitor arrived with a recognized
  // sport intent, we surface that sport's protocol label in the footer as text. We do
  // NOT pull in any sport-site visual branding here; this stays the shared Base signup.
  const sportKey = (addSport ?? '').toLowerCase()
  const SPORT_PROTOCOL_LABELS: Record<string, string> = {
    bjj: 'Position Readiness Protocol™ by ROMRx+BJJ',
    bodybuilding: 'Exercise Readiness Protocol™ by ROMRx+BodyBuilding',
  }
  const protocolLabel = SPORT_PROTOCOL_LABELS[sportKey] ?? 'Readiness Protocol™ by ROMRx'
  const assessmentDest = `/onboarding/assessment${addSport ? `?add=${encodeURIComponent(addSport)}` : ''}`
  // Brand-new accounts always start at assessment step one. Lead-unlock links keep
  // their /unlock/:token destination (that lead already assessed as an anon lead).
  const nextDest = leadToken ? `/unlock/${leadToken}` : assessmentDest
  const [email, setEmail] = useState(leadEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState(leadName ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

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
        // full_name, sport intent, and source land in raw_user_meta_data, where the
        // send-s1-welcome-email edge function reads them for the customer welcome email
        // and the best-effort internal jim@romrx.io signup alert.
        data: {
          full_name: fullName,
          signup_source: 'romrx.io',
          ...(addSport ? { add_sport: addSport } : {}),
        },
        // If email confirmation is enabled, this is where the confirmation link lands.
        // next carries the assessment destination so a confirmed new user starts at
        // assessment step one (not the paywalled dashboard).
        emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=${encodeURIComponent(nextDest)}${leadToken ? `&lead=${encodeURIComponent(leadToken)}` : ''}`,
      },
    })

    if (signUpErr) {
      const msg = signUpErr.message || (signUpErr as any).error_description || JSON.stringify(signUpErr)
      setError(msg && msg !== '{}' ? msg : 'Signup failed. This email may already be registered - try signing in instead.')
      setLoading(false)
      return
    }

    // The public.users row is created by the on_auth_user_created trigger
    // (handle_new_user). It defaults to base_status='inactive' - ProtectedRoute
    // blocks /dashboard/* until the Stripe webhook flips it after checkout. Do NOT
    // client-upsert here (no INSERT RLS policy on public.users; the trigger owns it).

    // Confirmation disabled: signUp returns a live session, so go straight to the
    // first assessment step now.
    if (data.session) {
      navigate(nextDest, { replace: true })
      return
    }

    // Confirmation enabled: the user row exists but there is no session yet. Supabase
    // has emailed a confirmation link (next -> assessment). Show a prompt rather than
    // dropping an unauthenticated user into the assessment as an anon lead.
    if (data.user) {
      setCheckEmail(true)
      setLoading(false)
      return
    }

    setLoading(false)
    setError('Something went wrong. Please try again.')
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <Mail size={30} className="text-cobalt" />
          </div>
          <h1 className="font-display font-bold text-cobalt-ink text-xl">Confirm your email</h1>
          <p className="text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
            account and start your free ROM assessment.
          </p>
          <p className="text-xs text-slate-500">
            Wrong email?{' '}
            <button type="button" onClick={() => setCheckEmail(false)} className="text-cobalt underline">
              Go back
            </button>
          </p>
        </div>
      </div>
    )
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
              readOnly={!!leadEmail}
              className={`input${leadEmail ? ' opacity-70 cursor-not-allowed' : ''}`}
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
        <p className="text-center text-xs text-slate-500 mt-6">{protocolLabel}</p>
      </div>
    </div>
  )
}
