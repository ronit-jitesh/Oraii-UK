'use client'
import { useState, useEffect } from 'react'
import { saveCheckin } from '../../actions'

const MOODS = [
  { value: 1, emoji: '😞', label: 'Awful', color: '#DC2626' },
  { value: 2, emoji: '😟', label: 'Bad', color: '#EF4444' },
  { value: 3, emoji: '😔', label: 'Low', color: '#F97316' },
  { value: 4, emoji: '😕', label: 'Meh', color: '#FB923C' },
  { value: 5, emoji: '😐', label: 'Okay', color: '#FBBF24' },
  { value: 6, emoji: '🙂', label: 'Fine', color: '#A3E635' },
  { value: 7, emoji: '😊', label: 'Good', color: '#4ADE80' },
  { value: 8, emoji: '😄', label: 'Great', color: '#22C55E' },
  { value: 9, emoji: '😁', label: 'Wonderful', color: '#10B981' },
  { value: 10, emoji: '🤩', label: 'Amazing', color: '#059669' },
]

const EMOTIONS = [
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'hopeful', emoji: '🌟', label: 'Hopeful' },
  { id: 'angry', emoji: '😤', label: 'Angry' },
  { id: 'grateful', emoji: '🙏', label: 'Grateful' },
  { id: 'lonely', emoji: '🥺', label: 'Lonely' },
  { id: 'motivated', emoji: '💪', label: 'Motivated' },
  { id: 'overwhelmed', emoji: '😩', label: 'Overwhelmed' },
  { id: 'content', emoji: '☺️', label: 'Content' },
  { id: 'restless', emoji: '😖', label: 'Restless' },
  { id: 'loved', emoji: '🥰', label: 'Loved' },
  { id: 'numb', emoji: '😶', label: 'Numb' },
  { id: 'inspired', emoji: '✨', label: 'Inspired' },
  { id: 'frustrated', emoji: '😠', label: 'Frustrated' },
  { id: 'peaceful', emoji: '🕊️', label: 'Peaceful' },
]

const ACTIVITIES = [
  { id: 'work', emoji: '💼', label: 'Work' },
  { id: 'exercise', emoji: '🏃', label: 'Exercise' },
  { id: 'social', emoji: '👥', label: 'Social' },
  { id: 'nature', emoji: '🌳', label: 'Nature' },
  { id: 'reading', emoji: '📚', label: 'Reading' },
  { id: 'cooking', emoji: '🍳', label: 'Cooking' },
  { id: 'creative', emoji: '🎨', label: 'Creative' },
  { id: 'screen', emoji: '📱', label: 'Screen time' },
  { id: 'sleep', emoji: '😴', label: 'Good sleep' },
  { id: 'meditation', emoji: '🧘', label: 'Meditation' },
  { id: 'music', emoji: '🎵', label: 'Music' },
  { id: 'family', emoji: '🏠', label: 'Family' },
  { id: 'study', emoji: '📖', label: 'Study' },
  { id: 'nothing', emoji: '🛋️', label: 'Nothing much' },
]

const ENERGY = [
  { value: 1, label: 'Exhausted', color: '#DC2626' },
  { value: 2, label: 'Low energy', color: '#F97316' },
  { value: 3, label: 'Moderate', color: '#FBBF24' },
  { value: 4, label: 'Energised', color: '#22C55E' },
  { value: 5, label: 'Very energised', color: '#059669' },
]

type Step = 'mood' | 'emotions' | 'activities' | 'journal' | 'done'

export default function CheckinPage() {
  const [step, setStep] = useState<Step>('mood')
  const [mood, setMood] = useState(0)
  const [energy, setEnergy] = useState(3)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [journalText, setJournalText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleEmotion = (id: string) => {
    setSelectedEmotions(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveCheckin({
        moodScore: mood,
        energyLevel: energy,
        emotions: selectedEmotions,
        activities: selectedActivities,
        journalText: journalText.trim() || undefined,
      })
      if (result.error) {
        setError(result.error)
        setSaving(false)
      } else {
        setStep('done')
        setSaving(false)
      }
    } catch {
      setError('Could not save. Please try again.')
      setSaving(false)
    }
  }

  const progressPct = step === 'mood' ? 25 : step === 'emotions' ? 50 : step === 'activities' ? 75 : step === 'journal' ? 90 : 100
  const moodData = mood > 0 ? MOODS[mood - 1] : null

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Progress bar */}
      {step !== 'done' && (
        <div style={{ padding: '0 1.25rem', maxWidth: 680, margin: '0 auto', width: '100%', paddingTop: '0.75rem' }}>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'var(--primary)',
              borderRadius: 2, transition: 'width 0.5s ease',
              width: `${progressPct}%`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Daily check-in</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>~60 seconds</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1.25rem' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>

          {/* ── STEP 1: Mood ── */}
          {step === 'mood' && (
            <div className="anim-fade-up" style={{ textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.375rem',
              }}>
                How are you feeling?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.75rem' }}>
                Tap the face that matches your mood right now
              </p>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.625rem',
                marginBottom: '1.75rem',
              }}>
                {MOODS.map(m => (
                  <button key={m.value} onClick={() => setMood(m.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '0.75rem 0.25rem', borderRadius: 16,
                      border: mood === m.value ? `2px solid ${m.color}` : '2px solid transparent',
                      background: mood === m.value ? `${m.color}12` : 'var(--surface)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: mood === m.value ? `0 4px 16px ${m.color}20` : 'none',
                      transform: mood === m.value ? 'scale(1.05)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.75rem', transition: 'transform 0.2s', transform: mood === m.value ? 'scale(1.15)' : 'none' }}>{m.emoji}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: mood === m.value ? m.color : 'var(--muted)' }}>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Energy level */}
              {mood > 0 && (
                <div className="anim-fade-up" style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>
                    Energy level
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {ENERGY.map(e => (
                      <button key={e.value} onClick={() => setEnergy(e.value)}
                        style={{
                          padding: '0.5rem 0.875rem', borderRadius: 12,
                          border: energy === e.value ? `2px solid ${e.color}` : '1.5px solid var(--border)',
                          background: energy === e.value ? `${e.color}12` : 'var(--surface)',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          fontSize: '0.75rem', fontWeight: energy === e.value ? 700 : 400,
                          color: energy === e.value ? e.color : 'var(--muted)',
                        }}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setStep('emotions')} disabled={mood === 0}
                className="p-btn p-btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', borderRadius: 14 }}>
                Next
              </button>
            </div>
          )}

          {/* ── STEP 2: Emotions ── */}
          {step === 'emotions' && (
            <div className="anim-fade-up" style={{ textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.375rem',
              }}>
                What emotions are present?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Select all that apply — there are no wrong answers
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {EMOTIONS.map(e => {
                  const isSelected = selectedEmotions.includes(e.id)
                  return (
                    <button key={e.id} onClick={() => toggleEmotion(e.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.875rem', borderRadius: 20,
                        border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                        background: isSelected ? 'var(--light)' : 'var(--surface)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        color: isSelected ? 'var(--primary-dk)' : 'var(--text-2)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.8125rem',
                        transform: isSelected ? 'scale(1.03)' : 'none',
                      }}
                    >
                      <span>{e.emoji}</span>
                      <span>{e.label}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setStep('mood')} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>
                  Back
                </button>
                <button onClick={() => setStep('activities')} className="p-btn p-btn-primary" style={{ flex: 2, borderRadius: 14, padding: '0.875rem' }}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Activities ── */}
          {step === 'activities' && (
            <div className="anim-fade-up" style={{ textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.375rem',
              }}>
                What have you been up to?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Helps us find patterns in what affects your mood
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                {ACTIVITIES.map(a => {
                  const isSelected = selectedActivities.includes(a.id)
                  return (
                    <button key={a.id} onClick={() => toggleActivity(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.5rem 0.875rem', borderRadius: 20,
                        border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                        background: isSelected ? 'var(--light)' : 'var(--surface)',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        color: isSelected ? 'var(--primary-dk)' : 'var(--text-2)',
                        fontWeight: isSelected ? 600 : 400,
                        fontSize: '0.8125rem',
                        transform: isSelected ? 'scale(1.03)' : 'none',
                      }}
                    >
                      <span>{a.emoji}</span>
                      <span>{a.label}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setStep('emotions')} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>
                  Back
                </button>
                <button onClick={() => setStep('journal')} className="p-btn p-btn-primary" style={{ flex: 2, borderRadius: 14, padding: '0.875rem' }}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Journal (Optional) ── */}
          {step === 'journal' && (
            <div className="anim-fade-up" style={{ textAlign: 'center' }}>
              <h2 style={{
                fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.375rem',
              }}>
                Anything else on your mind?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Optional — even a sentence helps. Or skip this.
              </p>

              {/* Summary of selections */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 14, marginBottom: '1rem', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{moodData?.emoji}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                  {moodData?.label} · {ENERGY[energy - 1]?.label}
                  {selectedEmotions.length > 0 && ` · ${selectedEmotions.length} emotions`}
                  {selectedActivities.length > 0 && ` · ${selectedActivities.length} activities`}
                </span>
              </div>

              <textarea
                value={journalText}
                onChange={e => setJournalText(e.target.value)}
                placeholder="Write freely — no rules, no judgement..."
                rows={4}
                className="p-input"
                style={{ marginBottom: '1rem', textAlign: 'left', borderRadius: 14 }}
              />

              {error && (
                <div style={{
                  background: 'var(--danger-lt)', border: '0.5px solid rgba(220,38,38,0.2)',
                  borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.8125rem',
                  color: 'var(--danger)', marginBottom: '0.75rem',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.625rem' }}>
                <button onClick={() => setStep('activities')} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 14 }}>
                  Back
                </button>
                <button onClick={handleSave} disabled={saving} className="p-btn p-btn-primary"
                  style={{ flex: 2, borderRadius: 14, padding: '0.875rem' }}>
                  {saving ? 'Saving...' : journalText.trim() ? 'Save check-in' : 'Skip & save'}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="anim-fade-up" style={{ textAlign: 'center' }}>
              <div style={{
                width: 88, height: 88, borderRadius: 26,
                background: 'linear-gradient(145deg, #D8EDDF 0%, #74C69D 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 32px rgba(45,106,79,0.15)',
                animation: 'breathe 3s ease infinite',
              }}>
                <span style={{ fontSize: '2.5rem' }}>🌱</span>
              </div>

              <h2 style={{
                fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.5rem',
              }}>
                Check-in saved
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Your garden grew a little today 🌿
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem' }}>
                {moodData?.emoji} {moodData?.label} · {ENERGY[energy - 1]?.label}
              </p>

              {/* Quick links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <a href="/home" className="p-btn p-btn-primary" style={{ width: '100%', borderRadius: 14, padding: '0.875rem', fontSize: '1rem', textDecoration: 'none' }}>
                  Back to home
                </a>
                <a href="/journal" className="p-btn p-btn-ghost" style={{ width: '100%', borderRadius: 14, textDecoration: 'none' }}>
                  Write more in journal
                </a>
                <a href="/chat" className="p-btn p-btn-ghost" style={{ width: '100%', borderRadius: 14, textDecoration: 'none' }}>
                  Talk to ORAII
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
