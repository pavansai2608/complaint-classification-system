import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['Open', 'complaint-status-open'],
    ['In Progress', 'complaint-status-in-progress'],
    ['Resolved', 'complaint-status-resolved'],
  ])('shows %s with its own colour class', (status, className) => {
    render(<StatusBadge status={status} />)
    const badge = screen.getByText(status)
    expect(badge).toHaveClass('complaint-status', className)
  })

  it('treats a missing status as Open', () => {
    render(<StatusBadge />)
    expect(screen.getByText('Open')).toHaveClass('complaint-status-open')
  })

  it('shows Unknown in a neutral badge for a value it does not recognise', () => {
    render(<StatusBadge status="Escalated" />)
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('complaint-status', 'complaint-status-unknown')
    expect(screen.queryByText('Escalated')).not.toBeInTheDocument()
  })

  it('does not turn odd text into class names', () => {
    render(<StatusBadge status="x onclick=alert(1)" />)
    expect(screen.getByText('Unknown').className).toBe('complaint-status complaint-status-unknown')
  })

  it('handles values that are not text', () => {
    render(<StatusBadge status={{ $gt: '' }} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('does not treat built-in object names as statuses', () => {
    render(<StatusBadge status="constructor" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
