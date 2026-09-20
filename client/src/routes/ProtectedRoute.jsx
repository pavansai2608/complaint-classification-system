import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Blocks a route until the silent-refresh check on page load has finished,
// so a logged-in user refreshing the page isn't bounced to /login for a
// moment before their session comes back.
function ProtectedRoute() {
  const { user, ready } = useAuth()

  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}

export default ProtectedRoute
