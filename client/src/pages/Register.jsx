import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const initialForm = { name: '', email: '', password: '' }

function Register() {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await axios.post('/api/auth/register', form)
      setSuccess(true)
      setForm(initialForm)
    } catch (err) {
      const apiError = err.response?.data?.error
      if (apiError?.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors = {}
        apiError.details.forEach((detail) => {
          errors[detail.field] = detail.message
        })
        setFieldErrors(errors)
      } else if (apiError?.message) {
        setFormError(apiError.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const visualPanel = (
    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-visual-glow auth-visual-glow-a" />
      <div className="auth-visual-glow auth-visual-glow-b" />
      <div className="auth-visual-content">
        <span className="brand brand-on-dark">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </span>
        <h2>Get every complaint to the right person, fast.</h2>
        <p>Create an account to raise complaints and follow their status from submission to resolution.</p>
        <ul className="auth-visual-features">
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Free to sign up, no credit card needed
          </li>
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Track every complaint in one dashboard
          </li>
          <li>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Get notified the moment there's a reply
          </li>
        </ul>
      </div>
    </aside>
  )

  if (success) {
    return (
      <div className="auth-page">
        {visualPanel}
        <div className="auth-form-panel">
          <header className="top-bar top-bar-mobile-only">
            <Link to="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                CR
              </span>
              Complaint Resolution System
            </Link>
            <Link to="/about" className="top-bar-about-link">
              About
            </Link>
          </header>
          <main className="auth-shell">
            <div className="auth-card success-panel">
              <div className="success-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1>Account created</h1>
              <p>You can now log in with your email and password.</p>
              <Link to="/login" className="btn-primary-link">
                Go to log in
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      {visualPanel}
      <div className="auth-form-panel">
        <header className="top-bar top-bar-mobile-only">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              CR
            </span>
            Complaint Resolution System
          </Link>
          <Link to="/about" className="top-bar-about-link">
            About
          </Link>
        </header>

        <main className="auth-shell">
        <div className="auth-card">
          <h1>Create an account</h1>
          <p className="auth-subtitle">Track and manage your complaints in one place.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                required
              />
              {fieldErrors.name && (
                <p className="field-error" id="name-error" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                required
              />
              {fieldErrors.email && (
                <p className="field-error" id="email-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                required
              />
              <p className="field-hint" id="password-hint">
                At least 8 characters, with a letter and a number.
              </p>
              {fieldErrors.password && (
                <p className="field-error" id="password-error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
        </main>
      </div>
    </div>
  )
}

export default Register
