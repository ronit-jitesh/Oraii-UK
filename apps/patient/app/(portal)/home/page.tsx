'use client'
import { useEffect, useState } from 'react'

const CARDS = [
  { href: '/chat',         emoji: '◎', label: 'Talk to Daji',  desc: 'AI support between sessions',     bg: '#EBF5F0' },
  { href: '/journal',      emoji: '◻', label: 'Journal',       desc: 'Reflect and track your mood',      bg: '#F5F0EB' },
  { href: '/mindos',       emoji: '◑', label: 'MindOS',        desc: 'Relaxation and focus audio',       bg: '#EBF0F5' },
  { href: '/safety-plan',  emoji: '◈', label: 'Safety plan',   desc: 'Your crisis contacts and steps',   bg: '#F5EBEB' },
  { href: '/outcomes',     emoji: '◷', label: 'Progress',      desc: 'PHQ-9, GAD-7, CORE-10 scores',    bg: '#EFF5EB' },
  { href: '/appointments', emoji: '□', label: 'Appointments',  desc: 'Your upcoming sessions',           bg: '#F2EBF5' },
]

export default function PatientHome() {
  const [hour, setHour] = useState(new Date().getHours())

  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60000)
    return () => clearInterval(t)
  }, [])

  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="portal-page">
      {/* Greeting */}
      <div className="anim-fade-up" style={{ marginBottom: '1.75rem' }}>
        <h1 style={{
          fontFamily: 'Lora, Georgia, serif',
          fontSize: '1.75rem',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          marginBottom: '0.25rem',
        }}>
          {greeting}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          How are you doing between sessions?
        </p>
      </div>

      {/* Mood quick-check */}
      <div className="anim-fade-up d1 p-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>How are you feeling right now?</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>1 – 10</span>
        </div>
        <MoodSlider />
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1.5rem' }}>
        {CARDS.map((c, i) => (
          <a
            key={c.href}
            href={c.href}
            className={`anim-fade-up d${i + 2}`}
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: '18px',
              padding: '1.125rem',
              textDecoration: 'none',
              display: 'block',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--primary)'
              el.style.transform = 'translateY(-3px)'
              el.style.boxShadow = '0 8px 24px rgba(45,106,79,0.1)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--border)'
              el.style.transform = 'translateY(0)'
              el.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: '12px',
              background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.125rem',
              marginBottom: '0.75rem',
            }}>
              {c.emoji}
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              {c.desc}
            </div>
          </a>
        ))}
      </div>

      {/* Crisis resources — always visible */}
      <div className="anim-fade-up d8 crisis-bar">
        <div className="crisis-bar-title">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="#DC2626" strokeWidth="1"/>
            <path d="M7 4V7.5M7 9.5V9.6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Crisis resources — always available
        </div>
        {[
          { name: 'Samaritans',         contact: '116 123',             note: 'free · 24/7' },
          { name: 'NHS Mental Health',  contact: '111 option 2',        note: '24/7' },
          { name: 'Crisis Text Line',   contact: 'Text SHOUT to 85258', note: 'free · 24/7' },
          { name: 'Emergency Services', contact: '999',                 note: '' },
        ].map(r => (
          <div key={r.name} className="crisis-line">
            <strong>{r.name}</strong>
            <span>{r.contact}</span>
            {r.note && <small>({r.note})</small>}
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--border-dk)', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.5 }}>
        ORAII is a wellness companion — not a crisis service or therapy replacement.<br />
        Always contact your therapist or emergency services in a crisis.
      </p>
    </div>
  )
}

function MoodSlider() {
  const [value, setValue] = useState(5)
  const emojis = ['😞','😟','😔','😕','😐','🙂','😊','😄','😁','🤩']
  const colors = ['#DC2626','#EF4444','#F97316','#FB923C','#FBBF24','#A3E635','#4ADE80','#22C55E','#10B981','#059669']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem' }}>
        <span style={{ fontSize: '1.75rem', transition: 'all 0.2s ease' }}>{emojis[value - 1]}</span>
        <input
          type="range" min={1} max={10} value={value}
          onChange={e => setValue(Number(e.target.value))}
          style={{ flex: 1, accentColor: colors[value - 1] }}
        />
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: colors[value - 1], minWidth: 24, textAlign: 'right', transition: 'color 0.2s ease' }}>
          {value}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <a href="/journal" className="p-btn p-btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          Log this in journal
        </a>
        <a href="/chat" className="p-btn p-btn-ghost" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
          Talk to Daji
        </a>
      </div>
    </div>
  )
}
