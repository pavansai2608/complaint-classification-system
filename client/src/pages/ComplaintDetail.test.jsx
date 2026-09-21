import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import ComplaintDetail from './ComplaintDetail.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

function renderPage(id = '507f1f77bcf86cd799439011') {
  return render(
    <MemoryRouter initialEntries={[`/complaints/${id}`]}>
      <Routes>
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/complaints" element={<p>Complaint list</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ComplaintDetail', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
  })

  it('shows the complaint returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        complaint: {
          id: '507f1f77bcf86cd799439011',
          title: 'Order arrived damaged',
          description: 'The package arrived with a cracked screen.',
          status: 'Open',
          orderReference: 'ORD-1234',
        },
      },
    })

    renderPage()

    expect(await screen.findByText('Order arrived damaged')).toBeInTheDocument()
    expect(screen.getByText('The package arrived with a cracked screen.')).toBeInTheDocument()
    expect(screen.getByText('Order reference: ORD-1234')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/api/complaints/507f1f77bcf86cd799439011')
  })

  it('shows a not-found message for a complaint that is missing or not owned by the customer', async () => {
    const err = new Error('not found')
    err.response = { status: 404 }
    apiClient.get.mockRejectedValueOnce(err)

    renderPage()

    expect(await screen.findByText('This complaint could not be found.')).toBeInTheDocument()
  })
})
