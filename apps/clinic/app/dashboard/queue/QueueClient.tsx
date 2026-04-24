'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { acknowledgeTriageFlag, resolveTriageFlag, type TriageFlagRow } from '../../actions'
import { severityColors, severityLabel, type TriageSeverity } from '@oraii/core/triage'

interface Counts { red: number; amber: number; green: number; total: number }

function Ico({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)    return 'just now'
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function sourceLabel(src: string): string {
  switch (src) {
    case 'outcome_scores': return 'Self-assessment'
    case 'chat_session':   return 'Chat'
    case 'safety_plan':    return 'Safety plan'
    case 'journal':        return 'Journal'
    case 'manual':         return 'Manual'
    case 'system':         return 'System'
    default:               return src
  }
}

export function QueueClient({
  initialFlags,
  counts,
  includeResolved,
}: {
  initialFlags: TriageFlagRow[]
  counts: Counts
  includeResolved: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<'all' | 'red' | 'amber' | 'green'>('all')
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const visible = filter === 'all'
    ? initialFlags
    : initialFlags.filter(f => f.severity === filter)

  async function onAcknowledge(id: string) {
    setBusyId(id)
    await acknowledgeTriageFlag(id)
    setBusyId(null)
    startTransition(() => router.refresh())
  }

  async function onResolve(id: string) {
    setBusyId(id)
    await resolveTriageFlag(id, resolutionNote)
    setBusyId(null)
    setResolving(null)
    setResolutionNote('')
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.875rem', fontWeight: 600, color: '#1A1816', margin: 0 }}>
              Triage Queue
            </h1>
            <p style={{ marginTop: 4, fontSize: '0.875rem', color: '#6F6A64' }}>
              Red / amber flags raised by patient activity — reviewed here, resolved against the record.
            </p>
          </div>
          <Link
            href={includeResolved ? '/dashboard/queue' : '/dashboard/queue?show=all'}
            style={{
              fontSize: '0.8rem', color: '#2D6A4F', fontWeight: 500, textDecoration: 'none',
              padding: '7px 14px', border: '0.5px solid #C7DED0', borderRadius: 8, background: '#fff',
            }}
          >
            {includeResolved ? 'Hide resolved' : 'Show resolved'}
          </Link>
        </div>
      </div>

      {/* ═══ SEVERITY FILTERS ═══ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <FilterChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All open"
          count={counts.total}
          color="#4A4744"
        />
        <FilterChip
          active={filter === 'red'}
          onClick={() => setFilter('red')}
          label="Urgent"
          count={counts.red}
          color="#DC2626"
        />
        <FilterChip
          active={filter === 'amber'}
          onClick={() => setFilter('amber')}
          label="Review"
          count={counts.amber}
          color="#F59E0B"
        />
        <FilterChip
          active={filter === 'green'}
          onClick={() => setFilter('green')}
          label="Stable"
          count={counts.green}
          color="#22C55E"
        />
      </div>

      {/* ═══ QUEUE ═══ */}
      {visible.length === 0 ? (
        <EmptyState filter={filter} includeResolved={includeResolved} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(flag => (
            <FlagCard
              key={flag.id}
              flag={flag}
              busy={busyId === flag.id || pending}
              resolvingOpen={resolving === flag.id}
              resolutionNote={resolutionNote}
              onResolutionNoteChange={setResolutionNote}
              onAcknowledge={() => onAcknowledge(flag.id)}
              onStartResolve={() => { setResolving(flag.id); setResolutionNote('') }}
              onCancelResolve={() => { setResolving(null); setResolutionNote('') }}
              onConfirmResolve={() => onResolve(flag.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────
function FilterChip({
  active, onClick, label, count, color,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 20,
        border: active ? `1px solid ${color}` : '0.5px solid #E2DDD5',
        background: active ? `${color}15` : '#fff',
        color: active ? color : '#4A4744',
        fontSize: '0.8rem', fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {label}
      <span style={{ fontWeight: 700, opacity: 0.85 }}>{count}</span>
    </button>
  )
}

// ─── Flag card ────────────────────────────────────────────────────────
function FlagCard({
  flag, busy, resolvingOpen, resolutionNote,
  onResolutionNoteChange, onAcknowledge, onStartResolve, onCancelResolve, onConfirmResolve,
}: {
  flag: TriageFlagRow
  busy: boolean
  resolvingOpen: boolean
  resolutionNote: string
  onResolutionNoteChange: (v: string) => void
  onAcknowledge: () => void
  onStartResolve: () => void
  onCancelResolve: () => void
  onConfirmResolve: () => void
}) {
  const c = severityColors(flag.severity as TriageSeverity)
  const isResolved     = flag.status === 'resolved'
  const isAcknowledged = flag.status === 'acknowledged'

  return (
    <div
      style={{
        background: '#fff',
        border: `0.5px solid ${isResolved ? '#E2DDD5' : c.border}`,
        borderLeft: isResolved ? '0.5px solid #E2DDD5' : `3px solid ${c.dot}`,
        borderRadius: 10,
        padding: '14px 18px',
        opacity: isResolved ? 0.6 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Severity pill */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 9px', borderRadius: 20,
          background: c.bg, color: c.text,
          border: `0.5px solid ${c.border}`,
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
          {severityLabel(flag.severity as TriageSeverity)}
        </span>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href={`/dashboard/clients/${flag.patient_id}`}
              style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1A1816', textDecoration: 'none' }}
            >
              {flag.patient_label}
            </Link>
            <span style={{ fontSize: '0.75rem', color: '#8B8680' }}>
              · {sourceLabel(flag.trigger_source)} · {timeAgo(flag.created_at)}
            </span>
            {isAcknowledged && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, color: '#6F6A64',
                padding: '2px 7px', borderRadius: 10, background: '#F3F1EC',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Acknowledged
              </span>
            )}
            {isResolved && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, color: '#166534',
                padding: '2px 7px', borderRadius: 10, background: '#F0FDF4',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Resolved
              </span>
            )}
          </div>

          <p style={{ marginTop: 4, marginBottom: 0, fontSize: '0.875rem', color: '#3A3633', lineHeight: 1.5 }}>
            {flag.summary}
          </p>

          {flag.resolution_note && (
            <p style={{
              marginTop: 8, padding: '8px 12px',
              background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: 6,
              fontSize: '0.8rem', color: '#166534', fontStyle: 'italic',
            }}>
              Resolution: {flag.resolution_note}
            </p>
          )}
        </div>

        {/* Actions */}
        {!isResolved && (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!isAcknowledged && (
              <button
                onClick={onAcknowledge}
                disabled={busy}
                title="Mark as seen — stays in queue"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 11px', borderRadius: 7,
                  border: '0.5px solid #E2DDD5', background: '#fff',
                  fontSize: '0.75rem', fontWeight: 500, color: '#4A4744',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                <Ico d="M5 13l4 4L19 7" size={13} />
                Acknowledge
              </button>
            )}
            <button
              onClick={onStartResolve}
              disabled={busy}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 11px', borderRadius: 7,
                background: '#2D6A4F', color: '#fff', border: '0.5px solid #2D6A4F',
                fontSize: '0.75rem', fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Resolve
            </button>
          </div>
        )}
      </div>

      {/* Inline resolve form */}
      {resolvingOpen && !isResolved && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px dashed #E2DDD5' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6F6A64', marginBottom: 6 }}>
            Resolution note (optional)
          </label>
          <textarea
            value={resolutionNote}
            onChange={e => onResolutionNoteChange(e.target.value)}
            placeholder="e.g. Called patient, confirmed safe, safety plan reviewed. Next contact: Monday."
            rows={2}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 7,
              border: '0.5px solid #E2DDD5', fontSize: '0.825rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancelResolve}
              disabled={busy}
              style={{
                padding: '6px 14px', borderRadius: 7,
                border: '0.5px solid #E2DDD5', background: '#fff',
                fontSize: '0.8rem', color: '#4A4744', cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirmResolve}
              disabled={busy}
              style={{
                padding: '6px 14px', borderRadius: 7,
                background: '#2D6A4F', color: '#fff', border: '0.5px solid #2D6A4F',
                fontSize: '0.8rem', fontWeight: 600,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {busy ? 'Resolving...' : 'Confirm resolve'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyState({ filter, includeResolved }: { filter: string; includeResolved: boolean }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px dashed #E2DDD5', borderRadius: 12,
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, margin: '0 auto 14px',
        borderRadius: 22, background: '#F0FDF4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1A1816', margin: '0 0 4px' }}>
        {filter === 'all' ? 'Queue is clear' : `No ${filter} flags`}
      </p>
      <p style={{ fontSize: '0.825rem', color: '#6F6A64', margin: 0 }}>
        {includeResolved
          ? 'Nothing matches the current filter.'
          : 'Flags will appear here when patient self-assessments, chat activity, or safety events cross clinical thresholds.'}
      </p>
    </div>
  )
}
