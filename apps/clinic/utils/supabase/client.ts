import { createSupabaseClient } from '@oraii/core/auth'

// Get the current therapist_id for the logged-in user — client-side
// Uses the cookie-based session (createBrowserClient from @supabase/ssr)
export async function getCurrentTherapistId(): Promise<string | null> {
  try {
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return null

    const { data } = await supabase
      .from('therapists')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    return data?.id ?? null
  } catch {
    return null
  }
}

// Load patients for the current therapist only
export async function loadTherapistPatients(requireConsent = false) {
  try {
    const supabase    = createSupabaseClient()
    const therapistId = await getCurrentTherapistId()
    if (!therapistId) return []

    let query = supabase
      .from('patients')
      .select('id, display_label, consent_given')
      .eq('therapist_id', therapistId)
      .order('display_label')

    if (requireConsent) {
      query = (query as any).eq('consent_given', true)
    }

    const { data, error } = await query
    if (error) console.error('[loadTherapistPatients]', error.message)
    return data || []
  } catch (e) {
    console.error('[loadTherapistPatients] exception:', e)
    return []
  }
}
