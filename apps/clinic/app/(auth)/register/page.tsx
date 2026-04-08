'use client'
import { useState } from 'react'
import { createSupabaseClient } from '@oraii/core/auth'

export default function TherapistRegister() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [fullName, setFullName] = useState('')
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

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, portal: 'clinic' },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // 2. Insert therapist profile row
    if (data.user) {
      const { error: profileError } = await supabase.from('therapists').insert({
        auth_user_id:        data.user.id,
        email:               email,
        full_name:           fullName,
        professional_body:   'BACP',
        registration_number: 'PENDING',
        specialisms:         [],
      })

      if (profileError) {
        // Profile insert failed but auth user created — still let them in
        console.error('Profile insert error:', profileError.message)
      }
    }

    setLoading(false)
    setDone(true)

    // Auto-redirect after 2 seconds if session exists
    if (data.session) {
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reg-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 440px;
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .reg-left {
          background: #141210;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem;
        }
        .reg-left::before {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(45,106,79,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .left-logo {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: white;
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
        }
        .left-logo span {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.65rem;
          font-weight: 400;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .left-tagline {
          position: relative;
          z-index: 1;
          font-family: 'Lora', Georgia, serif;
          font-size: 1.5rem;
          color: rgba(255,255,255,0.8);
          line-height: 1.45;
          font-style: italic;
        }
        .left-steps {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .left-step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }
        .step-num {
          width: 22px; height: 22px;
          border-radius: 50%;
          border: 1px solid rgba(116,198,157,0.4);
          color: #74C69D;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .step-text {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.5;
        }
        .reg-right {
          background: #F7F5F0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2.5rem;
          animation: slideIn 0.5s ease both;
          overflow-y: auto;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .reg-heading {
          font-family: 'Lora', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1A1816;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .reg-sub {
          font-size: 0.875rem;
          color: #8B8680;
          margin-bottom: 1.75rem;
        }
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
        .success-msg {
          background: #ECFDF5;
          border: 0.5px solid rgba(5,150,105,0.2);
          border-radius: 10px;
          padding: 1rem;
          text-align: center;
        }
        .success-msg h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #065F46;
          margin-bottom: 0.375rem;
        }
        .success-msg p { font-size: 0.8125rem; color: #047857; }
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
        .submit-btn:hover:not(:disabled) {
          background: #1B4332;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(45,106,79,0.35);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-link {
          text-align: center;
          margin-top: 1.25rem;
          font-size: 0.8125rem;
          color: #8B8680;
        }
        .login-link a {
          color: #2D6A4F;
          font-weight: 500;
          text-decoration: none;
        }
        .login-link a:hover { text-decoration: underline; }
        .reg-footer {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 0.5px solid #E2DDD5;
          font-size: 0.7rem;
          color: #B0ABA4;
          text-align: center;
          line-height: 1.6;
        }
        @media (max-width: 768px) {
          .reg-root { grid-template-columns: 1fr; }
          .reg-left { display: none; }
        }
      `}</style>

      <div className="reg-root">
        {/* Left panel */}
        <div className="reg-left">
          <div className="left-logo">
            ORAII
            <span>Clinical · United Kingdom</span>
          </div>

          <div className="left-tagline">
            "The good physician treats the disease;<br />
            the great physician treats the patient."
          </div>

          <div className="left-steps">
            <div className="left-step">
              <div className="step-num">1</div>
              <div className="step-text">Create your therapist account with your email and password</div>
            </div>
            <div className="left-step">
              <div className="step-num">2</div>
              <div className="step-text">Sign in and add your first pseudonymous client record</div>
            </div>
            <div className="left-step">
              <div className="step-num">3</div>
              <div className="step-text">Record a session — ORAII generates your clinical note draft</div>
            </div>
            <div className="left-step">
              <div className="step-num">4</div>
              <div className="step-text">Review, edit, and approve the note. You are always in control.</div>
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="reg-right">
          <div className="reg-heading">Create your account</div>
          <div className="reg-sub">Therapist portal · ORAII UK</div>

          {done ? (
            <div className="success-msg">
              <h3>Account created ✓</h3>
              <p>
                {`Signing you in to your dashboard…`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              {error && <div className="error-msg">{error}</div>}

              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Dr Jane Smith"
                  className="form-input"
                />
              </div>

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

          <div className="reg-footer">
            By creating an account you confirm you are a registered UK therapist.<br />
            Protected under UK-GDPR · Data stored in London eu-west-2
          </div>
        </div>
      </div>
    </>
  )
}
