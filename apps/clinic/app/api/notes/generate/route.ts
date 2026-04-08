import { NextRequest, NextResponse } from 'next/server'
import { generateClinicalNote } from '@oraii/ai/notes'
import { createSupabaseServiceClient } from '@oraii/core/auth'
import { z } from 'zod'

const schema = z.object({
  transcript:     z.string().min(50, 'Transcript too short to generate a meaningful note'),
  format:         z.enum(['SOAP', 'DAP', 'GIRP', 'BIRP']),
  sessionId:      z.string().uuid(),
  sessionContext: z.object({
    presentingIssue:          z.string().optional(),
    treatmentApproach:        z.string().optional(),
    treatmentGoals:           z.array(z.string()).optional(),
    previousSessionSummary:   z.string().optional(),
    sessionNumber:            z.number().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createSupabaseServiceClient()
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Validate body
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { transcript, format, sessionContext } = parsed.data

    // Generate note
    const note = await generateClinicalNote({ transcript, format, sessionContext })

    // Audit log — record that a note was generated (no transcript content in log)
    await supabase.from('audit_log').insert({
      actor_type:    'therapist',
      actor_id_hash: user.id.slice(0, 8), // partial ID — not full UUID in audit
      action:        'note.generate',
      resource_type: 'clinical_note',
      metadata:      { format, sessionId: parsed.data.sessionId },
    })

    return NextResponse.json(note)
  } catch (err) {
    console.error('Note generation error:', err)
    return NextResponse.json({ error: 'Note generation failed' }, { status: 500 })
  }
}
