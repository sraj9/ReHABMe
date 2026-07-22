export type UserRole = 'admin' | 'therapist'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show'
export type AppointmentType = 'initial_assessment' | 'follow_up' | 'physiotherapy' | 'occupational_therapy' | 'speech_therapy' | 'hydrotherapy'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface StaffProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  role: UserRole
  phone?: string
  specialty?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  mrn: string // Medical Record Number
  full_name: string
  date_of_birth: string
  gender: Gender
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_group_number?: string
  referring_physician?: string
  primary_diagnosis?: string
  medical_history?: string
  allergies?: string
  medications?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  therapist_id: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  type: AppointmentType
  status: AppointmentStatus
  reason?: string
  notes?: string
  room?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  therapist?: StaffProfile
}

export interface SOAPNote {
  id: string
  patient_id: string
  appointment_id?: string
  therapist_id: string
  session_date: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  pain_scale?: number
  functional_goals?: string
  next_session_plan?: string
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  therapist?: StaffProfile
  appointment?: Appointment
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  invoice_number: string
  patient_id: string
  appointment_id?: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  paid_date?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes?: string
  items: InvoiceItem[]
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
  appointment?: Appointment
}

export interface DashboardStats {
  total_patients: number
  todays_appointments: number
  pending_invoices: number
  monthly_revenue: number
}

export interface RecentActivity {
  id: string
  type: 'appointment' | 'patient' | 'invoice' | 'note'
  description: string
  timestamp: string
  user_name: string
}
