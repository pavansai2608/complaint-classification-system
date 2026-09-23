import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Demo from './Demo.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <Demo />
    </MemoryRouter>,
  )
}

describe('Demo', () => {
  it('shows the sample complaint with its AI analysis', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Payment not received for order #4821' })).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('billing', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('negative (0.87)', { exact: false })).toBeInTheDocument()
  })

  it('shows both the AI draft and the reply a person actually sent', () => {
    renderPage()
    expect(screen.getByText('Suggested reply (AI draft):', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reply from support (written and sent by a person)' })).toBeInTheDocument()
  })

  it('does not require an account to view it', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Create a free account' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/')
  })
})
