import { useEffect, useState } from 'react'
import apiClient from '../api/client'
import LoadingSpinner from './LoadingSpinner'

const STATS = [
  { key: 'total', label: 'All complaints' },
  { key: 'open', label: 'Open' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
]

function AdminSummary() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    apiClient
      .get('/api/admin/summary')
      .then((res) => {
        if (!cancelled) setSummary(res.data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load complaint numbers. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    )
  }

  if (!summary) return <LoadingSpinner label="Loading complaint numbers..." />

  return (
    <dl className="admin-summary">
      {STATS.map((stat) => (
        <div className="admin-stat" key={stat.key}>
          <dt>{stat.label}</dt>
          <dd>{summary[stat.key]}</dd>
        </div>
      ))}
    </dl>
  )
}

export default AdminSummary
