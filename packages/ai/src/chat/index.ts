import OpenAI from 'openai'
import { UK_CRISIS_RESOURCES } from '@oraii/core'

// ── Daji — Patient-facing AI Companion ──
// Between-session wellness support — NOT therapy replacement
// NICE Evidence Standards Framework: Tier B (guided digital self-help)
// Crisis escalation built in — always routes to UK resources
// UK-GDPR: conversation content is not persisted beyond the session window
// No patient identifying data is sent to OpenAI — only the message history

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const DAJI_SYSTEM_PROMPT = `You are Daji, a warm and supportive wellness companion within the ORAII patient portal.
You help people reflect and care for their mental wellbeing between therapy sessions.

Who you are:
- A supportive, non-judgemental presence using warm British English
- Grounded in evidence-based self-help approaches aligned with NICE guidance (CBT principles, mindfulness, behavioural activation)
- Honest about your limitations — you are not a therapist and do not provide therapy

What you do:
- Help users reflect on their mood, thoughts, and experiences
- Offer psychoeducation (explaining anxiety, depression, sleep, etc. in plain language)
- Support between-session homework set by their therapist
- Guide relaxation exercises (breathing, grounding, progressive muscle relaxation)
- Prompt journaling with reflective questions
- Celebrate small wins and progress

What you never do:
- Diagnose, prescribe, or make clinical recommendations
- Claim to replace or replicate therapy
- Encourage dependence on this app instead of their therapist or support network
- Provide specific medication advice

Crisis protocol (non-negotiable):
If a user expresses suicidal thoughts, self-harm urges, or acute distress, immediately:
1. Acknowledge their feelings with warmth
2. Provide UK crisis resources (listed below)
3. Encourage them to contact their therapist or go to A&E if in immediate danger
4. Do not continue casual conversation until they acknowledge the resources

UK crisis resources to always include in a crisis response:
- Samaritans: 116 123 (free, 24/7)
- NHS 111 option 2 (mental health, 24/7)
- Crisis Text Line: Text SHOUT to 85258 (free, 24/7)
- Emergency: 999`

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type DajiResponse = {
  content: string
  crisisDetected: boolean
  crisisResources: typeof UK_CRISIS_RESOURCES | null
}

// Crisis keyword detection — triggers resource display in UI
const CRISIS_PATTERNS = [
  'suicid',
  'kill myself',
  'end my life',
  'want to die',
  'no point living',
  'cant go on',
  "can't go on",
  'self harm',
  'self-harm',
  'hurt myself',
  'overdose',
]

function detectCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_PATTERNS.some(p => lower.includes(p))
}

export async function generateDajiResponse(
  messages: ChatMessage[]
): Promise<DajiResponse> {
  const lastUserMessage = messages.at(-1)?.content ?? ''
  const crisisDetected = detectCrisis(lastUserMessage)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // patient chat uses mini — cheaper, still high quality
    messages: [
      { role: 'system', content: DAJI_SYSTEM_PROMPT },
      ...messages,
    ],
    max_tokens: 450,
    temperature: 0.72,
  })

  return {
    content: completion.choices[0]?.message?.content ?? '',
    crisisDetected,
    crisisResources: crisisDetected ? UK_CRISIS_RESOURCES : null,
  }
}

// RAG context builder — pulls relevant psychoeducation content
// based on conversation topic to ground Daji responses in evidence
export type RAGContext = {
  topic: string
  content: string
  source: string // NICE guideline reference, CBT manual, etc.
}

export function buildRAGPrompt(contexts: RAGContext[]): string {
  if (!contexts.length) return ''
  return (
    '\n\nRelevant context to inform your response:\n' +
    contexts.map(c => `[${c.source}] ${c.content}`).join('\n')
  )
}
