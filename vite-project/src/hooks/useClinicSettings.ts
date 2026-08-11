import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ClinicSettings } from '../lib/types'

const STORAGE_KEY = 'rehabme_clinic_settings_v1'

const DEFAULTS: ClinicSettings = {
  id: 1,
  clinic_name: 'ReHABMe Rehabilitation and Physiotherapy Center',
  clinic_phone: '',
  clinic_email: '',
  clinic_address: '',
  business_hours: '',
  tax_id: '',
  whatsapp_phone_number_id: '',
  whatsapp_access_token: '',
  whatsapp_template_invite: 'staff_invite',
  updated_at: new Date().toISOString(),
}

/**
 * The single clinic_settings row (clinic info + WhatsApp API config).
 * Admin-only by RLS in live mode; localStorage-backed in demo mode.
 */
export function useClinicSettings() {
  // Demo mode resolves synchronously from localStorage; live mode fetches
  const [settings, setSettings] = useState<ClinicSettings | null>(() => {
    if (isSupabaseConfigured) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ClinicSettings>) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    void supabase
      .from('clinic_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        setSettings((data as ClinicSettings | null) ?? null)
        setLoading(false)
      })
  }, [])

  const save = useCallback(
    async (patch: Partial<ClinicSettings>): Promise<boolean> => {
      const next = { ...(settings ?? DEFAULTS), ...patch }
      if (!isSupabaseConfigured) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        setSettings(next)
        return true
      }
      const { data, error: err } = await supabase
        .from('clinic_settings')
        .update(patch)
        .eq('id', 1)
        .select('*')
        .single()
      if (err) {
        setError(err.message)
        return false
      }
      setSettings(data as ClinicSettings)
      return true
    },
    [settings]
  )

  return { settings, loading, error, save }
}
