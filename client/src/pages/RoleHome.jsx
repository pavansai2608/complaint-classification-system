import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_CONTENT = {
  customer: {
    title: 'Your complaints',
    lede: 'Submit a new complaint and track the status of the ones you’ve already raised.',
  },
  agent: {
    title: 'Priority queue',
    lede: 'Review complaints sorted by priority, check the AI analysis, and send replies.',
  },
  admin: {
    title: 'Admin dashboard',
    lede: 'See complaint trends across the team and manage user accounts and roles.',
  },
}

function RoleHome() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const content = ROLE_CONTENT[user.role]
  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?'
  const complaintSubmitted = Boolean(location.state?.complaintSubmitted)

  return (
    <div className="page">
      <header className="top-bar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </span>
      </header>

      <main className="home-hero">
        <h1>{content.title}</h1>
        <p className="lede">{content.lede}</p>

        {complaintSubmitted && (
          <p className="status-pill" role="status">
            <span className="status-dot ok" aria-hidden="true" />
            Complaint submitted
          </p>
        )}

        <div className="home-actions">
          {user.role === 'customer' && (
            <>
              <Link to="/complaints/new" className="btn-primary-link">
                Submit a complaint
              </Link>
              <Link to="/complaints" className="btn-secondary">
                View my complaints
              </Link>
            </>
          )}
          <span className="user-chip">
            <span className="user-chip-avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-chip-text">
              <span className="user-chip-name">
                Logged in as {user.name} ({user.role})
              </span>
            </span>
          </span>
          <button type="button" className="btn-secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </main>
    </div>
  )
}

export default RoleHome
