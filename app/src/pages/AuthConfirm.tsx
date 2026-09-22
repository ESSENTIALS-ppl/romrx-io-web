import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { completeAuthFromUrl } from '../lib/authRedirect'
import { resolvePostAuthDest } from '../lib/postAuthDest'

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

      const { data } = await supabase.auth.getUser()
      if (data.user) {
        if (lead) {
          await supabase
            .from('leads')
            .update({ converted_user_id: data.user.id, converted_at: new Date().toISOString() })
            .eq('unlock_token', lead)
        }
        // Persist signup demographics + first-touch UTM into public.users (ops).
        const meta = data.user.user_metadata ?? {}
        const age_bucket = typeof meta.age_bucket === 'string' ? meta.age_bucket : null
        const gender = typeof meta.gender === 'string' ? meta.gender : null
        const str = (k: string) => (typeof meta[k] === 'string' && (meta[k] as string).trim() ? (meta[k] as string).trim() : null)
        const patch: Record<string, string> = {}
        if (age_bucket) patch.age_bucket = age_bucket
        if (gender) patch.gender = gender
        for (const k of ['signup_source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
          const v = str(k)
          if (v) patch[k] = v
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('users').update(patch).eq('id', data.user.id)
        }
      }

      const dest = await resolvePostAuthDest(data.user?.id, next)
      navigate(dest, { replace: true })
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
