export default function AppointmentsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Appointments</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your upcoming therapy sessions. Booked by your therapist.
      </p>

      <div className="bg-white rounded-2xl border border-[var(--oraii-border)] p-5 text-center py-12">
        <p className="text-sm text-gray-400">
          No upcoming appointments. Your therapist will schedule these and they will appear here.
        </p>
      </div>

      <div className="mt-4 bg-[var(--oraii-light)] rounded-2xl px-5 py-4 text-sm text-[var(--oraii-primary)]">
        <p className="font-medium mb-1">Need to contact your therapist?</p>
        <p className="text-xs">
          Use the contact details your therapist provided when you started working together.
          ORAII does not handle direct messaging between you and your therapist.
        </p>
      </div>
    </div>
  )
}
