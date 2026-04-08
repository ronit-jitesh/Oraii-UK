'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

export default function PatientRegister() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  const supabase = createSupabaseClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { portal: 'patient' },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)

    if (data.session) {
      setTimeout(() => { window.location.href = '/home' }, 1500)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; background: #F7F5F0; }
        .preg-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }
        .preg-card {
          width: 100%;
          max-width: 420px;
          animation: fadeUp 0.4s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .preg-header { text-align: center; margin-bottom: 2rem; }
        .preg-logo {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #2D6A4F;
          letter-spacing: -0.02em;
          display: block;
          margin-bottom: 0.25rem;
        }
        .preg-tagline { font-size: 0.875rem; color: #8B8680; }
        .preg-form {
          background: white;
          border: 0.5px solid #E2DDD5;
          border-radius: 20px;
          padding: 2rem;
        }
        .preg-heading {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1A1816;
          margin-bottom: 0.25rem;
        }
        .preg-sub { font-size: 0.8125rem; color: #8B8680; margin-bottom: 1.5rem; }
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
        }
        .success-msg {
          background: #ECFDF5;
          border: 0.5px solid rgba(5,150,105,0.2);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
        }
        .success-msg h3 { font-size: 0.9375rem; font-weight: 600; color: #065F46; margin-bottom: 0.375rem; }
        .success-msg p  { font-size: 0.8125rem; color: #047857; }
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
        .submit-btn:hover:not(:disabled) { background: #1B4332; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-link { text-align: center; margin-top: 1.25rem; font-size: 0.8125rem; color: #8B8680; }
        .login-link a { color: #2D6A4F; font-weight: 500; text-decoration: none; }
        .preg-privacy {
          background: #F7F5F0;
          border: 0.5px solid #E2DDD5;
          border-radius: 12px;
          padding: 0.875rem;
          margin-top: 1.25rem;
          font-size: 0.75rem;
          color: #8B8680;
          line-height: 1.5;
        }
        .preg-privacy strong { color: #4A4744; }
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
      `}</style>

      <div className="preg-root">
        <div className="preg-card">
          <div className="preg-header">
            <span className="preg-logo">ORAII</span>
            <span className="preg-tagline">Your between-session wellness companion</span>
          </div>

          <div className="preg-form">
            <div className="preg-heading">Create your account</div>
            <div className="preg-sub">Patient portal · free to join</div>

            {done ? (
              <div className="success-msg">
                <h3>Account created ✓</h3>
                <p>Taking you to your wellness portal…</p>
              </div>
            ) : (
              <form onSubmit={handleRegister}>
                {error && <div className="error-msg">{error}</div>}

                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="form-input"
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    className="form-input"
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? (
                    <><div className="spinner" /> Creating account…</>
                  ) : (
                    <>Create account →</>
                  )}
                </button>
              </form>
            )}

            <div className="login-link">
              Already have an account? <a href="/login">Sign in</a>
            </div>
          </div>

          <div className="preg-privacy">
            <strong>Your privacy</strong>
            Your identity within ORAII is pseudonymous — we store only a reference code,
            not your real name. Protected under UK-GDPR · Data stored in London eu-west-2.
          </div>

          <div className="crisis-bar">
            <strong>In crisis right now?</strong>
            Samaritans: 116 123 · NHS 111 option 2 · Emergency: 999
          </div>
        </div>
      </div>
    </>
  )
}
