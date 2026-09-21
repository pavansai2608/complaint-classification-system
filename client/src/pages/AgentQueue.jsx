import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import apiClient from '../api/client'
import PriorityBadge from '../components/PriorityBadge'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

function AgentQueue() {
  const location = useLocation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const replySent = Boolean(location.state?.replySent)

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/api/agent/queue')
      .then((res) => {
        if (!cancelled) setItems(res.data.items)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the queue. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/agent" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </Link>
      </header>

      <main className="home-hero">
        <Link to="/agent" className="lede">
          &larr; Back to dashboard
        </Link>

        <h1>Priority queue</h1>
        <p className="lede">Open complaints, highest priority first.</p>

        {replySent && (
          <p className="status-pill" role="status">
            <span className="status-dot ok" aria-hidden="true" />
            Reply sent and complaint resolved
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {loading && <LoadingSpinner label="Loading the queue..." />}

        {!loading && !error && items.length === 0 && <EmptyState message="The queue is empty." />}

        {items.length > 0 && (
          <ul className="complaint-list">
            {items.map((item) => (
              <li key={item._id}>
                <Link to={`/agent/complaints/${item._id}`} className="complaint-card">
                  <span className="complaint-card-title">{item.title}</span>
                  <span className="complaint-card-badges">
                    <PriorityBadge priority={item.priority} />
                    <StatusBadge status={item.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default AgentQueue
