import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute({ user, loading }) {
  if (loading) return <div className="loading-screen">Loading your conversations...</div>
  return user ? <Outlet /> : <Navigate to="/" replace />
}