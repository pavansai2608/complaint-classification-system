import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import About from './About.jsx'

function renderPage() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  )
}

describe('About', () => {
  it('has a main heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'About this app' })).toBeInTheDocument()
  })

  it('explains the customer, sorting and agent parts', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'For customers' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How complaints are sorted' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'For agents' })).toBeInTheDocument()
  })

  it('links to sign up and log in', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })
})
