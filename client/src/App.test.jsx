import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the app title', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Complaint Resolution System' })).toBeInTheDocument()
  })

  it('shows "ok" when the server health check passes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'ok' }) })),
    )
    render(<App />)
    expect(await screen.findByText('ok')).toBeInTheDocument()
  })

  it('shows "down" when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))
    render(<App />)
    expect(await screen.findByText('down')).toBeInTheDocument()
  })
})
