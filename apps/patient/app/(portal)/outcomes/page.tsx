// Outcome scores — patient view of their PHQ-9, GAD-7, DASS-21, CORE-10 over time
// Scores are entered by the therapist and shared with the patient here
// CORE-10 is the UK standard for NHS Talking Therapies
export default function OutcomesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Your progress</h1>
      <p className="text-sm text-gray-500 mb-6">
        Outcome scores recorded with your therapist — PHQ-9, GAD-7, DASS-21, CORE-10.
        These track your wellbeing over time.
      </p>

      {/* Score legend */}
      <div className="bg-white rounded-2xl border border-[var(--oraii-border)] p-5 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">About your scores</p>
        <div className="space-y-2 text-xs text-gray-500">
          <p><span className="font-medium text-gray-700">PHQ-9</span> — measures depression symptoms (0–27). Lower is better.</p>
          <p><span className="font-medium text-gray-700">GAD-7</span> — measures anxiety symptoms (0–21). Lower is better.</p>
          <p><span className="font-medium text-gray-700">CORE-10</span> — UK standard wellbeing measure (0–40). Lower is better.</p>
          <p><span className="font-medium text-gray-700">DASS-21</span> — measures depression, anxiety and stress (0–42 each). Lower is better.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--oraii-border)] p-5 text-center py-12">
        <p className="text-sm text-gray-400">
          No scores recorded yet.
          Your therapist will add these during your sessions and they will appear here.
        </p>
      </div>
    </div>
  )
}
