import OpenAI from 'openai'
import { UK_CRISIS_RESOURCES } from '@oraii/core'
import { findRelevantKnowledge, type KnowledgeChunk } from '../knowledge/cbt'

// ── ORAII — Patient-facing AI Companion ──
// Between-session wellness support — NOT therapy replacement
// NICE Evidence Standards Framework: Tier B (guided digital self-help)
// Crisis escalation built in — always routes to UK crisis resources
// UK-GDPR: conversation content is not persisted beyond the session window
// No patient identifying data is sent to OpenAI — only the message history

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const ORAII_SYSTEM_PROMPT = `You are ORAII (pronounced "or-eye"), a warm and supportive wellness companion within the ORAII patient portal.
You help people reflect and care for their mental wellbeing between therapy sessions.
When users ask your name, say: "I'm ORAII — your wellness companion."

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
- Refer to yourself as "Daji" — your name is ORAII

Crisis protocol (non-negotiable):
If a user expresses suicidal thoughts, self-harm urges, or acute distress, immediately:
1. Acknowledge their feelings with warmth
2. Provide UK crisis resources (listed below)
3. Encourage them to contact their therapist, GP, or local NHS crisis team
4. Encourage going to A&E if in immediate danger
5. Do not continue casual conversation until they acknowledge the resources

UK crisis resources to always include in a crisis response:
- Samaritans: 116 123 (free, 24/7)
- NHS Crisis Team: 111 press 2 (mental health, 24/7)
- Crisis Text Line: Text SHOUT to 85258 (free, 24/7)
- Emergency: 999 or nearest A&E
- Childline: 0800 1111 (under 19s, free, 24/7)`

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type OraiiResponse = {
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

// RAG context builder — pulls relevant psychoeducation content
// based on conversation topic to ground ORAII responses in evidence
export type RAGContext = {
  topic: string
  content: string
  source: string // NICE guideline reference, CBT manual, etc.
}

export function buildRAGPrompt(contexts: RAGContext[]): string {
  if (!contexts.length) return ''
  return (
    '\n\nRelevant evidence-based context to inform your response (cite naturally, don\'t quote verbatim):\n' +
    contexts.map(c => `[${c.source}] ${c.content}`).join('\n\n')
  )
}

export async function generateOraiiResponse(
  messages: ChatMessage[],
  ragContexts?: KnowledgeChunk[]
): Promise<OraiiResponse> {
  const lastUserMessage = messages.at(-1)?.content ?? ''
  const crisisDetected = detectCrisis(lastUserMessage)

  // Auto-detect relevant knowledge if not explicitly provided
  const contexts = ragContexts ?? findRelevantKnowledge(lastUserMessage, 2)

  // Build enriched system prompt
  const systemPrompt = contexts.length > 0
    ? ORAII_SYSTEM_PROMPT + buildRAGPrompt(contexts.map(c => ({
        topic: c.topic,
        content: c.content,
        source: c.source,
      })))
    : ORAII_SYSTEM_PROMPT

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // patient chat uses mini — cheaper, still high quality
    messages: [
      { role: 'system', content: systemPrompt },
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

// Re-export knowledge utilities so callers can use them directly
export { findRelevantKnowledge, type KnowledgeChunk } from '../knowledge/cbt'
