import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { clearAllMirrors } from '../lib/assessmentDraft'

// Sign out removes every saved-progress copy on this device (Stacy Oct 28: per-user key, cleared on sign out).
const clearDraftMirrors = () => { try { clearAllMirrors(window.localStorage) } catch { /* no storage */ } }

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') clearDraftMirrors()
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = () => { clearDraftMirrors(); return supabase.auth.signOut() }

  return { session, user, loading, signOut }
}
