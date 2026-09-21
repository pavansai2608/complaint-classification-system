import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'

function statusClass(status) {
  return `complaint-status complaint-status-${status.toLowerCase().replace(/\s+/g, '-')}`
}

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
            <p className={statusClass(complaint.status)}>{complaint.status}</p>
            <p className="lede">{complaint.description}</p>
            {complaint.orderReference && (
              <p className="lede">Order reference: {complaint.orderReference}</p>
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
