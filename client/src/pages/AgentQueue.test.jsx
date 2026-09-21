import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import AgentQueue from './AgentQueue.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

function renderPage(initialEntry = '/agent/queue') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/agent/queue" element={<AgentQueue />} />
        <Route path="/agent/complaints/:id" element={<p>Complaint detail</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AgentQueue', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
  })

  it('lists queue items sorted by priority, returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        items: [
          { _id: '1', title: 'Charged twice', status: 'Open', priority: 'Urgent' },
          { _id: '2', title: 'Late delivery', status: 'Open', priority: 'Low' },
        ],
        total: 2,
      },
    })

    renderPage()

    expect(await screen.findByText('Charged twice')).toBeInTheDocument()
    expect(screen.getByText('Late delivery')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/api/agent/queue')
  })

  it('renders an item saved before the priority field existed without crashing', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        items: [{ _id: '1', title: 'Old complaint', status: 'Open' }],
        total: 1,
      },
    })

    renderPage()

    expect(await screen.findByText('Old complaint')).toBeInTheDocument()
    expect(screen.getAllByText('Medium')[0]).toBeInTheDocument()
  })

  it('shows an empty state when the queue has nothing in it', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [], total: 0 } })

    renderPage()

    expect(await screen.findByText('The queue is empty.')).toBeInTheDocument()
  })

  it('shows an error message if loading fails', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network error'))

    renderPage()

    expect(await screen.findByText('Could not load the queue. Please try again.')).toBeInTheDocument()
  })

  it('shows a confirmation banner after a reply was just sent', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [], total: 0 } })

    render(
      <MemoryRouter initialEntries={[{ pathname: '/agent/queue', state: { replySent: true } }]}>
        <Routes>
          <Route path="/agent/queue" element={<AgentQueue />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Reply sent and complaint resolved')).toBeInTheDocument()
  })
})
