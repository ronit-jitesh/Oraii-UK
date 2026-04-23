// ── UK-GDPR Consent Management ──
// Lawful basis: Article 6(1)(a) + Article 9(2)(a) — explicit consent for special category health data
// ICO guidance: consent must be freely given, specific, informed, and unambiguous
// Consent must be as easy to withdraw as to give
// Increment CONSENT_VERSION whenever the consent text changes — triggers re-consent for existing users

export const CONSENT_VERSION = '1.0.0'

// Audio recording consent — shown before every session recording starts
export const AUDIO_CONSENT_TEXT = `
Before we start recording, please confirm you understand and agree to the following:

ORAII will record the audio of this therapy session solely to generate a clinical note draft.

What happens to your audio:
• It is transmitted securely to Deepgram (EU-hosted infrastructure) for transcription
• The audio is deleted immediately after transcription — it is not stored by ORAII or Deepgram
• The resulting text transcript is used by GPT-4o (UK data residency, zero retention) to draft your note
• The transcript is then deleted from ORAII's processing pipeline

What is stored:
• The AI-generated note draft (for your review and editing)
• A record that audio consent was given, and when

Your rights under UK-GDPR:
• Right of access — request a copy of your data at any time
• Right to erasure — request deletion of your records
• Right to withdraw consent — you may stop recording at any time

Data controller: ORAII Ltd
ICO registration: [ICO_REGISTRATION_NUMBER]
Data protection enquiries: privacy@oraii.co.uk
`.trim()

// Patient portal consent — shown at account creation
export const PATIENT_PORTAL_CONSENT_TEXT = `
ORAII processes limited information to provide you with between-session wellness support.

Your identity within ORAII is pseudonymous — we hold only a reference code, not your real name.
Your therapist links this reference to your identity in their own records.

What we process:
• Your wellness journal entries (if you create them)
• Mood and wellbeing tracking data you enter
• Chat messages with ORAII, our AI wellness companion
• Your safety plan (created with your therapist)

We do not share your data with third parties except as required to deliver the service
(Supabase for secure storage, OpenAI for AI responses — both under UK-GDPR Data Processing Agreements).

You may request deletion of your account and all associated data at any time.

Lawful basis: UK-GDPR Article 9(2)(a) — explicit consent for special category health data.
`.trim()

export type ConsentRecord = {
  userId: string
  consentType: 'audio_recording' | 'patient_portal'
  version: string
  givenAt: string
  ipHash: string     // SHA-256 hash of IP — never stored in cleartext per ICO guidance
  withdrawn: boolean
  withdrawnAt?: string
}

export type DataSubjectRequest = {
  type: 'access' | 'erasure' | 'rectification' | 'portability' | 'restriction'
  requestedAt: string
  dueBy: string      // UK-GDPR: respond within 1 calendar month
  status: 'pending' | 'in_progress' | 'complete'
  notes?: string
}

// UK-GDPR Article 30 — Records of Processing Activities
// Must be maintained and available to ICO on request
export const PROCESSING_ACTIVITIES = [
  {
    activity: 'Session audio transcription',
    purpose: 'Generate clinical note drafts for therapist review',
    lawfulBasis: 'Article 9(2)(a) — explicit consent',
    dataCategories: ['Audio recording', 'Speech transcript'],
    recipients: ['Deepgram EU (processor)', 'OpenAI UK (processor)'],
    retention: 'Audio: deleted immediately. Transcript: deleted after note generation.',
    transfers: 'Deepgram EU endpoint — no transfer outside UK/EEA',
  },
  {
    activity: 'Clinical note storage',
    purpose: 'Maintain clinical records for therapist use',
    lawfulBasis: 'Article 9(2)(h) — health treatment; Article 9(2)(a) — consent',
    dataCategories: ['Clinical notes', 'Risk assessments', 'Outcome scores'],
    recipients: ['Supabase eu-west-2 (processor)'],
    retention: '8 years from last contact (UK professional body guidance)',
    transfers: 'Supabase London region — no transfer outside UK/EEA',
  },
  {
    activity: 'Patient portal wellness features',
    purpose: 'Between-session mental health support',
    lawfulBasis: 'Article 9(2)(a) — explicit consent',
    dataCategories: ['Journal entries', 'Mood data', 'Chat messages', 'Safety plan'],
    recipients: ['Supabase eu-west-2 (processor)', 'OpenAI UK (processor for chat)'],
    retention: 'Until account deletion or 3 years inactivity',
    transfers: 'UK/EEA only',
  },
] as const
