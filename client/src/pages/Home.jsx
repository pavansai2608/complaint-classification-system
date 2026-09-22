import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../utils/roles'

function Home() {
  const [serverStatus, setServerStatus] = useState('checking')
  const { user, ready } = useAuth()

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Bad response'))))
      .then((data) => setServerStatus(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setServerStatus('down'))
  }, [])

  if (ready && user) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </span>
        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/about">About</Link>
        </nav>
        {ready && !user && (
          <div className="landing-header-actions">
            <Link to="/login" className="btn-ghost">
              Log in
            </Link>
            <Link to="/register" className="btn-primary-sm">
              Get started
            </Link>
          </div>
        )}
      </header>

      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <span className="status-pill">
            <span className={`status-dot ${serverStatus}`} aria-hidden="true" />
            Server status: <strong data-testid="server-status">{serverStatus}</strong>
          </span>

          <h1 className="hero-title">
            Resolve complaints<br />
            <span className="hero-gradient-text">before they escalate.</span>
          </h1>
          <p className="hero-subtitle">
            Raise a complaint, track where it stands, and get a resolution — all from one place.
            Powered by intelligent triage that routes every issue to the right person.
          </p>

          {ready && !user && (
            <div className="hero-actions">
              <Link to="/register" className="btn-primary-lg">
                Start for free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link to="/login" className="btn-outline-lg">
                Log in to your account
              </Link>
            </div>
          )}
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="hero-card-stack">
            <div className="hero-mock-card hero-mock-card-1">
              <div className="mock-dot mock-dot-urgent" />
              <span>Payment not received for order #4821</span>
              <span className="mock-badge mock-badge-urgent">Urgent</span>
            </div>
            <div className="hero-mock-card hero-mock-card-2">
              <div className="mock-dot mock-dot-high" />
              <span>Wrong item delivered — need replacement</span>
              <span className="mock-badge mock-badge-high">High</span>
            </div>
            <div className="hero-mock-card hero-mock-card-3">
              <div className="mock-dot mock-dot-medium" />
              <span>Account settings page not loading</span>
              <span className="mock-badge mock-badge-medium">Medium</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-inner">
          <span className="section-label">Features</span>
          <h2 className="section-title">Everything you need to manage complaints</h2>
          <p className="section-subtitle">
            From submission to resolution, every step is tracked, triaged, and transparent.
          </p>

          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Intelligent triage</h3>
              <p>Every complaint is automatically classified by category, sentiment, and urgency — agents see the most critical issues first.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Suggested replies</h3>
              <p>Each complaint comes with a draft response agents can review, edit, and send — cutting reply time in half.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Real-time tracking</h3>
              <p>Customers see live status updates from the moment they submit a complaint until it is resolved.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Role-based access</h3>
              <p>Customers, agents, and admins each see only what they need — permissions are enforced server-side on every request.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Dashboard analytics</h3>
              <p>Admins get a bird's-eye view of complaint volume, category distribution, and resolution times.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Google Sign-In</h3>
              <p>One-click login with your Google account — no passwords to remember, no forms to fill.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="section-inner">
          <span className="section-label">How it works</span>
          <h2 className="section-title">Three steps to resolution</h2>

          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">01</span>
              <h3>Submit</h3>
              <p>Describe the problem. The system analyses it instantly and assigns a category, priority, and suggested reply.</p>
            </div>
            <div className="step-connector" aria-hidden="true">
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                <path d="M0 8h36M30 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="step-card">
              <span className="step-number">02</span>
              <h3>Triage</h3>
              <p>An agent reviews the complaint and the draft reply, edits it if needed, and sends the response.</p>
            </div>
            <div className="step-connector" aria-hidden="true">
              <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                <path d="M0 8h36M30 2l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="step-card">
              <span className="step-number">03</span>
              <h3>Resolve</h3>
              <p>The customer sees the reply and updated status. The complaint is closed and logged for analytics.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="section-inner">
          <div className="cta-card">
            <h2>Ready to streamline your complaints?</h2>
            <p>Create a free account and submit your first complaint in under a minute.</p>
            {ready && !user && (
              <div className="hero-actions">
                <Link to="/register" className="btn-primary-lg">
                  Get started free
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
