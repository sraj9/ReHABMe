// extract-patient edge function
// Reads a photographed/uploaded patient assessment sheet with Claude vision
// and returns the patient's details as structured fields for the Add Patient
// form. Requires the ANTHROPIC_API_KEY function secret.

import Anthropic from 'npm:@anthropic-ai/sdk'
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

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Every field nullable — the sheet may only carry a subset
const nullableString = { type: ['string', 'null'] }
const PATIENT_SCHEMA = {
  type: 'object',
  properties: {
    full_name: nullableString,
    date_of_birth: { ...nullableString, description: 'YYYY-MM-DD' },
    gender: { type: ['string', 'null'], enum: ['male', 'female', 'other', null] },
    phone: nullableString,
    email: nullableString,
    address: nullableString,
    city: nullableString,
    state: nullableString,
    zip: nullableString,
    emergency_contact_name: nullableString,
    emergency_contact_phone: nullableString,
    insurance_provider: nullableString,
    insurance_policy_number: nullableString,
    insurance_group_number: nullableString,
    referring_physician: nullableString,
    primary_diagnosis: nullableString,
    medical_history: nullableString,
    allergies: nullableString,
    medications: nullableString,
    notes: nullableString,
  },
  required: [
    'full_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'city',
    'state', 'zip', 'emergency_contact_name', 'emergency_contact_phone',
    'insurance_provider', 'insurance_policy_number', 'insurance_group_number',
    'referring_physician', 'primary_diagnosis', 'medical_history', 'allergies',
    'medications', 'notes',
  ],
  additionalProperties: false,
}

const EXTRACTION_PROMPT = `This is a photo or scan of a patient assessment/intake sheet from a physiotherapy clinic in India. Extract the patient's details into the given fields.

Rules:
- Read handwriting carefully; if a value is absent or illegible, use null — never guess.
- Ambiguous numeric dates are DD/MM/YYYY (Indian convention). Output date_of_birth as YYYY-MM-DD.
- If only the age is written (no birth date), leave date_of_birth null and record the age in notes.
- Phone numbers: digits only, keep a leading country code if written.
- Put the chief complaint / condition being treated in primary_diagnosis. Past conditions, surgeries and relevant history go in medical_history.
- Anything useful that doesn't fit another field (occupation, referral details, pain scores, therapist remarks) goes in notes, briefly.`

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  // Caller must be an authenticated staff member
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData } = await admin.auth.getUser(jwt)
  const caller = userData?.user
  if (!caller) return json(401, { error: 'Not authenticated' })

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', caller.id)
    .single()
  if (!callerProfile) return json(403, { error: 'Staff access required' })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json(500, { error: 'Scanning is not configured yet — ask the admin to set the ANTHROPIC_API_KEY secret.' })
  }

  let body: { image?: string; media_type?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid JSON body' })
  }

  const image = typeof body.image === 'string' ? body.image : ''
  const mediaType = typeof body.media_type === 'string' ? body.media_type : ''
  if (!image) return json(400, { error: 'Missing image' })
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return json(400, { error: 'Unsupported image type — use a JPEG or PNG photo of the sheet' })
  }

  const anthropic = new Anthropic({ apiKey })

  try {
    const response = await anthropic.beta.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      // Refusal fallback: if a safety classifier declines, the request is
      // re-served by Anthropic's recommended fallback model in the same call
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: PATIENT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
      // deno-lint-ignore no-explicit-any
    } as any)

    if (response.stop_reason === 'refusal') {
      return json(422, { error: 'The image could not be processed. Try a clearer photo of the assessment sheet.' })
    }
    if (response.stop_reason === 'max_tokens') {
      return json(422, { error: 'The sheet could not be read completely — try again with a clearer photo.' })
    }

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === 'text'
    ) as { text: string } | undefined
    if (!textBlock) {
      return json(422, { error: 'No details could be read from the image.' })
    }

    const fields = JSON.parse(textBlock.text)
    return json(200, { ok: true, fields })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('extract-patient failed:', message)
    return json(500, { error: `Could not read the sheet: ${message.slice(0, 200)}` })
  }
})
