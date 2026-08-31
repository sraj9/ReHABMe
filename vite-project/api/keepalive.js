// Supabase's free plan pauses projects after ~7 days without traffic,
// which takes the whole app down ("Failed to fetch" on login).
// Vercel calls this once a day (vercel.json "crons") so the database
// never counts as idle. The key is the public one already shipped in
// the website bundle.
export default async function handler(req, res) {
  const r = await fetch(
    'https://nrpeftwzamcxiaworvyo.supabase.co/rest/v1/patients?select=id&limit=1',
    { headers: { apikey: 'sb_publishable_CATSM41qyJtoS2nqIHm9uA_NLDslLTL' } }
  )
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, pingedAt: new Date().toISOString() })
}
