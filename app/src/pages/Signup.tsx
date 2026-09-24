import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, UserPlus, Mail } from 'lucide-react'
import { track } from '../lib/track'
import { trackMetaLead } from '../lib/metaAttribution'
import { captureUtmFromUrl, getSignupAttribution } from '../lib/utm'
import { cn } from '../lib/cn'
import { DoNotSellLink } from '../components/ConsentBanner'

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

export function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const leadToken = searchParams.get('lead')
  const leadEmail = searchParams.get('email')
  const leadName = searchParams.get('name')
  // ?add= may have been removed from the address bar before the Meta PageView
  // (router still has it in memory; sessionStorage covers a reload).
  const addSport = searchParams.get('add') ?? (() => {
    try { return sessionStorage.getItem('romrx.signup.add') } catch { return null }
  })()
  const sportKey = (addSport ?? '').toLowerCase()
  const SPORT_PROTOCOL_LABELS: Record<string, string> = {
    bjj: 'Position Readiness Protocol\u2122 by ROMRx+BJJ',
    bodybuilding: 'Exercise Readiness Protocol\u2122 by ROMRx+BodyBuilding',
  }
  const protocolLabel = SPORT_PROTOCOL_LABELS[sportKey] ?? 'Finally, a mobility program customized for you.'
  const assessmentDest = `/onboarding/assessment${addSport ? `?add=${encodeURIComponent(addSport)}` : ''}`
  const nextDest = leadToken ? `/unlock/${leadToken}` : assessmentDest
  const [email, setEmail] = useState(leadEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fullName, setFullName] = useState(leadName ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [gender, setGender] = useState('')
  const [ageBucket, setAgeBucket] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!agreedToTerms) { setError('You must agree to the Terms of Service to continue.'); return }
    if (!ageBucket) { setError('Age group is required.'); return }
    setLoading(true); setError('')
    captureUtmFromUrl()
    const { signup_source, meta: utmMeta } = getSignupAttribution()
    track('signup_submitted', {
      sport_intent: addSport ?? 'general',
      has_lead_token: !!leadToken,
      signup_source,
      ...(utmMeta.utm_campaign ? { utm_campaign: utmMeta.utm_campaign } : {}),
      ...(utmMeta.utm_medium ? { utm_medium: utmMeta.utm_medium } : {}),
    })

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          signup_source,
          age_bucket: ageBucket,
          ...(gender ? { gender } : {}),
          ...utmMeta,
          ...(addSport ? { add_sport: addSport } : {}),
        },
        emailRedirectTo: `${window.location.origin}/app/auth/confirm?next=${encodeURIComponent(nextDest)}${leadToken ? `&lead=${encodeURIComponent(leadToken)}` : ''}`,
      },
    })

    if (signUpErr) {
      const msg = signUpErr.message || (signUpErr as any).error_description || JSON.stringify(signUpErr)
      setError(msg && msg !== '{}' ? msg : 'Signup failed. This email may already be registered - try signing in instead.')
      setLoading(false)
      return
    }

    if (data.session && data.user) {
      const utmPatch: Record<string, string> = { signup_source }
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
        if (utmMeta[k]) utmPatch[k] = utmMeta[k]
      }
      const { error: demoErr } = await supabase.from('users').update({
        age_bucket: ageBucket,
        gender: gender || null,
        ...utmPatch,
      }).eq('id', data.user.id)
      if (demoErr && import.meta.env.DEV) console.warn('[signup] demographics/utm update', demoErr.message)
      trackMetaLead()
      navigate(nextDest, { replace: true })
      return
    }

    if (data.user) {
      trackMetaLead()
      setCheckEmail(true)
      setLoading(false)
      return
    }

    setLoading(false)
    setError('Something went wrong. Please try again.')
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <Mail size={30} className="text-cobalt" />
          </div>
          <h1 className="font-display font-bold text-cobalt-ink text-xl">Confirm your email</h1>
          <p className="text-sm text-slate-500">
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your
            account and start your free ROM assessment.
          </p>
          <div className="pt-4"><DoNotSellLink /></div>
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
          <p className="text-slate-500 text-sm mt-1">Finally, a mobility program customized for you.</p>
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

          <div>
            <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gender <span className="normal-case font-normal text-slate-400">(optional)</span></p>
            <div className="flex gap-2 flex-wrap">
              {GENDERS.map(g => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGender(gender === g.v ? '' : g.v)}
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

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-cobalt/20 accent-cobalt shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-500 leading-relaxed">
              I have read and agree to the ROMRx LLC{' '}
              <a href="https://romrx.io/legal" target="_blank" rel="noopener noreferrer" className="text-cobalt underline font-medium">
                Terms of Service, Privacy Policy & Refund Policy
              </a>
              , a company-wide agreement with ROMRx LLC covering ROMRx Base, ROMRx+BJJ, ROMRx+BodyBuilding, and other ROMRx products, including the collection and anonymized use of my ROM data for research and product development. All sales are final.
            </span>
          </label>

          {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || !agreedToTerms || !ageBucket} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Create account & start assessment
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-cobalt underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-6">{protocolLabel}</p>
        <div className="text-center mt-4"><DoNotSellLink /></div>
      </div>
    </div>
  )
}
