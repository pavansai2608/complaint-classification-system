import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import Register from './Register.jsx'

vi.mock('axios')

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

function fillForm({ name = 'Riya', email = 'riya@example.com', password = 'secret123' } = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

describe('Register', () => {
  beforeEach(() => {
    axios.post.mockReset()
  })

  it('shows a success message after a successful registration', async () => {
    axios.post.mockResolvedValueOnce({ data: { user: { email: 'riya@example.com' } } })
    renderRegister()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Account created' })).toBeInTheDocument()
  })

  it('shows field errors from a validation error response', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please fix the highlighted fields',
            details: [{ field: 'password', message: 'Password must be at least 8 characters' }],
          },
        },
      },
    })
    renderRegister()

    fillForm({ password: 'short' })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('shows the server message for a duplicate email', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          error: { code: 'CONFLICT', message: 'An account with this email already exists' },
        },
      },
    })
    renderRegister()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
  })

  it('shows a generic error when the request fails unexpectedly', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network error'))
    renderRegister()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })
})
