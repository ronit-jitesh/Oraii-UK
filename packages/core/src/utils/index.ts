import { randomUUID, createHash } from 'crypto'

// ── UK-GDPR Pseudonymisation Utilities ──
// Patient real identity is NEVER stored in ORAII.
// Therapist assigns a pseudonymous UUID at patient creation.
// The link between UUID and real name lives only in the therapist's
// own records outside ORAII (their practice management system or paper records).
// UK-GDPR Article 4(5): pseudonymisation reduces but does not eliminate data protection obligations.

export const generatePatientUUID = (): string => randomUUID()

// One-way hash for audit log entries — cannot be reversed to patient identity
export const hashForAudit = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 16)

// UK date format — DD/MM/YYYY (not US MM/DD/YYYY)
export const formatUKDate = (date: Date): string =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

// Build a UK-GDPR compliant consent record
// Lawful basis: Article 9(2)(a) — explicit consent for special category health data
export const buildConsentRecord = (version: string) => ({
  consentGiven: true,
  consentDate: new Date().toISOString(),
  consentVersion: version,
  lawfulBasis: 'explicit_consent_article_9_2_a',
})

// UK crisis resources — always included, never conditional on risk level
// These must appear in the patient portal safety plan and crisis features
export const UK_CRISIS_RESOURCES = [
  {
    name: 'Samaritans',
    phone: '116 123',
    text: null,
    available: '24/7',
    free: true,
    description: 'Confidential emotional support',
  },
  {
    name: 'Crisis Text Line (Shout)',
    phone: null,
    text: 'Text SHOUT to 85258',
    available: '24/7',
    free: true,
    description: 'Text-based crisis support',
  },
  {
    name: 'NHS Mental Health Crisis Line',
    phone: '111 option 2',
    text: null,
    available: '24/7',
    free: true,
    description: 'NHS urgent mental health support',
  },
  {
    name: 'Emergency Services',
    phone: '999',
    text: null,
    available: '24/7',
    free: true,
    description: 'If you or someone else is in immediate danger',
  },
] as const

export type UKCrisisResource = (typeof UK_CRISIS_RESOURCES)[number]
