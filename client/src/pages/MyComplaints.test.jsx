import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import MyComplaints from './MyComplaints.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/complaints']}>
      <Routes>
        <Route path="/complaints" element={<MyComplaints />} />
        <Route path="/complaints/:id" element={<p>Complaint detail</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MyComplaints', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
  })

  it('lists the complaints returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { complaints: [{ id: '1', title: 'Order arrived damaged', status: 'Open' }] },
    })

    renderPage()

    expect(await screen.findByText('Order arrived damaged')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/api/complaints/mine')
  })

  it('shows an empty state when there are no complaints', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaints: [] } })

    renderPage()

    expect(await screen.findByText('You haven’t submitted any complaints yet.')).toBeInTheDocument()
  })

  it('shows an error message if loading fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network error'))

    renderPage()

    expect(await screen.findByText('Could not load your complaints. Please try again.')).toBeInTheDocument()
  })
})
