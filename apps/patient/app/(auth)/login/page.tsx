'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

export default function PatientLogin() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const supabase = createSupabaseClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Normalised message — never reveal whether email exists (prevents user enumeration)
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
    } else {
      window.location.href = '/home'
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; background: #F7F5F0; }
        .plogin-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .plogin-card {
          width: 100%;
          max-width: 400px;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .plogin-header { text-align: center; margin-bottom: 2rem; }
        .plogin-logo {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.75rem;
          font-weight: 600;
          color: #2D6A4F;
          letter-spacing: -0.02em;
          display: block;
          margin-bottom: 0.375rem;
        }
        .plogin-tagline { font-size: 0.875rem; color: #8B8680; }
        .plogin-form {
          background: white;
          border: 0.5px solid #E2DDD5;
          border-radius: 20px;
          padding: 2rem;
        }
        .plogin-heading {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1A1816;
          margin-bottom: 0.25rem;
        }
        .plogin-sub { font-size: 0.8125rem; color: #8B8680; margin-bottom: 1.5rem; }
        .form-group { margin-bottom: 1rem; }
        .form-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #4A4744;
          margin-bottom: 0.375rem;
        }
        .form-input {
          width: 100%;
          padding: 0.6875rem 0.875rem;
          border: 0.5px solid #E2DDD5;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-family: 'DM Sans', sans-serif;
          color: #1A1816;
          background: white;
          outline: none;
          transition: all 0.15s ease;
        }
        .form-input:focus {
          border-color: #2D6A4F;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.1);
        }
        .form-input::placeholder { color: #C0BBB4; }
        .error-msg {
          background: #FEF2F2;
          border: 0.5px solid rgba(220,38,38,0.2);
          border-radius: 8px;
          padding: 0.625rem 0.875rem;
          font-size: 0.8125rem;
          color: #DC2626;
          margin-bottom: 1rem;
          animation: shake 0.3s ease;
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
        }
        .submit-btn {
          width: 100%;
          padding: 0.75rem;
          background: #2D6A4F;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .submit-btn:hover:not(:disabled) { background: #1B4332; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(45,106,79,0.3); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .bottom-links { text-align: center; margin-top: 1.25rem; font-size: 0.8125rem; color: #8B8680; }
        .bottom-links a { color: #2D6A4F; font-weight: 500; text-decoration: none; }
        .bottom-links a:hover { text-decoration: underline; }
        .divider { margin: 0 0.5rem; color: #D1CCC6; }
        .crisis-bar {
          background: #FEF2F2;
          border: 0.5px solid rgba(220,38,38,0.15);
          border-radius: 12px;
          padding: 0.875rem;
          margin-top: 1rem;
          font-size: 0.75rem;
          color: #B91C1C;
          line-height: 1.6;
        }
        .crisis-bar strong { display: block; font-weight: 600; color: #991B1B; margin-bottom: 0.25rem; }
        .privacy-note {
          text-align: center;
          margin-top: 0.875rem;
          font-size: 0.7rem;
          color: #B0ABA4;
          line-height: 1.5;
        }
      `}</style>

      <div className="plogin-root">
        <div className="plogin-card">
          <div className="plogin-header">
            <img src="/logoo.png" alt="ORAII" style={{ height: 48, width: 'auto', objectFit: 'contain', marginBottom: 4 }} />
            <span className="plogin-tagline">Your between-session wellness companion</span>
          </div>

          <div className="plogin-form">
            <div className="plogin-heading">Welcome back</div>
            <div className="plogin-sub">Sign in to your wellness portal</div>

            <form onSubmit={handleLogin}>
              {error && <div className="error-msg">{error}</div>}

              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="login-password" className="form-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? (
                  <><div className="spinner" /> Signing in…</>
                ) : (
                  <>Sign in →</>
                )}
              </button>
            </form>

            <div className="bottom-links">
              <a href="/register">Create account</a>
              <span className="divider">·</span>
              <a href="/forgot-password">Forgot password?</a>
            </div>
          </div>

          <div className="crisis-bar">
            <strong>In crisis right now?</strong>
            Samaritans: 116 123 · NHS 111 option 2 · Emergency: 999
          </div>

          <div className="privacy-note">
            Protected under UK-GDPR · Data stored in London eu-west-2
          </div>
        </div>
      </div>
    </>
  )
}
