# ORAII UK

UK-native mental health AI platform. Two separate portals sharing a compliant data bridge.

## Structure

```
apps/
  clinic/   — Therapist portal (oraii.co.uk/clinic)  port 3000
  patient/  — Patient portal PWA (oraii.co.uk/me)    port 3001
packages/
  core/       — Shared DB, auth, types, UK-GDPR utils
  ai/         — GPT-4o notes, Deepgram EU ASR, C-SSRS engine, Daji chat
  ui/         — Shared design system (ORAII brand tokens)
  compliance/ — UK-GDPR consent, DCB0129 hazard log, SNOMED CT
infra/
  supabase/   — Migrations and edge functions (eu-west-2)
```

## UK Compliance Stack

| Requirement | Solution |
|---|---|
| Data residency | Supabase eu-west-2 (London) |
| LLM | OpenAI GPT-4o — UK data residency + zero retention |
| ASR | Deepgram Nova-3 — EU endpoint (api.eu.deepgram.com) |
| Data law | UK-GDPR + DPA 2018 — ICO registered |
| Clinical safety | DCB0129 hazard log in packages/compliance/src/dcb0129 |
| Clinical coding | SNOMED CT (not CPT — American; not ICD-10 as primary) |
| Mental health law | Mental Health Act 1983/2007/2025 (not MHCA 2017 — Indian) |
| Professional bodies | BACP, UKCP, BPS, HCPC (not IMA, MCI) |
| Patient identity | Pseudonymous UUID — no real names stored in ORAII |

## What is NOT in this codebase (India version elements removed)

- MHCA 2017 — replaced with Mental Health Act 1983/2007/2025
- DPDP Act 2023 — replaced with UK-GDPR + DPA 2018
- CPT billing codes — replaced with SNOMED CT + QOF codes
- Sarvam AI / Saaras — replaced with Deepgram EU endpoint
- NIMHANS protocols — replaced with NICE guidelines
- Hinglish taxonomy — English clinical terminology only
- Indian professional body references — replaced with BACP/UKCP/BPS/HCPC

## Getting Started

```bash
cp .env.example .env.local
# Fill in your Supabase (eu-west-2), OpenAI, and Deepgram keys

npm install
npm run dev:clinic    # therapist portal → localhost:3000
npm run dev:patient   # patient portal   → localhost:3001
```

## Database

```bash
# Push migration to your Supabase EU project
supabase db push

# Regenerate TypeScript types after schema changes
npm run db:types
```

## Two-sided Revenue Model

- Therapist: £49/mo basic (notes only) | £99/mo pro (full platform) | £149/mo enterprise
- Patient: free tier (appointments, basic chat) | £9.99/mo premium (MindOS, journal AI, reports)

## 5-Year Roadmap

- Year 1 (2026): 10-20 therapist pilots Edinburgh + London
- Year 2 (2027): Scottish Health Board intro, seed raise £250-500K
- Year 3 (2028): SBRI Healthcare Phase 1, first NHS Talking Therapies pilot
- Year 4 (2029): Series A, NHS Innovation Accelerator, EHR integrations
- Year 5 (2030): NHS national framework or international expansion
