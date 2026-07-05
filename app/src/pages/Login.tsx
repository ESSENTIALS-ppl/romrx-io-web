import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react'

export function Login() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [cooldown, setCooldown] = useState(0) // seconds remaining

  useEffect(() => {
    if (session) navigate('/dashboard/my-body', { replace: true })
  }, [session, navigate])

  // Restore cooldown from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('romrx_magic_sent_at')
    if (stored) {
      const secondsLeft = 60 - Math.floor((Date.now() - Number(stored)) / 1000)
      if (secondsLeft > 0) setCooldown(secondsLeft)
    }
  }, [])

  // Count down the cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // ---- Email + password sign-in ----
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : err.message)
    }
    // success -> useEffect above handles redirect via session change
  }

  // ---- Magic link fallback ----
  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || cooldown > 0) return
    setLoading(true); setError('')

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })
    setLoading(false)
    if (err) {
      setError(err.message.includes('rate') || err.message.includes('many')
        ? 'Too many attempts. Wait a minute and try again, or use your password instead.'
        : err.message)
    } else {
      setMagicSent(true)
      // Set 60-second cooldown, persisted in localStorage so page refresh doesn't bypass it
      localStorage.setItem('romrx_magic_sent_at', String(Date.now()))
      setCooldown(60)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-cobalt text-3xl">ROMRx</h1>
          <p className="text-slate-500 text-sm mt-1">Athlete Dashboard</p>
        </div>

        <div className="card p-6">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-surface rounded-card p-1 mb-5">
            <button
              onClick={() => { setMode('password'); setError('') }}
              className={`flex-1 py-1.5 rounded-card text-sm font-medium transition-all ${
                mode === 'password' ? 'bg-white text-cobalt shadow-sm' : 'text-slate-500 hover:text-cobalt-ink'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => { setMode('magic'); setError(''); setMagicSent(false) }}
              className={`flex-1 py-1.5 rounded-card text-sm font-medium transition-all ${
                mode === 'magic' ? 'bg-white text-cobalt shadow-sm' : 'text-slate-500 hover:text-cobalt-ink'
              }`}
            >
              Magic link
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cobalt">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                Sign in
              </button>

              <div className="flex items-center justify-between">
                <button type="button"
                  onClick={() => { setMode('magic'); setError(''); setMagicSent(false) }}
                  className="text-xs text-cobalt underline">
                  Forgot password?
                </button>
                <button type="button"
                  onClick={() => { setMode('magic'); setError(''); setMagicSent(false) }}
                  className="text-xs text-slate-500 underline">
                  Use magic link
                </button>
              </div>
            </form>
          ) : magicSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-cobalt-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail size={22} className="text-cobalt" />
              </div>
              <h2 className="font-display font-bold text-base text-cobalt-ink mb-1">Check your email</h2>
              <p className="text-sm text-slate-500">Link sent to <strong>{email}</strong></p>
              <button onClick={() => { setMagicSent(false); setMode('password') }}
                className="mt-4 text-cobalt text-xs underline">
                Use password instead
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                  className="input"
                />
              </div>

              {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <button type="submit" disabled={loading || cooldown > 0} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send magic link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          New athlete?{' '}
          <Link to="/signup" className="text-cobalt underline">Create an account</Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-3">Position Readiness Protocol™ by ROMRx</p>
      </div>
    </div>
  )
}
