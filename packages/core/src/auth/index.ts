import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// ── Browser client — uses cookies for session storage ──────────────────
// CRITICAL: Must use createBrowserClient from @supabase/ssr so the session
// is stored in cookies, not localStorage. This way the server-side
// createServerClient (which reads cookies) can see the same session.
export const createSupabaseClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Service role client — server-side only, never expose to browser
export const createSupabaseServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

export type PortalType = 'clinic' | 'patient'
