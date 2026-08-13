export type UserRole = 'admin' | 'therapist'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show'
export type AppointmentType = 'initial_assessment' | 'follow_up' | 'physiotherapy' | 'occupational_therapy' | 'speech_therapy' | 'hydrotherapy'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export interface StaffProfile {
  id: string
  user_id: string
  full_name: string
  email?: string
  role: UserRole
  phone?: string
  specialty?: string
  avatar_url?: string
  is_active: boolean
  must_change_password?: boolean
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  profile_id: string
  check_in_at: string
  check_out_at?: string
  lat: number
  lng: number
  accuracy_m?: number
  check_out_lat?: number
  check_out_lng?: number
  created_at: string
  // Joined fields
  profile?: StaffProfile
}

export interface ClinicSettings {
  id: number
  clinic_name: string
  clinic_phone?: string
  clinic_email?: string
  clinic_address?: string
  business_hours?: string
  tax_id?: string
  whatsapp_phone_number_id?: string
  whatsapp_access_token?: string
  whatsapp_template_invite: string
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
  paid_date?: string | null
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

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other'
export type ExpenseCategory = 'rent' | 'salaries' | 'equipment' | 'supplies' | 'utilities' | 'maintenance' | 'other'

export interface Payment {
  id: string
  invoice_id: string
  patient_id: string
  amount: number
  method: PaymentMethod
  paid_at: string
  notes?: string
  received_by?: string
  /** Marked as a wrong entry — kept for the record, excluded from all totals */
  voided?: boolean
  voided_at?: string | null
  created_at: string
  // Joined fields
  patient?: Patient
  invoice?: Invoice
  receiver?: StaffProfile
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount: number
  expense_date: string
  recorded_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  recorder?: StaffProfile
}

export interface SessionPackage {
  id: string
  patient_id: string
  name: string
  total_sessions: number
  price: number
  invoice_id?: string | null
  purchased_at: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  patient?: Patient
}

export interface PatientSession {
  id: string
  patient_id: string
  /** null = walk-in (pay-per-visit) session */
  package_id?: string | null
  therapist_id?: string
  session_at: string
  notes?: string
  created_at: string
  // Joined fields
  patient?: Patient
  package?: SessionPackage
  therapist?: StaffProfile
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
