'use client'
import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { createAnonymousUser } from '../../actions'

const ADJECTIVES = [
  'Gentle','Quiet','Bright','Calm','Warm','Steady','Kind','Brave','Clear','Soft',
  'Deep','Still','Wild','Free','Bold','True','Wise','Swift','Pure','Light',
  'Golden','Silver','Autumn','Spring','Morning','Evening','Midnight','Crimson',
  'Emerald','Azure','Coral','Amber','Ivory','Sage','Misty','Velvet','Lunar',
  'Solar','Ocean','Forest','River','Mountain','Meadow','Storm','Frost','Dawn',
]

const NOUNS = [
  'River','Star','Fox','Owl','Moon','Sun','Wave','Stone','Leaf','Cloud',
  'Rain','Wind','Fern','Pine','Oak','Birch','Hawk','Dove','Bear','Wolf',
  'Hare','Wren','Lark','Jay','Elm','Ash','Bay','Sky','Dusk','Glow',
  'Peak','Vale','Glen','Cove','Reef','Bloom','Petal','Thorn','Root','Spark',
  'Flame','Ember','Cliff','Shore','Creek','Maple','Cedar','Willow','Raven','Crane',
]

function generateNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj}${noun}`
}

const DATA_ITEMS = [
  { icon: '😊', label: 'Mood & check-ins', detail: 'Your daily scores and emotion tags' },
  { icon: '📓', label: 'Journal entries', detail: 'Text you write in the journal (private by default)' },
  { icon: '💬', label: 'Chat history', detail: 'Conversations with ORAII (not shared with OpenAI after processing)' },
  { icon: '📊', label: 'Progress scores', detail: 'PHQ-9/GAD-7 questionnaire responses' },
  { icon: '🛡️', label: 'Safety plan', detail: 'Your crisis contacts and coping steps' },
]

type Step = 'intro' | 'name' | 'consent' | 'loading'

export default function WelcomePage() {
  const [nickname, setNickname] = useState('')
  const [step, setStep] = useState<Step>('intro')
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setNickname(generateNickname())
    setMounted(true)
  }, [])

  const regenerate = useCallback(() => {
    setNickname(generateNickname())
  }, [])

  const handleStart = async () => {
    if (!nickname.trim()) return
    setStep('loading')
    setError(null)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Check if already signed in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        window.location.href = '/home'
        return
      }

      // Create anonymous user with consent flag = true (user clicked "I agree")
      const result = await createAnonymousUser(nickname.trim(), true)

      if (result.error) {
        throw new Error(result.error)
      }

      // Sign in with the created credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email!,
        password: result.password!,
      })

      if (signInError) throw signInError

      window.location.href = '/home'
    } catch (err: unknown) {
      console.error('Auth error:', err)
      setError((err as Error)?.message || 'Something went wrong. Please try again.')
      setStep('consent')
    }
  }

  if (!mounted) return null

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient background */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-15%',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(45,106,79,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%',
        width: '40vw', height: '40vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(116,198,157,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1 }}>

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="anim-fade-up" style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'linear-gradient(145deg, #D8EDDF 0%, #74C69D 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 32px rgba(45,106,79,0.15)',
            }}>
              <span style={{ fontSize: '2.25rem' }}>🌱</span>
            </div>

            <h1 style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: '2rem', fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem', lineHeight: 1.2,
            }}>
              Welcome to ORAII
            </h1>

            <p style={{
              fontSize: '1rem', color: 'var(--muted)',
              lineHeight: 1.6, marginBottom: '2rem',
              maxWidth: 320, marginInline: 'auto',
            }}>
              A gentle space to understand your mind, track your wellbeing, and grow at your own pace.
            </p>

            <div style={{
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
              marginBottom: '2rem', textAlign: 'left',
            }}>
              {[
                { emoji: '✨', text: 'Daily check-ins that take 60 seconds' },
                { emoji: '📓', text: 'Private journaling with AI insights' },
                { emoji: '🎯', text: 'Track your purpose and values' },
                { emoji: '🔒', text: 'Completely anonymous — no email needed' },
              ].map((f, i) => (
                <div key={i} className={`anim-fade-up d${i + 2}`} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 14,
                }}>
                  <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{f.emoji}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{f.text}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setStep('name')} className="p-btn p-btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: 14 }}>
              Get started — it&apos;s free
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1rem', lineHeight: 1.5 }}>
              No account needed. No email. No data sold. Ever.
            </p>
          </div>
        )}

        {/* ── Choose name ── */}
        {step === 'name' && (
          <div className="anim-fade-up" style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'var(--light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <span style={{ fontSize: '1.75rem' }}>🌿</span>
            </div>

            <h2 style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: '1.5rem', fontWeight: 600,
              color: 'var(--text)', letterSpacing: '-0.02em',
              marginBottom: '0.375rem',
            }}>
              Choose your name
            </h2>

            <p style={{
              fontSize: '0.875rem', color: 'var(--muted)',
              marginBottom: '1.5rem', lineHeight: 1.5,
            }}>
              Pick a nickname — or keep the one we made.<br />
              You can always change this later.
            </p>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input type="text" value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={24} className="p-input"
                style={{
                  textAlign: 'center', fontSize: '1.25rem', fontWeight: 600,
                  letterSpacing: '-0.01em', padding: '1rem', borderRadius: 14,
                  fontFamily: 'Lora, Georgia, serif', color: 'var(--primary-dk)',
                }}
                autoFocus
              />
            </div>

            <button onClick={regenerate} className="p-btn p-btn-ghost"
              style={{ marginBottom: '1.5rem', fontSize: '0.8125rem', gap: '0.375rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Generate another
            </button>

            <button onClick={() => setStep('consent')} disabled={!nickname.trim()} className="p-btn p-btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: 14 }}>
              Continue →
            </button>

            <button onClick={() => setStep('intro')} className="p-btn p-btn-ghost"
              style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.875rem' }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Consent ── */}
        {step === 'consent' && (
          <div className="anim-fade-up">
            <div style={{
              width: 56, height: 56, borderRadius: 18,
              background: '#EBF5F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
            </div>

            <h2 style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: '1.375rem', fontWeight: 600,
              color: 'var(--text)', letterSpacing: '-0.02em',
              marginBottom: '0.375rem', textAlign: 'center',
            }}>
              Before you begin
            </h2>

            <p style={{
              fontSize: '0.875rem', color: 'var(--muted)',
              marginBottom: '1.25rem', lineHeight: 1.6, textAlign: 'center',
            }}>
              We need your permission to store your wellness data. Here&apos;s exactly what we collect:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {DATA_ITEMS.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 12,
                }}>
                  <span style={{ fontSize: '1.125rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{item.label}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--light)', border: '0.5px solid rgba(45,106,79,0.15)',
              borderRadius: 14, padding: '0.875rem 1rem', marginBottom: '1.25rem',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--primary-dk)', lineHeight: 1.6 }}>
                <strong>Your rights under UK-GDPR:</strong> You can view, export, or delete your data at any time. Your identity is pseudonymous — we store a reference code, not your name. Data stored in London (eu-west-2). We never sell your data.
              </p>
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-lt)', border: '0.5px solid rgba(220,38,38,0.2)',
                borderRadius: 12, padding: '0.75rem 1rem',
                fontSize: '0.8125rem', color: 'var(--danger)', marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <button onClick={handleStart} className="p-btn p-btn-primary"
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', fontWeight: 600, borderRadius: 14 }}>
              I agree — start as {nickname}
            </button>

            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.75rem', lineHeight: 1.6, textAlign: 'center' }}>
              By continuing you consent to processing under UK-GDPR Art. 6(1)(a).<br />
              You can withdraw consent and delete your data at any time.
            </p>

            <button onClick={() => setStep('name')} className="p-btn p-btn-ghost"
              style={{ width: '100%', marginTop: '0.625rem', fontSize: '0.875rem' }}>
              ← Back
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {step === 'loading' && (
          <div className="anim-fade-in" style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: 'linear-gradient(145deg, #D8EDDF 0%, #74C69D 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <span style={{ fontSize: '2rem' }}>🌱</span>
            </div>
            <p style={{
              fontFamily: 'Lora, Georgia, serif',
              fontSize: '1.125rem', fontWeight: 500,
              color: 'var(--text)', marginBottom: '0.5rem',
            }}>
              Planting your garden...
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Setting up your space, {nickname}
            </p>
          </div>
        )}
      </div>

      {step !== 'loading' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '1rem', textAlign: 'center',
          background: 'linear-gradient(transparent, var(--bg) 40%)',
        }}>
          <a href="/login" style={{ fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none' }}>
            Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</span>
          </a>
        </div>
      )}
    </div>
  )
}
