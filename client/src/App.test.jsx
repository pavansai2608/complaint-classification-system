import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from './api/client'
import App from './App.jsx'

vi.mock('./api/client', () => ({
  default: { post: vi.fn(), defaults: { headers: { common: {} } } },
}))

describe('App', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
    apiClient.post.mockRejectedValue(new Error('no session'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the home page at /', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByRole('heading', { name: /report a problem/i })).toBeInTheDocument()
  })

  it('shows the register page at /register', () => {
    window.history.pushState({}, '', '/register')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('shows the login page at /login', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the footer on the home and login pages', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    window.history.pushState({}, '', '/')
    const { unmount } = render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    unmount()

    window.history.pushState({}, '', '/login')
    render(<App />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown address', () => {
    window.history.pushState({}, '', '/no-such-page')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('takes you home from the 404 page', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    window.history.pushState({}, '', '/no-such-page')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Go to the home page' }))
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('shows the About page at /about', () => {
    window.history.pushState({}, '', '/about')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'About this app' })).toBeInTheDocument()
  })

  it('reaches the About page from the footer', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    window.history.pushState({}, '', '/login')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(screen.getByRole('heading', { name: 'About this app' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/about')
  })
})
