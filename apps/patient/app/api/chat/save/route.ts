// /api/chat/save — receives sendBeacon POST on page unload
// Stores the chat session snapshot in Supabase journal_entries
// Called as a best-effort save; errors are swallowed (non-critical path)

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSvc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return new NextResponse(null, { status: 204 }) // silent — no auth, no error
    }

    let body: { messages?: unknown[] } | null = null
    try {
      body = await request.json()
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new NextResponse(null, { status: 204 })
    }

    const svc = getSvc()

    // Resolve patient ID
    const { data: patient } = await svc
      .from('patients')
      .select('id')
      .eq('portal_auth_user_id', user.id)
      .single()

    if (!patient?.id) {
      return new NextResponse(null, { status: 204 })
    }

    const today = new Date().toISOString().split('T')[0]!
    const messagesJson = JSON.stringify(body.messages)

    // Upsert today's session
    const { data: existing } = await svc
      .from('journal_entries')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('entry_type', 'chat_session')
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing?.id) {
      await svc
        .from('journal_entries')
        .update({ content: messagesJson })
        .eq('id', existing.id)
    } else {
      await svc.from('journal_entries').insert({
        patient_id: patient.id,
        content: messagesJson,
        mood_score: null,
        entry_type: 'chat_session',
        therapist_can_view: false,
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch {
    // Beacon saves are best-effort — never surface errors to client
    return new NextResponse(null, { status: 204 })
  }
}
