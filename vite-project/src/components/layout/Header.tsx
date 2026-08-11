import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Bell, ChevronDown, LogOut, User, Settings, Menu, CalendarDays, Receipt, MapPin } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAppointmentsContext } from '../../context/AppointmentsContext'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { useAttendanceContext } from '../../context/AttendanceContext'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../lib/format'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/notes': 'SOAP Notes',
  '/billing': 'Billing',
  '/accounts': 'Accounts',
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
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [locating, setLocating] = useState(false)

  const { appointments } = useAppointmentsContext()
  const { invoices } = useInvoicesContext()
  const { attendance, addAttendance, updateAttendance } = useAttendanceContext()

  // A session without a check-out means this person is currently checked in
  const openSession = profile
    ? attendance.find(a => a.profile_id === profile.id && !a.check_out_at)
    : undefined

  const handleCheckInOut = () => {
    if (!profile) return
    if (!('geolocation' in navigator)) {
      toast.error('Location is not supported on this device — attendance requires it')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } = position.coords
        if (openSession) {
          const result = await updateAttendance({
            ...openSession,
            check_out_at: new Date().toISOString(),
            check_out_lat: latitude,
            check_out_lng: longitude,
          })
          if (result) {
            toast.success('Checked out — see you next time!')
          } else {
            toast.error('Could not record your check-out')
          }
        } else {
          const now = new Date().toISOString()
          const result = await addAttendance({
            id: `att-${Date.now()}`,
            profile_id: profile.id,
            check_in_at: now,
            lat: latitude,
            lng: longitude,
            accuracy_m: accuracy,
            created_at: now,
            profile,
          })
          if (result) {
            toast.success('Checked in — attendance recorded')
          } else {
            toast.error('Could not record your check-in')
          }
        }
        setLocating(false)
      },
      geoError => {
        setLocating(false)
        toast.error(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission is required for attendance — enable it for this site and try again'
            : 'Could not get your location. Move to an open area and try again.'
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

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
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between gap-2 px-3 sm:px-5 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Attendance check-in / check-out — staff only, admins don't clock in */}
        {profile?.role !== 'admin' && (
        <button
          onClick={handleCheckInOut}
          disabled={locating}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 ${
            openSession
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : 'bg-[#3d9cd6]/10 text-[#1e7ab4] border border-[#3d9cd6]/20 hover:bg-[#3d9cd6]/20'
          }`}
          title={openSession ? `Checked in at ${format(new Date(openSession.check_in_at), 'h:mm a')}` : 'Check in with your location for attendance'}
        >
          <MapPin size={13} />
          {locating ? 'Getting location…' : openSession ? 'Check Out' : 'Check In'}
        </button>
        )}

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
              <p className="text-xs text-gray-500 leading-tight">{profile?.role === 'admin' ? 'Administrator' : 'Therapist'}</p>
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
