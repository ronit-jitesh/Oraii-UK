import { createServerClient, getTherapistId } from '../../../utils/supabase/server'
import ClientsPage from './ClientsPage'

export default async function Page() {
  let clients: any[] = []
  try {
    const supabase    = await createServerClient()
    const therapistId = await getTherapistId(supabase)

    const query = supabase
      .from('patients')
      .select('id, display_label, primary_complaint, referral_source, age, gender, consent_given, created_at')
      .order('created_at', { ascending: false })

    const { data, error } = therapistId
      ? await query.eq('therapist_id', therapistId)
      : await query.is('therapist_id', null)

    if (error) console.error('[clients page]', error.message)

    clients = (data || []).map((p: any) => ({
      id:                p.id,
      name:              p.display_label || 'Unnamed client',
      age:               p.age,
      gender:            p.gender,
      primary_complaint: p.primary_complaint,
      status:            p.consent_given ? 'active' : 'pending consent',
      createdAt:         p.created_at,
    }))
  } catch (e) {
    console.error('[clients page] exception:', e)
  }

  return <ClientsPage clients={clients} />
}
