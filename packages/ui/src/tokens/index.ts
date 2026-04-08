// ── ORAII brand design tokens ──
// Use these in both apps for visual consistency
// Primary brand: forest green — calm, grounded, professional
// Typography: Lora (headings) + Inter (body)

export const colors = {
  primary:     '#2D6A4F',
  primaryDark: '#1B4332',
  primaryMid:  '#40916C',
  light:       '#D8EDDF',
  background:  '#F7F5F0',
  border:      '#E2DDD5',
  muted:       '#6B7280',
  // Semantic
  danger:      '#DC2626',
  dangerLight: '#FEF2F2',
  warning:     '#D97706',
  warningLight:'#FFFBEB',
  info:        '#2563EB',
  infoLight:   '#EFF6FF',
  success:     '#059669',
  successLight:'#ECFDF5',
} as const

export const typography = {
  fontHeading: 'Lora, Georgia, serif',
  fontBody:    '"Inter", system-ui, -apple-system, sans-serif',
  fontMono:    '"JetBrains Mono", "Fira Code", monospace',
} as const

export const spacing = {
  xs:  '0.25rem',  // 4px
  sm:  '0.5rem',   // 8px
  md:  '1rem',     // 16px
  lg:  '1.5rem',   // 24px
  xl:  '2rem',     // 32px
  xl2: '3rem',     // 48px
} as const

export const radii = {
  sm:   '0.5rem',   // 8px
  md:   '0.75rem',  // 12px
  lg:   '1rem',     // 16px
  xl:   '1.25rem',  // 20px
  xl2:  '1.5rem',   // 24px
  full: '9999px',
} as const

// Tailwind theme extension — paste into tailwind.config.ts in both apps
export const tailwindThemeExtension = {
  colors: {
    oraii: {
      primary:     '#2D6A4F',
      'primary-dk':'#1B4332',
      'primary-md':'#40916C',
      light:       '#D8EDDF',
      bg:          '#F7F5F0',
      border:      '#E2DDD5',
      muted:       '#6B7280',
    },
  },
  fontFamily: {
    heading: ['Lora', 'Georgia', 'serif'],
    body:    ['Inter', 'system-ui', 'sans-serif'],
  },
  borderRadius: {
    '2xl': '1rem',
    '3xl': '1.5rem',
  },
} as const

// Consent copy versions — increment when text changes to trigger re-consent
export const CONSENT_VERSIONS = {
  audioRecording:  '1.0.0',
  patientPortal:   '1.0.0',
} as const
