import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Home() {
  const [serverStatus, setServerStatus] = useState('checking')
  const { user, ready, logout } = useAuth()

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Bad response'))))
      .then((data) => setServerStatus(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setServerStatus('down'))
  }, [])

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?'

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

        {ready && user && (
          <div className="home-actions">
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
        )}

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
