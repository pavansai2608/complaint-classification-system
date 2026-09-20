import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../utils/roles'

function Home() {
  const [serverStatus, setServerStatus] = useState('checking')
  const { user, ready } = useAuth()

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Bad response'))))
      .then((data) => setServerStatus(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setServerStatus('down'))
  }, [])

  // A logged-in visitor lands on their own role page instead of this
  // logged-out landing page.
  if (ready && user) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

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
        <span className="status-pill">
          <span className={`status-dot ${serverStatus}`} aria-hidden="true" />
          Server status: <strong data-testid="server-status">{serverStatus}</strong>
        </span>

        <h1>Complaint Resolution System</h1>
        <p className="lede">
          Raise a complaint, track where it stands, and get a resolution — all from one place.
        </p>

        {ready && !user && (
          <div className="home-actions">
            <Link to="/login" className="btn-primary-link">
              Log in
            </Link>
            <Link to="/register" className="btn-secondary">
              create an account
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default Home
