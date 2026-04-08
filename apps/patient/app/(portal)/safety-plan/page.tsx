// ── Safety Plan — Stanley-Brown Safety Planning Intervention (SPI) ──
// Evidence: Stanley & Brown (2012) JAMA Psychiatry
// Patients receiving SPI were ~50% less likely to exhibit suicidal behaviour at 6 months
// 6 components always shown in order. Crisis resources always first and always visible.

const CRISIS_LINES = [
  { name: 'Samaritans',          contact: '116 123',              note: 'free · 24/7 · confidential' },
  { name: 'NHS Mental Health',   contact: '111 option 2',         note: '24/7' },
  { name: 'Crisis Text Line',    contact: 'Text SHOUT to 85258',  note: 'free · 24/7' },
  { name: 'Emergency Services',  contact: '999',                  note: 'immediate danger' },
]

const SPI_COMPONENTS = [
  {
    step: 1,
    title: 'Warning signs',
    description: 'Thoughts, images, feelings or situations that signal a crisis may be coming',
    placeholder: 'e.g. I start isolating, feeling hopeless, or noticing racing thoughts',
  },
  {
    step: 2,
    title: 'Internal coping strategies',
    description: 'Things I can do on my own to take my mind off the crisis — without contacting others',
    placeholder: 'e.g. Go for a walk, listen to music, do breathing exercises',
  },
  {
    step: 3,
    title: 'People and places that provide distraction',
    description: 'Social contacts and places I can go to take my mind off things (not necessarily to discuss the crisis)',
    placeholder: 'e.g. Call a friend, visit a coffee shop, go to a library',
  },
  {
    step: 4,
    title: 'People I can ask for help',
    description: 'People I trust and can tell when I am in crisis — who can help me stay safe',
    placeholder: 'e.g. Family member, close friend — name and phone number',
  },
  {
    step: 5,
    title: 'Professionals and agencies I can contact',
    description: 'My therapist, GP, crisis line, and emergency services',
    placeholder: 'Your therapist will add their contact details here',
  },
  {
    step: 6,
    title: 'Making my environment safer',
    description: 'Steps to reduce access to means that could be used for self-harm during a crisis',
    placeholder: 'e.g. Ask someone to hold my medication, remove sharp objects',
  },
]

export default function SafetyPlanPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">My safety plan</h1>
      <p className="text-sm text-gray-500 mb-6">
        Created with your therapist. Keep this somewhere easy to find.
      </p>

      {/* Crisis resources — ALWAYS first, ALWAYS visible — no auth or plan required */}
      <div className="bg-red-50 border border-red-300 rounded-2xl px-5 py-4 mb-6">
        <p className="text-sm font-semibold text-red-800 mb-3">
          If you are in crisis right now — contact one of these:
        </p>
        <div className="space-y-2">
          {CRISIS_LINES.map(r => (
            <div key={r.name} className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-red-700 min-w-[140px]">{r.name}</span>
              <span className="text-sm text-red-700">{r.contact}</span>
              {r.note && <span className="text-xs text-red-400">({r.note})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 6 SPI components */}
      <div className="space-y-4">
        {SPI_COMPONENTS.map(c => (
          <div key={c.step} className="bg-white rounded-2xl border border-[var(--oraii-border)] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-[var(--oraii-light)] flex items-center
                              justify-center text-xs font-semibold text-[var(--oraii-primary)]">
                {c.step}
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed ml-10">{c.description}</p>
            <div className="ml-10 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-400 italic
                            border border-dashed border-gray-200">
              {c.placeholder}
              <p className="text-xs mt-1 not-italic text-gray-300">
                Your therapist will complete this with you during a session.
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Based on the Stanley-Brown Safety Planning Intervention (SPI) — evidence-based
        crisis support developed for use alongside professional mental health care.
      </p>
    </div>
  )
}
