import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { cn } from '../lib/cn'
import { FuelCalculateTracker } from './FuelCalculateTracker'
import { DoNotSellLink } from './ConsentBanner'
import { Dumbbell, ClipboardList, Apple, Trophy, MessageSquare, Settings, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

const NAV: NavItem[] = [
  { to: '/dashboard/my-body', icon: Dumbbell, label: 'My Body' },
  { to: '/dashboard/my-protocol', icon: ClipboardList, label: 'My Protocol' },
  { to: '/dashboard/my-fuel', icon: Apple, label: 'My Fuel' },
  { to: '/dashboard/my-sport', icon: Trophy, label: 'My Sport' },
  { to: '/dashboard/rombot', icon: MessageSquare, label: 'ROMBot' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.id)
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const demo = profile as { age_bucket?: string | null } | null
  // Gender is optional; only a missing age group routes to CompleteProfile.
  const needsDemographics = !!profile && !demo?.age_bucket
  const onGate = location.pathname.startsWith('/dashboard/complete-profile')
    || location.pathname.startsWith('/dashboard/settings')
  if (!profileLoading && needsDemographics && !onGate) {
    return <Navigate to="/dashboard/complete-profile" replace />
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <FuelCalculateTracker />
      <header className="sticky top-0 z-10 bg-white border-b border-cobalt/10">
        <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-1">
          <span className="font-display font-bold mr-4 text-base text-cobalt">
            ROMRx
          </span>
          <nav className="flex gap-1 flex-1 overflow-x-auto">
            {NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    isActive ? 'bg-cobalt text-white' : 'text-slate-500 hover:bg-cobalt-light hover:text-cobalt',
                  )
                }
              >
                <Icon size={14} />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={handleSignOut}
            className="ml-2 p-2 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-cobalt/10 py-4 px-4 text-center">
        <DoNotSellLink />
        <div className="mt-2 text-xs text-slate-400">
          <a href="https://romrx.io/legal#privacy" className="underline hover:text-slate-600">Privacy Policy</a>
        </div>
      </footer>
    </div>
  )
}
