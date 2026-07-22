import { useState } from 'react'
import { Users, Plus, Settings as SettingsIcon, Shield, Bell, Building2, Mail, CheckCircle, Edit, Trash2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useStaffContext } from '../../context/StaffContext'
import type { UserRole } from '../../lib/types'

type SettingsTab = 'staff' | 'clinic' | 'notifications' | 'security'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('staff')
  const { staff } = useStaffContext()
  const [showInviteModal, setShowInviteModal] = useState(false)

  const tabs = [
    { key: 'staff' as const, label: 'Staff Management', icon: Users },
    { key: 'clinic' as const, label: 'Clinic Settings', icon: Building2 },
    { key: 'notifications' as const, label: 'Notifications', icon: Bell },
    { key: 'security' as const, label: 'Security', icon: Shield },
  ]

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
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

      {/* Staff Management */}
      {activeTab === 'staff' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{staff.length} staff members</p>
            <Button icon={<Plus size={16} />} onClick={() => setShowInviteModal(true)}>
              Invite Staff Member
            </Button>
          </div>

          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {staff.map(member => (
                <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] font-semibold text-sm flex-shrink-0">
                    {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                      {member.role === 'admin' && (
                        <Badge variant="primary" size="sm">Admin</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    {member.specialty && (
                      <p className="text-xs text-gray-400">{member.specialty}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm font-medium text-gray-700 capitalize">{member.role}</p>
                  </div>

                  {/* Status */}
                  <Badge variant={member.is_active ? 'success' : 'default'} dot>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button aria-label="Edit staff member" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit size={14} />
                    </button>
                    {member.role !== 'admin' && (
                      <button aria-label="Delete staff member" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Roles explanation */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Role Permissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#3d9cd6]/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={16} className="text-[#3d9cd6]" />
                  <p className="text-sm font-semibold text-gray-900">Administrator</p>
                </div>
                <ul className="space-y-1.5">
                  {[
                    'Full system access',
                    'Manage staff accounts',
                    'View all patient records',
                    'Access billing & reports',
                    'Configure system settings',
                  ].map(perm => (
                    <li key={perm} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-gray-500" />
                  <p className="text-sm font-semibold text-gray-900">Therapist</p>
                </div>
                <ul className="space-y-1.5">
                  {[
                    'View assigned patients',
                    'Manage appointments',
                    'Create & edit SOAP notes',
                    'View own schedule',
                    'Limited billing access',
                  ].map(perm => (
                    <li key={perm} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle size={11} className="text-green-500 flex-shrink-0" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Clinic Settings */}
      {activeTab === 'clinic' && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-[#3d9cd6]" />
            <h3 className="text-sm font-semibold text-gray-900">Clinic Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {[
              { label: 'Clinic Name', value: 'ReHABMe Rehabilitation and Physiotherapy Center', full: true },
              { label: 'Phone', value: '+1 (555) 123-4567' },
              { label: 'Email', value: 'info@rehabme.com' },
              { label: 'Address', value: '100 Health Boulevard, Springfield, IL 62701', full: true },
              { label: 'Business Hours', value: 'Mon–Fri: 8am–6pm, Sat: 9am–2pm' },
              { label: 'Tax ID', value: '12-3456789' },
            ].map(field => (
              <div key={field.label} className={field.full ? 'sm:col-span-2' : ''}>
                <label htmlFor={`clinic-${field.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  id={`clinic-${field.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]"
                  defaultValue={field.value}
                />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </Card>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Bell size={16} className="text-[#3d9cd6]" />
            <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
          </div>
          <div className="space-y-4 max-w-lg">
            {[
              { label: 'Appointment Reminders', desc: 'Email patients 24h before appointments', enabled: true },
              { label: 'New Patient Registration', desc: 'Notify admin when new patients are added', enabled: true },
              { label: 'Overdue Invoice Alerts', desc: 'Daily digest of overdue invoices', enabled: true },
              { label: 'No-Show Notifications', desc: 'Alert therapist when patient is a no-show', enabled: false },
              { label: 'Monthly Reports', desc: 'Monthly summary of clinic performance', enabled: true },
              { label: 'System Updates', desc: 'Notifications about system maintenance', enabled: false },
            ].map(notif => (
              <div key={notif.label} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{notif.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" defaultChecked={notif.enabled} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3d9cd6]" />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button>Save Preferences</Button>
          </div>
        </Card>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-5 max-w-2xl">
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="security-current_password" className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
                <input id="security-current_password" type="password" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]" />
              </div>
              <div>
                <label htmlFor="security-new_password" className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <input id="security-new_password" type="password" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]" />
              </div>
              <div>
                <label htmlFor="security-confirm_new_password" className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input id="security-confirm_new_password" type="password" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]" />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button>Update Password</Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-5">
              <SettingsIcon size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Session & Security</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security', enabled: false },
                { label: 'Auto-logout after inactivity', desc: 'Logout after 30 minutes of inactivity', enabled: true },
                { label: 'Login notifications', desc: 'Email me when my account is accessed', enabled: true },
              ].map(setting => (
                <div key={setting.label} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{setting.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked={setting.enabled} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3d9cd6]" />
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <InviteStaffModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  )
}

function InviteStaffModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', role: 'therapist' as UserRole, specialty: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    setSending(true)
    await new Promise(r => setTimeout(r, 800))
    setSending(false)
    setSent(true)
    setTimeout(onClose, 1500)
  }

  const fieldClass = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Invite Staff Member</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">Invitation sent!</p>
              <p className="text-xs text-gray-500 mt-1">They'll receive an email to set up their account.</p>
            </div>
          ) : (
            <>
              <div>
                <label className={labelClass} htmlFor="invite-full_name">Full Name *</label>
                <input id="invite-full_name" className={fieldClass} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Jane Smith" />
              </div>
              <div>
                <label className={labelClass} htmlFor="invite-email">Email Address *</label>
                <input id="invite-email" type="email" className={fieldClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@rehabme.com" />
              </div>
              <div>
                <label className={labelClass} htmlFor="invite-role">Role</label>
                <select id="invite-role" className={fieldClass} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                  <option value="therapist">Therapist</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="invite-specialty">Specialty</label>
                <input id="invite-specialty" className={fieldClass} value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Physiotherapy, OT, Speech..." />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button icon={<Mail size={14} />} loading={sending} onClick={handleSend}>
                  Send Invitation
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
