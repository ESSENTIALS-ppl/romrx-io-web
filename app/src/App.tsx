import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { PageViewTracker } from './components/PageViewTracker'
import { ConsentBanner } from './components/ConsentBanner'
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
import { MyFuel } from './pages/MyFuel'
import { MySport } from './pages/MySport'
import { ROMBot } from './pages/ROMBot'
import { Settings } from './pages/Settings'
import { CompleteProfile } from './pages/CompleteProfile'

import { signupSportRedirectTarget } from './lib/signupRedirect'

function SignupSportRedirect() {
  const { sport } = useParams<{ sport: string }>()
  const { search, hash } = useLocation()
  // Keep utm_* / fbclid so Meta click matching (_fbc) survives the hop.
  return <Navigate to={signupSportRedirectTarget(sport, search, hash)} replace />
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <PageViewTracker />
      <ConsentBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/:sport" element={<SignupSportRedirect />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/onboarding/assessment" element={<Assessment />} />
        <Route path="/onboarding/results" element={<ResultsPreview />} />
        <Route path="/unlock/:token" element={<Unlock />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />

        <Route path="/" element={null} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Navigate to="/dashboard/my-body" replace />} />
            <Route path="/dashboard/my-body" element={<MyBody />} />
            <Route path="/dashboard/my-protocol" element={<MyProtocol />} />
            <Route path="/dashboard/my-fuel" element={<MyFuel />} />
            <Route path="/dashboard/my-sport" element={<MySport />} />
            <Route path="/dashboard/rombot" element={<ROMBot />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/complete-profile" element={<CompleteProfile />} />
          </Route>
        </Route>

        <Route path="/my-body" element={<Navigate to="/dashboard/my-body" replace />} />
        <Route path="/my-protocol" element={<Navigate to="/dashboard/my-protocol" replace />} />
        <Route path="/my-fuel" element={<Navigate to="/dashboard/my-fuel" replace />} />
        <Route path="/my-sport" element={<Navigate to="/dashboard/my-sport" replace />} />
        <Route path="/chat" element={<Navigate to="/dashboard/rombot" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
