'use client'
import { useState, useEffect } from 'react'
import { savePurpose, getMyPurposes } from '../../actions'

const VALUE_CARDS = [
  { id: 'connection', emoji: '🤝', label: 'Connection', desc: 'Meaningful relationships and belonging' },
  { id: 'growth', emoji: '🌱', label: 'Growth', desc: 'Learning, developing, becoming better' },
  { id: 'health', emoji: '💚', label: 'Health', desc: 'Physical and mental wellbeing' },
  { id: 'creativity', emoji: '🎨', label: 'Creativity', desc: 'Expression, art, building new things' },
  { id: 'service', emoji: '🌍', label: 'Service', desc: 'Helping others, making a difference' },
  { id: 'freedom', emoji: '🦅', label: 'Freedom', desc: 'Independence, autonomy, choice' },
  { id: 'security', emoji: '🏡', label: 'Security', desc: 'Stability, safety, financial peace' },
  { id: 'adventure', emoji: '🧭', label: 'Adventure', desc: 'New experiences, exploration, travel' },
  { id: 'knowledge', emoji: '📚', label: 'Knowledge', desc: 'Understanding, wisdom, intellectual growth' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family', desc: 'Loved ones, community, roots' },
  { id: 'career', emoji: '🚀', label: 'Career', desc: 'Professional purpose and achievement' },
  { id: 'spirituality', emoji: '🕊️', label: 'Spirituality', desc: 'Faith, meaning, inner peace' },
]

interface PurposeEntry {
  id: string
  content: string
  mood_score: number
  created_at: string
}

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export default function PurposePage() {
  const [view, setView] = useState<'list' | 'add' | 'reflect'>('list')
  const [purposes, setPurposes] = useState<PurposeEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Add purpose state
  const [selectedValues, setSelectedValues] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [alignment, setAlignment] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getMyPurposes().then(data => {
      setPurposes(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const result = await savePurpose({
      title: title.trim(),
      description: description.trim(),
      category: selectedValues.length > 0 ? selectedValues.join(',') : 'other',
      alignmentScore: alignment,
    })
    if (!result.error) {
      setSaved(true)
      const fresh = await getMyPurposes()
      setPurposes(fresh || [])
      setTimeout(() => {
        setSaved(false)
        setView('list')
        setTitle('')
        setDescription('')
        setSelectedValues([])
        setAlignment(5)
      }, 1500)
    }
    setSaving(false)
  }

  const parsePurpose = (entry: PurposeEntry) => {
    try {
      return JSON.parse(entry.content)
    } catch {
      return { title: entry.content, description: '', category: 'other', alignmentScore: entry.mood_score }
    }
  }

  return (
    <div className="portal-page">
      <div className="anim-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <h1 style={{
            fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
            color: 'var(--text)', letterSpacing: '-0.02em',
          }}>
            Purpose & Values
          </h1>
          {view === 'list' && (
            <button onClick={() => setView('add')} className="p-btn p-btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: 12 }}>
              + Add purpose
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          What gives your life meaning? Track your alignment over time.
        </p>
      </div>

      {/* ── ADD PURPOSE ── */}
      {view === 'add' && (
        <div className="anim-fade-up">
          {/* Values selection */}
          <div className="p-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              What values does this connect to?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {VALUE_CARDS.map(v => {
                const selected = selectedValues.includes(v.id)
                return (
                  <button key={v.id}
                    onClick={() => setSelectedValues(prev =>
                      prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]
                    )}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      padding: '0.5rem 0.75rem', borderRadius: 14,
                      border: selected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                      background: selected ? 'var(--light)' : 'var(--surface)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      fontSize: '0.8rem',
                      fontWeight: selected ? 600 : 400,
                      color: selected ? 'var(--primary-dk)' : 'var(--text-2)',
                    }}
                  >
                    <span>{v.emoji}</span>
                    <span>{v.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Purpose statement */}
          <div className="p-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
              What&apos;s your purpose?
            </p>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Build a meaningful career in health tech"
              className="p-input" style={{ marginBottom: '0.75rem', borderRadius: 12 }}
            />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Why does this matter to you? (optional)"
              rows={3} className="p-input" style={{ borderRadius: 12 }}
            />
          </div>

          {/* Alignment score */}
          <div className="p-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
              How aligned do you feel with this right now?
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              1 = completely off track · 10 = fully living this purpose
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="range" min={1} max={10} value={alignment}
                onChange={e => setAlignment(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <span style={{
                fontSize: '1.5rem', fontWeight: 800,
                color: alignment >= 7 ? '#059669' : alignment >= 4 ? '#FBBF24' : '#DC2626',
                minWidth: 32, textAlign: 'center', transition: 'color 0.2s',
              }}>
                {alignment}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => setView('list')} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!title.trim() || saving}
              className="p-btn p-btn-primary" style={{ flex: 2, borderRadius: 14, padding: '0.875rem' }}>
              {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save purpose'}
            </button>
          </div>
        </div>
      )}

      {/* ── PURPOSE LIST ── */}
      {view === 'list' && (
        <>
          {/* Values overview */}
          <div className="anim-fade-up d1" style={{
            background: 'linear-gradient(145deg, #D8EDDF 0%, #EBF5F0 100%)',
            border: '0.5px solid rgba(45,106,79,0.15)',
            borderRadius: 20, padding: '1.25rem', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dk)' }}>
                  Why track purpose?
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--primary)', lineHeight: 1.5 }}>
                  Research shows that people who regularly reflect on their values and purpose experience better mental health outcomes and stronger resilience.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              Loading...
            </div>
          ) : purposes.length === 0 ? (
            <div className="anim-fade-up d2" style={{
              background: 'var(--surface)', border: '1px dashed var(--border)',
              borderRadius: 20, padding: '2.5rem 2rem', textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(145deg, #FEF3C7, #FDE68A)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <span style={{ fontSize: '1.5rem' }}>🧭</span>
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.375rem' }}>
                What matters most to you?
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1.25rem', maxWidth: 280, marginInline: 'auto' }}>
                Add your first purpose to start tracking how aligned you feel with what gives your life meaning.
              </p>
              <button onClick={() => setView('add')} className="p-btn p-btn-primary" style={{ borderRadius: 14, padding: '0.75rem 1.5rem' }}>
                Add your first purpose
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {purposes.map((entry, idx) => {
                const p = parsePurpose(entry)
                // Support both legacy single-category and new comma-separated multi-category
                const categoryIds = (p.category || 'other').split(',').map((s: string) => s.trim()).filter(Boolean)
                const valueCards = categoryIds.map((id: string) => VALUE_CARDS.find(v => v.id === id)).filter(Boolean)
                const primaryCard = valueCards[0]
                const score = p.alignmentScore || entry.mood_score || 5
                return (
                  <div key={entry.id} className={`anim-fade-up d${idx + 2} p-card p-card-hover`}
                    style={{ padding: '1.125rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'var(--light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: '1.25rem',
                      }}>
                        {primaryCard?.emoji || '🎯'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
                          {p.title}
                        </p>
                        {p.description && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                            {p.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {valueCards.map((vc: typeof VALUE_CARDS[0] | undefined) => vc && (
                            <span key={vc.id} style={{
                              fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px',
                              borderRadius: 8, background: 'var(--light)', color: 'var(--primary-dk)',
                            }}>
                              {vc.emoji} {vc.label}
                            </span>
                          ))}
                          <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                            {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{
                          fontSize: '1.5rem', fontWeight: 800,
                          color: score >= 7 ? '#059669' : score >= 4 ? '#FBBF24' : '#DC2626',
                        }}>
                          {score}
                        </p>
                        <p style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 500 }}>alignment</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
