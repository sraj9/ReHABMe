import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO, addDays, isSameDay } from 'date-fns'
import {
  Play, Search, ChevronLeft, ChevronRight, Users, Package,
  Pencil, Trash2, Undo2,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import StartSessionModal from '../../components/StartSessionModal'
import EditSessionModal from '../../components/EditSessionModal'
import { useSessionsContext } from '../../context/SessionsContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import type { PatientSession } from '../../lib/types'

const PAGE_SIZE = 15
const UNDO_WINDOW_MS = 60_000

const toInputDate = (d: Date) => format(d, 'yyyy-MM-dd')

export default function SessionList() {
  const navigate = useNavigate()
  const { sessions, loading, deleteSession } = useSessionsContext()
  const { profile } = useAuth()
  const toast = useToast()
  const isAdmin = profile?.role === 'admin'

  const [day, setDay] = useState(() => toInputDate(new Date()))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showStartSession, setShowStartSession] = useState(false)
  const [editTarget, setEditTarget] = useState<PatientSession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PatientSession | null>(null)
  // Ticks so the therapist's 1-minute undo window closes on screen
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [])

  const selected = parseISO(`${day}T00:00:00`)
  const isToday = isSameDay(selected, new Date())

  const daySessions = sessions
    .filter(s => isSameDay(parseISO(s.session_at), selected))
    .sort((a, b) => parseISO(b.session_at).getTime() - parseISO(a.session_at).getTime())

  const q = search.trim().toLowerCase()
  const filtered = q
    ? daySessions.filter(s =>
        (s.patient?.full_name ?? '').toLowerCase().includes(q) ||
        (s.therapist?.full_name ?? '').toLowerCase().includes(q)
      )
    : daySessions

  // Clamp rather than reset-in-effect so a day/search change can't leave us past the last page
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const packageCount = daySessions.filter(s => s.package_id).length
  const uniquePatients = new Set(daySessions.map(s => s.patient_id)).size

  const shiftDay = (delta: number) => {
    setDay(toInputDate(addDays(selected, delta)))
    setPage(1)
  }

  const canUndo = (s: PatientSession) =>
    !isAdmin &&
    !!profile &&
    s.created_by === profile.user_id &&
    nowMs - parseISO(s.created_at).getTime() < UNDO_WINDOW_MS

  const removeSession = async (s: PatientSession, isUndo: boolean) => {
    const ok = await deleteSession(s.id)
    if (ok) toast.success(isUndo ? 'Session removed' : 'Session deleted')
    else toast.error(isUndo ? 'Could not undo — the 1-minute window may have passed' : 'Could not delete the session')
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isToday ? "Today's Sessions" : 'Sessions'}
          value={daySessions.length}
          subtitle={format(selected, 'EEEE, MMM d, yyyy')}
          icon={<Play size={24} />}
          color="green"
        />
        <StatCard
          title="From Packages"
          value={packageCount}
          subtitle={`${daySessions.length - packageCount} walk-in`}
          icon={<Package size={24} />}
          color="primary"
        />
        <StatCard
          title="Patients Seen"
          value={uniquePatients}
          subtitle="one session per patient per day"
          icon={<Users size={24} />}
          color="purple"
        />
      </div>

      {/* Day picker + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftDay(-1)}
            aria-label="Previous day"
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            aria-label="Session date"
            value={day}
            onChange={e => { setDay(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
          />
          <button
            onClick={() => shiftDay(1)}
            aria-label="Next day"
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
          {!isToday && (
            <button
              onClick={() => { setDay(toInputDate(new Date())); setPage(1) }}
              className="ml-1 px-3 py-2 rounded-lg text-xs font-medium text-[#3d9cd6] hover:bg-[#3d9cd6]/10"
            >
              Today
            </button>
          )}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by patient or therapist…"
            aria-label="Search sessions"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
          />
        </div>
        <Button icon={<Play size={14} />} onClick={() => setShowStartSession(true)}>
          Start Session
        </Button>
      </div>

      {/* Session table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Therapist</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    {loading
                      ? 'Loading sessions…'
                      : q
                        ? 'No sessions match your search'
                        : isToday
                          ? 'No sessions logged today yet — use Start Session when a patient arrives'
                          : `No sessions on ${format(selected, 'MMM d, yyyy')}`}
                  </td>
                </tr>
              ) : (
                paged.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(parseISO(s.session_at), 'h:mm a')}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/patients/${s.patient_id}`)}
                        className="text-sm font-medium text-[#3d9cd6] hover:underline text-left"
                      >
                        {s.patient?.full_name ?? 'Unknown patient'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {s.therapist?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={s.package_id ? 'info' : 'warning'} size="sm">
                        {s.package_id ? (s.package?.name ?? 'Package') : 'Walk-in'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 max-w-xs truncate">
                      {s.notes || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditTarget(s)}
                              title="Edit session"
                              aria-label="Edit session"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#3d9cd6] hover:bg-[#3d9cd6]/10 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(s)}
                              title="Delete session"
                              aria-label="Delete session"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        {canUndo(s) && (
                          <button
                            onClick={() => void removeSession(s, true)}
                            title="Remove this session — available for 1 minute after logging"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                          >
                            <Undo2 size={13} />
                            Undo
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          label="sessions"
        />
      </Card>

      {showStartSession && <StartSessionModal onClose={() => setShowStartSession(false)} />}
      {editTarget && <EditSessionModal session={editTarget} onClose={() => setEditTarget(null)} />}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this session?"
        message={deleteTarget
          ? `${deleteTarget.patient?.full_name ?? 'This patient'}'s session on ${format(parseISO(deleteTarget.session_at), 'MMM d, yyyy • h:mm a')} will be removed${deleteTarget.package_id ? ' and returned to the package' : ''}.`
          : ''}
        onConfirm={() => {
          if (deleteTarget) void removeSession(deleteTarget, false)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
