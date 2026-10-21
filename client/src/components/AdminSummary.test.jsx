import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import AdminSummary from './AdminSummary.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

describe('AdminSummary', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
  })

  it('shows each complaint count from the server', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { total: 11, open: 4, inProgress: 2, resolved: 5 } })

    render(<AdminSummary />)

    expect(await screen.findByText('11')).toBeInTheDocument()
    expect(screen.getByText('Open').nextSibling).toHaveTextContent('4')
    expect(screen.getByText('In progress').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Resolved').nextSibling).toHaveTextContent('5')
  })

  it('shows an error if the numbers cannot be loaded', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network'))

    render(<AdminSummary />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load complaint numbers')
  })
})
