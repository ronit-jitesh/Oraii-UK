import OpenAI from 'openai'
import type { NoteFormat } from '@oraii/core'

// ── UK Clinical Note Generation ──
// GPT-4o with UK data residency + zero retention
// British English throughout (behaviour not behavior, programme not program)
// References: Mental Health Act 1983/2007/2025, NICE guidelines, BACP/UKCP frameworks
// NOT: MHCA 2017 (Indian), CPT codes (American), Hinglish, NIMHANS protocols

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  defaultHeaders: {
    'OpenAI-Organization': process.env.OPENAI_ORG_ID ?? '',
  },
})

// Note format structure definitions — UK private practice standard
const NOTE_STRUCTURES: Record<NoteFormat, string> = {
  SOAP: `S — Subjective: Client's own words about their experience, mood, and concerns this session
O — Objective: Observable presentation, affect, behaviour, mental state (use clinical descriptors)
A — Assessment: Clinical formulation, progress toward treatment goals, risk level (clinician-determined)
P — Plan: Agreed next steps, therapeutic homework, next session focus, any referrals or escalations`,

  DAP: `D — Data: Factual account of what the client said and did; direct observations without interpretation
A — Assessment: Clinician's clinical interpretation, formulation, and judgement
P — Plan: Therapeutic interventions planned, between-session tasks, next session objectives`,

  GIRP: `G — Goal: Session goal and how it connects to the overall treatment plan
I — Intervention: Specific therapeutic techniques and modalities used (name the approach e.g. CBT, ACT, person-centred)
R — Response: How the client engaged with and responded to interventions
P — Plan: Next steps, homework tasks, and focus for the next session`,

  BIRP: `B — Behaviour: Client's presentation, mood, observable behaviour, and mental state at session start
I — Intervention: Therapeutic techniques applied and the rationale for their use
R — Response: Client's response, engagement level, and any shifts observed
P — Plan: Agreed actions, follow-up tasks, referrals, and next session objectives`,
}

// UK clinical context injected into every note generation request
const UK_SYSTEM_PROMPT = `You are a clinical documentation assistant supporting a UK-registered therapist (BACP, UKCP, BPS, or HCPC member).

UK clinical standards apply throughout:
- Use British English spelling (behaviour, programme, colour, recognise, counselling)
- Reference Mental Health Act 1983 (amended 2007, 2025) — NOT MHCA 2017 (Indian law)
- Use NICE guidelines as the clinical evidence framework (not NIMHANS)
- Professional body ethics: BACP Ethical Framework or UKCP Code of Ethics
- Clinical coding: SNOMED CT — do NOT use CPT codes (American) or mention QOF unless relevant
- Risk language: follow NICE CG136 (self-harm), CG90 (depression), CG123 (PTSD)
- Safeguarding: refer to local authority safeguarding procedures under the Children Act 1989 / Care Act 2014
- Do NOT use Indian clinical terminology, cultural references, or Hindi/Hinglish language

The output is a DRAFT note for therapist review. The therapist reviews, edits, and approves before it becomes a clinical record.
Flag any safeguarding concerns, mandatory reporting obligations, or C-SSRS-relevant disclosures clearly at the end of the note.`

export type GenerateNoteOptions = {
  transcript: string
  format: NoteFormat
  sessionContext?: {
    presentingIssue?: string
    treatmentApproach?: string // e.g. "CBT", "Person-centred", "ACT"
    treatmentGoals?: string[]
    previousSessionSummary?: string
    sessionNumber?: number
  }
}

export type GeneratedNote = {
  content: string
  format: NoteFormat
  generatedAt: string
  wordCount: number
  requiresTherapistReview: true  // always true — never changes
  flaggedConcerns: string[]      // safeguarding, risk, mandatory reporting flags
  disclaimer: string
}

export async function generateClinicalNote(
  options: GenerateNoteOptions
): Promise<GeneratedNote> {
  const { transcript, format, sessionContext } = options

  const contextBlock = sessionContext
    ? `Session context:
- Session number: ${sessionContext.sessionNumber ?? 'not specified'}
- Presenting issue: ${sessionContext.presentingIssue ?? 'not specified'}
- Treatment approach: ${sessionContext.treatmentApproach ?? 'not specified'}
- Treatment goals: ${sessionContext.treatmentGoals?.join('; ') ?? 'not specified'}
- Previous session summary: ${sessionContext.previousSessionSummary ?? 'first session or not provided'}`
    : ''

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: UK_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Generate a ${format} clinical note from the session transcript below.

${contextBlock}

Note structure to follow:
${NOTE_STRUCTURES[format]}

After the note, on a new line beginning with "FLAGS:", list any:
- Safeguarding concerns (Children Act 1989 / Care Act 2014)
- Suicide or self-harm risk indicators (note for C-SSRS review)
- Mandatory reporting obligations
- Urgent referrals required
If none, write "FLAGS: None identified."

Session transcript:
${transcript}`,
      },
    ],
    max_tokens: 1800,
    temperature: 0.25, // low temp — clinical notes need consistency not creativity
  })

  const raw = completion.choices[0]?.message?.content ?? ''

  // Extract flags section
  const flagsMatch = raw.match(/FLAGS:(.*?)$/ms)
  const flagsText = flagsMatch?.[1]?.trim() ?? ''
  const flaggedConcerns =
    flagsText === 'None identified.' || flagsText === ''
      ? []
      : flagsText
          .split('\n')
          .map(l => l.replace(/^[-•]\s*/, '').trim())
          .filter(Boolean)

  // Strip flags from main note content
  const content = raw.replace(/FLAGS:.*$/ms, '').trim()

  return {
    content,
    format,
    generatedAt: new Date().toISOString(),
    wordCount: content.split(/\s+/).length,
    requiresTherapistReview: true,
    flaggedConcerns,
    disclaimer:
      'AI-generated draft. Must be reviewed, edited, and signed off by the responsible clinician before being stored as a clinical record. Do not share with the client without review.',
  }
}
