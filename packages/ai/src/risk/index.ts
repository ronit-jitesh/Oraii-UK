import OpenAI from 'openai'

// ── C-SSRS Transcript Screening ──
//
// REGULATORY POSITION (critical — read before modifying):
// This module identifies C-SSRS-relevant language in session transcripts
// to ASSIST the therapist in completing their own clinical assessment.
// It does NOT autonomously determine risk level.
// The clinician makes ALL risk determinations using full clinical judgement.
//
// This framing positions the tool as documentation support (not a clinical decision tool),
// reducing MHRA Class IIa SaMD classification risk.
// Before product launch, contact: devices.borderlines@mhra.gov.uk
// for written confirmation of non-device status. Keep the response on file.
//
// UK legal framework:
// - Rabone v Pennine Care NHS Foundation Trust [2012] — duty of care when real/immediate risk known
// - NICE CG133 — suicide prevention
// - Mental Health Act 1983 s.5(2) — holding power (clinician context only)
// - Online Safety Act 2023 — platform obligations around suicide-related content

import type { CSSRSAssessment } from '@oraii/core'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export type CSSRSFlag = {
  passage: string           // exact quoted text from transcript
  cssrsItem: string         // which C-SSRS item this may relate to
  clinicalNote: string      // why this passage is flagged
  requiresTherapistReview: true
}

export type CSSRSScreeningResult = {
  flags: CSSRSFlag[]
  recommendedItems: string[]  // C-SSRS items the therapist should assess
  safeguardingConcern: boolean
  disclaimer: string
  ukCrisisLines: typeof UK_CRISIS_LINES
}

export const UK_CRISIS_LINES = [
  { name: 'Samaritans', contact: '116 123', available: '24/7' },
  { name: 'NHS Mental Health Crisis', contact: '111 option 2', available: '24/7' },
  { name: 'Crisis Text Line (Shout)', contact: 'Text SHOUT to 85258', available: '24/7' },
  { name: 'Emergency Services', contact: '999', available: '24/7' },
] as const

export async function screenTranscriptForCSSRS(
  transcript: string
): Promise<CSSRSScreeningResult> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You assist UK-registered therapists by identifying passages in session transcripts
that may be relevant to C-SSRS (Columbia Suicide Severity Rating Scale) assessment.

You do NOT make clinical risk determinations. You highlight language for the therapist's review.

C-SSRS items to screen for:
1. Wish to be dead (passive)
2. Non-specific active suicidal ideation
3. Active ideation with method (no plan/intent)
4. Active ideation with intent to act (no plan)
5. Active ideation with plan and intent
6. Preparatory behaviour
7. Aborted attempt
8. Interrupted attempt
9. Actual attempt

Also flag any safeguarding concerns under UK law (Children Act 1989, Care Act 2014).

Return JSON:
{
  "flags": [
    {
      "passage": "exact quoted text",
      "cssrsItem": "item name",
      "clinicalNote": "brief clinical rationale"
    }
  ],
  "recommendedItems": ["list of C-SSRS item names to assess"],
  "safeguardingConcern": boolean
}`,
      },
      {
        role: 'user',
        content: `Review this therapy session transcript for C-SSRS-relevant language:\n\n${transcript}`,
      },
    ],
    max_tokens: 1000,
    temperature: 0.1,
  })

  const raw = JSON.parse(
    completion.choices[0]?.message?.content ?? '{}'
  )

  return {
    flags: (raw.flags ?? []).map((f: any) => ({
      ...f,
      requiresTherapistReview: true as const,
    })),
    recommendedItems: raw.recommendedItems ?? [],
    safeguardingConcern: raw.safeguardingConcern ?? false,
    disclaimer:
      'This screening identifies potentially relevant language only. ' +
      'All risk determinations must be made by the responsible clinician ' +
      'using full clinical judgement and direct assessment. ' +
      'This output is not a risk assessment.',
    ukCrisisLines: UK_CRISIS_LINES,
  }
}

// Stanley-Brown Safety Planning Intervention — 6-component structure
// Evidence: Stanley & Brown (2012) JAMA Psychiatry
// Patients receiving SPI were ~50% less likely to exhibit suicidal behaviour at 6 months
export const SAFETY_PLAN_COMPONENTS = [
  {
    step: 1,
    title: 'Warning signs',
    description: 'Thoughts, images, feelings, behaviours that signal a crisis may be developing',
    examples: ['Feeling hopeless', 'Isolating from others', 'Increased alcohol use'],
  },
  {
    step: 2,
    title: 'Internal coping strategies',
    description: 'Things the patient can do alone to distract or self-soothe',
    examples: ['Going for a walk', 'Listening to music', 'Breathing exercises'],
  },
  {
    step: 3,
    title: 'Social contacts for distraction',
    description: 'People and places that provide distraction — not necessarily crisis disclosure',
    examples: ['Call a friend', 'Go to a coffee shop', 'Visit family'],
  },
  {
    step: 4,
    title: 'Adults to contact in a crisis',
    description: 'People the patient can tell they are in crisis and ask for help',
    examples: ['Family member', 'Close friend', 'Neighbour'],
  },
  {
    step: 5,
    title: 'Professionals and agencies to contact',
    description: 'Therapist, GP, crisis line, emergency services',
    alwaysInclude: [
      'Samaritans: 116 123',
      'NHS 111 option 2',
      'Shout: Text SHOUT to 85258',
      '999 for immediate danger',
    ],
  },
  {
    step: 6,
    title: 'Making the environment safer',
    description: 'Means restriction — reducing access to lethal means during a crisis period',
    examples: [
      'Ask someone to hold medication',
      'Remove or secure sharp objects',
      'Limit access to alcohol',
    ],
  },
] as const
