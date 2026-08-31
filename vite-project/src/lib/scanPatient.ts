import { supabase, isSupabaseConfigured } from './supabase'

/** Fields the extract-patient edge function can return (all nullable). */
export interface ScannedPatientFields {
  full_name: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  insurance_provider: string | null
  insurance_policy_number: string | null
  insurance_group_number: string | null
  referring_physician: string | null
  primary_diagnosis: string | null
  medical_history: string | null
  allergies: string | null
  medications: string | null
  notes: string | null
}

export interface ScanResult {
  ok: boolean
  fields?: ScannedPatientFields
  error?: string
}

/**
 * Downscale a photo to at most `maxEdge` px on its long side and re-encode
 * as JPEG. Phone photos are 10MB+; the model reads nothing extra above
 * ~2500px and the request stays small.
 */
async function toBase64Jpeg(file: File, maxEdge = 2400): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
}

/**
 * Send a photo/upload of an assessment sheet to the extract-patient edge
 * function and get back structured patient fields.
 */
export async function scanAssessmentSheet(file: File): Promise<ScanResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Connect Supabase to use assessment sheet scanning' }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Please choose a photo (JPEG/PNG) of the assessment sheet' }
  }

  let payload: { base64: string; mediaType: string }
  try {
    payload = await toBase64Jpeg(file)
  } catch {
    return { ok: false, error: 'Could not read that image — try another photo' }
  }

  // Refresh a silently-expired login before calling the server (see staffAdmin)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    void supabase.auth.signOut()
    return { ok: false, error: 'Your session has expired — please sign in again' }
  }

  const { data, error } = await supabase.functions.invoke('extract-patient', {
    body: { image: payload.base64, media_type: payload.mediaType },
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) {
    // Non-2xx responses carry the server's message in the response body
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const detail = (await context.json()) as { error?: string }
        if (detail.error) return { ok: false, error: detail.error }
      } catch {
        // fall through to the generic message
      }
    }
    return { ok: false, error: error.message }
  }
  return data as ScanResult
}
