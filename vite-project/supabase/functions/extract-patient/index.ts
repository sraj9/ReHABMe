// extract-patient edge function
// Reads a photographed/uploaded patient assessment sheet with Google's
// Gemini vision model (free tier) and returns the patient's details as
// structured fields for the Add Patient form.
// Requires the GEMINI_API_KEY function secret (free key from aistudio.google.com).

import { createClient } from 'npm:@supabase/supabase-js@2'

// Tried in order — Google retires model names and free-tier capacity for a
// model can spike; on 404/429/503 the next one is tried.
const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
]

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

// Gemini structured-output schema — every field nullable since the sheet
// may only carry a subset
const nullableString = { type: 'STRING', nullable: true }
const PATIENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    full_name: nullableString,
    date_of_birth: { ...nullableString, description: 'YYYY-MM-DD' },
    gender: { type: 'STRING', enum: ['male', 'female', 'other'], nullable: true },
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

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return json(500, { error: 'Scanning is not configured yet — ask the admin to set the GEMINI_API_KEY secret.' })
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

  try {
    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: image } },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: PATIENT_SCHEMA,
      },
    })

    let res: Response | undefined
    let lastStatus = 0
    for (const model of GEMINI_MODELS) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: requestBody,
        }
      )
      if (res.ok) break
      lastStatus = res.status
      const detail = await res.text()
      console.error(`Gemini ${model} ${res.status}:`, detail.slice(0, 300))
      // Retired model, rate limit, or capacity spike — try the next model
      if (![404, 429, 503].includes(res.status)) {
        return json(502, { error: `Could not read the sheet (AI service error ${res.status}).` })
      }
      res = undefined
    }
    if (!res) {
      if (lastStatus === 429) {
        return json(429, { error: 'Scan limit reached for the moment — wait a minute and try again.' })
      }
      return json(503, { error: 'The AI service is busy right now — wait a minute and try again.' })
    }

    const data = await res.json()
    const candidate = data?.candidates?.[0]
    const text: string | undefined = candidate?.content?.parts?.find(
      (p: { text?: string }) => typeof p.text === 'string'
    )?.text

    if (!text) {
      const reason = candidate?.finishReason ?? data?.promptFeedback?.blockReason ?? 'no output'
      console.error('Gemini returned no text:', reason)
      return json(422, { error: 'The image could not be processed. Try a clearer photo of the assessment sheet.' })
    }

    const fields = JSON.parse(text)
    return json(200, { ok: true, fields })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('extract-patient failed:', message)
    return json(500, { error: `Could not read the sheet: ${message.slice(0, 200)}` })
  }
})
