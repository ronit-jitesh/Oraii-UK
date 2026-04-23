'use client'
import { useEffect, useState } from 'react'
import { getDashboardData } from '../../actions'

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

interface MoodInsights {
  totalEntries: number
  avgMood: number
  moodTrend: number
  topEmotions: { emotion: string; count: number }[]
  activityCorrelations: { activity: string; avgMood: number; count: number }[]
  entries: { mood: number; energy: number; date: string }[]
}

interface DashData {
  displayLabel: string
  therapistName: string | null
  isAnonymous: boolean
  hasTherapist: boolean
  nextAppointment: { requested_time: string; status: string; location_type: string } | null
  latestScore: { measure: string; score: number; severity: string; completed_at: string } | null
  hasSafetyPlan: boolean
  recentMoods: { mood_score: number; created_at: string }[]
  streak: { current: number; longest: number; totalCheckins: number }
  insights: MoodInsights | null
}

const QUICK_CARDS = [
  { href: '/chat',        emoji: '💬', label: 'Talk to ORAII', desc: 'AI support between sessions', bg: '#EBF5F0', color: '#2D6A4F' },
  { href: '/journal',     emoji: '📓', label: 'Journal',       desc: 'Reflect and track your mood',  bg: '#F5F0EB', color: '#92400E' },
  { href: '/purpose',     emoji: '🎯', label: 'Purpose',       desc: 'Track what matters to you',    bg: '#FEF3C7', color: '#92400E' },
  { href: '/outcomes',    emoji: '📊', label: 'Progress',      desc: 'Your wellbeing scores',        bg: '#EFF5EB', color: '#065F46' },
  { href: '/safety-plan', emoji: '🛡️', label: 'Safety plan',   desc: 'Crisis contacts and steps',    bg: '#FEF2F2', color: '#DC2626' },
  { href: '/mindos',      emoji: '🎵', label: 'MindOS',        desc: 'Relaxation and focus',         bg: '#EBF0F5', color: '#1E3A8A' },
]

const MOOD_COLORS = ['#DC2626','#EF4444','#F97316','#FB923C','#FBBF24','#A3E635','#4ADE80','#22C55E','#10B981','#059669']

const EMOTION_EMOJIS: Record<string, string> = {
  anxious: '😰', calm: '😌', happy: '😊', sad: '😢', tired: '😴',
  angry: '😠', grateful: '🙏', hopeful: '🌟', overwhelmed: '😵',
  lonely: '😔', motivated: '💪', content: '🙂', stressed: '😤',
  excited: '🎉', confused: '🤔',
}

export default function PatientHome() {
  const [hour] = useState(new Date().getHours())
  const [dash, setDash] = useState<DashData | null>(null)

  useEffect(() => {
    getDashboardData().then(setDash).catch(() => {})
  }, [])

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const streak = dash?.streak || { current: 0, longest: 0, totalCheckins: 0 }
  const insights = dash?.insights

  return (
    <div className="portal-page">
      {/* Greeting */}
      <div className="anim-fade-up" style={{ marginBottom: '1.25rem' }}>
        <h1 style={{
          fontFamily: 'Lora, Georgia, serif', fontSize: '1.75rem', fontWeight: 600,
          color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '0.25rem',
        }}>
          {greeting}{dash?.displayLabel ? `, ${dash.displayLabel}` : ''} 🌿
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {dash?.therapistName
            ? `Working with ${dash.therapistName}`
            : 'Your daily companion for mental wellbeing'}
        </p>
      </div>

      {/* Streak banner */}
      {streak.totalCheckins > 0 && (
        <div className="anim-fade-up d1" style={{
          background: 'linear-gradient(135deg, #D8EDDF 0%, #EBF5F0 100%)',
          border: '0.5px solid rgba(45,106,79,0.15)',
          borderRadius: 20, padding: '1rem 1.25rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(45,106,79,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.375rem',
            }}>
              🌱
            </div>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dk)' }}>
                {streak.current > 0 ? `${streak.current}-day streak` : 'Start a new streak'}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>
                {streak.totalCheckins} total check-ins · best: {streak.longest} days
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i < streak.current ? 'var(--primary)' : 'rgba(45,106,79,0.15)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Check-in CTA */}
      <a href="/checkin" className="anim-fade-up d2" style={{
        display: 'block', textDecoration: 'none',
        background: 'linear-gradient(145deg, var(--primary) 0%, var(--primary-dk) 100%)',
        borderRadius: 20, padding: '1.25rem 1.5rem', marginBottom: '1.25rem',
        boxShadow: '0 4px 20px rgba(45,106,79,0.25)',
        transition: 'all 0.2s ease',
        position: 'relative', overflow: 'hidden',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(45,106,79,0.35)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(45,106,79,0.25)' }}
      >
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                ✨ Daily check-in
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)' }}>
                60 seconds to reflect on your day
              </p>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>
      </a>

      {/* Mood history mini-chart */}
      {dash && dash.recentMoods.length > 1 && (
        <div className="anim-fade-up d3 p-card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>Recent moods</span>
            <a href="/journal" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {dash.recentMoods.slice(0, 7).reverse().map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: `${Math.max(12, (m.mood_score / 10) * 48)}px`,
                  borderRadius: 6, margin: '0 auto',
                  background: `linear-gradient(180deg, ${MOOD_COLORS[(m.mood_score || 5) - 1]}CC, ${MOOD_COLORS[(m.mood_score || 5) - 1]})`,
                  transition: 'all 0.3s',
                  maxWidth: 32,
                }}
                  title={`${m.mood_score}/10`}
                />
                <span style={{ fontSize: '0.55rem', color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  {new Date(m.created_at).toLocaleDateString('en-GB', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mood insights — shown when we have at least 3 entries ── */}
      {insights && insights.totalEntries >= 3 && (
        <div className="anim-fade-up d3" style={{ marginBottom: '1.25rem' }}>
          {/* Trend summary */}
          <div className="p-card" style={{ padding: '1rem 1.25rem', marginBottom: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)' }}>14-day snapshot</span>
              <a href="/outcomes" style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                Full progress →
              </a>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: MOOD_COLORS[Math.round(insights.avgMood) - 1] || '#059669' }}>
                  {insights.avgMood}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500 }}>avg mood</p>
              </div>
              <div style={{ flex: 1, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: insights.moodTrend > 0 ? '#059669' : insights.moodTrend < 0 ? '#DC2626' : '#8B8680' }}>
                  {insights.moodTrend > 0 ? '↑' : insights.moodTrend < 0 ? '↓' : '→'}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {Math.abs(insights.moodTrend) > 0.5
                    ? insights.moodTrend > 0 ? 'improving' : 'declining'
                    : 'stable'}
                </p>
              </div>
              <div style={{ flex: 1, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {insights.totalEntries}
                </p>
                <p style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500 }}>check-ins</p>
              </div>
            </div>
          </div>

          {/* Top emotions */}
          {insights.topEmotions.length > 0 && (
            <div className="p-card" style={{ padding: '1rem 1.25rem', marginBottom: '0.625rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.625rem' }}>
                Most frequent emotions
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {insights.topEmotions.slice(0, 5).map(({ emotion, count }) => (
                  <div key={emotion} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20,
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{EMOTION_EMOJIS[emotion.toLowerCase()] || '💭'}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-2)', textTransform: 'capitalize' }}>{emotion}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>×{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity-mood correlations */}
          {insights.activityCorrelations.length > 0 && (
            <div className="p-card" style={{ padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
                Activities & your mood
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                Based on days you logged these activities
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.activityCorrelations.slice(0, 4).map(({ activity, avgMood, count }) => (
                  <div key={activity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', flex: 1, textTransform: 'capitalize' }}>
                      {activity}
                    </span>
                    <div style={{ flex: 2, height: 6, background: '#F0EDE6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${(avgMood / 10) * 100}%`,
                        background: MOOD_COLORS[Math.round(avgMood) - 1] || '#059669',
                        transition: 'width 0.5s',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: MOOD_COLORS[Math.round(avgMood) - 1] || '#059669', minWidth: 24, textAlign: 'right' }}>
                      {avgMood}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next appointment banner */}
      {dash?.nextAppointment && (
        <a href="/appointments" className="anim-fade-up d4" style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--light)', border: '0.5px solid rgba(45,106,79,0.15)',
          borderRadius: 16, padding: '14px 18px', marginBottom: '1.25rem',
          textDecoration: 'none', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(45,106,79,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            📅
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dk)' }}>Next appointment</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>
              {new Date(dash.nextAppointment.requested_time).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <Ico d="M9 5l7 7-7 7" size={16} color="var(--primary)" />
        </a>
      )}

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {QUICK_CARDS.map((c, i) => (
          <a key={c.href} href={c.href}
            className={`anim-fade-up d${i + 4}`}
            style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 18, padding: '1rem', textDecoration: 'none',
              display: 'block', transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = c.color
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 6px 20px ${c.color}15`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.625rem', fontSize: '1.25rem',
            }}>
              {c.emoji}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.125rem' }}>
              {c.label}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              {c.desc}
            </div>
          </a>
        ))}
      </div>

      {/* Anonymous user — link account nudge */}
      {dash?.isAnonymous && (
        <div className="anim-fade-up d8" style={{
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>🔗</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Save your progress</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              Create an account to sync across devices and connect with a therapist
            </p>
          </div>
          <a href="/login" className="p-btn p-btn-ghost" style={{ fontSize: '0.72rem', padding: '0.375rem 0.75rem', borderRadius: 10 }}>
            Link
          </a>
        </div>
      )}

      {/* Crisis resources */}
      <div className="crisis-bar" style={{ marginBottom: '0.75rem' }}>
        <div className="crisis-bar-title">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="#DC2626" strokeWidth="1"/>
            <path d="M7 4V7.5M7 9.5V9.6" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Crisis resources — always available
        </div>
        {[
          { name: 'Samaritans', contact: '116 123', note: 'free · 24/7' },
          { name: 'NHS Mental Health', contact: '111 option 2', note: '24/7' },
          { name: 'Crisis Text Line', contact: 'Text SHOUT to 85258', note: 'free · 24/7' },
        ].map(r => (
          <div key={r.name} className="crisis-line">
            <strong>{r.name}</strong>
            <span>{r.contact}</span>
            <small>({r.note})</small>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--border-dk)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
        ORAII is a wellness companion — not a crisis service or therapy replacement.
      </p>
    </div>
  )
}
