import { NextRequest, NextResponse } from 'next/server'
import { generateDajiResponse } from '@oraii/ai/chat'

// POST /api/chat
// Patient-facing Daji chatbot endpoint
// UK-GDPR: no patient PII sent to OpenAI — only message content
// Crisis detection triggers UK crisis resources in response
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    // Validate message structure
    const valid = messages.every(
      (m: any) =>
        typeof m === 'object' &&
        ['user', 'assistant'].includes(m.role) &&
        typeof m.content === 'string'
    )
    if (!valid) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    const result = await generateDajiResponse(messages)

    return NextResponse.json({
      content:         result.content,
      crisisDetected:  result.crisisDetected,
      crisisResources: result.crisisResources,
    })
  } catch (err) {
    console.error('Daji chat error:', err)
    return NextResponse.json(
      {
        error: 'Chat temporarily unavailable',
        fallback:
          'If you are in crisis please call Samaritans on 116 123 (free, 24/7) or NHS 111 option 2.',
      },
      { status: 500 }
    )
  }
}
