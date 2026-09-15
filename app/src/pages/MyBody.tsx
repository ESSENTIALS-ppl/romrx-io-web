import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { Activity, TrendingUp } from 'lucide-react'

export function MyBody() {
  const { user } = useAuth()
  const { assessment, assessments, loading } = useProfile(user?.id)
  if (loading) return <Spinner />
  if (!assessment) {
    return (
      <EmptyState
        icon={Activity}
        title="No assessment on file"
        description="Complete your ROM self-assessment to see your body map and joint breakdown."
        action={<Link to="/onboarding/assessment" className="btn-primary text-sm">Get started</Link>}
      />
    )
  }
  const oneShot = (assessments?.length ?? 1) === 1
  return (
    <div className="space-y-5">
      {oneShot && (
        <div className="flex items-start gap-3 rounded-card border border-cobalt/20 bg-cobalt-light p-4">
          <TrendingUp size={18} className="text-cobalt mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cobalt-ink">Want to see how your ROM is changing?</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You have one assessment on file. A second snapshot unlocks progress tracking on this page.
            </p>
            <Link to="/onboarding/assessment" className="inline-block mt-2 text-xs font-semibold text-cobalt hover:underline">
              Reassess when ready
            </Link>
          </div>
        </div>
      )}
      <EmptyState
        icon={Activity}
        title="Your ROM snapshot is on file"
        description="Open a reassessment when you want a second reading. Protocol and fuel stay in the tabs above."
        action={<Link to="/onboarding/assessment" className="btn-primary text-sm">Reassess when ready</Link>}
      />
    </div>
  )
}
