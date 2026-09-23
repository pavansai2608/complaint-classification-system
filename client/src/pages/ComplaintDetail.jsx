import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from '../components/StatusBadge'

function ComplaintDetail() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    apiClient
      .get(`/api/complaints/${id}`)
      .then((res) => {
        if (!cancelled) setComplaint(res.data.complaint)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.response?.status === 404) {
          setError('This complaint could not be found.')
        } else {
          setError('Could not load this complaint. Please try again.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

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
        <Link to="/complaints" className="lede">
          &larr; Back to your complaints
        </Link>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {complaint && (
          <>
            <h1>{complaint.title}</h1>
            <div className="complaint-card-badges demo-badges">
              <StatusBadge status={complaint.status} />
              {complaint.priority && (
                <span className={`priority-badge priority-badge-${complaint.priority.toLowerCase()}`}>
                  {complaint.priority} priority
                </span>
              )}
            </div>
            <p className="lede">{complaint.description}</p>
            {complaint.orderReference && (
              <p className="lede">Order reference: {complaint.orderReference}</p>
            )}

            {!complaint.analysisPending && complaint.category && (
              <div className="ai-analysis">
                <p className="ai-analysis-label">Analyzed automatically when you submitted this</p>
                <p>
                  <strong>Category:</strong> {complaint.category}
                </p>
                <p>
                  <strong>Detected tone:</strong> {complaint.emotion?.label || 'neutral'}
                </p>
              </div>
            )}
            {complaint.analysisPending && (
              <p className="lede">We&rsquo;re still analyzing this complaint - an agent will pick it up shortly.</p>
            )}

            {complaint.agentReply && (
              <div className="agent-reply">
                <h2>Reply from support</h2>
                <p className="lede">{complaint.agentReply}</p>
              </div>
            )}
          </>
        )}

        {!loading && !error && !complaint && (
          <p className="lede">This complaint could not be found.</p>
        )}
      </main>
    </div>
  )
}

export default ComplaintDetail
