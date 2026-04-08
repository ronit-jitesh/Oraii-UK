import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@oraii/core/auth'

// GET /api/safety-plan — fetch patient's current safety plan
// Safety plan is created by therapist, read by patient
// Cached on device for offline access (PWA service worker — P0 task before go-live)
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

    if (!patient) return NextResponse.json({ plan: null })

    const { data: plan } = await supabase
      .from('safety_plans')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Always include UK crisis lines regardless of plan status
    const ukCrisisLines = [
      { name: 'Samaritans',        contact: '116 123',             available: '24/7' },
      { name: 'NHS Mental Health', contact: '111 option 2',        available: '24/7' },
      { name: 'Crisis Text Line',  contact: 'Text SHOUT to 85258', available: '24/7' },
      { name: 'Emergency',         contact: '999',                 available: '24/7' },
    ]

    return NextResponse.json({ plan: plan ?? null, ukCrisisLines })
  } catch (err) {
    console.error('Safety plan fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch safety plan' }, { status: 500 })
  }
}
