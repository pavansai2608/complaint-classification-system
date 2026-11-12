import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import apiClient from '../api/client'
import AdminAnalytics from './AdminAnalytics.jsx'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

const analytics = {
  byCategory: [
    { label: 'billing', count: 6 },
    { label: 'delivery', count: 3 },
  ],
  byPriority: [
    { label: 'Urgent', count: 1 },
    { label: 'High', count: 2 },
    { label: 'Medium', count: 5 },
    { label: 'Low', count: 1 },
  ],
  daily: [
    { date: '2026-11-10', count: 4 },
    { date: '2026-11-11', count: 5 },
  ],
}

// jsdom gives the chart no size, so the drawing itself is not rendered in
// tests. These tests check the table that sits under every chart instead -
// it is built from the same rows the chart draws.
function tableFor(title) {
  return screen.getByRole('table', { name: title })
}

describe('AdminAnalytics', () => {
  beforeEach(() => {
    apiClient.get.mockReset()
  })

  it('asks the server for the admin analytics', async () => {
    apiClient.get.mockResolvedValueOnce({ data: analytics })

    render(<AdminAnalytics />)

    await screen.findByRole('heading', { name: 'Complaints by category' })
    expect(apiClient.get).toHaveBeenCalledWith('/api/admin/analytics')
  })

  it('shows a chart card for category, priority and daily numbers', async () => {
    apiClient.get.mockResolvedValueOnce({ data: analytics })

    render(<AdminAnalytics />)

    expect(await screen.findByRole('heading', { name: 'Complaints by category' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Complaints by priority' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New complaints per day' })).toBeInTheDocument()
  })

  it('lists every category and priority count in the table view', async () => {
    apiClient.get.mockResolvedValueOnce({ data: analytics })

    render(<AdminAnalytics />)

    await screen.findByRole('heading', { name: 'Complaints by category' })

    const categoryTable = within(tableFor('Complaints by category'))
    expect(categoryTable.getByRole('row', { name: 'billing 6' })).toBeInTheDocument()
    expect(categoryTable.getByRole('row', { name: 'delivery 3' })).toBeInTheDocument()

    const priorityTable = within(tableFor('Complaints by priority'))
    expect(priorityTable.getByRole('row', { name: 'Urgent 1' })).toBeInTheDocument()
    expect(priorityTable.getByRole('row', { name: 'Medium 5' })).toBeInTheDocument()
  })

  it('shows each day as a short readable date', async () => {
    apiClient.get.mockResolvedValueOnce({ data: analytics })

    render(<AdminAnalytics />)

    await screen.findByRole('heading', { name: 'New complaints per day' })

    const dailyTable = within(tableFor('New complaints per day'))
    expect(dailyTable.getByRole('row', { name: '10 Nov 4' })).toBeInTheDocument()
    expect(dailyTable.getByRole('row', { name: '11 Nov 5' })).toBeInTheDocument()
  })

  it('says so when there are no complaints yet instead of drawing empty charts', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { byCategory: [], byPriority: analytics.byPriority.map((p) => ({ ...p, count: 0 })), daily: [] },
    })

    render(<AdminAnalytics />)

    expect(await screen.findByText(/No complaints yet/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error if the charts cannot be loaded', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('network'))

    render(<AdminAnalytics />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the charts')
  })
})
