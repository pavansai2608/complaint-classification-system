import { Link } from 'react-router-dom'

// Shown when a list has nothing in it. The action button is optional and only
// appears when both a label and a target address are given.
function EmptyState({ message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <p className="lede">{message}</p>
      {actionLabel && actionTo && (
        <div className="home-actions">
          <Link to={actionTo} className="btn-primary-link">
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  )
}

export default EmptyState
