import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import StatusBadge from '../components/StatusBadge'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

function AgentComplaintDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [replyText, setReplyText] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    apiClient
      .get(`/api/complaints/${id}`)
      .then((res) => {
        if (cancelled) return
        const data = res.data.complaint
        setComplaint(data)
        setReplyText(data.suggestedReply || '')
        setCategory(data.category || '')
        setPriority(data.priority || 'Medium')
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.response?.status === 404 ? 'This complaint could not be found.' : 'Could not load this complaint.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await apiClient.post(`/api/complaints/${id}/reply`, {
        reply: replyText,
        category: category || undefined,
        priority,
      })
      setComplaint(res.data.complaint)
      navigate('/agent/queue', { state: { replySent: true } })
    } catch (err) {
      const apiError = err.response?.data?.error
      if (apiError?.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors = {}
        apiError.details.forEach((detail) => {
          errors[detail.field] = detail.message
        })
        setFieldErrors(errors)
        setSubmitError(apiError.message)
      } else {
        setSubmitError(apiError?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/agent" className="brand">
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
        <Link to="/agent/queue" className="lede">
          &larr; Back to queue
        </Link>

        {loadError && (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        )}

        {complaint && (
          <>
            <h1>{complaint.title}</h1>
            <div className="complaint-card-badges demo-badges">
              <StatusBadge status={complaint.status} />
              {complaint.priority && (
                <span className={`priority-badge priority-badge-${complaint.priority.toLowerCase()}`}>
                  {complaint.priority}
                </span>
              )}
            </div>
            <p className="lede">{complaint.description}</p>
            {complaint.orderReference && <p className="lede">Order reference: {complaint.orderReference}</p>}

            <div className="ai-analysis">
              <p>
                <strong>Category:</strong> {complaint.category || 'Not analyzed'}
              </p>
              <p>
                <strong>AI emotion:</strong>{' '}
                {complaint.emotion?.label ? `${complaint.emotion.label} (${complaint.emotion.score})` : 'Not analyzed'}
              </p>
              {complaint.analysisPending && (
                <p className="lede">AI analysis is still pending for this complaint - review and reply manually.</p>
              )}
              {complaint.wasCorrected && (
                <p className="lede">
                  Previously corrected from AI category &ldquo;{complaint.originalCategory || '—'}&rdquo; / priority
                  &ldquo;{complaint.originalPriority || '—'}&rdquo;.
                </p>
              )}
            </div>

            {complaint.status === 'Resolved' ? (
              <p className="lede">This complaint has already been resolved and replied to.</p>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.category)}
                  />
                  {fieldErrors.category && (
                    <p className="field-error" role="alert">
                      {fieldErrors.category}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="priority">Priority</label>
                  <select id="priority" name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                    {PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.priority && (
                    <p className="field-error" role="alert">
                      {fieldErrors.priority}
                    </p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="reply">Reply to customer</label>
                  <textarea
                    id="reply"
                    name="reply"
                    rows={6}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.reply)}
                    required
                  />
                  {fieldErrors.reply && (
                    <p className="field-error" role="alert">
                      {fieldErrors.reply}
                    </p>
                  )}
                </div>

                {submitError && (
                  <p className="form-error" role="alert">
                    {submitError}
                  </p>
                )}

                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send reply & resolve'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default AgentComplaintDetail
