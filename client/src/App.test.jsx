import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the home page at /', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Complaint Resolution System' })).toBeInTheDocument()
  })

  it('shows the register page at /register', () => {
    window.history.pushState({}, '', '/register')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })
})
