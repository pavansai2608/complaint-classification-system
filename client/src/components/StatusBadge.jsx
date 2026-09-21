const STATUS_CLASSES = {
  Open: 'complaint-status-open',
  'In Progress': 'complaint-status-in-progress',
  Resolved: 'complaint-status-resolved',
}

// A missing status means an old complaint saved before the field existed, so it
// counts as Open. A value we do not recognise gets a neutral "Unknown" badge
// instead of being shown as typed, so bad data never reaches a class name.
function StatusBadge({ status }) {
  const value = status ?? 'Open'
  const known = Object.hasOwn(STATUS_CLASSES, value)
  const className = known ? STATUS_CLASSES[value] : 'complaint-status-unknown'

  return <span className={`complaint-status ${className}`}>{known ? value : 'Unknown'}</span>
}

export default StatusBadge
