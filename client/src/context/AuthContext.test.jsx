import { render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import apiClient from '../api/client'
import { AuthProvider, useAuth } from './AuthContext.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), get: vi.fn(), defaults: { headers: { common: {} } } },
}))

// Stands in for a page like the priority queue: it asks for data in its
// own effect as soon as it is shown after the login check.
function PageThatLoadsData() {
  const { ready } = useAuth()
  const [header, setHeader] = useState(null)
  useEffect(() => {
    if (ready) setHeader(apiClient.defaults.headers.common.Authorization || 'missing')
  }, [ready])
  return <p>{header}</p>
}

describe('AuthProvider', () => {
  it('attaches the access token before a page sends its first request after a reload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { user: { name: 'Riya', role: 'admin' }, accessToken: 'new-token' } })

    render(
      <AuthProvider>
        <PageThatLoadsData />
      </AuthProvider>,
    )

    expect(await screen.findByText('Bearer new-token')).toBeInTheDocument()
  })
})
