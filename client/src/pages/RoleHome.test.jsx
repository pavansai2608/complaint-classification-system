import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import apiClient from '../api/client'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import RoleHome from './RoleHome.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), defaults: { headers: { common: {} } } },
}))

function renderAsRole(role) {
  apiClient.post.mockImplementation((url) => {
    if (url === '/api/auth/refresh') {
      return Promise.resolve({ data: { user: { name: 'Riya', role }, accessToken: 'token' } })
    }
    return Promise.resolve({})
  })

  return render(
    <MemoryRouter initialEntries={[`/${role}`]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/agent" element={<RoleHome />} />
            <Route path="/customer" element={<RoleHome />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RoleHome', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
  })

  it.each([
    ['customer', 'Your complaints'],
    ['agent', 'Priority queue'],
  ])('shows %s-specific content and the logged-in user', async (role, heading) => {
    renderAsRole(role)

    expect(await screen.findByText(heading)).toBeInTheDocument()
    expect(screen.getByText(`Logged in as Riya (${role})`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('shows a link to the priority queue for agents', async () => {
    renderAsRole('agent')

    expect(await screen.findByRole('link', { name: 'View priority queue' })).toHaveAttribute(
      'href',
      '/agent/queue',
    )
  })

  it('does not show the priority queue link for customers', async () => {
    renderAsRole('customer')

    await screen.findByText('Your complaints')
    expect(screen.queryByRole('link', { name: 'View priority queue' })).not.toBeInTheDocument()
  })
})
