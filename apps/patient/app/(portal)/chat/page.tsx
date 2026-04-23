'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { saveChatSession, getLastChatSession } from '../../actions'

type Msg = { role: 'user' | 'assistant'; content: string; ts?: string }

const CHAT_STORAGE_KEY = 'oraii_chat_v2'
const MAX_STORED_MESSAGES = 60

const CRISIS_LINES = [
  { name: 'Samaritans',      contact: '116 123',             note: 'free · 24/7',             href: 'tel:116123' },
  { name: 'NHS Crisis Team', contact: '111 (press 2)',        note: 'mental health · 24/7',     href: 'tel:111' },
  { name: 'Crisis Text',     contact: 'Text SHOUT to 85258', note: 'free · 24/7',              href: 'sms:85258?body=SHOUT' },
  { name: 'Emergency',       contact: '999',                  note: 'immediate danger',         href: 'tel:999' },
  { name: 'Childline',       contact: '0800 1111',            note: 'under 19s · free · 24/7', href: 'tel:08001111' },
]

const STARTERS = [
  "I'm feeling anxious today",
  "Help me wind down",
  "I want to journal",
  "Breathing exercise",
]

const WELCOME_MSG: Msg = {
  role: 'assistant',
  content: "Hi, I'm ORAII 🌿 I'm here to support you between your therapy sessions. How are you feeling today?",
  ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
}

function loadLocalMessages(): Msg[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalMessages(msgs: Msg[]) {
  try {
    // Keep last MAX_STORED_MESSAGES only
    const toStore = msgs.slice(-MAX_STORED_MESSAGES)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Storage full or unavailable — non-fatal
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME_MSG])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [crisis, setCrisis]   = useState(false)
  const [started, setStarted] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load history on mount: localStorage first, Supabase fallback
  useEffect(() => {
    const local = loadLocalMessages()
    if (local.length > 0) {
      setMessages([WELCOME_MSG, ...local])
      setStarted(true)
      setHistoryLoaded(true)
      return
    }
    // Fallback: try Supabase
    getLastChatSession().then(serverMsgs => {
      if (serverMsgs.length > 0) {
        const hydrated: Msg[] = serverMsgs.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ts: undefined,
        }))
        setMessages([WELCOME_MSG, ...hydrated])
        setStarted(true)
        // Warm localStorage from server data
        saveLocalMessages(hydrated)
      }
      setHistoryLoaded(true)
    }).catch(() => setHistoryLoaded(true))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Flush to Supabase with 3s debounce after each exchange
  const scheduleFlush = useCallback((msgs: Msg[]) => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(() => {
      const toSave = msgs
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .filter(m => m.content !== WELCOME_MSG.content) // exclude welcome msg
        .map(m => ({ role: m.role, content: m.content }))
      if (toSave.length > 0) {
        saveChatSession(toSave).catch(() => {}) // fire and forget
      }
    }, 3000)
  }, [])

  // Also flush on page unload
  useEffect(() => {
    const onUnload = () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      const toSave = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .filter(m => m.content !== WELCOME_MSG.content)
        .map(m => ({ role: m.role, content: m.content }))
      if (toSave.length > 0) {
        // Use sendBeacon for reliable unload persistence
        const blob = new Blob([JSON.stringify({ messages: toSave })], { type: 'application/json' })
        navigator.sendBeacon?.('/api/chat/save', blob)
        // Also try the server action (may not complete but best effort)
        saveChatSession(toSave).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [messages])

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

    // Save user message to localStorage immediately
    const userOnly = updated.filter(m => m.content !== WELCOME_MSG.content)
    saveLocalMessages(userOnly)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const aiTs = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      const aiMsg: Msg = {
        role: 'assistant',
        content: data.content ?? "I'm here with you. Could you tell me more?",
        ts: aiTs,
      }
      setMessages(prev => {
        const next = [...prev, aiMsg]
        // Save to localStorage + schedule Supabase flush
        const toStore = next.filter(m => m.content !== WELCOME_MSG.content)
        saveLocalMessages(toStore)
        scheduleFlush(toStore)
        return next
      })
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

  const clearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY)
    setMessages([WELCOME_MSG])
    setStarted(false)
    setCrisis(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{
        maxWidth: 680, margin: '0 auto', width: '100%',
        padding: '1rem 1.25rem 0.75rem',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'Lora, Georgia, serif', letterSpacing: '-0.01em' }}>ORAII</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} aria-hidden="true" />
              Online · wellness companion
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Clear history button — only when there's history */}
            {started && (
              <button
                type="button"
                onClick={clearHistory}
                title="Start new conversation"
                style={{
                  fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500,
                  padding: '4px 8px', background: 'none', border: '0.5px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                New chat
              </button>
            )}
            {/* Persistent crisis link — always visible */}
            <a
              href="tel:116123"
              style={{
                fontSize: '0.7rem', color: '#DC2626', fontWeight: 600,
                textDecoration: 'none', padding: '4px 10px',
                background: '#FEF2F2', borderRadius: 8, border: '0.5px solid #FECACA',
                whiteSpace: 'nowrap',
              }}
              aria-label="Call Samaritans crisis line 116 123"
            >
              🆘 116 123
            </a>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          AI support between sessions · not a therapist or crisis service
        </p>
      </div>

      {/* History restored banner */}
      {historyLoaded && started && messages.length > 2 && (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0.5rem 1.25rem 0' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
            ↑ Previous conversation · <button type="button" onClick={clearHistory} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.68rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Start fresh</button>
          </p>
        </div>
      )}

      {/* Crisis banner */}
      {crisis && (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0.75rem 1.25rem 0' }}>
          <div className="anim-fade-in" style={{
            background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
            border: '1.5px solid #FECACA',
            borderRadius: 16, padding: '1rem 1.25rem',
          }} role="alert" aria-live="assertive">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              fontSize: '0.85rem', fontWeight: 700, color: '#991B1B',
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="8" stroke="#DC2626" strokeWidth="1.5"/>
                <path d="M9 5V9.5M9 12V12.1" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              UK Crisis Support — Please reach out now
            </div>
            <p style={{ fontSize: '0.75rem', color: '#7F1D1D', marginBottom: 10, lineHeight: 1.5 }}>
              You are not alone. These services are free, confidential, and available right now:
            </p>
            {CRISIS_LINES.map(r => (
              <div key={r.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', marginBottom: 4,
                background: 'rgba(255,255,255,0.7)', borderRadius: 10,
              }}>
                <div>
                  <strong style={{ fontSize: '0.8rem', color: '#991B1B' }}>{r.name}</strong>
                  {r.note && <span style={{ fontSize: '0.7rem', color: '#B91C1C', marginLeft: 6 }}>({r.note})</span>}
                </div>
                <a
                  href={r.href}
                  style={{
                    fontSize: '0.82rem', fontWeight: 700, color: '#DC2626',
                    textDecoration: 'none', padding: '4px 10px',
                    background: '#FEE2E2', borderRadius: 8,
                  }}
                >
                  {r.contact}
                </a>
              </div>
            ))}
            <p style={{ fontSize: '0.68rem', color: '#B91C1C', marginTop: 8, textAlign: 'center' }}>
              If you are in immediate danger, call 999 or go to your nearest A&amp;E
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }} role="log" aria-label="Conversation" aria-live="polite">
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)', paddingInline: '0.25rem' }} aria-hidden="true">
                    {m.ts}
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="anim-fade-in" style={{ display: 'flex', justifyContent: 'flex-start' }} aria-label="ORAII is typing" role="status">
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

      {/* Starter chips */}
      {!started && (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '0 1.25rem 0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {STARTERS.map(s => (
              <button
                key={s}
                type="button"
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
            aria-label="Message ORAII"
            className="p-input"
            style={{ flex: 1, resize: 'none', minHeight: 44, maxHeight: 120, lineHeight: '1.5', paddingTop: '0.625rem', paddingBottom: '0.625rem', borderRadius: 12 }}
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="p-btn p-btn-primary"
            style={{ padding: '0.625rem', borderRadius: 12, width: 44, height: 44, flexShrink: 0 }}
          >
            {loading ? (
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} aria-hidden="true" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M15.75 9L2.25 3L5.25 9L2.25 15L15.75 9Z" fill="white"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
