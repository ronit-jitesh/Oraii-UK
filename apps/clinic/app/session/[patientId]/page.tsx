import { createServerClient } from '../../../utils/supabase/server';
import { notFound } from 'next/navigation';
import SessionInterface from '../../../components/SessionInterface';

export default async function SessionPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;

  let patientName = 'Client';
  let sessionNumber = 1;

  try {
    const supabase = await createServerClient();
    const [patRes, countRes] = await Promise.all([
      supabase.from('patients').select('id, display_label').eq('id', patientId).single(),
      supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('patient_id', patientId),
    ]);
    if (!patRes.data) notFound();
    patientName = patRes.data.display_label || 'Client';
    sessionNumber = (countRes.count || 0) + 1;
  } catch {
    // If tables don't exist, still render the session interface
  }

  return (
    <SessionInterface patientId={patientId} patientName={patientName} sessionNumber={sessionNumber} />
  );
}
