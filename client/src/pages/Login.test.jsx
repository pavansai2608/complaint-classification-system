import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import apiClient from '../api/client'
import Login from './Login.jsx'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

// The real Google Client ID lives in .env (loaded by Vite even in tests), so
// the button would try to render for real here without this mock.
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function fillForm({ email = 'riya@example.com', password = 'secret123' } = {}) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

describe('Login', () => {
  beforeEach(() => {
    apiClient.post.mockReset()
    // AuthProvider tries a silent refresh on mount; treat it as "not logged in yet".
    apiClient.post.mockImplementation((url) => {
      if (url === '/api/auth/refresh') return Promise.reject(new Error('no session'))
      return Promise.reject(new Error('unexpected call'))
    })
  })

  it('logs in and navigates to the home page', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url === '/api/auth/refresh') return Promise.reject(new Error('no session'))
      if (url === '/api/auth/login') {
        return Promise.resolve({
          data: { user: { name: 'Riya', role: 'customer' }, accessToken: 'token' },
        })
      }
      return Promise.reject(new Error('unexpected call'))
    })

    renderLogin()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('shows the account-locked message from the API', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url === '/api/auth/refresh') return Promise.reject(new Error('no session'))
      if (url === '/api/auth/login') {
        const err = new Error('locked')
        err.response = {
          data: { error: { code: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again in a few minutes.' } },
        }
        return Promise.reject(err)
      }
      return Promise.reject(new Error('unexpected call'))
    })

    renderLogin()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(
      await screen.findByText('Too many failed attempts. Try again in a few minutes.'),
    ).toBeInTheDocument()
  })

  it('shows a generic message for wrong credentials', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url === '/api/auth/refresh') return Promise.reject(new Error('no session'))
      if (url === '/api/auth/login') {
        const err = new Error('invalid')
        err.response = { data: { error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' } } }
        return Promise.reject(err)
      }
      return Promise.reject(new Error('unexpected call'))
    })

    renderLogin()
    fillForm({ password: 'wrong' })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
  })
})
