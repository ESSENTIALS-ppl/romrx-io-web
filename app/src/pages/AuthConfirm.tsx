import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { completeAuthFromUrl } from '../lib/authRedirect'

// Handles the Supabase magic-link / signup confirmation redirect at
// /app/auth/confirm. Accepts token_hash (PKCE verify), code (PKCE), and hash
// tokens (implicit) so any link format establishes a session.
export function AuthConfirm() {
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    completeAuthFromUrl().then(async ({ ok, next, lead }) => {
      if (!active) return
      if (!ok) {
        navigate('/login?error=link_expired', { replace: true })
        return
      }

      if (lead) {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          await supabase
            .from('leads')
            .update({ converted_user_id: data.user.id, converted_at: new Date().toISOString() })
            .eq('unlock_token', lead)
        }
      }

      navigate(next ?? '/dashboard/my-body', { replace: true })
    })

    return () => { active = false }
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
