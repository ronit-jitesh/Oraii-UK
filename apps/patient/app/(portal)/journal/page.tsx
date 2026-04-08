'use client'
import { useState } from 'react'

const PROMPTS = [
  'What went well today?',
  'What felt difficult?',
  'What am I grateful for?',
  'What do I need more of?',
  'How did I care for myself?',
  'What is on my mind right now?',
]

const MOOD_LABELS = ['Very low','Low','Quite low','Below average','Average','Above average','Good','Very good','Excellent','Amazing']
const MOOD_COLORS = ['#DC2626','#EF4444','#F97316','#FB923C','#FBBF24','#A3E635','#4ADE80','#22C55E','#10B981','#059669']

export default function JournalPage() {
  const [content, setContent] = useState('')
  const [mood, setMood]       = useState(5)
  const [share, setShare]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [entries, setEntries] = useState<Array<{ content: string; mood: number; date: string; shared: boolean }>>([])

  const usePrompt = (p: string) => {
    setContent(prev => prev
      ? prev.trimEnd() + '\n\n' + p + '\n'
      : p + '\n'
    )
  }

  const save = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, moodScore: mood, therapistCanView: share }),
      })
      setEntries(prev => [{
        content: content.trim(),
        mood,
        date: new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        shared: share,
      }, ...prev])
      setContent('')
      setMood(5)
      setShare(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="portal-page">
      <div className="anim-fade-up">
        <h1 className="portal-page-title">Journal</h1>
        <p className="portal-page-sub">Your private space to reflect. You decide what to share.</p>
      </div>

      {/* Mood tracker */}
      <div className="anim-fade-up d1 p-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Mood right now</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>
              {['😞','😟','😔','😕','😐','🙂','😊','😄','😁','🤩'][mood - 1]}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: MOOD_COLORS[mood - 1], transition: 'color 0.2s ease' }}>
              {MOOD_LABELS[mood - 1]}
            </span>
          </div>
        </div>

        <input
          type="range" min={1} max={10} value={mood}
          onChange={e => setMood(Number(e.target.value))}
          style={{ width: '100%', accentColor: MOOD_COLORS[mood - 1] }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Low</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>High</span>
        </div>
      </div>

      {/* Write area */}
      <div className="anim-fade-up d2 p-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Prompts */}
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Need a prompt?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {PROMPTS.map(p => (
              <button key={p} onClick={() => usePrompt(p)} className="tag" style={{ fontSize: '0.75rem' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write freely — no rules, no judgement..."
          rows={8}
          className="p-input"
          style={{ marginBottom: '1rem' }}
        />

        {/* Share toggle */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.125rem' }}>
          <div
            onClick={() => setShare(!share)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: share ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.2s ease',
              position: 'relative',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <div style={{
              width: 16, height: 16,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 3,
              left: share ? 21 : 3,
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>
              Share with my therapist
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              Off by default. Only shared entries are visible to your therapist.
            </p>
          </div>
        </label>

        {error && (
          <div style={{ background: 'var(--danger-lt)', border: '0.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !content.trim()}
          className="p-btn p-btn-primary"
          style={{ width: '100%', fontSize: '0.9375rem', padding: '0.75rem' }}
        >
          {saving ? (
            <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Saving…</>
          ) : saved ? (
            <>✓ Saved</>
          ) : (
            <>Save entry</>
          )}
        </button>
      </div>

      {/* Previous entries */}
      {entries.length > 0 && (
        <div className="anim-fade-up">
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
            Recent entries
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {entries.map((e, i) => (
              <div key={i} className="p-card" style={{ padding: '1rem 1.125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{e.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {e.shared && <span style={{ fontSize: '0.65rem', background: 'var(--light)', color: 'var(--primary-dk)', padding: '0.15rem 0.5rem', borderRadius: 10, fontWeight: 600 }}>Shared</span>}
                    <span style={{ fontSize: '0.875rem' }}>
                      {['😞','😟','😔','😕','😐','🙂','😊','😄','😁','🤩'][e.mood - 1]}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {e.content.slice(0, 200)}{e.content.length > 200 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
