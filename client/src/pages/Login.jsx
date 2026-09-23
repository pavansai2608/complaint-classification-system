import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function Login() {
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
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
      await login(form.email, form.password)
      navigate('/')
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

  async function handleGoogleSuccess(credentialResponse) {
    setError('')
    try {
      await loginWithGoogle(credentialResponse.credential)
      navigate('/')
    } catch (err) {
      setError('Could not sign in with Google. Please try again.')
    }
  }

  return (
    <div className="auth-page">
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
          <h2>Every complaint, resolved faster.</h2>
          <p>One place for customers to raise issues and for your team to triage, respond, and close the loop.</p>
          <ul className="auth-visual-features">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              AI-assisted triage by category and priority
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Real-time status tracking for every ticket
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Suggested replies that agents can edit and send
            </li>
          </ul>
        </div>
      </aside>

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
            <h1>Log in</h1>
            <p className="auth-subtitle">Welcome back — enter your details to continue.</p>

            <form onSubmit={handleSubmit} noValidate>
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
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  required
                />
                {fieldErrors.password && (
                  <p className="field-error" id="password-error" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="auth-divider">or</div>
                <div className="google-button-slot">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Could not sign in with Google. Please try again.')}
                  />
                </div>
              </>
            )}

            <p className="auth-switch">
              Don&rsquo;t have an account? <Link to="/register">Create one</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Login
