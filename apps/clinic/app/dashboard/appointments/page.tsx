import { createServerClient, getTherapistId } from '../../../utils/supabase/server'
import AppointmentsClient from './AppointmentsClient'

export default async function AppointmentsPage() {
  let appointments: any[] = []
  let patients:     any[] = []
  try {
    const supabase    = await createServerClient()
    const therapistId = await getTherapistId(supabase)

    const [apptRes, patRes] = await Promise.all([
      // Appointments scoped to this therapist
      therapistId
        ? supabase
            .from('appointments')
            .select('id, requested_time, reason, status, patient_id, patients(display_label)')
            .eq('therapist_id', therapistId)
            .order('requested_time', { ascending: true })
        : supabase
            .from('appointments')
            .select('id, requested_time, reason, status, patient_id, patients(display_label)')
            .order('requested_time', { ascending: true }),

      // Patients for the booking form — only this therapist's clients
      therapistId
        ? supabase
            .from('patients')
            .select('id, display_label')
            .eq('therapist_id', therapistId)
            .order('display_label', { ascending: true })
        : supabase
            .from('patients')
            .select('id, display_label')
            .order('display_label', { ascending: true }),
    ])

    appointments = (apptRes.data || []).map((a: any) => ({
      id:          a.id,
      time:        a.requested_time,
      reason:      a.reason,
      status:      a.status,
      patientId:   a.patient_id,
      patientName: a.patients?.display_label || 'Unknown',
    }))

    patients = (patRes.data || []).map((p: any) => ({
      id:   p.id,
      name: p.display_label || 'Unnamed',
    }))
  } catch { /* tables may not exist yet */ }

  return <AppointmentsClient appointments={appointments} patients={patients} />
}
