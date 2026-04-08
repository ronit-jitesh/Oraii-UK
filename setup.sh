#!/bin/bash

# ── apps/clinic directories ──
mkdir -p apps/clinic/app/\(auth\)/login
mkdir -p apps/clinic/app/\(auth\)/register
mkdir -p "apps/clinic/app/(dashboard)/clients/[id]"
mkdir -p "apps/clinic/app/(dashboard)/sessions/[id]"
mkdir -p "apps/clinic/app/(dashboard)/notes/[id]"
mkdir -p "apps/clinic/app/(dashboard)/risk/[clientId]"
mkdir -p apps/clinic/app/\(dashboard\)/outcomes
mkdir -p apps/clinic/app/\(dashboard\)/appointments
mkdir -p apps/clinic/app/api/notes/generate
mkdir -p apps/clinic/app/api/risk/assess
mkdir -p apps/clinic/app/api/outcomes
mkdir -p apps/clinic/app/api/audio/transcribe
mkdir -p apps/clinic/components/notes
mkdir -p apps/clinic/components/risk
mkdir -p apps/clinic/components/outcomes
mkdir -p apps/clinic/components/audio
mkdir -p apps/clinic/lib

# ── apps/patient directories ──
mkdir -p apps/patient/app/\(auth\)/login
mkdir -p apps/patient/app/\(auth\)/register
mkdir -p apps/patient/app/\(portal\)/mindos
mkdir -p apps/patient/app/\(portal\)/journal
mkdir -p apps/patient/app/\(portal\)/safety-plan
mkdir -p apps/patient/app/\(portal\)/chat
mkdir -p apps/patient/app/\(portal\)/outcomes
mkdir -p apps/patient/app/\(portal\)/appointments
mkdir -p apps/patient/app/api/chat
mkdir -p apps/patient/app/api/journal
mkdir -p apps/patient/app/api/safety-plan
mkdir -p apps/patient/components/mindos
mkdir -p apps/patient/components/journal
mkdir -p apps/patient/components/safety
mkdir -p apps/patient/components/chat
mkdir -p apps/patient/lib

# ── packages/core ──
mkdir -p packages/core/src/db
mkdir -p packages/core/src/auth
mkdir -p packages/core/src/types
mkdir -p packages/core/src/utils

# ── packages/ai ──
mkdir -p packages/ai/src/notes
mkdir -p packages/ai/src/risk
mkdir -p packages/ai/src/chat
mkdir -p packages/ai/src/transcription

# ── packages/compliance ──
mkdir -p packages/compliance/src/gdpr
mkdir -p packages/compliance/src/dcb0129
mkdir -p packages/compliance/src/snomed

# ── packages/ui ──
mkdir -p packages/ui/src/components
mkdir -p packages/ui/src/tokens

# ── infra ──
mkdir -p infra/supabase/migrations
mkdir -p infra/supabase/functions

echo "✓ Directories created"
