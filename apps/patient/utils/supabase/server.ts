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
 * getPatientId — resolves the logged-in user's patient row.
 * Returns null if no auth session or no linked patient record.
 */
export async function getPatientId(
  supabase: Awaited<ReturnType<typeof createServerClient>>
): Promise<string | null> {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return null

    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('portal_auth_user_id', user.id)
      .single()

    return patient?.id ?? null
  } catch {
    return null
  }
}
