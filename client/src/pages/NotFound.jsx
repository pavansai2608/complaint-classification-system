import { Link } from 'react-router-dom'

// Shown for any address that no route matches. The address is not repeated on
// the page, so nothing from the URL can end up in the content.
function NotFound() {
  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </Link>
      </header>

      <main className="home-hero">
        <h1>Page not found</h1>
        <p className="lede">Sorry, we could not find the page you were looking for. It may have moved or the address may be wrong.</p>
        <div className="home-actions">
          <Link to="/" className="btn-primary-link">
            Go to the home page
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFound
