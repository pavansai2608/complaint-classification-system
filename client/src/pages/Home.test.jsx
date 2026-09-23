import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import apiClient from '../api/client'
import Home from './Home.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), defaults: { headers: { common: {} } } },
}))

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agent" element={<p>Agent page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Home', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
    apiClient.post.mockRejectedValue(new Error('no session'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows log in and register links when no one is logged in', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderHome()
    expect(await screen.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    // The page offers this twice, at the top and at the foot; both go to
    // the same place.
    const registerLinks = screen.getAllByRole('link', { name: /create an account/i })
    expect(registerLinks.length).toBeGreaterThan(0)
    registerLinks.forEach((link) => expect(link).toHaveAttribute('href', '/register'))
  })

  it('links to the live example so it can be seen without an account', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderHome()
    const demoLinks = await screen.findAllByRole('link', { name: /live example/i })
    demoLinks.forEach((link) => expect(link).toHaveAttribute('href', '/demo'))
  })

  it('redirects a logged-in user to their role page instead of showing this page', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url === '/api/auth/refresh') {
        return Promise.resolve({ data: { user: { name: 'Riya', role: 'agent' }, accessToken: 'token' } })
      }
      return Promise.resolve({})
    })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    renderHome()

    expect(await screen.findByText('Agent page')).toBeInTheDocument()
  })
})
