import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleSidebar = () => {
    // lg breakpoint: below it the sidebar is an overlay drawer, above it collapses in place
    if (window.innerWidth < 1024) {
      setMobileOpen(open => !open)
    } else {
      setSidebarCollapsed(collapsed => !collapsed)
    }
  }

  return (
    <div className="flex h-screen bg-[#f4f7ed] overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          {/* Any click inside (e.g. a nav link) closes the drawer after it acts */}
          <div className="absolute inset-y-0 left-0 shadow-2xl" onClick={() => setMobileOpen(false)}>
            <Sidebar collapsed={false} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
