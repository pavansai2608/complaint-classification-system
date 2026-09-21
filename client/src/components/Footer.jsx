import { Link } from 'react-router-dom'

// A public address, set at build time. example.com is a reserved domain, so the
// fallback never reaches a real inbox.
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@example.com'

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <span>
        &copy; {year} Complaint Resolution System
      </span>
      <nav aria-label="Footer" className="site-footer-links">
        <Link to="/about">About</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
      </nav>
    </footer>
  )
}

export default Footer
