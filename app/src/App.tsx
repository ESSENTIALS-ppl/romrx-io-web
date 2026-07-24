import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { MyFuel } from './pages/MyFuel'
import { MySport } from './pages/MySport'
import { ROMBot } from './pages/ROMBot'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
            <Route path="/dashboard/my-fuel" element={<MyFuel />} />
            <Route path="/dashboard/my-sport" element={<MySport />} />
            <Route path="/dashboard/rombot" element={<ROMBot />} />
            <Route path="/dashboard/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Legacy redirects - old /my-body etc. -> /dashboard/my-body */}
        <Route path="/my-body" element={<Navigate to="/dashboard/my-body" replace />} />
        <Route path="/my-protocol" element={<Navigate to="/dashboard/my-protocol" replace />} />
        <Route path="/my-fuel" element={<Navigate to="/dashboard/my-fuel" replace />} />
        <Route path="/my-sport" element={<Navigate to="/dashboard/my-sport" replace />} />
        <Route path="/chat" element={<Navigate to="/dashboard/rombot" replace />} />
        <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
