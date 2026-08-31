import React, { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Save, ScanLine, Upload, User, Shield, Stethoscope } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import { usePatientsContext } from '../../context/PatientsContext'
import { useToast } from '../../context/ToastContext'
import { scanAssessmentSheet } from '../../lib/scanPatient'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Gender } from '../../lib/types'

interface FormData {
  full_name: string
  date_of_birth: string
  gender: Gender
  phone: string
  email: string
  address: string
  insurance_provider: string
  insurance_policy_number: string
  insurance_group_number: string
  referring_physician: string
  primary_diagnosis: string
  medical_history: string
  allergies: string
  medications: string
  notes: string
}

const defaultForm: FormData = {
  full_name: '',
  date_of_birth: '',
  gender: 'prefer_not_to_say',
  phone: '',
  email: '',
  address: '',
  insurance_provider: '',
  insurance_policy_number: '',
  insurance_group_number: '',
  referring_physician: '',
  primary_diagnosis: '',
  medical_history: '',
  allergies: '',
  medications: '',
  notes: '',
}

export default function PatientForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const { patients, addPatient, updatePatient, error: storeError } = usePatientsContext()
  const toast = useToast()

  const existingPatient = isEdit ? patients.find(p => p.id === id) : null

  const [form, setForm] = useState<FormData>(() => {
    if (existingPatient) {
      return {
        full_name: existingPatient.full_name,
        date_of_birth: existingPatient.date_of_birth || '',
        gender: existingPatient.gender,
        phone: existingPatient.phone || '',
        email: existingPatient.email || '',
        address: existingPatient.address || '',
        insurance_provider: existingPatient.insurance_provider || '',
        insurance_policy_number: existingPatient.insurance_policy_number || '',
        insurance_group_number: existingPatient.insurance_group_number || '',
        referring_physician: existingPatient.referring_physician || '',
        primary_diagnosis: existingPatient.primary_diagnosis || '',
        medical_history: existingPatient.medical_history || '',
        allergies: existingPatient.allergies || '',
        medications: existingPatient.medications || '',
        notes: existingPatient.notes || '',
      }
    }
    return defaultForm
  })

  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    setScanning(true)
    setScanError('')
    const result = await scanAssessmentSheet(file)
    setScanning(false)
    if (!result.ok || !result.fields) {
      setScanError(result.error || 'Could not read the sheet — try a clearer photo.')
      return
    }
    const fields = result.fields
    const text = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '')
    // Collect the updates first — counting inside the setForm updater would
    // read 0 because React applies the updater after this handler returns
    const updates: Partial<FormData> = {}
    let filled = 0
    for (const key of Object.keys(defaultForm) as (keyof FormData)[]) {
      if (key === 'gender' || key === 'address' || key === 'notes') continue
      const value = fields[key]
      if (typeof value === 'string' && value.trim()) {
        updates[key] = value.trim()
        filled++
      }
    }
    if (fields.gender) {
      updates.gender = fields.gender
      filled++
    }
    // The form keeps a single Address field — fold scanned city/state/PIN into it
    const addressParts = [text(fields.address), text(fields.city), text(fields.state), text(fields.zip)].filter(Boolean)
    if (addressParts.length) {
      updates.address = addressParts.join(', ')
      filled++
    }
    // No emergency-contact fields on the form — keep what the sheet says in Notes
    const emergency = [text(fields.emergency_contact_name), text(fields.emergency_contact_phone)].filter(Boolean).join(' ')
    const noteParts = [text(fields.notes), emergency ? `Emergency contact: ${emergency}` : ''].filter(Boolean)
    if (noteParts.length) {
      updates.notes = noteParts.join(' • ')
      filled++
    }
    setForm(f => ({ ...f, ...updates }))
    setErrors({})
    if (filled === 0) {
      setScanError('No details could be read from that image — try a clearer photo of the sheet.')
    } else {
      toast.success(`${filled} field${filled === 1 ? '' : 's'} filled from the sheet — please review before saving`)
    }
  }

  const update = (field: keyof FormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {}
    if (!form.full_name.trim()) newErrors.full_name = 'Full name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSubmitError('')

    const now = new Date().toISOString()
    let result
    // Blank mobile number / date of birth are stored as null (both optional,
    // can be filled in later via Edit Patient)
    const phone = form.phone.trim() || null
    const dateOfBirth = form.date_of_birth || null
    if (isEdit && existingPatient) {
      result = await updatePatient({ ...existingPatient, ...form, phone, date_of_birth: dateOfBirth, updated_at: now })
    } else {
      const nextNum = patients.length + 1
      result = await addPatient({
        ...form,
        phone,
        date_of_birth: dateOfBirth,
        id: `patient-${Date.now()}`,
        mrn: `RHB-${String(nextNum).padStart(6, '0')}`,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }

    setSaving(false)
    if (!result) {
      setSubmitError('Could not save the patient. Please check your connection and try again.')
      return
    }
    toast.success(isEdit ? 'Patient updated' : `Patient ${result.full_name} created`)
    navigate(isEdit ? `/patients/${id}` : '/patients')
  }

  const fieldClass = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(isEdit ? `/patients/${id}` : '/patients')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          {isEdit ? 'Back to Patient' : 'Back to Patients'}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(isEdit ? `/patients/${id}` : '/patients')}>
            Cancel
          </Button>
          <Button icon={<Save size={15} />} loading={saving} onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Patient'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Scan assessment sheet */}
        {!isEdit && isSupabaseConfigured && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="p-1.5 bg-[#b7f383]/40 rounded-lg">
                  <ScanLine size={15} className="text-[#3d9cd6]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Have an assessment sheet?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Snap a photo or upload a scan — the details below will be filled in automatically for you to review.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  loading={scanning}
                  icon={<Camera size={14} />}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  loading={scanning}
                  icon={<Upload size={14} />}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  Upload
                </Button>
              </div>
            </div>
            {scanning && (
              <p className="text-xs text-[#3d9cd6] mt-3">Reading the sheet — this takes a few seconds…</p>
            )}
            {scanError && <p className="text-xs text-red-600 mt-3">{scanError}</p>}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              aria-label="Take a photo of the assessment sheet"
              onChange={handleScanFile}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload an image of the assessment sheet"
              onChange={handleScanFile}
            />
          </Card>
        )}

        {/* Personal Information */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 bg-[#3d9cd6]/10 rounded-lg">
              <User size={15} className="text-[#3d9cd6]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-full_name">Full Name <span className="text-red-500">*</span></label>
              <input id="patient-full_name" className={`${fieldClass} ${errors.full_name ? 'border-red-400' : ''}`} value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="e.g. Jane Smith" />
              {errors.full_name && <p className={errorClass}>{errors.full_name}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-date_of_birth">Date of Birth</label>
              <input id="patient-date_of_birth" type="date" className={`${fieldClass} ${errors.date_of_birth ? 'border-red-400' : ''}`} value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
              {errors.date_of_birth && <p className={errorClass}>{errors.date_of_birth}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-gender">Gender</label>
              <select id="patient-gender" className={fieldClass} value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-phone">Mobile Number</label>
              <input id="patient-phone" className={`${fieldClass} ${errors.phone ? 'border-red-400' : ''}`} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9876543210" />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-email">Email</label>
              <input id="patient-email" type="email" className={fieldClass} value={form.email} onChange={e => update('email', e.target.value)} placeholder="patient@email.com" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass} htmlFor="patient-address">Address</label>
              <input id="patient-address" className={fieldClass} value={form.address} onChange={e => update('address', e.target.value)} placeholder="B-14 Shanti Nagar Society, Ahmedabad" />
            </div>
          </div>
        </Card>

        {/* Insurance */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 bg-[#3d9cd6]/10 rounded-lg">
              <Shield size={15} className="text-[#3d9cd6]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Insurance Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-insurance_provider">Insurance Provider</label>
              <input id="patient-insurance_provider" className={fieldClass} value={form.insurance_provider} onChange={e => update('insurance_provider', e.target.value)} placeholder="BlueCross BlueShield" />
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-insurance_policy_number">Policy Number</label>
              <input id="patient-insurance_policy_number" className={fieldClass} value={form.insurance_policy_number} onChange={e => update('insurance_policy_number', e.target.value)} placeholder="BCB-123456789" />
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-insurance_group_number">Group Number</label>
              <input id="patient-insurance_group_number" className={fieldClass} value={form.insurance_group_number} onChange={e => update('insurance_group_number', e.target.value)} placeholder="GRP-001" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-referring_physician">Referring Physician</label>
              <input id="patient-referring_physician" className={fieldClass} value={form.referring_physician} onChange={e => update('referring_physician', e.target.value)} placeholder="Dr. Alan Thompson" />
            </div>
          </div>
        </Card>

        {/* Medical Information */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1.5 bg-[#3d9cd6]/10 rounded-lg">
              <Stethoscope size={15} className="text-[#3d9cd6]" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Medical Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-primary_diagnosis">Primary Diagnosis</label>
              <input id="patient-primary_diagnosis" className={fieldClass} value={form.primary_diagnosis} onChange={e => update('primary_diagnosis', e.target.value)} placeholder="e.g. Lumbar Disc Herniation" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-medical_history">Medical History</label>
              <textarea
                id="patient-medical_history"
                className={`${fieldClass} resize-y`}
                rows={3}
                value={form.medical_history}
                onChange={e => update('medical_history', e.target.value)}
                placeholder="Previous conditions, surgeries, relevant medical history..."
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-allergies">Allergies</label>
              <textarea
                id="patient-allergies"
                className={`${fieldClass} resize-y`}
                rows={2}
                value={form.allergies}
                onChange={e => update('allergies', e.target.value)}
                placeholder="List any known allergies..."
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="patient-medications">Current Medications</label>
              <textarea
                id="patient-medications"
                className={`${fieldClass} resize-y`}
                rows={2}
                value={form.medications}
                onChange={e => update('medications', e.target.value)}
                placeholder="List current medications and dosages..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="patient-notes">Additional Notes</label>
              <textarea
                id="patient-notes"
                className={`${fieldClass} resize-y`}
                rows={2}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Any other relevant notes..."
              />
            </div>
          </div>
        </Card>

        {/* Submit */}
        {submitError && (
          <p className="text-sm text-red-600 text-right">
            {submitError}
            {storeError ? ` (${storeError})` : ''}
          </p>
        )}
        <div className="flex justify-end gap-3 pb-4">
          <Button variant="outline" type="button" onClick={() => navigate(isEdit ? `/patients/${id}` : '/patients')}>
            Cancel
          </Button>
          <Button type="submit" icon={<Save size={15} />} loading={saving}>
            {isEdit ? 'Save Changes' : 'Create Patient'}
          </Button>
        </div>
      </form>
    </div>
  )
}
