import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

// Lets someone with no complaint of their own try the form and see the AI
// pipeline react to real-looking text - five different ones so repeat clicks
// don't just show the same complaint every time.
const EXAMPLE_COMPLAINTS = [
  {
    title: 'Payment not received for order #4821',
    description:
      "I placed order #4821 twelve days ago. The payment page showed it succeeded, but the order still shows as unpaid on my account, and a refund not received from a return I made last month is still missing too. I've written in twice already with no reply. This needs sorting out today.",
  },
  {
    title: 'Wrong item delivered - need a replacement',
    description:
      'I ordered a size medium blue jacket but received a size small in grey instead. The packing slip inside even lists the correct item, so this looks like a warehouse mix-up. Please send the right item and arrange a pickup for this one.',
  },
  {
    title: 'Account settings page will not load',
    description:
      "Every time I open the account settings page it spins forever and then shows a blank screen. I've tried on both my phone and laptop, in two different browsers, and cleared the cache. I just need to update my shipping address.",
  },
  {
    title: 'Charged twice for the same order',
    description:
      'My card statement shows two identical charges for order #3390, both dated the same day. I only placed one order and only received one package. Please refund the duplicate charge.',
  },
  {
    title: 'Delivery marked complete but nothing arrived',
    description:
      "The tracking page says my package was delivered and left at the front door yesterday afternoon, but there is nothing here and none of my neighbours have seen it either. I checked with building security too. This is the second time this has happened this month.",
  },
]

function NewComplaint() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', orderReference: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastExampleIndex, setLastExampleIndex] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleTryExample() {
    const choices = EXAMPLE_COMPLAINTS.map((_, index) => index).filter((index) => index !== lastExampleIndex)
    const index = choices[Math.floor(Math.random() * choices.length)]
    setLastExampleIndex(index)
    const example = EXAMPLE_COMPLAINTS[index]
    setForm((prev) => ({ ...prev, title: example.title, description: example.description }))
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

            <button type="button" className="btn-secondary try-example-btn" onClick={handleTryExample}>
              Try with an example
            </button>

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
