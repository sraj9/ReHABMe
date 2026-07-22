import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Users, CalendarDays, Receipt, TrendingUp, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import Card, { CardHeader } from '../components/ui/Card'
import Badge, { getAppointmentStatusBadge } from '../components/ui/Badge'
import { formatCurrency } from '../lib/format'
import { deriveRecentActivity } from '../lib/activity'
import { useAuth } from '../hooks/useAuth'
import { usePatientsContext } from '../context/PatientsContext'
import { useAppointmentsContext } from '../context/AppointmentsContext'
import { useNotesContext } from '../context/NotesContext'
import { useInvoicesContext } from '../context/InvoicesContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { user } = useAuth()
  const { patients } = usePatientsContext()
  const { appointments } = useAppointmentsContext()
  const { notes } = useNotesContext()
  const { invoices } = useInvoicesContext()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const userName = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'there'

  const todaysAppointments = appointments.filter(a => a.appointment_date === today)
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_amount, 0)
  const recentActivity = deriveRecentActivity(patients, appointments, notes, invoices)

  const appointmentTypeLabels: Record<string, string> = {
    initial_assessment: 'Initial Assessment',
    follow_up: 'Follow Up',
    physiotherapy: 'Physiotherapy',
    occupational_therapy: 'OT',
    speech_therapy: 'Speech Therapy',
    hydrotherapy: 'Hydrotherapy',
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'appointment': return <CalendarDays size={14} />
      case 'patient': return <Users size={14} />
      case 'invoice': return <Receipt size={14} />
      case 'note': return <Activity size={14} />
      default: return <Activity size={14} />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'appointment': return 'bg-blue-100 text-blue-600'
      case 'patient': return 'bg-green-100 text-green-600'
      case 'invoice': return 'bg-amber-100 text-amber-600'
      case 'note': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#3d9cd6] to-[#1e7ab4] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{greeting}, {userName}!</h2>
            <p className="text-blue-100 text-sm mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} &mdash; You have {todaysAppointments.filter(a => a.status === 'scheduled').length} appointments scheduled today
            </p>
          </div>
          <div className="hidden sm:block">
            <img src="/logo.svg" alt="" className="h-16 w-auto opacity-30 object-contain" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={patients.length}
          subtitle={`${patients.filter(p => p.is_active).length} active`}
          icon={<Users size={24} />}
          color="primary"
        />
        <StatCard
          title="Today's Appointments"
          value={todaysAppointments.length}
          subtitle={`${todaysAppointments.filter(a => a.status === 'scheduled').length} scheduled`}
          icon={<CalendarDays size={24} />}
          color="green"
        />
        <StatCard
          title="Pending Invoices"
          value={pendingInvoices.length}
          subtitle={`${formatCurrency(pendingInvoices.reduce((s, i) => s + i.total_amount, 0))} outstanding`}
          icon={<Receipt size={24} />}
          color="amber"
        />
        <StatCard
          title="Revenue Collected"
          value={formatCurrency(totalRevenue)}
          subtitle={`${invoices.filter(i => i.status === 'paid').length} paid invoices`}
          icon={<TrendingUp size={24} />}
          color="purple"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's appointments */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Today's Schedule</h3>
                <p className="text-xs text-gray-500 mt-0.5">{format(new Date(), 'MMMM d, yyyy')}</p>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-sm text-[#3d9cd6] hover:underline font-medium"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {todaysAppointments.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-500">
                  No appointments scheduled for today
                </div>
              ) : (
                todaysAppointments.map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => navigate('/appointments')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.key === ' ') e.preventDefault()
                        navigate('/appointments')
                      }
                    }}
                    className="px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d9cd6] focus-visible:ring-inset"
                  >
                    {/* Time */}
                    <div className="flex-shrink-0 w-14 text-center">
                      <p className="text-sm font-semibold text-gray-900">{apt.appointment_time}</p>
                      <p className="text-xs text-gray-500">{apt.duration_minutes}min</p>
                    </div>

                    {/* Divider */}
                    <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                      apt.status === 'completed' ? 'bg-green-400' :
                      apt.status === 'cancelled' ? 'bg-red-400' :
                      apt.status === 'no-show' ? 'bg-amber-400' :
                      'bg-[#3d9cd6]'
                    }`} />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{apt.patient?.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {appointmentTypeLabels[apt.type]} &bull; {apt.therapist?.full_name} &bull; {apt.room}
                      </p>
                    </div>

                    {/* Status */}
                    <Badge variant={getAppointmentStatusBadge(apt.status)} dot>
                      {apt.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-4 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">No activity yet</p>
              ) : (
                recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 font-medium leading-relaxed">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {activity.user_name ? `${activity.user_name} • ` : ''}{format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick stats */}
          <Card className="mt-4">
            <CardHeader title="Quick Overview" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={14} className="text-green-500" />
                  Completed today
                </div>
                <span className="text-sm font-semibold">{todaysAppointments.filter(a => a.status === 'completed').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} className="text-blue-500" />
                  Remaining today
                </div>
                <span className="text-sm font-semibold">{todaysAppointments.filter(a => a.status === 'scheduled').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <AlertCircle size={14} className="text-red-500" />
                  Overdue invoices
                </div>
                <span className="text-sm font-semibold text-red-600">{invoices.filter(i => i.status === 'overdue').length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Pending invoices */}
      {pendingInvoices.length > 0 && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Outstanding Invoices</h3>
              <p className="text-xs text-gray-500 mt-0.5">Invoices requiring attention</p>
            </div>
            <button onClick={() => navigate('/billing')} className="text-sm text-[#3d9cd6] hover:underline font-medium">
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingInvoices.map(inv => (
              <div
                key={inv.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d9cd6] focus-visible:ring-inset"
                onClick={() => navigate('/billing')}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault()
                    navigate('/billing')
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{inv.patient?.full_name} &bull; Due {format(parseISO(inv.due_date), 'MMM d, yyyy')}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</p>
                <Badge variant={inv.status === 'overdue' ? 'danger' : 'info'} dot>
                  {inv.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
