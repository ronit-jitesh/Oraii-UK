'use client'
import { useState, useEffect } from 'react'
import { getMyJournalEntries, saveJournalEntry, deleteJournalEntry } from '../../actions'

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
const MOOD_EMOJIS = ['😞','😟','😔','😕','😐','🙂','😊','😄','😁','🤩']

interface JournalEntry {
  id: string
  content: string
  mood_score: number
  therapist_can_view: boolean
  created_at: string
}

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export default function JournalPage() {
  const [content, setContent] = useState('')
  const [mood, setMood]       = useState(5)
  const [share, setShare]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Load entries on mount
  useEffect(() => {
    getMyJournalEntries().then(data => {
      setEntries(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const usePrompt = (p: string) => {
    setContent(prev => prev ? prev.trimEnd() + '\n\n' + p + '\n' : p + '\n')
  }

  const save = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError(null)
    try {
      const result = await saveJournalEntry({
        content: content.trim(),
        moodScore: mood,
        therapistCanView: share,
      })
      if (result.error) {
        setError(result.error)
      } else {
        // Reload entries to get the real data
        const fresh = await getMyJournalEntries()
        setEntries(fresh || [])
        setContent('')
        setMood(5)
        setShare(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    const result = await deleteJournalEntry(id)
    if (!result.error) {
      setEntries(prev => prev.filter(e => e.id !== id))
    }
    setDeleting(null)
  }

  return (
    <div className="portal-page">
      <div className="anim-fade-up">
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Journal
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Your private space to reflect. You decide what to share.
        </p>
      </div>

      {/* Mood tracker */}
      <div className="anim-fade-up d1 p-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>Mood right now</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{MOOD_EMOJIS[mood - 1]}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: MOOD_COLORS[mood - 1], transition: 'color 0.2s ease' }}>
              {MOOD_LABELS[mood - 1]}
            </span>
          </div>
        </div>
        <input type="range" min={1} max={10} value={mood}
          onChange={e => setMood(Number(e.target.value))}
          style={{ width: '100%', accentColor: MOOD_COLORS[mood - 1] }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.375rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Low</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>High</span>
        </div>
      </div>

      {/* Write area */}
      <div className="anim-fade-up d2 p-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            Need a prompt?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {PROMPTS.map(p => (
              <button key={p} onClick={() => usePrompt(p)} className="tag" style={{ fontSize: '0.75rem' }}>{p}</button>
            ))}
          </div>
        </div>

        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Write freely — no rules, no judgement..."
          rows={8} className="p-input" style={{ marginBottom: '1rem' }}
        />

        {/* Share toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.125rem' }}
          onClick={() => setShare(!share)}>
          <div style={{
            width: 40, height: 22, borderRadius: 11,
            background: share ? 'var(--primary)' : 'var(--border)',
            transition: 'all 0.2s ease', position: 'relative', flexShrink: 0, marginTop: 2,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: share ? 21 : 3,
              transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Share with my therapist</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              Off by default. Only shared entries are visible to your therapist.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-lt)', border: '0.5px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '0.75rem' }}>
            {error}
          </div>
        )}

        <button onClick={save} disabled={saving || !content.trim()}
          className="p-btn p-btn-primary" style={{ width: '100%', fontSize: '0.9375rem', padding: '0.75rem' }}>
          {saving ? (
            <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Saving...</>
          ) : saved ? (
            <>Saved</>
          ) : (
            <>Save entry</>
          )}
        </button>
      </div>

      {/* Previous entries */}
      <div className="anim-fade-up d3">
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 10 }}>
          Recent entries
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
            Loading entries...
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px dashed var(--border)',
            borderRadius: 18, padding: '2.5rem 2rem', textAlign: 'center',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Ico d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size={20} color="var(--muted)" />
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>No entries yet</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Start writing above to create your first journal entry.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map((e) => (
              <div key={e.id} className="p-card" style={{ padding: '14px 18px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem' }}>{MOOD_EMOJIS[(e.mood_score || 5) - 1]}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.therapist_can_view && (
                      <span style={{ fontSize: '0.62rem', background: 'var(--light)', color: 'var(--primary-dk)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                        Shared
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                      aria-label="Delete journal entry"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        opacity: deleting === e.id ? 0.3 : 0.4,
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.opacity = '1'}
                      onMouseLeave={ev => ev.currentTarget.style.opacity = '0.4'}
                    >
                      <Ico d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" size={14} color="var(--danger)" />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {e.content ? (e.content.slice(0, 300) + (e.content.length > 300 ? '...' : '')) : '(mood entry only)'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
