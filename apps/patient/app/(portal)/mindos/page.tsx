'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getMindOSProgress, saveMindOSSession } from '../../actions'

// ── Session data ───────────────────────────────────────────────────
const SESSIONS = [
  { id: 'morning-calm',  title: 'Morning calm',      durationMin: 10, desc: 'Gentle tones to start your day settled and grounded',        cat: 'Relaxation', icon: '☀', baseHz: 200, beatHz: 10, xp: 30, unlockAt: 0 },
  { id: 'ground-breath', title: 'Grounding breath',   durationMin: 5,  desc: 'A short breathing exercise to feel present and calm',        cat: 'Breathing',  icon: '◇', baseHz: 150, beatHz: 6,  xp: 15, unlockAt: 0 },
  { id: 'focus-flow',    title: 'Focus flow',          durationMin: 25, desc: 'Background tones to support concentration and clarity',      cat: 'Focus',      icon: '◎', baseHz: 250, beatHz: 40, xp: 75, unlockAt: 0 },
  { id: 'evening-wind',  title: 'Evening wind-down',   durationMin: 15, desc: 'Ease your transition to rest at the end of the day',         cat: 'Relaxation', icon: '◑', baseHz: 180, beatHz: 4,  xp: 45, unlockAt: 50 },
  { id: 'clarity-boost', title: 'Clarity boost',       durationMin: 12, desc: 'Uplifting tones to support an energised and focused feeling',cat: 'Focus',      icon: '◈', baseHz: 220, beatHz: 30, xp: 35, unlockAt: 100 },
  { id: 'deep-rest',     title: 'Deep rest',           durationMin: 30, desc: 'Extended relaxation audio for rest periods or before sleep', cat: 'Relaxation', icon: '◐', baseHz: 160, beatHz: 2,  xp: 90, unlockAt: 150 },
  { id: 'ocean-drift',   title: 'Ocean drift',         durationMin: 20, desc: 'Drift into a calm oceanic headspace with delta waves',      cat: 'Relaxation', icon: '🌊', baseHz: 140, beatHz: 3,  xp: 60, unlockAt: 250 },
  { id: 'peak-focus',    title: 'Peak performance',    durationMin: 35, desc: 'Sustained gamma-range tones for deep work sessions',        cat: 'Focus',      icon: '⚡', baseHz: 280, beatHz: 40, xp: 100, unlockAt: 400 },
]

const CAT_COLORS: Record<string, { text: string; bg: string; glow: string }> = {
  Relaxation: { text: '#2D6A4F', bg: '#D8EDDF', glow: 'rgba(45,106,79,0.15)' },
  Focus:      { text: '#1D4ED8', bg: '#DBEAFE', glow: 'rgba(29,78,216,0.15)' },
  Breathing:  { text: '#92400E', bg: '#FEF3C7', glow: 'rgba(146,64,14,0.15)' },
}

const LEVELS = [
  { name: 'Seedling',  emoji: '🌱', minXP: 0 },
  { name: 'Sprout',    emoji: '🌿', minXP: 100 },
  { name: 'Bloom',     emoji: '🌸', minXP: 250 },
  { name: 'Tree',      emoji: '🌳', minXP: 500 },
  { name: 'Forest',    emoji: '🏔', minXP: 1000 },
  { name: 'Cosmos',    emoji: '✨', minXP: 2000 },
]

function getLevel(xp: number) {
  let lvl = LEVELS[0]!
  for (const l of LEVELS) { if (xp >= l.minXP) lvl = l }
  const idx = LEVELS.indexOf(lvl)
  const next = LEVELS[idx + 1]
  const progress = next ? (xp - lvl.minXP) / (next.minXP - lvl.minXP) : 1
  return { ...lvl, idx: idx + 1, progress, nextXP: next?.minXP ?? lvl.minXP }
}

// ── Binaural beat audio engine ─────────────────────────────────────
function useBinauralAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{
    osc1: OscillatorNode; osc2: OscillatorNode;
    gain: GainNode; noiseGain: GainNode;
    noise: AudioBufferSourceNode;
  } | null>(null)
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hard-kill any existing audio immediately (no fade)
  const killAudio = useCallback(() => {
    if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null }
    if (nodesRef.current) {
      try { nodesRef.current.osc1.stop() } catch {}
      try { nodesRef.current.osc2.stop() } catch {}
      try { nodesRef.current.noise.stop() } catch {}
      nodesRef.current = null
    }
    if (ctxRef.current) {
      try { ctxRef.current.close() } catch {}
      ctxRef.current = null
    }
  }, [])

  const start = useCallback((baseHz: number, beatHz: number, volume = 0.6) => {
    // Kill any previous audio immediately to avoid race conditions
    killAudio()

    const ctx = new AudioContext()
    ctxRef.current = ctx

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume()

    // ── Binaural oscillators ──
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.value = baseHz
    osc2.frequency.value = baseHz + beatHz

    // Stereo split — left ear / right ear
    const panL = ctx.createStereoPanner()
    const panR = ctx.createStereoPanner()
    panL.pan.value = -1
    panR.pan.value = 1

    // Oscillator gains (louder than noise)
    const oscGain = ctx.createGain()
    oscGain.gain.value = 0.7

    osc1.connect(panL).connect(oscGain)
    osc2.connect(panR).connect(oscGain)

    // ── Ambient brown noise layer ──
    const noiseLen = ctx.sampleRate * 4
    const noiseBuf = ctx.createBuffer(2, noiseLen, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < noiseLen; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    }
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.35

    noise.connect(noiseGain)

    // ── Master output with fade-in ──
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5)

    oscGain.connect(gain)
    noiseGain.connect(gain)
    gain.connect(ctx.destination)

    osc1.start()
    osc2.start()
    noise.start()

    nodesRef.current = { osc1, osc2, gain, noiseGain, noise }
  }, [killAudio])

  const stop = useCallback(() => {
    if (nodesRef.current && ctxRef.current) {
      const nodes = nodesRef.current
      const ctx = ctxRef.current
      // Fade out over 1s, then clean up
      nodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1)
      stopTimeoutRef.current = setTimeout(() => {
        try { nodes.osc1.stop() } catch {}
        try { nodes.osc2.stop() } catch {}
        try { nodes.noise.stop() } catch {}
        try { ctx.close() } catch {}
        if (nodesRef.current === nodes) nodesRef.current = null
        if (ctxRef.current === ctx) ctxRef.current = null
        stopTimeoutRef.current = null
      }, 1100)
    }
  }, [])

  const setVolume = useCallback((v: number) => {
    if (nodesRef.current && ctxRef.current) {
      nodesRef.current.gain.gain.linearRampToValueAtTime(v, ctxRef.current.currentTime + 0.2)
    }
  }, [])

  useEffect(() => () => { killAudio() }, [killAudio])

  return { start, stop, setVolume }
}

// ── Component ──────────────────────────────────────────────────────
export default function MindOSPage() {
  const [playing, setPlaying]     = useState<string | null>(null)
  const [filter, setFilter]       = useState('All')
  const [progress, setProgress]   = useState<{ sessions: any[]; totalMinutes: number; totalXP: number; level: number }>({ sessions: [], totalMinutes: 0, totalXP: 0, level: 1 })
  const [timer, setTimer]         = useState(0)
  const [volume, setVolumeState]  = useState(0.6)
  const [completed, setCompleted] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audio = useBinauralAudio()

  useEffect(() => {
    getMindOSProgress().then(setProgress).catch(() => {})
  }, [])

  const handleComplete = async (session: typeof SESSIONS[0]) => {
    setPlaying(null)
    setCompleted(session.id)
    setSaving(true)
    await saveMindOSSession({
      sessionId: session.id,
      title: session.title,
      duration: session.durationMin,
      xp: session.xp,
      category: session.cat,
    })
    const updated = await getMindOSProgress()
    setProgress(updated)
    setSaving(false)
  }

  // Keep handleComplete in a ref so the interval closure is never stale
  const handleCompleteRef = useRef(handleComplete)
  useEffect(() => { handleCompleteRef.current = handleComplete })

  // Timer tick
  useEffect(() => {
    if (playing) {
      const session = SESSIONS.find(s => s.id === playing)
      if (!session) return
      const totalSec = session.durationMin * 60
      setTimer(totalSec)
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            audio.stop()
            // Call via ref — never a stale closure
            handleCompleteRef.current(session)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const startSession = (session: typeof SESSIONS[0]) => {
    if (playing === session.id) {
      // Stop
      audio.stop()
      setPlaying(null)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    setCompleted(null)
    audio.start(session.baseHz, session.beatHz, volume)
    setPlaying(session.id)
  }

  const handleVolume = (v: number) => {
    setVolumeState(v)
    audio.setVolume(v)
  }

  const categories = ['All', 'Relaxation', 'Focus', 'Breathing']
  const filtered = filter === 'All' ? SESSIONS : SESSIONS.filter(s => s.cat === filter)
  const level = getLevel(progress.totalXP)
  const completedIds = new Set(progress.sessions.map((s: any) => s.sessionId))

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Count today's sessions
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = progress.sessions.filter((s: any) => s.created_at?.startsWith(today)).length

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="anim-fade-up">
        <h1 className="portal-page-title">MindOS</h1>
        <p className="portal-page-sub">
          Binaural beats and ambient sounds for your wellbeing.
        </p>
      </div>

      {/* Stats bar */}
      <div className="anim-fade-up d1" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10, marginBottom: '1.25rem',
      }}>
        {[
          { label: 'Level', value: `${level.emoji} ${level.name}`, sub: `${progress.totalXP} XP` },
          { label: 'Minutes', value: `${progress.totalMinutes}`, sub: 'total listened' },
          { label: 'Today', value: `${todaySessions}`, sub: todaySessions === 1 ? 'session' : 'sessions' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '0.5px solid var(--border)',
            borderRadius: 14, padding: '12px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* XP progress bar */}
      <div className="anim-fade-up d1" style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 14, padding: '12px 16px', marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)' }}>
            {level.emoji} Level {level.idx}: {level.name}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            {progress.totalXP} / {level.nextXP} XP
          </span>
        </div>
        <div style={{ height: 8, background: '#F0EDE6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${Math.min(level.progress * 100, 100)}%`,
            background: 'linear-gradient(90deg, #74C69D, #2D6A4F)',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="anim-fade-up d1" style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 12, padding: '0.75rem 1rem',
        fontSize: '0.72rem', color: 'var(--muted)',
        marginBottom: '1.25rem', lineHeight: 1.5,
      }}>
        🎧 Use headphones for the best binaural beat experience. MindOS is a wellness tool, not a medical device.
      </div>

      {/* Completion celebration */}
      {completed && (
        <div className="anim-fade-in" style={{
          background: 'linear-gradient(145deg, #D8EDDF, #74C69D22)',
          border: '1px solid rgba(45,106,79,0.25)',
          borderRadius: 16, padding: '1.25rem',
          marginBottom: '1.25rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Session complete!
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--primary-dk)', marginBottom: 8 }}>
            +{SESSIONS.find(s => s.id === completed)?.xp || 0} XP earned
          </div>
          <button onClick={() => setCompleted(null)} style={{
            background: 'var(--primary)', color: 'white', border: 'none',
            borderRadius: 10, padding: '0.5rem 1.25rem', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="anim-fade-up d2" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '0.375rem 1rem', borderRadius: 20,
              fontSize: '0.8rem', fontWeight: filter === c ? 600 : 400,
              color: filter === c ? 'var(--primary-dk)' : 'var(--muted)',
              background: filter === c ? 'var(--light)' : 'var(--surface)',
              border: `0.5px solid ${filter === c ? 'rgba(45,106,79,0.3)' : 'var(--border)'}`,
              cursor: 'pointer', transition: 'all 0.15s ease',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Now playing banner */}
      {playing && (
        <div className="anim-fade-in" style={{
          background: 'var(--primary)', borderRadius: 16,
          padding: '1rem 1.125rem', marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 22 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2,
                    background: 'rgba(255,255,255,0.8)',
                    height: `${[12, 18, 10, 20, 14][i]}px`,
                    animation: `wave ${0.6 + i * 0.1}s ease infinite alternate`,
                  }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                  {SESSIONS.find(s => s.id === playing)?.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                  {fmtTime(timer)} remaining
                </div>
              </div>
            </div>
            <button
              onClick={() => { audio.stop(); setPlaying(null); if (timerRef.current) clearInterval(timerRef.current) }}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '0.375rem 0.875rem', color: 'white', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              Stop
            </button>
          </div>

          {/* Timer progress bar */}
          {(() => {
            const session = SESSIONS.find(s => s.id === playing)
            const total = (session?.durationMin || 1) * 60
            const pct = ((total - timer) / total) * 100
            return (
              <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', background: 'rgba(255,255,255,0.7)', borderRadius: 2, width: `${pct}%`, transition: 'width 1s linear' }} />
              </div>
            )
          })()}

          {/* Volume slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>🔈</span>
            <input type="range" min="0" max="100" value={Math.round(volume * 100)}
              onChange={e => handleVolume(Number(e.target.value) / 100)}
              style={{ flex: 1, accentColor: 'white', height: 4 }}
            />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>🔊</span>
          </div>
        </div>
      )}

      {/* Session cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map((s, i) => {
          const isPlaying = playing === s.id
          const cat = CAT_COLORS[s.cat]!
          const isLocked = progress.totalXP < s.unlockAt
          const isDone = completedIds.has(s.id)

          return (
            <div
              key={s.id}
              className={`anim-fade-up d${i + 3} mindos-card`}
              style={{
                border: isPlaying ? '1px solid var(--primary)' : undefined,
                opacity: isLocked ? 0.55 : 1,
                position: 'relative',
                cursor: isLocked ? 'default' : 'pointer',
              }}
              onClick={() => !isLocked && startSession(s)}
            >
              {/* Lock overlay */}
              {isLocked && (
                <div style={{
                  position: 'absolute', top: 10, right: 12,
                  fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted)',
                  background: '#F0EDE6', borderRadius: 8, padding: '2px 8px',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  🔒 {s.unlockAt} XP
                </div>
              )}

              {/* Done badge */}
              {isDone && !isLocked && (
                <div style={{
                  position: 'absolute', top: 10, right: 12,
                  fontSize: '0.6rem', fontWeight: 600, color: '#059669',
                  background: '#D1FAE5', borderRadius: 8, padding: '2px 8px',
                }}>
                  ✓ Done
                </div>
              )}

              <div className="mindos-icon" style={{ background: s.cat === 'Focus' ? '#EBF0F5' : s.cat === 'Breathing' ? '#FEF9EE' : '#EBF5F0' }}>
                {s.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>{s.title}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 10, background: cat.bg, color: cat.text }}>
                    {s.cat}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.4, marginBottom: '0.375rem' }}>{s.desc}</div>
                <div style={{ display: 'flex', gap: '0.875rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>⏱ {s.durationMin} min</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>∿ {s.beatHz} Hz</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#2D6A4F' }}>+{s.xp} XP</span>
                </div>
              </div>

              {!isLocked && (
                <button
                  type="button"
                  className="play-btn"
                  style={{ background: isPlaying ? 'var(--primary)' : undefined }}
                  aria-label={isPlaying ? `Pause ${s.title}` : `Play ${s.title}`}
                  onClick={e => { e.stopPropagation(); startSession(s) }}
                >
                  {isPlaying ? (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <rect x="1" y="1" width="4" height="12" rx="1" fill="white"/>
                      <rect x="7" y="1" width="4" height="12" rx="1" fill="white"/>
                    </svg>
                  ) : (
                    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                      <path d="M1 1L11 7L1 13V1Z" fill="var(--primary)"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* History section */}
      {progress.sessions.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            Recent sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {progress.sessions.slice(0, 5).map((s: any, i: number) => (
              <div key={i} style={{
                background: 'var(--surface)', border: '0.5px solid var(--border)',
                borderRadius: 12, padding: '10px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{s.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    {s.duration} min · {s.category} · {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2D6A4F' }}>+{s.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  )
}
