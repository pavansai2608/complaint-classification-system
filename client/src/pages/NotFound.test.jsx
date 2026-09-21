import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import NotFound from './NotFound.jsx'

describe('NotFound', () => {
  it('shows a friendly message', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('links back to the home page', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  })

  it('does not repeat the address that was asked for', () => {
    render(
      <MemoryRouter initialEntries={['/<img src=x onerror=alert(1)>']}>
        <NotFound />
      </MemoryRouter>,
    )
    expect(document.body.innerHTML).not.toContain('onerror')
  })
})
