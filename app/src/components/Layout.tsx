import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { cn } from '../lib/cn'
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

  // Tiny data-first gate: age_bucket + gender must be set before other dashboard pages.
  // Settings remains reachable so the user can complete the profile. No new schema.
  const demo = profile as { age_bucket?: string | null; gender?: string | null } | null
  const needsDemographics = !!profile && (!demo?.age_bucket || !demo?.gender)
  const onSettings = location.pathname.startsWith('/dashboard/settings')
  if (!profileLoading && needsDemographics && !onSettings) {
    return <Navigate to="/dashboard/settings?complete=profile" replace />
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top nav */}
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

      {/* Page content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
