'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { scanTranscriptUK, detectThemesUK, applyCoOccurrenceEscalation } from './riskDetection'
import NoteGenerator from './NoteGenerator'
import RiskAlertBanner from './RiskAlertBanner'
import LiveTranscript from './LiveTranscript'

interface Segment { speaker: string; text: string; isDraft: boolean; timestamp: number }
interface Props { patientId?: string; patientName?: string; sessionNumber?: number }

const UK_DEMO = [
  { speaker: 'Speaker 0', text: 'Hello, good to see you again. How have you been since our last session?' },
  { speaker: 'Speaker 1', text: "To be honest, I've been struggling quite a bit. The anxiety has been really bad this week." },
  { speaker: 'Speaker 0', text: "I'm sorry to hear that. Can you tell me more about what the anxiety has been like for you?" },
  { speaker: 'Speaker 1', text: "It's like a constant weight on my chest. I wake up at 4am with my heart racing and I just can't get back to sleep. I've been feeling really hopeless that things will ever get better." },
  { speaker: 'Speaker 0', text: "That sounds very distressing. The sleep disruption and the feelings of hopelessness are important — I want to check in about that directly. Are you having any thoughts of harming yourself or ending your life?" },
  { speaker: 'Speaker 1', text: "No, nothing like that. I just want the noise in my head to stop. I want to feel normal again." },
  { speaker: 'Speaker 0', text: "I'm really glad you're safe. Those feelings of wanting relief are completely understandable. Let's work on some cognitive reframing today, and I'd like to do a PHQ-9 at the end of the session. We can also review your safety plan together." },
  { speaker: 'Speaker 1', text: "That sounds really helpful. I have been trying the breathing exercises from last week but I find it hard to remember them when I'm in the middle of an anxious episode." },
  { speaker: 'Speaker 0', text: "That's really common. Let's look at some grounding techniques that might be easier to access in the moment. I also want to discuss whether a GP referral for a medication review might be helpful alongside our work here." },
]

function SVG({ d, size = 14, color = 'currentColor', strokeWidth = 1.75 }: { d: string; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  )
}

export default function Recorder({ patientId, patientName, sessionNumber }: Props) {
  const [recording, setRecording] = useState(false)
  const [status, setStatus]       = useState('Ready')
  const [segments, setSegments]   = useState<Segment[]>([])
  const [mode, setMode]           = useState<'live' | 'upload' | 'demo'>('demo')
  const [alerts, setAlerts]       = useState<any[]>([])
  const [themes, setThemes]       = useState<any[]>([])
  const [consent, setConsent]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState(false)

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const scanned   = useRef(0)
  const fileRef   = useRef<HTMLInputElement>(null)
  const demoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasSegments  = segments.length > 0
  const fullTranscript = segments.filter(s => !s.isDraft).map(s => `${s.speaker}: ${s.text}`).join('\n')

  // Risk scanning
  useEffect(() => {
    const finals = segments.filter(s => !s.isDraft)
    if (finals.length <= scanned.current) return
    const newSegs = finals.slice(scanned.current)
    scanned.current = finals.length
    for (const seg of newSegs) {
      const a = scanTranscriptUK(seg.text, seg.timestamp)
      if (a.length) setAlerts(prev => applyCoOccurrenceEscalation([...prev, ...a]))
    }
    setThemes(detectThemesUK(finals.map(s => s.text).join(' ')))
  }, [segments])

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a))
  }, [])

  const reset = () => {
    setSegments([]); setAlerts([]); setThemes([]); setStatus('Ready'); scanned.current = 0
    if (demoTimer.current) clearTimeout(demoTimer.current)
  }

  const startDemo = () => {
    reset(); setRecording(true); setStatus('Demo running…')
    let idx = 0
    const next = () => {
      if (idx >= UK_DEMO.length) { setStatus('Demo complete'); setRecording(false); return }
      const item = UK_DEMO[idx]
      const words = item.text.split(' ')
      let wi = 0
      const interval = setInterval(() => {
        const text = words.slice(0, wi + 1).join(' ')
        setSegments(prev => {
          const last = prev[prev.length - 1]
          if (last && last.speaker === item.speaker && last.isDraft) {
            return [...prev.slice(0, -1), { speaker: item.speaker, text, isDraft: wi < words.length - 1, timestamp: Date.now() }]
          }
          return [...prev, { speaker: item.speaker, text, isDraft: wi < words.length - 1, timestamp: Date.now() }]
        })
        wi++
        if (wi >= words.length) { clearInterval(interval); idx++; demoTimer.current = setTimeout(next, 1000) }
      }, 75)
    }
    setTimeout(next, 400)
  }

  const startLive = async () => {
    reset(); setStatus('Requesting microphone…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRef.current = mr
      const chunks: Blob[] = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        setStatus('Transcribing…')
        const form = new FormData()
        form.append('audio', new Blob(chunks, { type: 'audio/webm' }), 'session.webm')
        form.append('consentConfirmed', 'true')
        try {
          const res = await fetch('/api/audio/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (data.transcript) {
            const segs = data.transcript.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim()).map((text: string, i: number) => ({
              speaker: 'Speaker 0', text, isDraft: false, timestamp: Date.now() + i,
            }))
            setSegments(segs)
          }
          setStatus('Transcription complete')
        } catch { setStatus('Transcription failed — switch to demo') }
      }
      mr.start(5000); setRecording(true); setStatus('Recording…')
    } catch { setStatus('Microphone access denied') }
  }

  const stop = () => {
    if (mediaRef.current) { mediaRef.current.stop(); mediaRef.current.stream.getTracks().forEach(t => t.stop()); mediaRef.current = null }
    setRecording(false)
    if (mode === 'demo') { if (demoTimer.current) clearTimeout(demoTimer.current); setStatus('Demo complete') }
  }

  const handleStart = () => {
    if (patientId && !consent && mode !== 'demo') return
    if (mode === 'demo') startDemo()
    else startLive()
  }

  const handleFile = async (file: File) => {
    setUploading(true); setUploadErr(null); reset(); setStatus('Transcribing uploaded file…')
    const form = new FormData()
    form.append('audio', file); form.append('consentConfirmed', 'true')
    try {
      const res = await fetch('/api/audio/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Transcription failed')
      const segs = data.transcript.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim()).map((text: string, i: number) => ({
        speaker: 'Speaker 0', text, isDraft: false, timestamp: Date.now() + i,
      }))
      setSegments(segs); setStatus(`Transcribed — ${segs.length} segments`)
    } catch (e: any) { setUploadErr(e.message || 'Upload failed'); setStatus('Upload error') }
    finally { setUploading(false) }
  }

  const activeAlerts = alerts.filter(a => !a.dismissed)

  return (
    <div style={{ display: 'flex', width: '100%', overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

      {/* ── Left sidebar ── */}
      <div style={{ width: 208, flexShrink: 0, background: 'white', borderRight: '1px solid #E2DDD5', display: 'flex', flexDirection: 'column', padding: '12px 12px', gap: 10, overflow: 'hidden' }}>
        {/* Client */}
        <div>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 4 }}>Client</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1A1A1A' }}>{patientName || 'No client selected'}</p>
          <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: recording ? '#EF4444' : hasSegments ? '#4ADE80' : '#D1D5DB', animation: recording ? 'pulse 1.5s ease infinite' : 'none' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: recording ? '#EF4444' : hasSegments ? '#4ADE80' : '#9CA3AF' }}>{status}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #E2DDD5' }} />

        {/* Mode */}
        {!recording && !hasSegments && (
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: 5 }}>Mode</p>
            <div style={{ display: 'flex', background: '#F0EDE6', borderRadius: 9, padding: 3, gap: 2 }}>
              {(['demo', 'live', 'upload'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ flex: 1, padding: '6px 0', fontSize: '0.7rem', fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer', background: mode === m ? '#2D6A4F' : 'transparent', color: mode === m ? 'white' : '#9CA3AF', transition: 'all 0.15s', fontFamily: 'DM Sans, system-ui, sans-serif', textTransform: 'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GDPR notice */}
        <div style={{ background: '#F0EDE6', borderRadius: 10, padding: '9px 10px', fontSize: '0.7rem', color: '#6B7280', lineHeight: 1.55, flexShrink: 0 }}>
          <p style={{ fontWeight: 700, color: '#2D6A4F', marginBottom: 3 }}>UK-GDPR</p>
          Audio transcribed via Deepgram EU (London). Not stored by ORAII. Consent required under Article 9(2)(a).
        </div>

        {/* Consent */}
        {patientId && mode !== 'demo' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }}>
            <div onClick={() => setConsent(!consent)} style={{ width: 36, height: 20, borderRadius: 10, background: consent ? '#2D6A4F' : '#E2DDD5', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: consent ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#4A4744' }}>{consent ? 'Consent granted' : 'Consent required'}</span>
          </label>
        )}

        {/* Upload dropzone */}
        {mode === 'upload' && !recording && !hasSegments && (
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? '#2D6A4F' : '#E2DDD5'}`, borderRadius: 12, padding: '14px 8px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#D8EDDF' : '#F7F5F0', transition: 'all 0.15s', flexShrink: 0 }}>
            <SVG d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" size={18} color="#9CA3AF" />
            <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 5 }}>{uploading ? 'Transcribing…' : 'Drop audio or click'}</p>
            {uploadErr && <p style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: 4 }}>{uploadErr}</p>}
            <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
          {hasSegments && !recording && (
            <button onClick={reset} style={{ width: '100%', padding: '8px', border: '1px solid #E2DDD5', borderRadius: 20, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: 'transparent', color: '#6B7280', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              New session
            </button>
          )}
          {mode !== 'upload' && !hasSegments && (
            <button onClick={recording ? stop : handleStart}
              disabled={patientId && !consent && mode === 'live' && !recording ? true : false}
              style={{ width: '100%', padding: '10px', borderRadius: 20, fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: recording ? '#DC2626' : '#2D6A4F', color: 'white', opacity: (patientId && !consent && mode === 'live' && !recording) ? 0.5 : 1, transition: 'all 0.15s', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              <SVG d={recording ? 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'} size={14} color="white" />
              {recording ? 'End session' : mode === 'demo' ? 'Run demo' : 'Start session'}
            </button>
          )}
        </div>
      </div>

      {/* ── Centre: transcript + notes ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Transcript — top 40% */}
        <div style={{ height: '40%', flexShrink: 0, background: 'white', borderBottom: '1px solid #E2DDD5', display: 'flex', flexDirection: 'column', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #E2DDD5', flexShrink: 0 }}>
            <h3 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '0.9375rem', fontWeight: 700, color: '#1A1A1A' }}>Live Transcript</h3>
            <span style={{ background: '#D8EDDF', color: '#2D6A4F', borderRadius: 20, padding: '2px 8px', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diarisation</span>
            {segments.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#9CA3AF' }}>{segments.filter(s => !s.isDraft).length} segments</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {segments.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
                <SVG d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" size={28} color="#D1D5DB" />
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                  {mode === 'demo' ? 'Click "Run demo" to see a sample UK session transcript' : 'Start recording to see live transcript'}
                </p>
              </div>
            ) : <LiveTranscript segments={segments} />}
          </div>
        </div>

        {/* Notes — bottom 60% — alerts passed so risk flags are saved with session */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F7F5F0', padding: '18px 22px' }}>
          <NoteGenerator transcript={fullTranscript} patientId={patientId} patientName={patientName} alerts={alerts} />
        </div>
      </div>

      {/* ── Right: Copilot ── */}
      <div style={{ width: 300, flexShrink: 0, background: 'white', borderLeft: '1px solid #E2DDD5', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2DDD5', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* logoo.png — flex row container so no stretch issue, just height + width auto */}
          <img
            src="/logoo.png"
            alt="ORAII"
            style={{ height: 22, width: 'auto', display: 'block', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '0.875rem', fontWeight: 700, color: '#2D6A4F' }}>Copilot</p>
            <p style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>NICE framework · C-SSRS risk engine</p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <RiskAlertBanner alerts={alerts} onDismiss={dismissAlert} />

          {themes.length > 0 && (
            <div style={{ background: '#F7F5F0', border: '1px solid #E2DDD5', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 7 }}>Detected themes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {themes.map(t => (
                  <span key={t.id} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: t.color + '18', color: t.color }}>{t.label}</span>
                ))}
              </div>
            </div>
          )}

          {activeAlerts.length === 0 && themes.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 14px', gap: 10 }}>
              <SVG d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" size={36} color="#D8EDDF" />
              <p style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '0.9rem', fontWeight: 600, color: '#1A1A1A' }}>
                {recording ? 'Analysing session…' : 'Start a session to activate Copilot'}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                C-SSRS risk flags, safeguarding alerts, and clinical themes appear here in real time.
              </p>

              {/* UK crisis lines — always visible */}
              <div style={{ width: '100%', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 12px', textAlign: 'left', marginTop: 8 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#991B1B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>UK Crisis Lines</p>
                {[['Samaritans', '116 123', 'Free · 24/7'], ['NHS Mental Health', '111 opt 2', '24/7'], ['Crisis Text', 'SHOUT to 85258', 'Free · 24/7'], ['Emergency', '999', '']].map(([name, contact, note]) => (
                  <p key={name} style={{ fontSize: '0.75rem', color: '#B91C1C', marginBottom: 3 }}>
                    <strong>{name}:</strong> {contact} {note && <span style={{ color: '#F87171', fontSize: '0.65rem' }}>({note})</span>}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
