import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Bell, ChevronDown, LogOut, User, Settings, Menu, CalendarDays, Receipt } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAppointmentsContext } from '../../context/AppointmentsContext'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { formatCurrency } from '../../lib/format'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/notes': 'SOAP Notes',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/patients/new')) return 'New Patient'
  if (pathname.match(/^\/patients\/[^/]+\/edit/)) return 'Edit Patient'
  if (pathname.match(/^\/patients\/[^/]+/)) return 'Patient Details'
  if (pathname.startsWith('/appointments/new')) return 'New Appointment'
  if (pathname.match(/^\/appointments\/[^/]+/)) return 'Appointment Details'
  if (pathname.startsWith('/notes/new')) return 'New SOAP Note'
  if (pathname.match(/^\/notes\/[^/]+/)) return 'SOAP Note Details'
  if (pathname.startsWith('/billing/new')) return 'New Invoice'
  if (pathname.match(/^\/billing\/[^/]+/)) return 'Invoice Details'
  return pageTitles[pathname] || 'ReHABMe'
}

interface HeaderProps {
  onToggleSidebar: () => void
}

interface Notification {
  id: string
  icon: 'appointment' | 'invoice'
  title: string
  detail: string
  to: string
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)

  const { appointments } = useAppointmentsContext()
  const { invoices } = useInvoicesContext()

  const today = format(new Date(), 'yyyy-MM-dd')
  const notifications: Notification[] = [
    ...appointments
      .filter(a => a.appointment_date === today && a.status === 'scheduled')
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
      .map(a => ({
        id: `apt-${a.id}`,
        icon: 'appointment' as const,
        title: `${a.appointment_time} — ${a.patient?.full_name ?? 'Patient'}`,
        detail: `Scheduled today${a.room ? ` · ${a.room}` : ''}`,
        to: '/appointments',
      })),
    ...invoices
      .filter(i => i.status === 'overdue' || (i.status === 'sent' && i.due_date < today))
      .map(i => ({
        id: `inv-${i.id}`,
        icon: 'invoice' as const,
        title: `Invoice ${i.invoice_number} overdue`,
        detail: `${i.patient?.full_name ?? 'Patient'} · ${formatCurrency(i.total_amount)}`,
        to: '/billing',
      })),
  ]

  const pageTitle = getPageTitle(location.pathname)
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setBellOpen(!bellOpen)}
            aria-label={`Notifications${notifications.length ? ` (${notifications.length})` : ''}`}
            className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#3d9cd6] rounded-full" />
            )}
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">Notifications</p>
                  {notifications.length > 0 && (
                    <span className="text-xs text-gray-500">{notifications.length}</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-gray-500">You're all caught up</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => { setBellOpen(false); navigate(n.to) }}
                        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${n.icon === 'appointment' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          {n.icon === 'appointment' ? <CalendarDays size={13} /> : <Receipt size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#3d9cd6] flex items-center justify-center text-white text-xs font-semibold">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
              <p className="text-xs text-gray-500 leading-tight">Administrator</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={14} />
                  My Profile
                </button>
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => { setDropdownOpen(false); signOut() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
