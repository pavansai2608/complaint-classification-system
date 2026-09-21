import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import AgentComplaintDetail from './AgentComplaintDetail.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

const complaint = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Order arrived damaged',
  description: 'The package arrived with a cracked screen.',
  status: 'Open',
  category: 'product',
  priority: 'High',
  emotion: { label: 'negative', score: 0.8 },
  suggestedReply: 'Sorry about the damage, we are on it.',
  analysisPending: false,
  wasCorrected: false,
}

function renderPage(id = complaint._id) {
  return render(
    <MemoryRouter initialEntries={[`/agent/complaints/${id}`]}>
      <Routes>
        <Route path="/agent/complaints/:id" element={<AgentComplaintDetail />} />
        <Route path="/agent/queue" element={<p>Priority queue page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AgentComplaintDetail', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
    apiClient.post.mockReset()
  })

  it('shows the complaint, AI analysis, and prefills the reply with the suggested reply', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaint } })

    renderPage()

    expect(await screen.findByText('Order arrived damaged')).toBeInTheDocument()
    expect(screen.getByText('negative (0.8)', { exact: false })).toBeInTheDocument()
    expect(screen.getByLabelText('Reply to customer')).toHaveValue('Sorry about the damage, we are on it.')
    expect(screen.getByLabelText('Category')).toHaveValue('product')
    expect(screen.getByLabelText('Priority')).toHaveValue('High')
  })

  it('sends the reply and navigates back to the queue on success', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaint } })
    apiClient.post.mockResolvedValueOnce({ data: { complaint: { ...complaint, status: 'Resolved' } } })

    renderPage()
    await screen.findByText('Order arrived damaged')

    fireEvent.change(screen.getByLabelText('Reply to customer'), { target: { value: 'We refunded the charge.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply & resolve' }))

    expect(await screen.findByText('Priority queue page')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledWith('/api/complaints/507f1f77bcf86cd799439011/reply', {
      reply: 'We refunded the charge.',
      category: 'product',
      priority: 'High',
    })
  })

  it('shows field errors returned by the API', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaint } })
    const err = new Error('validation failed')
    err.response = {
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the highlighted fields',
          details: [{ field: 'reply', message: 'Reply must be 1 to 2000 characters' }],
        },
      },
    }
    apiClient.post.mockRejectedValueOnce(err)

    renderPage()
    await screen.findByText('Order arrived damaged')
    fireEvent.click(screen.getByRole('button', { name: 'Send reply & resolve' }))

    expect(await screen.findByText('Reply must be 1 to 2000 characters')).toBeInTheDocument()
  })

  it('shows a message instead of the reply form once already resolved', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { complaint: { ...complaint, status: 'Resolved' } } })

    renderPage()

    expect(await screen.findByText('This complaint has already been resolved and replied to.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Reply to customer')).not.toBeInTheDocument()
  })

  it('shows a not-found message for a complaint that does not exist', async () => {
    const err = new Error('not found')
    err.response = { status: 404 }
    apiClient.get.mockRejectedValueOnce(err)

    renderPage()

    expect(await screen.findByText('This complaint could not be found.')).toBeInTheDocument()
  })
})
