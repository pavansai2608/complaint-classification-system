import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import NewComplaint from './NewComplaint.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/complaints/new']}>
      <Routes>
        <Route path="/complaints/new" element={<NewComplaint />} />
        <Route path="/customer" element={<p>Customer home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillForm({ title = 'Order arrived damaged', description = 'The package arrived with a cracked screen.' } = {}) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: description } })
}

describe('NewComplaint', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
  })

  it('submits the complaint and navigates back to the customer home page', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { complaint: { id: '1', status: 'Open' } } })

    renderPage()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Submit complaint' }))

    expect(await screen.findByText('Customer home')).toBeInTheDocument()
    expect(apiClient.post).toHaveBeenCalledWith('/api/complaints', {
      title: 'Order arrived damaged',
      description: 'The package arrived with a cracked screen.',
      orderReference: '',
    })
  })

  it('shows field errors returned by the API', async () => {
    const err = new Error('validation failed')
    err.response = {
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please fix the highlighted fields',
          details: [{ field: 'title', message: 'Title must be 5 to 120 characters' }],
        },
      },
    }
    apiClient.post.mockRejectedValueOnce(err)

    renderPage()
    fillForm({ title: 'Bad' })
    fireEvent.click(screen.getByRole('button', { name: 'Submit complaint' }))

    expect(await screen.findByText('Title must be 5 to 120 characters')).toBeInTheDocument()
  })
})
