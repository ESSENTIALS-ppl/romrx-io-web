import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Handles Supabase PKCE magic link: /auth/confirm?token_hash=...&type=email
export function AuthConfirm() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = params.get('type') as 'email' | 'recovery' | 'invite' | null

    const next = params.get('next')
    const leadToken = params.get('lead')

    if (token_hash && type) {
      supabase.auth.verifyOtp({ token_hash, type })
        .then(async ({ data, error }) => {
          if (error || !data.session) {
            console.error('Auth confirm error:', error?.message)
            navigate('/login?error=link_expired', { replace: true })
            return
          }

          const authedUser = data.session.user
          if (leadToken && authedUser) {
            await supabase.from('leads').update({ converted_user_id: authedUser.id, converted_at: new Date().toISOString() }).eq('unlock_token', leadToken)
          }

          navigate(next ?? '/dashboard/my-body', { replace: true })
        })
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-[3px] border-cobalt/30 border-t-cobalt rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Signing you in...</p>
      </div>
    </div>
  )
}
