import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import apiClient from '../api/client'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import RoleHome from './RoleHome.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), get: vi.fn(), defaults: { headers: { common: {} } } },
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
            <Route path="/admin" element={<RoleHome />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('RoleHome', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
    apiClient.get.mockReset()
    apiClient.get.mockResolvedValue({ data: { total: 7, open: 3, inProgress: 2, resolved: 2 } })
  })

  it.each([
    ['customer', 'Your complaints'],
    ['agent', 'Priority queue'],
    ['admin', 'Admin overview'],
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

  it('shows complaint numbers to an admin', async () => {
    renderAsRole('admin')

    expect(await screen.findByText('All complaints')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/summary')
  })

  it('does not load admin numbers for an agent', async () => {
    renderAsRole('agent')

    await screen.findByText('Priority queue')
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
