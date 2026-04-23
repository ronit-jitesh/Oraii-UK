import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { generateOraiiResponse } from '@oraii/ai'

export const runtime = 'nodejs'
export const maxDuration = 30

// ── Security constants ──────────────────────────────────────────────────────
const MAX_MESSAGE_CHARS = 2_000   // per-message character cap (prompt injection guard)
const MAX_HISTORY_TURNS = 10      // sliding window sent to LLM (PHI minimisation)
const ALLOWED_ROLES = new Set(['user', 'assistant'])

// ── Crisis detection ────────────────────────────────────────────────────────
const CRISIS_KEYWORDS = [
  'suicide', 'suicidal', 'kill myself', 'kill me', 'end it all', 'want to die',
  'no reason to live', 'better off dead', 'self harm', 'self-harm',
  'cutting myself', 'cut myself', 'overdose', 'end my life',
  'hurt myself', 'no point', "can't go on", 'cant go on',
]

const CRISIS_RESPONSE = "I hear you, and I'm really glad you told me. What you're feeling matters, and you deserve support right now.\n\nPlease reach out to one of these UK crisis services — they're free, confidential, and available right now:\n\n🟢 **Samaritans**: 116 123 (free, 24/7)\n🏥 **NHS Crisis Team**: 111 press 2 (mental health, 24/7)\n📱 **Crisis Text Line**: Text SHOUT to 85258 (free, 24/7)\n🚨 **Emergency**: 999 or go to your nearest A&E\n👶 **Childline**: 0800 1111 (under 19s, free, 24/7)\n\nYou can also contact your GP or local NHS community mental health team. You are not alone — would you like to tell me more about what's happening right now?"

// ── Auth helper ─────────────────────────────────────────────────────────────
async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // read-only in API route
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth check — must be a logged-in user (anon or permanent) ──────
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // ── 2. Parse + basic structural validation ────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // ── 3. Sanitise messages — role allowlist + char cap ──────────────────
    const safe = body.messages
      .filter((m: any) =>
        m &&
        typeof m.content === 'string' &&
        ALLOWED_ROLES.has(m.role)          // reject 'system' / anything else
      )
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: (m.content as string).slice(0, MAX_MESSAGE_CHARS), // truncate, don't error
      }))

    if (safe.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // ── 4. Crisis signal detection on latest user message ─────────────────
    const lastUserMsg = safe.filter((m: any) => m.role === 'user').pop()
    const crisisDetected = !!lastUserMsg && CRISIS_KEYWORDS.some(
      k => lastUserMsg.content.toLowerCase().includes(k)
    )

    if (crisisDetected) {
      return NextResponse.json({ content: CRISIS_RESPONSE, crisisDetected: true })
    }

    // ── 5. Sliding window — last N turns only (PHI minimisation) ──────────
    const windowed = safe.slice(-MAX_HISTORY_TURNS)

    // ── 6. Primary: OpenAI via @oraii/ai (CBT-oriented system prompt) ──────
    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await generateOraiiResponse(windowed)
        return NextResponse.json({ content: res.content, crisisDetected: res.crisisDetected })
      } catch (err) {
        console.error('[chat-api] OpenAI error', err instanceof Error ? err.message : err)
      }
    }

    // ── 7. Fallback: Groq free tier ────────────────────────────────────────
    if (process.env.GROQ_API_KEY) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are ORAII, a warm CBT-informed wellness companion (not a therapist). Use British English, reflective listening, and open-ended questions. Keep replies to 2–3 short paragraphs. Never diagnose. If the user mentions self-harm or suicide, signpost UK crisis services (Samaritans 116 123, NHS 111 press 2, SHOUT text 85258, 999).',
            },
            ...windowed,
          ],
          max_tokens: 500,
          temperature: 0.72,
        }),
      })
      if (r.ok) {
        const data = await r.json()
        return NextResponse.json({
          content:
            data.choices?.[0]?.message?.content ||
            "I'm here with you. Could you tell me a bit more about what's on your mind?",
          crisisDetected: false,
        })
      }
    }

    // ── 8. Last-resort fallback ────────────────────────────────────────────
    return NextResponse.json({
      content:
        "I'm having trouble reaching my full capabilities right now. Let's keep going — can you tell me a bit more about what's coming up for you? If you need support right now, Samaritans are free on 116 123.",
      crisisDetected: false,
    })
  } catch (error) {
    console.error('[chat-api]', error)
    return NextResponse.json({
      content:
        "Something went wrong on my end. If you need support right now, please call Samaritans on 116 123 — they're free and available 24/7.",
      crisisDetected: false,
    })
  }
}
