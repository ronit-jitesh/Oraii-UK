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
    // No fallback to non-EU providers. UK-GDPR requires that PHI does not
    // leak to processors without a signed DPA + EU/UK data residency. Groq
    // is US-hosted with no UK DPA — we deliberately do not fall through to
    // it. If OpenAI fails, return a graceful holding message.
    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await generateOraiiResponse(windowed)
        return NextResponse.json({ content: res.content, crisisDetected: res.crisisDetected })
      } catch (err) {
        console.error('[chat-api] OpenAI error', err instanceof Error ? err.message : err)
      }
    }

    // ── 7. Graceful fallback (no PHI leaves the EU boundary) ───────────────
    return NextResponse.json({
      content:
        "I'm having a bit of trouble connecting right now — let's pause and try again in a minute. If you need support immediately, Samaritans are free on 116 123, or text SHOUT to 85258. If you're in danger, please call 999.",
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
