import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PriorityBadge from './PriorityBadge'

describe('PriorityBadge', () => {
  it.each([
    ['Low', 'priority-badge-low'],
    ['Medium', 'priority-badge-medium'],
    ['High', 'priority-badge-high'],
    ['Urgent', 'priority-badge-urgent'],
  ])('shows %s with its own colour class', (priority, className) => {
    render(<PriorityBadge priority={priority} />)
    const badge = screen.getByText(priority)
    expect(badge).toHaveClass('priority-badge', className)
  })

  it('treats a missing priority as Medium', () => {
    render(<PriorityBadge />)
    expect(screen.getByText('Medium')).toHaveClass('priority-badge-medium')
  })

  it('shows Unknown in a neutral badge for a value it does not recognise', () => {
    render(<PriorityBadge priority="Critical" />)
    const badge = screen.getByText('Unknown')
    expect(badge).toHaveClass('priority-badge', 'priority-badge-unknown')
    expect(screen.queryByText('Critical')).not.toBeInTheDocument()
  })

  it('handles values that are not text', () => {
    render(<PriorityBadge priority={42} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('does not treat built-in object names as priorities', () => {
    render(<PriorityBadge priority="toString" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
