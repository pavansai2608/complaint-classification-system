import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../api/client'

function statusClass(status) {
  return `complaint-status complaint-status-${status.toLowerCase().replace(/\s+/g, '-')}`
}

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

  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/customer" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
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

        {!loading && !error && complaints.length === 0 && (
          <p className="lede">You haven&rsquo;t submitted any complaints yet.</p>
        )}

        {complaints.length > 0 && (
          <ul className="complaint-list">
            {complaints.map((complaint) => (
              <li key={complaint._id || complaint.id}>
                <Link to={`/complaints/${complaint._id || complaint.id}`} className="complaint-card">
                  <span className="complaint-card-title">{complaint.title}</span>
                  <span className={statusClass(complaint.status)}>{complaint.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="home-actions">
          <Link to="/complaints/new" className="btn-primary-link">
            Submit a complaint
          </Link>
        </div>
      </main>
    </div>
  )
}

export default MyComplaints
