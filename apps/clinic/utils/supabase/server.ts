import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}

/**
 * getTherapistId — resolves the logged-in user's therapist row.
 *
 * Flow:
 *   1. Get the Supabase auth user from the session cookie
 *   2. Look up therapists.auth_user_id = user.id
 *   3. If no row yet (first login), auto-create one using the user's email
 *   4. Return the therapist UUID — use this to scope ALL queries
 *
 * Returns null only if there is genuinely no auth session (not logged in).
 */
export async function getTherapistId(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string | null> {
  try {
    // Step 1: who is logged in?
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return null

    // Step 2: find their therapist row
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (therapist?.id) return therapist.id

    // Step 3: no row yet — create one (first login / onboarding)
    const displayName = user.user_metadata?.full_name
      || user.email?.split('@')[0]
      || 'Therapist'

    const { data: created, error: createErr } = await supabase
      .from('therapists')
      .insert({
        auth_user_id:        user.id,
        email:               user.email,
        full_name:           displayName,
        professional_body:   'BACP',
        registration_number: `AUTO-${user.id.slice(0, 8).toUpperCase()}`,
        specialisms:         [],
      })
      .select('id')
      .single()

    if (createErr) {
      console.error('[getTherapistId] create error:', createErr.message)
      return null
    }

    return created?.id ?? null
  } catch (e) {
    console.error('[getTherapistId] exception:', e)
    return null
  }
}
