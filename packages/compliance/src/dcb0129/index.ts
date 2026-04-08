// ── DCB0129 Clinical Safety Standard ──
// Mandatory for NHS deployment under Health and Social Care Act 2012
// Strongly recommended for private practice — required before any NHS conversation
//
// Key requirements:
// 1. Appoint a Clinical Safety Officer (CSO) — must be a senior UK-registered clinician
// 2. Produce a Clinical Risk Management Plan
// 3. Maintain a Hazard Log (this file)
// 4. Produce a Clinical Safety Case Report before deployment
//
// Cost estimate: £10,000–£30,000 via specialist consultancy (e.g. Assuric, AbedGraham)
// Timeline: approximately 3 months for initial compliance
//
// This hazard log must be reviewed by the CSO and updated when:
// - New features are added that could affect clinical safety
// - An incident occurs
// - On a scheduled review date

export type HazardSeverity =
  | 'catastrophic'  // death or major permanent harm
  | 'major'         // significant injury or harm, potentially permanent
  | 'moderate'      // short-term harm requiring treatment
  | 'minor'         // low-level harm, no treatment required
  | 'negligible'    // inconvenience or no harm

export type HazardLikelihood =
  | 'certain'    // will happen in most circumstances
  | 'likely'     // will probably happen in most circumstances
  | 'possible'   // might happen in some circumstances
  | 'unlikely'   // could happen but not expected
  | 'rare'       // exceptional circumstances only

export type HazardStatus = 'open' | 'mitigated' | 'accepted' | 'closed'

export type Hazard = {
  id: string
  title: string
  description: string
  cause: string
  effect: string
  severity: HazardSeverity
  likelihood: HazardLikelihood
  riskRating: number
  controls: string[]
  residualSeverity: HazardSeverity
  residualLikelihood: HazardLikelihood
  residualRisk: number
  status: HazardStatus
  owner: string
  reviewDate: string
  notes?: string
}

// Risk matrix: severity (1-5) × likelihood (1-5)
// Catastrophic=5, Major=4, Moderate=3, Minor=2, Negligible=1
// Certain=5, Likely=4, Possible=3, Unlikely=2, Rare=1
export const HAZARD_LOG: Hazard[] = [
  {
    id: 'H001',
    title: 'C-SSRS screening misses suicidal ideation',
    description: 'AI screening fails to flag indirect, ambiguous, or culturally specific expressions of suicidal ideation in session transcript',
    cause: 'GPT-4o pattern matching misses non-literal language or metaphorical expressions of distress',
    effect: 'Therapist not alerted to potential risk; patient does not receive appropriate intervention; harm to patient',
    severity: 'catastrophic',
    likelihood: 'possible',
    riskRating: 15,
    controls: [
      'C-SSRS screening is explicitly framed as documentation support only — therapist makes all risk determinations',
      'Disclaimer displayed prominently on every screening result screen',
      'Therapist training materials explain AI limitations in risk detection',
      'System prompts therapist to conduct independent C-SSRS assessment each session regardless of AI output',
      'Clinician risk level field in CSSRS form requires manual therapist entry — cannot be auto-populated',
    ],
    residualSeverity: 'catastrophic',
    residualLikelihood: 'unlikely',
    residualRisk: 8,
    status: 'open',
    owner: 'Clinical Safety Officer',
    reviewDate: '2026-09-01',
    notes: 'MHRA borderlines consultation pending. Risk accepted at residual level pending CSO sign-off.',
  },
  {
    id: 'H002',
    title: 'AI-generated note contains clinically inaccurate content',
    description: 'GPT-4o hallucinates or misinterprets transcript, producing a note with incorrect clinical content that the therapist does not catch on review',
    cause: 'LLM hallucination; poor audio quality producing inaccurate transcript; therapist time pressure leading to insufficient review',
    effect: 'Inaccurate clinical record; compromised continuity of care; potential clinical harm if acted upon',
    severity: 'major',
    likelihood: 'possible',
    riskRating: 12,
    controls: [
      'All notes are watermarked as AI-generated drafts in the UI and in stored metadata',
      'Notes cannot be marked as complete without a deliberate therapist review action',
      'Review prompts highlight sections most likely to contain errors (risk, diagnosis, plan)',
      'Disclaimer on every note screen in non-dismissible banner',
      'Version history maintained — original AI draft preserved alongside therapist edits',
    ],
    residualSeverity: 'major',
    residualLikelihood: 'unlikely',
    residualRisk: 8,
    status: 'mitigated',
    owner: 'Clinical Safety Officer',
    reviewDate: '2026-09-01',
  },
  {
    id: 'H003',
    title: 'Patient audio or health data transmitted outside UK/EEA',
    description: 'Misconfiguration causes audio or clinical data to be routed to non-EU Deepgram endpoint or non-UK OpenAI region',
    cause: 'Environment variable misconfiguration; infrastructure change without compliance review; developer error',
    effect: 'UK-GDPR unlawful international transfer; ICO enforcement action (fines up to £17.5M or 4% global turnover); reputational damage',
    severity: 'major',
    likelihood: 'unlikely',
    riskRating: 8,
    controls: [
      'Deepgram EU endpoint validated on startup — app refuses to start if non-EU endpoint detected',
      'OpenAI UK data residency header set on all API calls',
      'Supabase project region locked to eu-west-2 (London)',
      'Infrastructure audit checklist run before each production deployment',
      'Data Processing Agreements in place with Deepgram, OpenAI, and Supabase',
    ],
    residualSeverity: 'major',
    residualLikelihood: 'rare',
    residualRisk: 4,
    status: 'mitigated',
    owner: 'Technical Lead',
    reviewDate: '2026-09-01',
  },
  {
    id: 'H004',
    title: 'Daji chatbot fails to escalate patient in crisis',
    description: 'Patient expresses suicidal ideation to Daji; chatbot does not detect crisis and continues normal conversation without providing crisis resources',
    cause: 'Crisis keyword matching misses indirect expression; GPT-4o system prompt not followed correctly',
    effect: 'Patient in crisis does not receive signposting to emergency services; potential harm',
    severity: 'catastrophic',
    likelihood: 'unlikely',
    riskRating: 10,
    controls: [
      'Dual-layer crisis detection: keyword matching in application code + GPT-4o system prompt instruction',
      'Crisis resources displayed in UI whenever crisisDetected flag is true — not dependent on AI response content',
      'Daji explicitly told not to continue casual conversation after crisis disclosure',
      'Regular red-team testing of crisis scenarios',
      'Online Safety Act 2023 compliance review — content moderation obligations',
    ],
    residualSeverity: 'catastrophic',
    residualLikelihood: 'rare',
    residualRisk: 5,
    status: 'mitigated',
    owner: 'Clinical Safety Officer',
    reviewDate: '2026-09-01',
  },
  {
    id: 'H005',
    title: 'Safety plan not accessible when patient is in crisis',
    description: 'Patient attempts to access their safety plan during a crisis but cannot due to app downtime, login failure, or connectivity issues',
    cause: 'Server outage; authentication failure; poor mobile connectivity',
    effect: 'Patient cannot access crisis contacts and professional resources at critical moment',
    severity: 'major',
    likelihood: 'possible',
    riskRating: 12,
    controls: [
      'Safety plan cached locally on device (PWA offline capability)',
      'Crisis resources (Samaritans etc.) shown on login screen without authentication',
      'Therapist advised to provide printed safety plan as backup',
      '99.9% uptime SLA from Supabase infrastructure',
    ],
    residualSeverity: 'major',
    residualLikelihood: 'unlikely',
    residualRisk: 8,
    status: 'open',
    owner: 'Technical Lead',
    reviewDate: '2026-09-01',
    notes: 'PWA offline caching for safety plan is a P0 development task before patient portal go-live.',
  },
]
