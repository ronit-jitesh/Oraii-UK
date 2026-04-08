import { NextRequest, NextResponse } from 'next/server'
import { screenTranscriptForCSSRS } from '@oraii/ai/risk'
import { createSupabaseServiceClient } from '@oraii/core/auth'

// POST /api/risk/screen
// Screens a transcript for C-SSRS-relevant language
// Returns flags for THERAPIST review — not a risk determination
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient()
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { transcript, sessionId } = await req.json()
    if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 })

    const result = await screenTranscriptForCSSRS(transcript)

    await supabase.from('audit_log').insert({
      actor_type:    'therapist',
      actor_id_hash: user.id.slice(0, 8),
      action:        'risk.screen',
      resource_type: 'cssrs_screening',
      metadata:      { sessionId, flagCount: result.flags.length },
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Risk screening error:', err)
    return NextResponse.json({ error: 'Screening failed' }, { status: 500 })
  }
}
