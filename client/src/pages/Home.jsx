import { Fragment, useRef } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { roleHomePath } from '../utils/roles'
import useLandingMotion from '../hooks/useLandingMotion'

// The headline is animated a word at a time, so it is written as lines.
const HEADLINE_LINES = ['Report a problem.', 'We sort out', 'the rest.']

// Sample complaints, shown so a visitor can see what the app actually does
// before signing up. Static, because a signed-out visitor has no data.
const EXAMPLES = [
  { subject: 'Charged twice for order #4821', kind: 'Billing', rank: 'Urgent' },
  { subject: 'Wrong item delivered, needs replacing', kind: 'Delivery', rank: 'High' },
  { subject: 'Settings page will not load', kind: 'Product', rank: 'Medium' },
  { subject: 'Refund not credited after nine days', kind: 'Billing', rank: 'High' },
]

const STEPS = [
  {
    head: 'You describe the problem',
    body: 'Write it in your own words. There is no form to work out and no category to guess at.',
  },
  {
    head: 'It gets sorted automatically',
    body: 'Your complaint is read and given a category and a priority, so the most urgent ones reach the support team first.',
  },
  {
    head: 'A person replies',
    body: 'Someone on the support team reads your complaint and writes the answer themselves. You can follow the status the whole way through.',
  },
]

function Home() {
  const { user, ready } = useAuth()
  const scopeRef = useRef(null)

  useLandingMotion(scopeRef)

  if (ready && user) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return (
    <div className="docket" ref={scopeRef}>
      <header className="docket-head">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          <span className="brand-words">Complaint Resolution</span>
        </span>
        <nav className="docket-nav">
          <a href="#how-it-works">How it works</a>
          <Link to="/demo">Live example</Link>
          <Link to="/about">About</Link>
        </nav>
        {ready && !user && (
          <div className="docket-head-actions">
            <Link to="/login" className="link-plain">
              Log in
            </Link>
            <Link to="/register" className="btn-ink">
              Create account
            </Link>
          </div>
        )}
      </header>

      <main>
        <section className="masthead">
          <div className="masthead-body">
            <div className="masthead-copy">
              <h1 className="display">
                {HEADLINE_LINES.map((line, lineIndex) => (
                  <Fragment key={line}>
                    <span className="line">
                      {line.split(' ').map((word, i, words) => (
                        <Fragment key={word + i}>
                          <span className="word">{word}</span>
                          {i < words.length - 1 ? ' ' : null}
                        </Fragment>
                      ))}
                    </span>
                    {/* Lines are block-level, so this space is invisible,
                        but without it the text runs together for a screen
                        reader. */}
                    {lineIndex < HEADLINE_LINES.length - 1 ? ' ' : null}
                  </Fragment>
                ))}
              </h1>

              <p className="standfirst">
                Raise a complaint in your own words and follow it through to an answer. Every one is
                read as soon as it arrives and passed to the right person, so the problems that
                matter most do not sit at the bottom of a pile.
              </p>

              {ready && !user && (
                <p className="masthead-actions">
                  <Link to="/register" className="btn-ink btn-ink-lg">
                    Create an account
                  </Link>
                  <Link to="/demo" className="link-underline">
                    See a live example — no account needed
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="register" aria-label="Example complaints">
          <h2 className="section-heading">What the support team sees</h2>
          <ul className="example-list">
            {EXAMPLES.map((row) => (
              <li key={row.subject} className="entry">
                <span className="entry-subject">{row.subject}</span>
                <span className="entry-meta">
                  <span className="entry-kind">{row.kind}</span>
                  <span className={`rank rank-${row.rank.toLowerCase()}`}>{row.rank}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="clauses" id="how-it-works">
          <h2 className="section-heading">How it works</h2>
          <ol className="clause-list">
            {STEPS.map((c, i) => (
              <li className="clause" key={c.head}>
                <span className="clause-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{c.head}</h3>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="colophon">
          <h2>Something to report?</h2>
          {ready && !user && (
            <p className="masthead-actions">
              <Link to="/register" className="btn-ink btn-ink-lg">
                Create an account
              </Link>
              <Link to="/demo" className="link-underline">
                Or look around first
              </Link>
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

export default Home
