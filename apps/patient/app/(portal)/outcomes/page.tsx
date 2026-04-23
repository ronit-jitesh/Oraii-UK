'use client'
import { useState, useEffect } from 'react'
import { getMyOutcomes, saveSelfOutcomeScore } from '../../actions'

interface Score {
  id: string
  measure: string
  score: number
  severity: string
  completed_at: string
}

const MEASURES: Record<string, { label: string; full: string; max: number; color: string; bg: string; bands: { label: string; max: number; color: string }[] }> = {
  'PHQ-9': {
    label: 'PHQ-9', full: 'Depression', max: 27, color: '#1E3A8A', bg: '#DBEAFE',
    bands: [
      { label: 'Minimal', max: 4, color: '#D1FAE5' },
      { label: 'Mild', max: 9, color: '#FEF3C7' },
      { label: 'Moderate', max: 14, color: '#FED7AA' },
      { label: 'Mod-Severe', max: 19, color: '#FECACA' },
      { label: 'Severe', max: 27, color: '#FEE2E2' },
    ]
  },
  'GAD-7': {
    label: 'GAD-7', full: 'Anxiety', max: 21, color: '#065F46', bg: '#D1FAE5',
    bands: [
      { label: 'Minimal', max: 4, color: '#D1FAE5' },
      { label: 'Mild', max: 9, color: '#FEF3C7' },
      { label: 'Moderate', max: 14, color: '#FED7AA' },
      { label: 'Severe', max: 21, color: '#FECACA' },
    ]
  },
  'CORE-10': {
    label: 'CORE-10', full: 'Wellbeing (UK Standard)', max: 40, color: '#7C3AED', bg: '#EDE9FE',
    bands: [
      { label: 'Healthy', max: 10, color: '#D1FAE5' },
      { label: 'Low', max: 20, color: '#FEF3C7' },
      { label: 'Mild', max: 25, color: '#FED7AA' },
      { label: 'Moderate', max: 33, color: '#FECACA' },
      { label: 'Severe', max: 40, color: '#FEE2E2' },
    ]
  },
  'DASS-21': {
    label: 'DASS-21', full: 'Depression, Anxiety & Stress', max: 42, color: '#92400E', bg: '#FFFBEB',
    bands: [
      { label: 'Normal', max: 9, color: '#D1FAE5' },
      { label: 'Mild', max: 13, color: '#FEF3C7' },
      { label: 'Moderate', max: 20, color: '#FED7AA' },
      { label: 'Severe', max: 27, color: '#FECACA' },
      { label: 'Very Severe', max: 42, color: '#FEE2E2' },
    ]
  },
}

const FREQ_LABELS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']

const PHQ9_QUESTIONS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or watching television',
  'Moving or speaking so slowly that other people could have noticed — or being so fidgety or restless that you have been moving around a lot more than usual',
  'Thoughts that you would be better off dead, or thoughts of hurting yourself in some way',
]

const GAD7_QUESTIONS = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  'Being so restless that it is hard to sit still',
  'Becoming easily annoyed or irritable',
  'Feeling afraid, as if something awful might happen',
]

function getPHQ9Severity(score: number): string {
  if (score <= 4) return 'Minimal depression'
  if (score <= 9) return 'Mild depression'
  if (score <= 14) return 'Moderate depression'
  if (score <= 19) return 'Moderately severe depression'
  return 'Severe depression'
}

function getGAD7Severity(score: number): string {
  if (score <= 4) return 'Minimal anxiety'
  if (score <= 9) return 'Mild anxiety'
  if (score <= 14) return 'Moderate anxiety'
  return 'Severe anxiety'
}

function Ico({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

function TrendChart({ scores, config }: { scores: Score[]; config: typeof MEASURES['PHQ-9'] }) {
  if (scores.length < 2) return null
  const CW = 600, CH = 160, PL = 36, PR = 16, PT = 16, PB = 32
  const W = CW - PL - PR, H = CH - PT - PB
  const maxVal = config.max

  const points = scores.map((s, i) => ({
    x: PL + (scores.length === 1 ? W / 2 : (i / (scores.length - 1)) * W),
    y: PT + H - (s.score / maxVal) * H,
    score: s.score,
    date: new Date(s.completed_at),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const last = points[points.length - 1]!
  const first = points[0]!
  const areaPath = `${linePath} L${last.x},${PT + H} L${first.x},${PT + H} Z`

  const bandRects = config.bands.map((band, i) => {
    const prevMax = i === 0 ? 0 : config.bands[i - 1]!.max
    const bandH = ((band.max - prevMax) / maxVal) * H
    const y = PT + H - (band.max / maxVal) * H
    return (
      <rect key={band.label} x={PL} y={y} width={W} height={bandH} fill={band.color} opacity={0.25} />
    )
  })

  return (
    <svg width="100%" viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block', marginTop: 12 }}>
      {bandRects}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = PT + H - pct * H
        const val = Math.round(pct * maxVal)
        return (
          <g key={pct}>
            <line x1={PL} y1={y} x2={PL + W} y2={y} stroke="#E2DDD5" strokeWidth={0.5} strokeDasharray="4,4" />
            <text x={PL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#8B8680">{val}</text>
          </g>
        )
      })}
      <path d={areaPath} fill={config.color} opacity={0.08} />
      <path d={linePath} fill="none" stroke={config.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill="#fff" stroke={config.color} strokeWidth={2} />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={config.color}>{p.score}</text>
          <text x={p.x} y={PT + H + 16} textAnchor="middle" fontSize={8} fill="#8B8680">
            {p.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        </g>
      ))}
    </svg>
  )
}

type QuizView = 'home' | 'phq9' | 'gad7' | 'done'

function SelfAssessment({ onComplete }: { onComplete: (measure: string, score: number, severity: string, responses: Record<string, number>) => void; onClose: () => void }) {
  const [quiz, setQuiz] = useState<QuizView>('home')
  const [responses, setResponses] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const questions = quiz === 'phq9' ? PHQ9_QUESTIONS : quiz === 'gad7' ? GAD7_QUESTIONS : []

  const handleResponse = (qIdx: number, val: number) => {
    setResponses(prev => {
      const next = [...prev]
      next[qIdx] = val
      return next
    })
  }

  const allAnswered = responses.length === questions.length && responses.every(r => r !== undefined)

  const handleSubmit = async () => {
    if (!allAnswered || saving) return
    setSaving(true)
    const total = responses.reduce((a, b) => a + b, 0)
    const measure = quiz === 'phq9' ? 'PHQ-9' : 'GAD-7'
    const severity = measure === 'PHQ-9' ? getPHQ9Severity(total) : getGAD7Severity(total)
    const responsesObj: Record<string, number> = {}
    responses.forEach((r, i) => { responsesObj[`q${i + 1}`] = r })
    const result = await saveSelfOutcomeScore({ measure, score: total, severity, responses: responsesObj })
    setSaving(false)
    if (!result.error) {
      onComplete(measure, total, severity, responsesObj)
      setQuiz('done')
    }
  }

  const startNew = (type: 'phq9' | 'gad7') => {
    setResponses([])
    setQuiz(type)
  }

  if (quiz === 'home') {
    return (
      <div style={{ padding: '1.25rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          These are validated clinical questionnaires used worldwide. Your responses are private and won&apos;t be shared without your permission.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => startNew('phq9')}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: '#DBEAFE', border: '0.5px solid rgba(30,58,138,0.2)',
              borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '1.25rem' }}>😔</span>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A', marginBottom: 2 }}>PHQ-9 · Depression</p>
              <p style={{ fontSize: '0.78rem', color: '#3730A3' }}>9 questions · 2 minutes</p>
            </div>
            <Ico d="M9 5l7 7-7 7" size={16} color="#1E3A8A" />
          </button>
          <button
            type="button"
            onClick={() => startNew('gad7')}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: '#D1FAE5', border: '0.5px solid rgba(6,95,70,0.2)',
              borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '1.25rem' }}>😟</span>
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#065F46', marginBottom: 2 }}>GAD-7 · Anxiety</p>
              <p style={{ fontSize: '0.78rem', color: '#047857' }}>7 questions · 1 minute</p>
            </div>
            <Ico d="M9 5l7 7-7 7" size={16} color="#065F46" />
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '1rem', lineHeight: 1.5 }}>
          These are screening tools only — not a diagnosis. If you are concerned, speak with a healthcare professional.
        </p>
      </div>
    )
  }

  if (quiz === 'done') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
        <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Score saved</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Your result has been added to your progress chart above.</p>
        <button type="button" onClick={() => setQuiz('home')} className="p-btn p-btn-ghost" style={{ borderRadius: 12 }}>
          Take another
        </button>
      </div>
    )
  }

  const config = quiz === 'phq9' ? MEASURES['PHQ-9']! : MEASURES['GAD-7']!
  const answeredCount = responses.filter(r => r !== undefined).length

  return (
    <div style={{ padding: '0 1.25rem 1.25rem' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: config.color }}>{config.label} — {config.full}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{answeredCount} / {questions.length}</span>
        </div>
        <div style={{ height: 4, background: '#F0EDE6', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(answeredCount / questions.length) * 100}%`, background: config.color, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        Over the last 2 weeks, how often have you been bothered by the following?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {questions.map((q, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: config.color, marginRight: 6 }}>{i + 1}.</span>
              {q}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {FREQ_LABELS.map((label, val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleResponse(i, val)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.5rem 0.75rem', borderRadius: 10,
                    border: responses[i] === val ? `1.5px solid ${config.color}` : '1.5px solid var(--border)',
                    background: responses[i] === val ? config.bg : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    border: responses[i] === val ? `5px solid ${config.color}` : '1.5px solid var(--border)',
                    background: responses[i] === val ? 'white' : 'transparent',
                    transition: 'all 0.15s',
                  }} />
                  <span style={{ fontSize: '0.82rem', color: responses[i] === val ? config.color : 'var(--text-2)', fontWeight: responses[i] === val ? 600 : 400 }}>
                    {label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--muted)' }}>{val}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PHQ-9 Q9 safety note */}
      {quiz === 'phq9' && (
        <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: 12, padding: '0.875rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#991B1B', lineHeight: 1.5 }}>
            If you answered anything other than &quot;Not at all&quot; to question 9, please reach out to your GP or call Samaritans on 116 123.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem' }}>
        <button type="button" onClick={() => setQuiz('home')} className="p-btn p-btn-ghost" style={{ flex: 1, borderRadius: 12 }}>
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered || saving}
          className="p-btn p-btn-primary"
          style={{ flex: 2, borderRadius: 12 }}
        >
          {saving ? 'Saving...' : allAnswered ? `Submit (${responses.reduce((a, b) => a + (b || 0), 0)} / ${config.max})` : `${answeredCount} of ${questions.length} answered`}
        </button>
      </div>
    </div>
  )
}

export default function OutcomesPage() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssessment, setShowAssessment] = useState(false)
  const [lastResult, setLastResult] = useState<{ measure: string; score: number; severity: string } | null>(null)

  useEffect(() => {
    getMyOutcomes().then(data => {
      setScores(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const grouped = scores.reduce<Record<string, Score[]>>((acc, s) => {
    if (!acc[s.measure]) acc[s.measure] = []
    acc[s.measure]!.push(s)
    return acc
  }, {})

  const measures = Object.keys(MEASURES)

  const handleComplete = async (measure: string, score: number, severity: string) => {
    setLastResult({ measure, score, severity })
    // Refresh scores from server
    const fresh = await getMyOutcomes()
    setScores(fresh || [])
  }

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="anim-fade-up" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              Your progress
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              Track your mental wellbeing with validated questionnaires
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAssessment(!showAssessment)}
            className="p-btn p-btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: 12, flexShrink: 0 }}
          >
            {showAssessment ? 'Close' : '+ Self-assess'}
          </button>
        </div>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div className="anim-fade-up" style={{
          background: 'var(--light)', border: '0.5px solid rgba(45,106,79,0.15)',
          borderRadius: 14, padding: '0.875rem 1.25rem', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.25rem' }}>✅</span>
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dk)' }}>
              {lastResult.measure} complete — score {lastResult.score}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{lastResult.severity}</p>
          </div>
        </div>
      )}

      {/* Self-assessment panel */}
      {showAssessment && (
        <div className="anim-fade-up p-card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '0.5px solid var(--border)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>📋 Self-assessment</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Validated tools — takes 1–2 minutes</p>
          </div>
          <SelfAssessment
            onComplete={handleComplete}
            onClose={() => setShowAssessment(false)}
          />
        </div>
      )}

      {/* Info banner */}
      <div className="anim-fade-up d1" style={{
        background: 'var(--light)', border: '0.5px solid rgba(45,106,79,0.15)',
        borderRadius: 16, padding: '14px 18px', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Ico d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size={18} color="var(--primary)" />
        <p style={{ fontSize: '0.8rem', color: 'var(--primary-dk)', lineHeight: 1.55 }}>
          Lower scores mean fewer symptoms. You can self-assess any time — or your therapist can record scores during sessions.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          Loading your scores...
        </div>
      ) : scores.length === 0 ? (
        <div className="anim-fade-up d2" style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 20, padding: '3rem 2rem', textAlign: 'center',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Ico d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={22} color="var(--muted)" />
          </div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No scores yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Use the self-assessment above to take your first PHQ-9 or GAD-7.
          </p>
          <button type="button" onClick={() => setShowAssessment(true)} className="p-btn p-btn-primary" style={{ borderRadius: 12 }}>
            Take a questionnaire
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {measures.map((measure, idx) => {
            const mScores = grouped[measure]
            if (!mScores || mScores.length === 0) return null
            const config = MEASURES[measure]!
            const latest = mScores[mScores.length - 1]!
            const prev = mScores.length > 1 ? mScores[mScores.length - 2]! : null
            const diff = prev ? latest.score - prev.score : 0
            const improving = diff < 0

            return (
              <div key={measure} className={`anim-fade-up d${idx + 2}`} style={{
                background: 'var(--surface)',
                border: '0.5px solid var(--border)',
                borderRadius: 20,
                padding: '20px',
                boxShadow: 'var(--shadow)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Ico d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" size={16} color={config.color} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{config.label}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{config.full}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: config.color }}>{latest.score}</p>
                    {prev && (
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: improving ? '#059669' : '#DC2626' }}>
                        {improving ? '↓' : '↑'} {Math.abs(diff)} {improving ? 'improving' : 'increased'}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, marginTop: 8 }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 8,
                    background: config.bg, color: config.color,
                  }}>
                    {latest.severity}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {new Date(latest.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <TrendChart scores={mScores} config={config} />

                <div style={{ marginTop: 12, padding: '0 4px' }}>
                  <div style={{ height: 6, background: '#F0EDE6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${(latest.score / config.max) * 100}%`,
                      background: `linear-gradient(90deg, ${config.color}88, ${config.color})`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>0</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{config.max}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Score legend */}
      <div className="anim-fade-up d7" style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 16, padding: '16px 20px', marginTop: '1.5rem',
      }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>About your scores</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'PHQ-9', desc: 'Measures depression symptoms (0–27). Lower is better. Self-assessable.' },
            { label: 'GAD-7', desc: 'Measures anxiety symptoms (0–21). Lower is better. Self-assessable.' },
            { label: 'CORE-10', desc: 'UK standard wellbeing measure (0–40). Lower is better. Therapist-administered.' },
            { label: 'DASS-21', desc: 'Measures depression, anxiety and stress (0–42 each). Lower is better.' },
          ].map(m => (
            <p key={m.label} style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>{m.label}</span> — {m.desc}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
