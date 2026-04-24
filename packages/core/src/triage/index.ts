// ─────────────────────────────────────────────────────────────
// Triage classifier — shared between patient + clinic portals.
//
// Takes raw clinical inputs (PHQ-9, GAD-7, safety-plan events,
// chat keywords) and returns a triage verdict:
//   { severity, flagType, summary }
//
// Severity thresholds follow NICE-aligned clinical convention:
//   PHQ-9:  0-4 none · 5-9 mild · 10-14 moderate · 15-19 mod-sev · 20-27 severe
//   GAD-7:  0-4 none · 5-9 mild · 10-14 moderate · 15-21 severe
//
// A positive answer on PHQ-9 Q9 (thoughts of self-harm) is ALWAYS red
// regardless of total score — this matches IAPT clinical safety rules.
// ─────────────────────────────────────────────────────────────

export type TriageSeverity = 'red' | 'amber' | 'green'

export type TriageFlagType =
  | 'phq9_high'
  | 'phq9_severe'
  | 'phq9_q9_positive'
  | 'gad7_high'
  | 'gad7_severe'
  | 'safety_plan_warning'
  | 'safety_plan_created_self'
  | 'chat_risk_keyword'
  | 'silence_7d'
  | 'mood_drop_sustained'

export type TriageTriggerSource =
  | 'outcome_scores'
  | 'safety_plan'
  | 'chat_session'
  | 'journal'
  | 'system'
  | 'manual'

export interface TriageVerdict {
  severity: TriageSeverity
  flagType: TriageFlagType
  summary: string
}

/**
 * Classify a self-administered PHQ-9 submission.
 * Returns null if no flag is warranted (score < 15 and Q9 = 0).
 */
export function classifyPHQ9(
  score: number,
  q9Response?: number,
): TriageVerdict | null {
  // Q9 overrides everything — any self-harm ideation is red
  if (typeof q9Response === 'number' && q9Response >= 1) {
    return {
      severity: 'red',
      flagType: 'phq9_q9_positive',
      summary: `PHQ-9 Q9 positive (thoughts of self-harm) · score ${score}`,
    }
  }
  if (score >= 20) {
    return {
      severity: 'red',
      flagType: 'phq9_severe',
      summary: `PHQ-9 severe depression · score ${score}/27`,
    }
  }
  if (score >= 15) {
    return {
      severity: 'amber',
      flagType: 'phq9_high',
      summary: `PHQ-9 moderately severe · score ${score}/27`,
    }
  }
  return null
}

/**
 * Classify a self-administered GAD-7 submission.
 * Returns null if score < 10.
 */
export function classifyGAD7(score: number): TriageVerdict | null {
  if (score >= 15) {
    return {
      severity: 'red',
      flagType: 'gad7_severe',
      summary: `GAD-7 severe anxiety · score ${score}/21`,
    }
  }
  if (score >= 10) {
    return {
      severity: 'amber',
      flagType: 'gad7_high',
      summary: `GAD-7 moderate anxiety · score ${score}/21`,
    }
  }
  return null
}

/**
 * Keyword-based screen for chat/journal risk content.
 * Deliberately conservative — this is a SAFETY NET, not a diagnostic tool.
 * It flags for clinician review; it does not auto-escalate to services.
 */
const RISK_KEYWORDS_RED = [
  'kill myself',
  'end my life',
  'suicide',
  'suicidal',
  "can't go on",
  'want to die',
  'better off dead',
  'take my life',
  'hurt myself',
  'self harm',
  'self-harm',
  'cut myself',
  'no reason to live',
]

const RISK_KEYWORDS_AMBER = [
  'hopeless',
  'worthless',
  "can't cope",
  'giving up',
  'pointless',
  'numb',
  "don't want to be here",
  'tired of everything',
  'burden',
]

export function classifyTextForRisk(text: string): TriageVerdict | null {
  const lower = text.toLowerCase()
  for (const kw of RISK_KEYWORDS_RED) {
    if (lower.includes(kw)) {
      return {
        severity: 'red',
        flagType: 'chat_risk_keyword',
        summary: `Risk keyword detected: "${kw}"`,
      }
    }
  }
  for (const kw of RISK_KEYWORDS_AMBER) {
    if (lower.includes(kw)) {
      return {
        severity: 'amber',
        flagType: 'chat_risk_keyword',
        summary: `Distress keyword detected: "${kw}"`,
      }
    }
  }
  return null
}

/**
 * Human-readable label for UI chips.
 */
export function severityLabel(sev: TriageSeverity): string {
  switch (sev) {
    case 'red':   return 'Urgent'
    case 'amber': return 'Review'
    case 'green': return 'Stable'
  }
}

/**
 * Tailwind-agnostic inline colour tokens matching ORAII brand.
 * Background / border / text — safe to drop into style={{}}.
 */
export function severityColors(sev: TriageSeverity): {
  bg: string
  border: string
  text: string
  dot: string
} {
  switch (sev) {
    case 'red':
      return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#DC2626' }
    case 'amber':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', dot: '#F59E0B' }
    case 'green':
      return { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534', dot: '#22C55E' }
  }
}

/**
 * Severity ranking for sorting — red first.
 */
export function severityRank(sev: TriageSeverity): number {
  return sev === 'red' ? 0 : sev === 'amber' ? 1 : 2
}

// ── Low-level DB helper ─────────────────────────────────────────────
// Callers pass a Supabase client (service role or user-scoped). The
// helper simply inserts; RLS policies handle access control.

export interface CreateFlagInput {
  patientId: string
  therapistId: string
  verdict: TriageVerdict
  triggerSource: TriageTriggerSource
  sourceId?: string | null
  triggerData?: Record<string, unknown>
}

export async function createTriageFlag(
  svc: { from: (table: string) => { insert: (payload: unknown) => { select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } } },
  input: CreateFlagInput,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await svc
    .from('triage_flags')
    .insert({
      patient_id:     input.patientId,
      therapist_id:   input.therapistId,
      severity:       input.verdict.severity,
      flag_type:      input.verdict.flagType,
      summary:        input.verdict.summary,
      trigger_source: input.triggerSource,
      source_id:      input.sourceId ?? null,
      trigger_data:   input.triggerData ?? {},
      status:         'open',
    })
    .select('id')
    .single()

  if (error) {
    const msg = typeof (error as { message?: string }).message === 'string'
      ? (error as { message: string }).message
      : 'insert failed'
    return { error: msg }
  }
  return { id: data?.id }
}
