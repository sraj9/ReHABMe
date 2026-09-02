// staff-admin edge function
// Admin-only actions that need the service role or secrets:
//   invite          — create a phone+password auth user, insert profile, WhatsApp the credentials
//   reset_password  — set a new temporary password for a staff member (optionally WhatsApp it)
//   test_whatsapp   — send the invite template to a number to verify the WhatsApp config
//
// WhatsApp Business Cloud API credentials live in the clinic_settings table
// (admin-only via RLS); this function reads them with the service role.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Readable temporary password: no ambiguous characters (0/O, 1/l/I)
function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

/** Digits only, as the Cloud API "to" field expects (E.164 without '+'). */
function waNumber(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

/** Country code optional — bare 10-digit numbers are assumed Indian (+91). */
function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, '')
  if (/^\+\d{8,15}$/.test(compact)) return compact
  if (/^\d{10}$/.test(compact)) return `+91${compact}`
  if (/^\d{11,15}$/.test(compact)) return `+${compact}`
  return null
}

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  template: string
}

async function getWhatsAppConfig(): Promise<WhatsAppConfig | null> {
  const { data } = await admin
    .from('clinic_settings')
    .select('whatsapp_phone_number_id, whatsapp_access_token, whatsapp_template_invite')
    .eq('id', 1)
    .single()
  if (!data?.whatsapp_phone_number_id || !data?.whatsapp_access_token) return null
  return {
    phoneNumberId: data.whatsapp_phone_number_id,
    accessToken: data.whatsapp_access_token,
    template: data.whatsapp_template_invite || 'staff_invite',
  }
}

async function sendInviteMessage(
  config: WhatsAppConfig,
  to: string,
  params: { name: string; login: string; password: string }
): Promise<{ sent: boolean; error?: string }> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waNumber(to),
        type: 'template',
        template: {
          name: config.template,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.name },
                { type: 'text', text: params.login },
                { type: 'text', text: params.password },
                { type: 'text', text: 'https://rehabme.vercel.app' },
              ],
            },
          ],
        },
      }),
    }
  )
  if (!res.ok) {
    const detail = await res.text()
    return { sent: false, error: `WhatsApp API ${res.status}: ${detail.slice(0, 300)}` }
  }
  return { sent: true }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  // Caller must be an authenticated admin
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData } = await admin.auth.getUser(jwt)
  const caller = userData?.user
  if (!caller) return json(401, { error: 'Not authenticated' })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('user_id', caller.id)
    .single()
  if (callerProfile?.role !== 'admin') return json(403, { error: 'Admin access required' })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  // ----------------------------------------------------------
  // INVITE
  // ----------------------------------------------------------
  if (body.action === 'invite') {
    const fullName = String(body.full_name ?? '').trim()
    const phone = normalizePhone(String(body.phone ?? ''))
    const email = String(body.email ?? '').trim() || null
    const role = body.role === 'admin' ? 'admin' : 'therapist'
    const specialty = String(body.specialty ?? '').trim() || null
    // Payroll fields, used to work the monthly payout out from attendance
    const monthlySalary = typeof body.monthly_salary === 'number' ? body.monthly_salary : null
    const dailyWorkingHours = typeof body.daily_working_hours === 'number' ? body.daily_working_hours : 8

    if (!fullName) return json(400, { error: 'Full name is required' })
    if (!phone) {
      return json(400, { error: 'Enter a valid mobile number, e.g. 9876543210 or +919876543210' })
    }

    // Admin may set the password directly; otherwise one is generated and
    // the staff member must change it at first login.
    const customPassword = typeof body.password === 'string' && body.password.length > 0 ? body.password : null
    if (customPassword && customPassword.length < 8) {
      return json(400, { error: 'Password must be at least 8 characters' })
    }
    const password = customPassword ?? generatePassword()
    const sendWhatsApp = body.send_whatsapp !== false
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone: phone.replace(/[\s-]/g, ''),
      password,
      phone_confirm: true,
      ...(email ? { email, email_confirm: true } : {}),
      user_metadata: { full_name: fullName },
    })
    if (createError || !created.user) {
      return json(400, { error: createError?.message ?? 'Could not create user' })
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .insert({
        user_id: created.user.id,
        full_name: fullName,
        email,
        phone,
        role,
        specialty,
        monthly_salary: monthlySalary,
        daily_working_hours: dailyWorkingHours,
        must_change_password: !customPassword,
      })
      .select('*')
      .single()
    if (profileError) {
      // Roll back the auth user so a failed invite leaves nothing behind
      await admin.auth.admin.deleteUser(created.user.id)
      return json(400, { error: `Could not create profile: ${profileError.message}` })
    }

    let whatsapp: { sent: boolean; error?: string } = { sent: false }
    if (sendWhatsApp) {
      const config = await getWhatsAppConfig()
      if (config) {
        whatsapp = await sendInviteMessage(config, phone, {
          name: fullName,
          login: phone,
          password,
        })
      } else {
        whatsapp = { sent: false, error: 'WhatsApp is not configured in Settings' }
      }
    }

    return json(200, {
      ok: true,
      profile,
      temp_password: password,
      whatsapp_sent: whatsapp.sent,
      whatsapp_error: whatsapp.error,
    })
  }

  // ----------------------------------------------------------
  // RESET PASSWORD
  // ----------------------------------------------------------
  if (body.action === 'reset_password') {
    const profileId = String(body.profile_id ?? '')
    const sendWhatsApp = body.send_whatsapp !== false

    const { data: profile } = await admin
      .from('profiles')
      .select('id, user_id, full_name, phone')
      .eq('id', profileId)
      .single()
    if (!profile) return json(404, { error: 'Staff member not found' })

    // Admin may choose the new password; a generated one forces a change at next login
    const customPassword = typeof body.password === 'string' && body.password.length > 0 ? body.password : null
    if (customPassword && customPassword.length < 8) {
      return json(400, { error: 'Password must be at least 8 characters' })
    }
    const password = customPassword ?? generatePassword()
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.user_id, {
      password,
    })
    if (updateError) return json(400, { error: updateError.message })

    await admin.from('profiles').update({ must_change_password: !customPassword }).eq('id', profile.id)

    let whatsapp: { sent: boolean; error?: string } = { sent: false }
    if (sendWhatsApp && profile.phone) {
      const config = await getWhatsAppConfig()
      if (config) {
        whatsapp = await sendInviteMessage(config, profile.phone, {
          name: profile.full_name,
          login: profile.phone,
          password,
        })
      } else {
        whatsapp = { sent: false, error: 'WhatsApp is not configured in Settings' }
      }
    }

    return json(200, {
      ok: true,
      temp_password: password,
      whatsapp_sent: whatsapp.sent,
      whatsapp_error: whatsapp.error,
    })
  }

  // ----------------------------------------------------------
  // DELETE — removes the auth account too, so the same phone
  // can be re-added later (a profile-only delete leaves an
  // orphaned login that blocks re-invites)
  // ----------------------------------------------------------
  if (body.action === 'delete') {
    const profileId = String(body.profile_id ?? '')
    const { data: profile } = await admin
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single()
    if (!profile) return json(404, { error: 'Staff member not found' })
    if (profile.user_id === caller.id) {
      return json(400, { error: 'You cannot delete your own account' })
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(profile.user_id)
    if (deleteError) return json(400, { error: deleteError.message })
    return json(200, { ok: true })
  }

  // ----------------------------------------------------------
  // UPDATE PHONE — the phone is the login identity, so it must
  // change on the auth account and the profile together
  // ----------------------------------------------------------
  if (body.action === 'update_phone') {
    const profileId = String(body.profile_id ?? '')
    const phone = String(body.phone ?? '').replace(/[\s-]/g, '')
    if (!/^\+\d{8,15}$/.test(phone)) {
      return json(400, { error: 'Phone must be in international format, e.g. +919876543210' })
    }
    const { data: profile } = await admin
      .from('profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single()
    if (!profile) return json(404, { error: 'Staff member not found' })

    const { error: authError } = await admin.auth.admin.updateUserById(profile.user_id, {
      phone,
      phone_confirm: true,
    })
    if (authError) return json(400, { error: authError.message })

    const { error: profileError } = await admin.from('profiles').update({ phone }).eq('id', profile.id)
    if (profileError) return json(400, { error: profileError.message })
    return json(200, { ok: true })
  }

  // ----------------------------------------------------------
  // TEST WHATSAPP
  // ----------------------------------------------------------
  if (body.action === 'test_whatsapp') {
    const to = String(body.to ?? '').trim()
    if (!/^\+\d{8,15}$/.test(to.replace(/[\s-]/g, ''))) {
      return json(400, { error: 'Phone must be in international format, e.g. +919876543210' })
    }
    const config = await getWhatsAppConfig()
    if (!config) return json(400, { error: 'WhatsApp is not configured — save the number ID and token first' })

    const result = await sendInviteMessage(config, to, {
      name: 'Test User',
      login: to,
      password: 'TEST-ONLY',
    })
    return json(result.sent ? 200 : 400, {
      ok: result.sent,
      whatsapp_sent: result.sent,
      whatsapp_error: result.error,
    })
  }

  return json(400, { error: `Unknown action: ${String(body.action)}` })
})
