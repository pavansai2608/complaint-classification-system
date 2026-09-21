import { Outlet } from 'react-router-dom'
import Footer from './Footer'

// Wraps every route so the footer shows at the bottom of every page.
function Layout() {
  return (
    <div className="app-layout">
      <div className="app-layout-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}

export default Layout
