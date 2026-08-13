import React, { useState } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  Users, Plus, Shield, Building2, CheckCircle, Edit, Trash2, KeyRound,
  MessageCircle, MapPin, Send, ExternalLink,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useStaffContext } from '../../context/StaffContext'
import { useAttendanceContext } from '../../context/AttendanceContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useClinicSettings } from '../../hooks/useClinicSettings'
import { staffAdmin } from '../../lib/staffAdmin'
import { normalizePhone } from '../../lib/phone'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { StaffProfile, UserRole } from '../../lib/types'

type SettingsTab = 'staff' | 'attendance' | 'clinic' | 'whatsapp' | 'security'

const fieldClass =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent'
const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

export default function Settings() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [activeTab, setActiveTab] = useState<SettingsTab>('staff')

  const tabs: { key: SettingsTab; label: string; icon: typeof Users; adminOnly?: boolean }[] = [
    { key: 'staff', label: 'Staff Management', icon: Users },
    { key: 'attendance', label: 'Attendance', icon: MapPin, adminOnly: true },
    { key: 'clinic', label: 'Clinic Settings', icon: Building2, adminOnly: true },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, adminOnly: true },
    { key: 'security', label: 'Security', icon: Shield },
  ]
  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit flex-wrap">
        {visibleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-[#3d9cd6] text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && <StaffTab isAdmin={isAdmin} />}
      {activeTab === 'attendance' && isAdmin && <AttendanceTab />}
      {activeTab === 'clinic' && isAdmin && <ClinicTab />}
      {activeTab === 'whatsapp' && isAdmin && <WhatsAppTab />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  )
}

// ============================================================
// STAFF MANAGEMENT
// ============================================================
function StaffTab({ isAdmin }: { isAdmin: boolean }) {
  const { staff, addStaff, updateStaff, deleteStaff, refresh } = useStaffContext()
  const toast = useToast()
  const [showInvite, setShowInvite] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffProfile | null>(null)
  const [resetTarget, setResetTarget] = useState<StaffProfile | null>(null)
  const [resetResult, setResetResult] = useState<{ name: string; password: string; whatsappSent: boolean; whatsappError?: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffProfile | null>(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (isSupabaseConfigured) {
      // Server-side delete removes the login account too — otherwise the
      // phone number stays registered and can never be re-added
      const result = await staffAdmin({ action: 'delete', profile_id: deleteTarget.id })
      setDeleteTarget(null)
      if (result.ok) {
        await refresh()
        toast.success('Staff member and their login removed')
      } else {
        toast.error(result.error ?? 'Could not remove the staff member')
      }
      return
    }
    const ok = await deleteStaff(deleteTarget.id)
    setDeleteTarget(null)
    if (ok) {
      toast.success('Staff member removed')
    } else {
      toast.error('Could not remove the staff member')
    }
  }

  const toggleActive = async (member: StaffProfile) => {
    const result = await updateStaff({ ...member, is_active: !member.is_active })
    if (result) {
      toast.success(`${member.full_name} ${result.is_active ? 'activated' : 'deactivated'}`)
    } else {
      toast.error('Could not update the staff member')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{staff.length} staff members</p>
        {isAdmin && (
          <Button icon={<Plus size={16} />} onClick={() => setShowInvite(true)}>
            Invite Staff Member
          </Button>
        )}
      </div>

      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {staff.map(member => (
            <div key={member.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] font-semibold text-sm flex-shrink-0">
                {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                  {member.role === 'admin' && <Badge variant="primary" size="sm">Admin</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{member.phone || member.email || '—'}</p>
                {member.specialty && <p className="text-xs text-gray-400">{member.specialty}</p>}
              </div>
              <Badge variant={member.is_active ? 'success' : 'default'} dot>
                {member.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Edit staff member"
                    onClick={() => setEditTarget(member)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  {isSupabaseConfigured && (
                    <button
                      aria-label="Reset password"
                      title="Reset password"
                      onClick={() => setResetTarget(member)}
                      className="p-1.5 text-gray-400 hover:text-[#3d9cd6] hover:bg-[#3d9cd6]/10 rounded-lg transition-colors"
                    >
                      <KeyRound size={14} />
                    </button>
                  )}
                  {member.role !== 'admin' && (
                    <button
                      aria-label="Delete staff member"
                      onClick={() => setDeleteTarget(member)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {showInvite && (
        <InviteStaffModal
          onClose={() => setShowInvite(false)}
          addStaffLocally={addStaff}
          refresh={refresh}
        />
      )}

      {editTarget && (
        <EditStaffModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          updateStaff={updateStaff}
          onToggleActive={toggleActive}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          member={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={async result => {
            setResetTarget(null)
            await refresh()
            setResetResult(result)
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove staff member?"
        message={`This removes ${deleteTarget?.full_name ?? ''}'s profile and login account — their number can be re-added later. Appointments and notes remain but lose the therapist link.`}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {resetResult && (
        <CredentialsModal
          title={`New password for ${resetResult.name}`}
          password={resetResult.password}
          whatsappSent={resetResult.whatsappSent}
          whatsappError={resetResult.whatsappError}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  )
}

interface InviteStaffModalProps {
  onClose: () => void
  addStaffLocally: (member: StaffProfile) => Promise<StaffProfile | null>
  refresh: () => Promise<void>
}

function InviteStaffModal({ onClose, addStaffLocally, refresh }: InviteStaffModalProps) {
  const toast = useToast()
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', role: 'therapist' as UserRole, specialty: '', password: '' })
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ password: string; whatsappSent: boolean; whatsappError?: string } | null>(null)

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.full_name.trim()) errs.full_name = 'Name is required'
    if (!normalizePhone(form.phone)) errs.phone = 'Enter a valid mobile number, e.g. 9876543210'
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = 'Enter a valid email or leave it empty'
    if (form.password && form.password.length < 8) errs.password = 'At least 8 characters, or leave empty to auto-generate'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleInvite = async () => {
    if (!validate()) return
    setSending(true)

    if (!isSupabaseConfigured) {
      // Demo mode: create the profile locally, no real account or message
      const now = new Date().toISOString()
      await addStaffLocally({
        id: `staff-${Date.now()}`,
        user_id: `demo-${Date.now()}`,
        full_name: form.full_name.trim(),
        phone: normalizePhone(form.phone) ?? form.phone,
        email: form.email.trim() || undefined,
        role: form.role,
        specialty: form.specialty.trim() || undefined,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      setSending(false)
      toast.success('Staff member added (demo mode — no WhatsApp sent)')
      onClose()
      return
    }

    const response = await staffAdmin({
      action: 'invite',
      full_name: form.full_name.trim(),
      phone: normalizePhone(form.phone) ?? form.phone,
      email: form.email.trim() || null,
      role: form.role,
      specialty: form.specialty.trim() || null,
      password: form.password || null,
      send_whatsapp: sendWhatsApp,
    })
    setSending(false)
    if (!response.ok || !response.temp_password) {
      setErrors({ submit: response.error ?? 'Could not create the staff member' })
      return
    }
    await refresh()
    setResult({
      password: response.temp_password,
      whatsappSent: !!response.whatsapp_sent,
      whatsappError: response.whatsapp_error,
    })
  }

  if (result) {
    return (
      <CredentialsModal
        title={`${form.full_name.trim()} invited`}
        password={result.password}
        whatsappSent={result.whatsappSent}
        whatsappError={result.whatsappError}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Staff Member</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{errors.submit}</p>
            </div>
          )}
          <div>
            <label htmlFor="invite-name" className={labelClass}>Full Name *</label>
            <input id="invite-name" className={fieldClass} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Priya Sharma" />
            {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
          </div>
          <div>
            <label htmlFor="invite-phone" className={labelClass}>WhatsApp Number *</label>
            <input id="invite-phone" className={fieldClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            <p className="text-xs text-gray-400 mt-1">Login credentials are sent to this number. It is also their login ID.</p>
          </div>
          <div>
            <label htmlFor="invite-email" className={labelClass}>Email (optional)</label>
            <input id="invite-email" type="email" className={fieldClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@rehabme.com" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="invite-role" className={labelClass}>Role</label>
              <select id="invite-role" className={fieldClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                <option value="therapist">Therapist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label htmlFor="invite-specialty" className={labelClass}>Specialty</label>
              <input id="invite-specialty" className={fieldClass} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Physiotherapy" />
            </div>
          </div>
          <div>
            <label htmlFor="invite-password" className={labelClass}>Password (optional)</label>
            <input id="invite-password" type="text" autoComplete="off" className={fieldClass} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave empty to auto-generate" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            <p className="text-xs text-gray-400 mt-1">Auto-generated passwords must be changed at first login; a password you set here is final.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded border-gray-300 accent-[#3d9cd6]" />
            <span className="text-sm text-gray-700">Send credentials via WhatsApp</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={sending} icon={<Send size={14} />} onClick={handleInvite}>
            Create Account
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Shows a freshly generated temporary password + WhatsApp delivery status. */
function CredentialsModal({ title, password, whatsappSent, whatsappError, onClose }: {
  title: string
  password: string
  whatsappSent: boolean
  whatsappError?: string
  onClose: () => void
}) {
  const toast = useToast()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div className="flex flex-col items-center text-center">
          <div className={`p-3 rounded-full mb-3 ${whatsappSent ? 'bg-green-50' : 'bg-amber-50'}`}>
            {whatsappSent ? <CheckCircle size={22} className="text-green-500" /> : <MessageCircle size={22} className="text-amber-500" />}
          </div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {whatsappSent
              ? 'The credentials were sent via WhatsApp.'
              : `WhatsApp message was NOT sent${whatsappError ? ` (${whatsappError})` : ''}. Share the temporary password manually:`}
          </p>
          <div className="mt-4 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Temporary password</p>
            <p className="font-mono text-lg font-bold text-gray-900 tracking-wide">{password}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">Auto-generated passwords must be changed at first login.</p>
          <div className="flex gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => { void navigator.clipboard.writeText(password); toast.success('Password copied') }}
            >
              Copy password
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ResetPasswordModalProps {
  member: StaffProfile
  onClose: () => void
  onDone: (result: { name: string; password: string; whatsappSent: boolean; whatsappError?: string }) => Promise<void>
}

function ResetPasswordModal({ member, onClose, onDone }: ResetPasswordModalProps) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReset = async () => {
    if (password && password.length < 8) {
      setError('At least 8 characters, or leave empty to auto-generate')
      return
    }
    setSaving(true)
    setError('')
    const result = await staffAdmin({
      action: 'reset_password',
      profile_id: member.id,
      password: password || null,
      send_whatsapp: sendWhatsApp,
    })
    setSaving(false)
    if (!result.ok || !result.temp_password) {
      toast.error(result.error ?? 'Could not reset the password')
      return
    }
    await onDone({
      name: member.full_name,
      password: result.temp_password,
      whatsappSent: !!result.whatsapp_sent,
      whatsappError: result.whatsapp_error,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Reset Password — {member.full_name}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="reset-password" className={labelClass}>New Password (optional)</label>
            <input id="reset-password" type="text" autoComplete="off" className={fieldClass} value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave empty to auto-generate" />
            <p className="text-xs text-gray-400 mt-1">Auto-generated passwords must be changed at next login; a password you set here is final.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded border-gray-300 accent-[#3d9cd6]" />
            <span className="text-sm text-gray-700">Send new credentials via WhatsApp</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<KeyRound size={14} />} onClick={handleReset}>
            Reset Password
          </Button>
        </div>
      </div>
    </div>
  )
}

interface EditStaffModalProps {
  member: StaffProfile
  onClose: () => void
  updateStaff: (member: StaffProfile) => Promise<StaffProfile | null>
  onToggleActive: (member: StaffProfile) => Promise<void>
}

function EditStaffModal({ member, onClose, updateStaff, onToggleActive }: EditStaffModalProps) {
  const toast = useToast()
  const [form, setForm] = useState({
    full_name: member.full_name,
    phone: member.phone ?? '',
    email: member.email ?? '',
    specialty: member.specialty ?? '',
    role: member.role,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    const newPhone = form.phone.trim() ? normalizePhone(form.phone) : null
    if (form.phone.trim() && !newPhone) {
      setError('Enter a valid mobile number, e.g. 9876543210')
      return
    }
    setSaving(true)
    setError('')

    // The phone is the login identity — in live mode it must change on the
    // auth account too, which only the server can do
    const phoneChanged = (newPhone ?? '') !== (member.phone ?? '')
    if (phoneChanged && newPhone && isSupabaseConfigured) {
      const phoneResult = await staffAdmin({ action: 'update_phone', profile_id: member.id, phone: newPhone })
      if (!phoneResult.ok) {
        setSaving(false)
        setError(phoneResult.error ?? 'Could not update the mobile number')
        return
      }
    }

    const result = await updateStaff({
      ...member,
      full_name: form.full_name.trim(),
      phone: newPhone ?? member.phone,
      email: form.email.trim() || undefined,
      specialty: form.specialty.trim() || undefined,
      role: form.role,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (result) {
      toast.success(phoneChanged ? 'Staff member updated — they now log in with the new number' : 'Staff member updated')
      onClose()
    } else {
      toast.error('Could not update the staff member')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit Staff Member</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="edit-staff-name" className={labelClass}>Full Name</label>
            <input id="edit-staff-name" className={fieldClass} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="edit-staff-phone" className={labelClass}>Mobile Number</label>
            <input id="edit-staff-phone" className={fieldClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            <p className="text-xs text-gray-400 mt-1">This is their login ID — changing it changes how they sign in.</p>
          </div>
          <div>
            <label htmlFor="edit-staff-email" className={labelClass}>Email (optional)</label>
            <input id="edit-staff-email" type="email" className={fieldClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-staff-role" className={labelClass}>Role</label>
              <select id="edit-staff-role" className={fieldClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                <option value="therapist">Therapist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-staff-specialty" className={labelClass}>Specialty</label>
              <input id="edit-staff-specialty" className={fieldClass} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>
          </div>
          <button
            onClick={() => { void onToggleActive(member); onClose() }}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${member.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
          >
            {member.is_active ? 'Deactivate account' : 'Reactivate account'}
          </button>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ATTENDANCE (admin)
// ============================================================
function AttendanceTab() {
  const { attendance, loading } = useAttendanceContext()
  const [dateFilter, setDateFilter] = useState('')

  const filtered = attendance.filter(a => !dateFilter || a.check_in_at.startsWith(dateFilter))

  const duration = (a: { check_in_at: string; check_out_at?: string }): string => {
    if (!a.check_out_at) return 'On duty'
    const mins = differenceInMinutes(parseISO(a.check_out_at), parseISO(a.check_in_at))
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Staff Attendance</h3>
          <p className="text-xs text-gray-500 mt-0.5">GPS check-ins recorded from the header button</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="attendance-date" className="text-xs font-medium text-gray-500">Date</label>
          <input id="attendance-date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]" />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-xs text-gray-500 hover:text-gray-800">Clear</button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Staff', 'Date', 'Check In', 'Check Out', 'Duration', 'Location'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                  {loading ? 'Loading attendance…' : 'No attendance records yet — staff check in from the button in the header'}
                </td>
              </tr>
            ) : (
              filtered.map(a => (
                <tr key={a.id}>
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{a.profile?.full_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{format(parseISO(a.check_in_at), 'MMM d, yyyy')}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{format(parseISO(a.check_in_at), 'h:mm a')}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.check_out_at ? format(parseISO(a.check_out_at), 'h:mm a') : '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={a.check_out_at ? 'default' : 'success'} dot={!a.check_out_at}>{duration(a)}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={`https://maps.google.com/?q=${a.lat},${a.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#3d9cd6] hover:underline"
                    >
                      <MapPin size={11} />
                      Map
                      <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ============================================================
// CLINIC SETTINGS (admin)
// ============================================================
function ClinicTab() {
  const { settings, loading, save } = useClinicSettings()
  const toast = useToast()
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <Card><p className="text-sm text-gray-500 py-6 text-center">Loading clinic settings…</p></Card>
  if (!settings) return <Card><p className="text-sm text-gray-500 py-6 text-center">Could not load clinic settings — run migration 002 in the Supabase SQL editor.</p></Card>

  const current = form ?? {
    clinic_name: settings.clinic_name,
    clinic_phone: settings.clinic_phone ?? '',
    clinic_email: settings.clinic_email ?? '',
    clinic_address: settings.clinic_address ?? '',
    business_hours: settings.business_hours ?? '',
    tax_id: settings.tax_id ?? '',
  }

  const set = (key: string, value: string) => setForm({ ...current, [key]: value })

  const handleSave = async () => {
    setSaving(true)
    const ok = await save(current)
    setSaving(false)
    if (ok) {
      toast.success('Clinic settings saved')
    } else {
      toast.error('Could not save clinic settings')
    }
  }

  const fields = [
    { key: 'clinic_name', label: 'Clinic Name', full: true },
    { key: 'clinic_phone', label: 'Phone' },
    { key: 'clinic_email', label: 'Email' },
    { key: 'clinic_address', label: 'Address', full: true },
    { key: 'business_hours', label: 'Business Hours' },
    { key: 'tax_id', label: 'Tax ID' },
  ]

  return (
    <Card>
      <div className="flex items-center gap-2 mb-5">
        <Building2 size={16} className="text-[#3d9cd6]" />
        <h3 className="text-sm font-semibold text-gray-900">Clinic Information</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
            <label htmlFor={`clinic-${f.key}`} className={labelClass}>{f.label}</label>
            <input id={`clinic-${f.key}`} className={fieldClass} value={current[f.key]} onChange={e => set(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end max-w-2xl">
        <Button loading={saving} onClick={handleSave}>Save Changes</Button>
      </div>
    </Card>
  )
}

// ============================================================
// WHATSAPP (admin)
// ============================================================
function WhatsAppTab() {
  const { settings, loading, save } = useClinicSettings()
  const toast = useToast()
  const [form, setForm] = useState<Record<string, string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [testTo, setTestTo] = useState('+91')
  const [testing, setTesting] = useState(false)

  if (loading) return <Card><p className="text-sm text-gray-500 py-6 text-center">Loading WhatsApp settings…</p></Card>
  if (!settings) return <Card><p className="text-sm text-gray-500 py-6 text-center">Could not load settings — run migration 002 in the Supabase SQL editor.</p></Card>

  const current = form ?? {
    whatsapp_phone_number_id: settings.whatsapp_phone_number_id ?? '',
    whatsapp_access_token: settings.whatsapp_access_token ?? '',
    whatsapp_template_invite: settings.whatsapp_template_invite || 'staff_invite',
  }
  const configured = !!current.whatsapp_phone_number_id && !!current.whatsapp_access_token

  const handleSave = async () => {
    setSaving(true)
    const ok = await save(current)
    setSaving(false)
    if (ok) {
      toast.success('WhatsApp settings saved')
    } else {
      toast.error('Could not save WhatsApp settings')
    }
  }

  const handleTest = async () => {
    setTesting(true)
    const result = await staffAdmin({ action: 'test_whatsapp', to: testTo.replace(/[\s-]/g, '') })
    setTesting(false)
    if (result.whatsapp_sent) {
      toast.success(`Test message sent to ${testTo}`)
    } else {
      toast.error(result.whatsapp_error ?? result.error ?? 'Test message failed')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={16} className="text-[#3d9cd6]" />
          <h3 className="text-sm font-semibold text-gray-900">WhatsApp Business Cloud API</h3>
          <Badge variant={configured ? 'success' : 'default'} dot size="sm">{configured ? 'Configured' : 'Not configured'}</Badge>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Staff invites and password resets are delivered from this number. Setup instructions:{' '}
          <a href="https://github.com/sraj9/ReHABMe/blob/main/docs/WHATSAPP_SETUP.md" target="_blank" rel="noreferrer" className="text-[#3d9cd6] hover:underline">WHATSAPP_SETUP.md</a>
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="wa-phone-id" className={labelClass}>Phone Number ID</label>
            <input id="wa-phone-id" className={fieldClass} value={current.whatsapp_phone_number_id} onChange={e => setForm({ ...current, whatsapp_phone_number_id: e.target.value })} placeholder="e.g. 123456789012345" />
            <p className="text-xs text-gray-400 mt-1">From Meta for Developers → WhatsApp → API Setup (this is NOT the phone number itself)</p>
          </div>
          <div>
            <label htmlFor="wa-token" className={labelClass}>Permanent Access Token</label>
            <input id="wa-token" type="password" className={fieldClass} value={current.whatsapp_access_token} onChange={e => setForm({ ...current, whatsapp_access_token: e.target.value })} placeholder="EAAG…" />
            <p className="text-xs text-gray-400 mt-1">Stored server-side, only admins can read it</p>
          </div>
          <div>
            <label htmlFor="wa-template" className={labelClass}>Invite Template Name</label>
            <input id="wa-template" className={fieldClass} value={current.whatsapp_template_invite} onChange={e => setForm({ ...current, whatsapp_template_invite: e.target.value })} placeholder="staff_invite" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button loading={saving} onClick={handleSave}>Save WhatsApp Settings</Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Send a test message</h3>
        <p className="text-xs text-gray-500 mb-4">Save the settings above first, then verify delivery to your own WhatsApp.</p>
        <div className="flex gap-2">
          <input
            aria-label="Test recipient phone number"
            className={`${fieldClass} flex-1`}
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            placeholder="9876543210"
          />
          <Button variant="outline" loading={testing} icon={<Send size={14} />} onClick={handleTest} disabled={!isSupabaseConfigured}>
            Send Test
          </Button>
        </div>
        {!isSupabaseConfigured && <p className="text-xs text-amber-600 mt-2">Available in live mode only</p>}
      </Card>
    </div>
  )
}

// ============================================================
// SECURITY
// ============================================================
function SecurityTab() {
  const { changePassword } = useAuth()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    const { error: err } = await changePassword(password)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setPassword('')
    setConfirm('')
    toast.success('Password updated')
  }

  return (
    <Card className="max-w-md">
      <div className="flex items-center gap-2 mb-5">
        <KeyRound size={16} className="text-[#3d9cd6]" />
        <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        <div>
          <label htmlFor="security-new-password" className={labelClass}>New Password</label>
          <input id="security-new-password" type="password" autoComplete="new-password" className={fieldClass} value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="security-confirm-password" className={labelClass}>Confirm New Password</label>
          <input id="security-confirm-password" type="password" autoComplete="new-password" className={fieldClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>Update Password</Button>
        </div>
      </form>
      {!isSupabaseConfigured && (
        <p className="text-xs text-amber-600 mt-3">Demo mode: password changes are not persisted</p>
      )}
    </Card>
  )
}
