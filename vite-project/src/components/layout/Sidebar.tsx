import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  Settings,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments' },
  { to: '/notes', icon: FileText, label: 'SOAP Notes' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={`
        h-screen bg-white border-r border-gray-200 flex flex-col
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Logo area */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="/logo.svg"
          alt="ReHABMe Logo"
          className="w-9 h-9 flex-shrink-0 object-contain"
        />
        {!collapsed && (
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">ReHABMe</p>
            <p className="text-xs text-gray-500 leading-tight">Rehab & Physiotherapy</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => {
          const isActive = exact
            ? location.pathname === to
            : location.pathname.startsWith(to)

          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-[#3d9cd6] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && isActive && <ChevronRight size={14} className="opacity-60" />}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                  {label}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom branding */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            ReHABMe CRM v1.0
          </p>
        </div>
      )}
    </aside>
  )
}
