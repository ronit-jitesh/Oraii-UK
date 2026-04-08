'use client'
import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

export default function TherapistLogin() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const supabase = createSupabaseClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('timeout') === '1') setTimedOut(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root { min-height: 100vh; display: grid; grid-template-columns: 1fr 420px; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
        .login-left { background: #141210; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: 2.5rem; }
        .login-left::before { content: ''; position: absolute; top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(45,106,79,0.18) 0%, transparent 70%); pointer-events: none; }
        .login-left::after { content: ''; position: absolute; bottom: -100px; left: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(74,198,157,0.08) 0%, transparent 70%); pointer-events: none; }
        .left-logo { position: relative; z-index: 1; }
        .left-logo span { display: block; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; font-weight: 400; color: rgba(255,255,255,0.35); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 6px; }
        .left-quote { position: relative; z-index: 1; }
        .left-quote-text { font-family: 'Lora', Georgia, serif; font-size: 1.5rem; font-weight: 400; color: rgba(255,255,255,0.85); line-height: 1.45; font-style: italic; margin-bottom: 1rem; }
        .left-quote-attr { font-size: 0.75rem; color: rgba(255,255,255,0.3); letter-spacing: 0.06em; }
        .left-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; position: relative; z-index: 1; }
        .left-badge { display: flex; align-items: center; gap: 0.375rem; padding: 0.3rem 0.75rem; border-radius: 20px; border: 0.5px solid rgba(255,255,255,0.1); font-size: 0.7rem; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.04); }
        .left-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: #74C69D; }
        .login-right { background: #F7F5F0; display: flex; flex-direction: column; justify-content: center; padding: 3rem 2.5rem; animation: slideIn 0.5s ease both; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .login-heading { font-family: 'Lora', Georgia, serif; font-size: 1.625rem; font-weight: 600; color: #1A1816; letter-spacing: -0.02em; margin-bottom: 0.375rem; }
        .login-sub { font-size: 0.875rem; color: #8B8680; margin-bottom: 2rem; }
        .form-group { margin-bottom: 1.125rem; }
        .form-label { display: block; font-weight: 500; color: #4A4744; margin-bottom: 0.4rem; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.75rem; }
        .form-input { width: 100%; padding: 0.6875rem 0.875rem; border: 0.5px solid #E2DDD5; border-radius: 10px; font-size: 0.9375rem; font-family: 'DM Sans', sans-serif; color: #1A1816; background: white; outline: none; transition: all 0.15s ease; }
        .form-input:focus { border-color: #2D6A4F; box-shadow: 0 0 0 3px rgba(45,106,79,0.1); }
        .form-input::placeholder { color: #C0BBB4; }
        .form-input.error-state { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .error-msg { background: #FEF2F2; border: 0.5px solid rgba(220,38,38,0.2); border-radius: 8px; padding: 0.625rem 0.875rem; font-size: 0.8125rem; color: #DC2626; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; animation: shake 0.3s ease; }
        .timeout-msg { background: #FFFBEB; border: 0.5px solid #FDE68A; border-radius: 8px; padding: 0.625rem 0.875rem; font-size: 0.8125rem; color: #92400E; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .submit-btn { width: 100%; padding: 0.75rem; background: #2D6A4F; color: white; border: none; border-radius: 10px; font-size: 0.9375rem; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.25rem; }
        .submit-btn:hover:not(:disabled) { background: #1B4332; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(45,106,79,0.35); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 0.5px solid #E2DDD5; font-size: 0.75rem; color: #B0ABA4; line-height: 1.6; text-align: center; }
        .login-footer a { color: #8B8680; text-decoration: underline; }
        .register-link { text-align: center; margin-top: 1.25rem; font-size: 0.8125rem; color: #8B8680; }
        .register-link a { color: #2D6A4F; font-weight: 500; text-decoration: none; }
        .register-link a:hover { text-decoration: underline; }
        @media (max-width: 768px) { .login-root { grid-template-columns: 1fr; } .login-left { display: none; } }
      `}</style>

      <div className="login-root">

        {/* ── Left dark panel ── */}
        <div className="login-left">
          <div className="left-logo">
            <img
              src="/logoo.png"
              alt="ORAII"
              style={{ height: 40, width: 'auto', display: 'block', mixBlendMode: 'screen' }}
            />
            <span>Clinical · United Kingdom</span>
          </div>

          <div className="left-quote">
            <div className="left-quote-text">
              &ldquo;The best way to find out if you can trust somebody is to trust them.&rdquo;
            </div>
            <div className="left-quote-attr">— Ernest Hemingway</div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="left-badges">
              <div className="left-badge"><div className="left-badge-dot" />UK-GDPR compliant</div>
              <div className="left-badge"><div className="left-badge-dot" style={{ background: '#6B8CAE' }} />DCB0129 clinical safety</div>
              <div className="left-badge"><div className="left-badge-dot" style={{ background: '#9B8EA0' }} />SNOMED CT coded</div>
            </div>
          </div>
        </div>

        {/* ── Right light panel ── */}
        <div className="login-right">
          {/*
            height: 44px → natural width = 44 × (662/377) = 77px ✓ correct ratio
            alignSelf: flex-start stops the flex column from stretching the image
          */}
          <img
            src="/logoo.png"
            alt="ORAII"
            style={{
              height: 44,
              width: 'auto',
              display: 'block',
              alignSelf: 'flex-start',
              marginBottom: '1.5rem',
            }}
          />

          <div className="login-heading">Welcome back</div>
          <div className="login-sub">Sign in to your therapist portal</div>

          <form onSubmit={handleLogin}>
            {timedOut && !error && (
              <div className="timeout-msg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                Session ended after 30 minutes of inactivity. Please sign in again.
              </div>
            )}

            {error && (
              <div className="error-msg">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor"/>
                  <path d="M7 4.5V7.5M7 9.5V9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required autoComplete="email"
                placeholder="you@example.com"
                className={`form-input${error ? ' error-state' : ''}`}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="/forgot-password" style={{ fontSize: '0.75rem', color: '#8B8680', textDecoration: 'none' }}>Forgot?</a>
              </div>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                required autoComplete="current-password"
                placeholder="••••••••"
                className={`form-input${error ? ' error-state' : ''}`}
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <><div className="spinner" />Signing in…</>
              ) : (
                <>Sign in <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></>
              )}
            </button>
          </form>

          <div className="register-link">
            Don&apos;t have an account? <a href="/register">Sign up</a>
          </div>

          <div className="login-footer">
            Protected under UK-GDPR · Data stored in London eu-west-2<br />
            Need help? <a href="mailto:support@oraii.co.uk">support@oraii.co.uk</a>
          </div>
        </div>
      </div>
    </>
  )
}
