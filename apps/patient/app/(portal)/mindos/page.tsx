'use client'
import { useState } from 'react'

const SESSIONS = [
  { id: 'morning-calm',    title: 'Morning calm',      duration: '10 min', desc: 'Gentle audio to start your day settled and grounded',          cat: 'Relaxation', bg: '#EBF5F0', icon: '☀', freq: '10 Hz' },
  { id: 'focus-flow',      title: 'Focus flow',        duration: '25 min', desc: 'Background tones to support concentration and clarity',         cat: 'Focus',      bg: '#EBF0F5', icon: '◎', freq: '40 Hz' },
  { id: 'evening-wind',    title: 'Evening wind-down', duration: '15 min', desc: 'Ease your transition to rest at the end of the day',            cat: 'Relaxation', bg: '#F5F0EB', icon: '◑', freq: '4 Hz'  },
  { id: 'ground-breath',   title: 'Grounding breath',  duration: '5 min',  desc: 'A short breathing exercise to feel present and calm',           cat: 'Breathing',  bg: '#EFF5EB', icon: '◇', freq: '6 Hz'  },
  { id: 'deep-rest',       title: 'Deep rest',         duration: '30 min', desc: 'Extended relaxation audio for rest periods or before sleep',    cat: 'Relaxation', bg: '#F0EBF5', icon: '◐', freq: '2 Hz'  },
  { id: 'clarity-boost',   title: 'Clarity boost',     duration: '12 min', desc: 'Uplifting audio to support an energised and focused feeling',   cat: 'Focus',      bg: '#F5EBEB', icon: '◈', freq: '30 Hz' },
]

const CAT_COLORS: Record<string, { text: string; bg: string }> = {
  Relaxation: { text: '#2D6A4F', bg: '#D8EDDF' },
  Focus:      { text: '#1D4ED8', bg: '#DBEAFE' },
  Breathing:  { text: '#92400E', bg: '#FEF3C7' },
}

export default function MindOSPage() {
  const [playing, setPlaying] = useState<string | null>(null)
  const [filter, setFilter]   = useState<string>('All')

  const categories = ['All', 'Relaxation', 'Focus', 'Breathing']
  const filtered = filter === 'All' ? SESSIONS : SESSIONS.filter(s => s.cat === filter)

  return (
    <div className="portal-page">
      <div className="anim-fade-up">
        <h1 className="portal-page-title">MindOS</h1>
        <p className="portal-page-sub">
          Relaxation and focus audio for your wellbeing between sessions.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="anim-fade-up d1" style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '0.75rem 1rem',
        fontSize: '0.75rem',
        color: 'var(--muted)',
        marginBottom: '1.5rem',
        lineHeight: 1.5,
      }}>
        MindOS provides wellness audio content only. It is not a medical device,
        therapeutic tool, or substitute for professional care.
      </div>

      {/* Category filter */}
      <div className="anim-fade-up d2" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '0.375rem 1rem',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: filter === c ? 600 : 400,
              color: filter === c ? 'var(--primary-dk)' : 'var(--muted)',
              background: filter === c ? 'var(--light)' : 'var(--surface)',
              border: `0.5px solid ${filter === c ? 'rgba(45,106,79,0.3)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Now playing banner */}
      {playing && (
        <div className="anim-fade-in" style={{
          background: 'var(--primary)',
          borderRadius: 14,
          padding: '0.875rem 1.125rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: 'rgba(255,255,255,0.8)',
                  height: `${[12,18,10,20,14][i]}px`,
                  animation: `wave ${0.6 + i * 0.1}s ease infinite alternate`,
                }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>
                {SESSIONS.find(s => s.id === playing)?.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>Now playing</div>
            </div>
          </div>
          <button
            onClick={() => setPlaying(null)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '0.375rem 0.75rem', color: 'white', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
          >
            Stop
          </button>
        </div>
      )}

      {/* Session cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((s, i) => {
          const isPlaying = playing === s.id
          const cat = CAT_COLORS[s.cat]
          return (
            <div
              key={s.id}
              className={`anim-fade-up d${i + 3} mindos-card`}
              style={{ border: isPlaying ? '0.5px solid var(--primary)' : undefined }}
              onClick={() => setPlaying(isPlaying ? null : s.id)}
            >
              <div className="mindos-icon" style={{ background: s.bg }}>
                {s.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{s.title}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 10, background: cat.bg, color: cat.text }}>
                    {s.cat}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: '0.375rem' }}>{s.desc}</div>
                <div style={{ display: 'flex', gap: '0.875rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>⏱ {s.duration}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>∿ {s.freq}</span>
                </div>
              </div>

              <button
                className="play-btn"
                style={{ background: isPlaying ? 'var(--primary)' : undefined }}
                onClick={e => { e.stopPropagation(); setPlaying(isPlaying ? null : s.id) }}
              >
                {isPlaying ? (
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <rect x="1" y="1" width="4" height="12" rx="1" fill="white"/>
                    <rect x="7" y="1" width="4" height="12" rx="1" fill="white"/>
                  </svg>
                ) : (
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path d="M1 1L11 7L1 13V1Z" fill="var(--primary)"/>
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  )
}
