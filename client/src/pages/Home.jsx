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

  return (
    <main className="app">
      <h1>Complaint Resolution System</h1>
      <p>
        Server status: <strong data-testid="server-status">{serverStatus}</strong>
      </p>

      {ready && user && (
        <>
          <p>
            Logged in as {user.name} ({user.role})
          </p>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </>
      )}

      {ready && !user && (
        <p>
          <Link to="/login">Log in</Link> or <Link to="/register">create an account</Link>
        </p>
      )}
    </main>
  )
}

export default Home
