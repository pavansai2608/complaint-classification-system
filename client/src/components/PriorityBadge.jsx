const PRIORITY_CLASSES = {
  Low: 'priority-badge-low',
  Medium: 'priority-badge-medium',
  High: 'priority-badge-high',
  Urgent: 'priority-badge-urgent',
}

// A missing priority means an old complaint saved before the field existed, so
// it counts as Medium. A value we do not recognise gets a neutral "Unknown"
// badge instead of being shown as typed.
function PriorityBadge({ priority }) {
  const value = priority ?? 'Medium'
  const known = Object.hasOwn(PRIORITY_CLASSES, value)
  const className = known ? PRIORITY_CLASSES[value] : 'priority-badge-unknown'

  return <span className={`priority-badge ${className}`}>{known ? value : 'Unknown'}</span>
}

export default PriorityBadge
