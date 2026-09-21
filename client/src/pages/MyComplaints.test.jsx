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

  it('offers a button to submit a first complaint when the list is empty', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaints: [] } })

    renderPage()

    const buttons = await screen.findAllByRole('link', { name: 'Submit a complaint' })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('href', '/complaints/new')
  })

  it('shows a loading indicator until the complaints arrive', async () => {
    apiClient.get.mockReturnValueOnce(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading your complaints...')
    expect(screen.queryByText('You haven’t submitted any complaints yet.')).not.toBeInTheDocument()
  })

  it('shows an error message if loading fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network error'))

    renderPage()

    expect(await screen.findByText('Could not load your complaints. Please try again.')).toBeInTheDocument()
  })
})
