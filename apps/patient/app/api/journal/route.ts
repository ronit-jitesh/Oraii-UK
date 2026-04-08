import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@oraii/core/auth'
import { z } from 'zod'

const schema = z.object({
  content:           z.string().min(1, 'Entry cannot be empty').max(10000),
  moodScore:         z.number().int().min(1).max(10).optional(),
  therapistCanView:  z.boolean().default(false),
})

// POST /api/journal — save a journal entry
// UK-GDPR: patient identity resolved via pseudonymous UUID
// therapistCanView defaults to false — patient explicitly opts in to sharing
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { content, moodScore, therapistCanView } = parsed.data

    // Resolve pseudonymous patient ID from portal auth user
    const { data: patient, error: patErr } = await supabase
      .from('patients')
      .select('id')
      .eq('portal_auth_user_id', user.id)
      .single()

    if (patErr || !patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 })
    }

    const { data, error: insertErr } = await supabase
      .from('journal_entries')
      .insert({
        patient_id:          patient.id,
        content,
        mood_score:          moodScore ?? null,
        therapist_can_view:  therapistCanView,
      })
      .select('id')
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ id: data.id, saved: true })
  } catch (err) {
    console.error('Journal save error:', err)
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}

// GET /api/journal — fetch patient's own journal entries
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()

    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('portal_auth_user_id', user.id)
      .single()

    if (!patient) return NextResponse.json({ entries: [] })

    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, content, mood_score, therapist_can_view, created_at')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ entries: entries ?? [] })
  } catch (err) {
    console.error('Journal fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch journal' }, { status: 500 })
  }
}
