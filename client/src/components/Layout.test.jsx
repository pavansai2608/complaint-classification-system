import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Layout from './Layout'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/one" element={<p>Page one</p>} />
          <Route path="/two" element={<p>Page two</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('shows the page and the footer', () => {
    renderAt('/one')
    expect(screen.getByText('Page one')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('shows the footer on every page it wraps', () => {
    renderAt('/two')
    expect(screen.getByText('Page two')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
  })
})
