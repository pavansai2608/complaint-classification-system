import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

function NewComplaint() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', orderReference: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setError('')
    setSubmitting(true)
    try {
      await apiClient.post('/api/complaints', form)
      navigate('/customer', { state: { complaintSubmitted: true } })
    } catch (err) {
      const apiError = err.response?.data?.error
      if (apiError?.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors = {}
        apiError.details.forEach((detail) => {
          errors[detail.field] = detail.message
        })
        setFieldErrors(errors)
        setError(apiError.message)
      } else {
        setError(apiError?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-form-panel" style={{ flex: 'none', width: '100%' }}>
        <header className="top-bar">
          <Link to="/customer" className="brand brand-on-dark">
            <span className="brand-mark" aria-hidden="true">
              CR
            </span>
            Complaint Resolution System
          </Link>
        </header>

        <main className="auth-shell">
          <div className="auth-card" style={{ maxWidth: 480 }}>
            <h1>Submit a complaint</h1>
            <p className="auth-subtitle">Tell us what went wrong and we&rsquo;ll get someone on it.</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={fieldErrors.title ? 'title-error' : undefined}
                  required
                />
                {fieldErrors.title && (
                  <p className="field-error" id="title-error" role="alert">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={form.description}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                  required
                />
                {fieldErrors.description && (
                  <p className="field-error" id="description-error" role="alert">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="orderReference">Order reference (optional)</label>
                <input
                  id="orderReference"
                  name="orderReference"
                  type="text"
                  value={form.orderReference}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.orderReference)}
                  aria-describedby={fieldErrors.orderReference ? 'orderReference-error' : undefined}
                />
                {fieldErrors.orderReference && (
                  <p className="field-error" id="orderReference-error" role="alert">
                    {fieldErrors.orderReference}
                  </p>
                )}
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit complaint'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

export default NewComplaint
