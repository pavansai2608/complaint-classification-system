import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

function MyComplaints() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/api/complaints/mine')
      .then((res) => {
        if (!cancelled) setComplaints(res.data.complaints)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your complaints. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const showEmpty = !loading && !error && complaints.length === 0

  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/customer" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </Link>
        <Link to="/about" className="top-bar-about-link">
          About
        </Link>
      </header>

      <main className="home-hero">
        <h1>Your complaints</h1>
        <p className="lede">Track the status of everything you&rsquo;ve submitted.</p>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {loading && <LoadingSpinner label="Loading your complaints..." />}

        {showEmpty && (
          <EmptyState
            message="You haven’t submitted any complaints yet."
            actionLabel="Submit a complaint"
            actionTo="/complaints/new"
          />
        )}

        {complaints.length > 0 && (
          <ul className="complaint-list">
            {complaints.map((complaint) => (
              <li key={complaint._id || complaint.id}>
                <Link to={`/complaints/${complaint._id || complaint.id}`} className="complaint-card">
                  <span className="complaint-card-title">{complaint.title}</span>
                  <StatusBadge status={complaint.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!showEmpty && (
          <div className="home-actions">
            <Link to="/complaints/new" className="btn-primary-link">
              Submit a complaint
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

export default MyComplaints
