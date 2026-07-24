import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { AuthCallback } from './pages/AuthCallback'
import { AuthConfirm } from './pages/AuthConfirm'
import { Signup } from './pages/Signup'
import { Assessment } from './pages/Assessment'
import { ResultsPreview } from './pages/ResultsPreview'
import { Unlock } from './pages/Unlock'
import { Unsubscribe } from './pages/Unsubscribe'
import { MyBody } from './pages/MyBody'
import { MyProtocol } from './pages/MyProtocol'
import { MySport } from './pages/MySport'
import { ROMBot } from './pages/ROMBot'
import { Settings } from './pages/Settings'

// Sport intent supported by the shared Base signup. Only these values are carried
// as ?add= so a stale or guessed /app/signup/:sport can never inject arbitrary text.
const KNOWN_SPORTS = new Set(['bjj', 'bodybuilding'])

// Stale/guessable /app/signup/:sport links (e.g. /app/signup/bjj) used to fall
// through to nothing and render a blank screen. Canonicalize them onto the shared
// Base signup, preserving a recognized sport as ?add=<sport> and dropping anything else.
function SignupSportRedirect() {
  const { sport } = useParams<{ sport: string }>()
  const key = (sport ?? '').toLowerCase()
  const to = KNOWN_SPORTS.has(key) ? `/signup?add=${encodeURIComponent(key)}` : '/signup'
  return <Navigate to={to} replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/:sport" element={<SignupSportRedirect />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/onboarding/assessment" element={<Assessment />} />
        <Route path="/onboarding/results" element={<ResultsPreview />} />
        <Route path="/unlock/:token" element={<Unlock />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />

        {/* / is handled by Netlify rewrite to the marketing site - this catches any edge case */}
        <Route path="/" element={null} />

        {/* Protected dashboard routes under /dashboard/* */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Navigate to="/dashboard/my-body" replace />} />
            <Route path="/dashboard/my-body" element={<MyBody />} />
            <Route path="/dashboard/my-protocol" element={<MyProtocol />} />
            <Route path="/dashboard/my-sport" element={<MySport />} />
            <Route path="/dashboard/rombot" element={<ROMBot />} />
            <Route path="/dashboard/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Legacy redirects - old /my-body etc. -> /dashboard/my-body */}
        <Route path="/my-body" element={<Navigate to="/dashboard/my-body" replace />} />
        <Route path="/my-protocol" element={<Navigate to="/dashboard/my-protocol" replace />} />
        <Route path="/my-sport" element={<Navigate to="/dashboard/my-sport" replace />} />
        <Route path="/chat" element={<Navigate to="/dashboard/rombot" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />

        {/* Unknown /app/* paths: never a blank screen. Route to /login, which sends
            authenticated users on to /dashboard/my-body and everyone else to sign in,
            so a stale link can't strand or reset a logged-in user. */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
