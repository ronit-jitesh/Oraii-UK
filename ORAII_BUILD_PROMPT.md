# ORAII UK — Therapist Portal Build Prompt

## Context
You are building the ORAII UK therapist portal at `/Users/ronitjitesh/Documents/oraii-uk/`.
Stack: Next.js 15 App Router, Supabase (eu-west-2 London), TypeScript, inline styles only.
Brand: primary `#2D6A4F`, light `#D8EDDF`, bg `#F7F5F0`, border `#E2DDD5`, text `#1A1816`, muted `#8B8680`.
Font: Lora for headings (fontFamily: 'Lora, Georgia, serif'), Inter/system-ui for body.
All styles are inline — no Tailwind classes, no CSS modules.
All DB writes use the anon key (RLS enforced). Server components use service role key.

## DB schema (key tables — 001_initial_schema.sql)
- `therapists` (id, auth_user_id, email, full_name, professional_body, registration_number)
- `patients` (id, therapist_id, display_label, consent_given, consent_date, consent_version, portal_auth_user_id)
- `sessions` (id, therapist_id, patient_id, session_date, duration_minutes, note_format, status)
- `clinical_notes` (id, session_id, therapist_id, patient_id, format, content, ai_generated, therapist_reviewed)
- `cssrs_assessments` (id, patient_id, therapist_id, session_id, [7 boolean items], clinician_risk_level, clinician_notes, supervisor_notified, supervisor_notified_at)
- `outcome_scores` (id, patient_id, therapist_id, session_id, measure, score, severity, completed_at)
- `safety_plans` (id, patient_id, therapist_id, warning_signs[], internal_coping_strategies[], crisis_contacts jsonb, means_restriction[])
- `appointments` (id, therapist_id, patient_id, scheduled_at, duration_minutes, location_type, status)
- `audit_log` (id, actor_type, actor_id_hash, action, resource_type, metadata, created_at)

## What has already been built (DO NOT rebuild these)
- [x] Login page with timeout banner (`app/(auth)/login/page.tsx`)
- [x] Dashboard layout with dark sidebar nav (`app/dashboard/layout.tsx`)
- [x] Dashboard overview page (`app/dashboard/page.tsx`)
- [x] Clients list with Add Client modal + consent capture (`app/dashboard/clients/ClientsPage.tsx`)
- [x] Add Client modal with UK-GDPR consent checkbox (`app/dashboard/clients/AddClientModal.tsx`)
- [x] Client profile page — 5 tabs: overview, risk, outcomes, sessions, safety (`app/dashboard/clients/[id]/ClientProfile.tsx`)
- [x] C-SSRS risk screening — 7 items, patient selector, save to DB, safety plan, supervisor notification (`app/dashboard/risk/page.tsx`)
- [x] PHQ-9 and GAD-7 outcome measures — patient selector, save to DB (`app/dashboard/outcomes/page.tsx`)
- [x] Session list table (`app/dashboard/sessions/`)
- [x] Notes list with review status (`app/dashboard/notes/`)
- [x] Appointments list (`app/dashboard/appointments/`)
- [x] Session timeout middleware — 30 min inactivity (`middleware.ts`)
- [x] Supabase migrations 001–004

## Remaining build priorities (in order)

### CRITICAL — build next
1. **GP letter generator** (`app/dashboard/notes/GPLetterModal.tsx`)
   - Triggered from a "Generate GP letter" button on clinical_notes rows
   - Template: "Dear Dr [name], I am writing regarding [Client Ref] whom I have been seeing since [date]..."
   - Pre-fills: client label, session date, C-SSRS risk level (from latest cssrs_assessments), PHQ-9/GAD-7 latest scores
   - Therapist edits inline, then copies to clipboard
   - Save as `gp_letters` table row (if table exists) or to clinical_notes with format='GP_LETTER'

2. **Note review + edit** (`app/dashboard/notes/NoteCard.tsx`)
   - If NoteCard.tsx is missing or incomplete: inline textarea for editing AI note content
   - "Approve" button sets `therapist_reviewed=true` and `therapist_reviewed_at=now()`
   - Approved notes show green badge and are read-only
   - Pending notes show amber badge with edit + approve buttons

3. **PHQ-9/GAD-7 trend chart on client profile**
   - In `ClientProfile.tsx` outcomes tab
   - Simple SVG bar chart showing score over time (already have OutcomeSparkline, expand it)
   - Color-coded by band (minimal=green, mild=blue, moderate=amber, severe=red)

4. **Session-to-risk linking**
   - On risk page (`app/dashboard/risk/page.tsx`): add session_id selector below patient selector
   - Load sessions for selected patient: `sessions.filter(s => s.patient_id === patientId)`
   - Write session_id FK into cssrs_assessments row

5. **Audit log viewer** (`app/dashboard/audit/page.tsx`)
   - Server component reading from audit_log table
   - Table: timestamp, actor_type, action, resource_type, metadata preview
   - Therapists see only their own entries (via RLS)

### HIGH — build after critical
6. **Dashboard risk alert count** — query cssrs_assessments for this therapist, count rows with clinician_risk_level='high' assessed in last 30 days → show in recentRiskAlerts stat on dashboard overview
7. **Appointment booking** — AppointmentsClient.tsx currently has a list; add "Book appointment" button + modal with patient selector, date/time picker, location type (in_person/video/phone)
8. **Session timer** — in SessionInterface.tsx, auto-start a timer when session starts, auto-fill duration_minutes on save
9. **Mobile sidebar** — collapse to hamburger on <768px viewport

## Component patterns to follow

### Server component pattern (data fetching)
```tsx
import { createClient } from '@supabase/supabase-js'
export default async function Page() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('table').select('...').order('created_at', { ascending: false })
  return <ClientComponent data={data || []} />
}
```

### Client component with Supabase write
```tsx
'use client'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Always resolve therapist_id before writing:
const { data: { session } } = await supabase.auth.getSession()
const { data: th } = await supabase.from('therapists').select('id').eq('auth_user_id', session.user.id).single()
const therapistId = th?.id
```

### Section header pattern
```tsx
function SectionHeader({ icon, title, count }: { icon: string; title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B8680" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8B8680' }}>{title}</p>
      {count !== undefined && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: 10, background: '#F0EDE6', color: '#8B8680' }}>{count}</span>}
    </div>
  )
}
```

### Risk level config
```tsx
const RISK_CFG = {
  low:      { color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', label: 'Low' },
  moderate: { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', label: 'Moderate' },
  high:     { color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', label: 'HIGH' },
  imminent: { color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA', label: 'IMMINENT' },
}
```

### Badge pattern
```tsx
<span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#D8EDDF', color: '#1B4332' }}>
  Active
</span>
```

### Modal pattern (no position:fixed — use fixed on backdrop only)
```tsx
<div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
  <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px', width: '100%', maxWidth: 480 }}>
    {/* modal content */}
  </div>
</div>
```

## UK clinical requirements (non-negotiable)
- C-SSRS administered by therapist — never auto-populated by AI
- PHQ-9 item 9 positive response always triggers C-SSRS referral alert
- Safety plans required at moderate risk (severity ≥3) and above
- Supervisor notification required at high risk (severity ≥5) and above
- UK crisis numbers: Samaritans 116 123, NHS 111 option 2, Crisis Text Line SHOUT 85258, Emergency 999
- All references are to NICE guidelines, MHA 1983/2007/2025, BACP/UKCP/BPS/HCPC — not Indian regulations
- Data residency: Supabase eu-west-2 London only
- No real patient names stored anywhere — pseudonymous labels only
