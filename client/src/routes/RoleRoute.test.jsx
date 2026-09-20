import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import apiClient from '../api/client'
import ProtectedRoute from './ProtectedRoute.jsx'
import RoleRoute from './RoleRoute.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

function renderAsCustomer(atPath) {
  apiClient.post.mockImplementation((url) => {
    if (url === '/api/auth/refresh') {
      return Promise.resolve({ data: { user: { name: 'Riya', role: 'customer' }, accessToken: 'token' } })
    }
    return Promise.resolve({})
  })

  return render(
    <MemoryRouter initialEntries={[atPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleRoute allow={['agent']} />}>
              <Route path="/agent" element={<p>Agent-only page</p>} />
            </Route>
            <Route path="/customer" element={<p>Customer page</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RoleRoute', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
  })

  it('sends a customer away from an agent-only page to their own page', async () => {
    renderAsCustomer('/agent')
    expect(await screen.findByText('Customer page')).toBeInTheDocument()
  })
})
