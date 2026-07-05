import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

// Only 'active' grants access to /dashboard/*. base_status is set to 'active'
// exclusively by the Stripe webhook once the base subscription checkout
// completes. Never seed 'active' (or 'trialing') client-side at signup - see
// Signup.tsx, which always seeds base_status='inactive'.
export function ProtectedRoute() {
  const { session, user, loading } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)

  if (loading || (session && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cobalt border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Don't redirect if URL contains Supabase auth tokens - let AuthCallback handle it
  const hasAuthToken = window.location.hash.includes('access_token') ||
                       window.location.search.includes('code=')
  if (hasAuthToken) return null

  if (!session) return <Navigate to="/login" replace />

  // Paywall gate. Anyone whose base_status is not 'active' (e.g. 'inactive',
  // 'past_due', 'canceled', undefined) gets routed to the assessment/checkout
  // flow instead of the dashboard.
  if (profile && profile.base_status !== 'active') {
    return <Navigate to="/onboarding/results" replace />
  }

  return <Outlet />
}
