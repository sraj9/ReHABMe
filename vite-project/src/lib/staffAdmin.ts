import { supabase, isSupabaseConfigured } from './supabase'
import type { StaffProfile } from './types'

export interface StaffAdminResult {
  ok: boolean
  error?: string
  profile?: StaffProfile
  temp_password?: string
  whatsapp_sent?: boolean
  whatsapp_error?: string
}

/**
 * Calls the staff-admin edge function (invite / reset_password / test_whatsapp).
 * Only available in live mode — demo mode handles staff changes locally.
 */
export async function staffAdmin(body: Record<string, unknown>): Promise<StaffAdminResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Connect Supabase to use this feature' }
  }

  const { data, error } = await supabase.functions.invoke('staff-admin', { body })
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
  return data as StaffAdminResult
}
