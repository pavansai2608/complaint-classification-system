import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Home from './Home.jsx'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

describe('Home', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows "ok" when the server health check passes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })),
    )
    renderHome()
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('shows "down" when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))
    renderHome()
    expect(await screen.findByText('down')).toBeInTheDocument()
  })

  it('links to the register page', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderHome()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    )
  })
})
