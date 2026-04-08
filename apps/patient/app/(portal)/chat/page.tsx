'use client'
import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string; ts?: string }

const CRISIS_LINES = [
  { name: 'Samaritans', contact: '116 123', note: 'free · 24/7' },
  { name: 'NHS Mental Health', contact: '111 option 2', note: '24/7' },
  { name: 'Crisis Text', contact: 'Text SHOUT to 85258', note: 'free · 24/7' },
  { name: 'Emergency', contact: '999', note: '' },
]

const STARTERS = [
  "I'm feeling anxious today",
  "Help me wind down",
  "I want to journal",
  "Breathing exercise",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: "Hi, I'm Daji 👋 I'm here to support you between your therapy sessions. How are you feeling today?",
      ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [crisis, setCrisis]         = useState(false)
  const [started, setStarted]       = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setStarted(true)
    const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Msg = { role: 'user', content, ts }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      const aiTs = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, ts: aiTs }])
      if (data.crisisDetected) setCrisis(true)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. If you need support right now, please call Samaritans on 116 123.',
        ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{
        maxWidth: 680, margin: '0 auto', width: '100%',
        padding: '1rem 1.25rem 0.75rem',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #D8EDDF, #40916C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.125rem',
          }}>
            ◎
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>Daji</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-lt)', display: 'inline-block' }} />
              Online · wellness companion
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          AI support between sessions · not a therapist or crisis service
        </p>
      </div>

      {/* Crisis banner */}
      {crisis && (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0.75rem 1.25rem 0' }}>
          <div className="crisis-bar anim-fade-in">
            <div className="crisis-bar-title">Please reach out right now</div>
            {CRISIS_LINES.map(r => (
              <div key={r.name} className="crisis-line">
                <strong>{r.name}</strong>
                <span>{r.contact}</span>
                {r.note && <small>({r.note})</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className="anim-fade-up"
              style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.25rem' }}>
                <div className={m.role === 'user' ? 'bubble-user' : 'bubble-ai'}>
                  {m.content}
                </div>
                {m.ts && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)', paddingInline: '0.25rem' }}>
                    {m.ts}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="anim-fade-in" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div className="bubble-ai" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.75rem 1rem' }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Starter chips — show before first message */}
      {!started && (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0 1.25rem 0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {STARTERS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="tag"
                style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        background: 'rgba(247,245,240,0.95)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            onKeyDown={handleKey}
            placeholder="How are you feeling? (Enter to send)"
            rows={1}
            className="p-input"
            style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: '1.5', paddingTop: '0.625rem', paddingBottom: '0.625rem', borderRadius: 12 }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="p-btn p-btn-primary"
            style={{ padding: '0.625rem', borderRadius: 12, width: 44, height: 44, flexShrink: 0 }}
          >
            {loading ? (
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15.75 9L2.25 3L5.25 9L2.25 15L15.75 9Z" fill="white"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
