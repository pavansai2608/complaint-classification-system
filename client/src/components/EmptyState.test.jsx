import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import EmptyState from './EmptyState'

function renderEmpty(props) {
  return render(
    <MemoryRouter>
      <EmptyState {...props} />
    </MemoryRouter>,
  )
}

describe('EmptyState', () => {
  it('shows the message', () => {
    renderEmpty({ message: 'Nothing here yet.' })
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('has no button when no action is given', () => {
    renderEmpty({ message: 'Nothing here yet.' })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows an action link when a label and address are given', () => {
    renderEmpty({ message: 'Nothing here yet.', actionLabel: 'Add one', actionTo: '/add' })
    expect(screen.getByRole('link', { name: 'Add one' })).toHaveAttribute('href', '/add')
  })

  it('has no button when only the label is given', () => {
    renderEmpty({ message: 'Nothing here yet.', actionLabel: 'Add one' })
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
