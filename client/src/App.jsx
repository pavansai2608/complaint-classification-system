import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [serverStatus, setServerStatus] = useState('checking')

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
    </main>
  )
}

export default App
