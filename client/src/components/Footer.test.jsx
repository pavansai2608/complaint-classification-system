import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Footer from './Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  )
}

describe('Footer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the app name and the current year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2031-06-15T12:00:00Z'))
    renderFooter()
    expect(screen.getByText(/2031 Complaint Resolution System/)).toBeInTheDocument()
  })
})
