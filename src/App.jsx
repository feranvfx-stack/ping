import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/Landing'
import AppShell from './pages/AppShell'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

export default function App() {
  const auth = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage auth={auth} />} />
        <Route element={<ProtectedRoute user={auth.user} loading={auth.loading} />}>
          <Route path="/app" element={<AppShell auth={auth} />} />
          <Route path="/app/:conversationId" element={<AppShell auth={auth} />} />
          <Route path="/settings" element={<Settings auth={auth} />} />
        </Route>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
