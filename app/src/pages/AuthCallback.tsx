import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { completeAuthFromUrl } from '../lib/authRedirect'

// Handles the Supabase magic-link redirect at /app/auth/callback. Kept fully
// functional alongside AuthConfirm so links pointing at either path succeed,
// including any old links already sent to users.
export function AuthCallback() {
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
        <div className="w-10 h-10 border-4 border-cobalt border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Signing you in...</p>
      </div>
    </div>
  )
}
