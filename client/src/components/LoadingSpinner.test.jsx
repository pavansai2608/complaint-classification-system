import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner', () => {
  it('tells screen readers that something is loading', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('uses the label it is given', () => {
    render(<LoadingSpinner label="Loading your complaints" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your complaints')
  })
})
