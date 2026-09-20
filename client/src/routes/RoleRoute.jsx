import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../utils/roles'

// Used inside a ProtectedRoute, so `user` is already known to exist here.
// A logged-in user with the wrong role is sent to their own home page
// instead of an error page, since they are allowed to use the app, just
// not this particular page.
function RoleRoute({ allow }) {
  const { user } = useAuth()

  if (!allow.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return <Outlet />
}

export default RoleRoute
