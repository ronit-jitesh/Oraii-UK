// ── UK Clinical Types ──
// All coding: SNOMED CT. CPT codes do not exist in UK healthcare.
// Professional bodies: BACP, UKCP, BPS, HCPC (not IMA, MCI — those are Indian)
// Law: Mental Health Act 1983/2007/2025 (not MHCA 2017 — that is Indian law)
// Data: UK-GDPR + DPA 2018 (not DPDP Act 2023 — that is Indian law)

export type NoteFormat = 'SOAP' | 'DAP' | 'GIRP' | 'BIRP'

export type UKProfessionalBody = 'BACP' | 'UKCP' | 'BPS' | 'HCPC' | 'OTHER'

export type TherapistProfile = {
  id: string
  email: string
  fullName: string
  professionalBody: UKProfessionalBody
  registrationNumber: string
  specialisms: string[]
  createdAt: string
}

// Patient identity is pseudonymous — UUID only in ORAII.
// Real name is held by the therapist in their own practice records OUTSIDE ORAII.
// This is UK-GDPR by design: pseudonymisation reduces breach risk.
export type PatientProfile = {
  id: string              // pseudonymous UUID — never a real name in the DB
  displayLabel: string    // therapist-assigned code e.g. "Client A" or "P001"
  therapistId: string
  createdAt: string
  consentGiven: boolean
  consentDate: string
  consentVersion: string  // increment when consent language changes
}

export type ClinicalSession = {
  id: string
  therapistId: string
  patientId: string       // pseudonymous UUID
  sessionDate: string
  durationMinutes: number
  noteFormat: NoteFormat
  audioConsentGiven: boolean
  audioConsentTimestamp: string
  status: 'draft' | 'complete' | 'archived'
  createdAt: string
  updatedAt: string
}

// UK clinical coding — SNOMED CT
// NOT CPT (American procedural codes — irrelevant to UK)
// NOT ICD-10 as primary coding (used for statistical purposes only)
export type SnomedCode = {
  conceptId: string       // e.g. "35489007" (depressive disorder)
  displayName: string
  hierarchy: string
}

// Outcome measures standard in UK Talking Therapies and private practice
// CORE-10 is the UK standard (not PHQ-9 alone — that is American primary)
export type OutcomeMeasure = 'PHQ-9' | 'GAD-7' | 'DASS-21' | 'CORE-10'

export type OutcomeScore = {
  id: string
  patientId: string
  therapistId: string
  sessionId: string
  measure: OutcomeMeasure
  score: number
  severity: string
  completedAt: string
}

// C-SSRS — Columbia Suicide Severity Rating Scale
// REGULATORY NOTE: This is clinician-administered scoring SUPPORT only.
// All risk determinations are made by the responsible clinician — not the software.
// This framing avoids MHRA Class IIa classification as an autonomous clinical decision tool.
// MHRA borderlines team should be consulted for written confirmation before launch.
export type CSSRSAssessment = {
  id: string
  sessionId: string
  patientId: string
  therapistId: string
  // Ideation items (Columbia Protocol)
  wishToBeDead: boolean
  passiveSuicidalIdeation: boolean
  activeSuicidalIdeation: boolean
  ideationWithMethod: boolean
  ideationWithIntentNoPlan: boolean
  ideationWithIntentAndPlan: boolean
  // Behaviour items
  preparatoryBehaviour: boolean
  abortedAttempt: boolean
  interruptedAttempt: boolean
  actualAttempt: boolean
  // Clinician-determined ONLY — never auto-determined by AI
  clinicianRiskLevel: 'low' | 'moderate' | 'high' | 'imminent' | null
  clinicianNotes: string
  assessedAt: string
}

// Safety Plan — Stanley-Brown Safety Planning Intervention (SPI)
// Evidence: Stanley & Brown (2012) JAMA Psychiatry — 50% reduction in suicidal behaviour
// 6 components: warning signs, internal coping, social distraction,
// crisis contacts, professional contacts, means restriction
export type SafetyPlan = {
  id: string
  patientId: string
  therapistId: string
  // Component 1: Warning signs
  warningSigns: string[]
  // Component 2: Internal coping strategies (self-soothing, distraction)
  internalCopingStrategies: string[]
  // Component 3: Social contacts for distraction (NOT crisis disclosure)
  socialContactsDistraction: Array<{ name: string; phone?: string }>
  // Component 4: People patient can contact in crisis
  crisisContacts: Array<{ name: string; phone: string; relationship: string }>
  // Component 5: Professionals + agencies (Samaritans always included)
  professionalContacts: Array<{
    name: string
    phone: string
    availability: string
  }>
  // Component 6: Making environment safer (means restriction)
  meansRestriction: string[]
  createdAt: string
  updatedAt: string
  version: number
}
