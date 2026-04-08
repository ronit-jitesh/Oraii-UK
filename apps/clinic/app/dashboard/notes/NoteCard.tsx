'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import GPLetterModal from './GPLetterModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Note {
  id: string; date: string; format: string; content: any
  aiGenerated: boolean; reviewed: boolean; patientName: string; patientId?: string
}

export default function NoteCard({ note }: { note: Note }) {
  const [hover, setHover]             = useState(false)
  const [expanded, setExpanded]       = useState(false)
  const [editing, setEditing]         = useState(false)
  const [editContent, setEditContent] = useState(typeof note.content === 'string' ? note.content : '')
  const [reviewed, setReviewed]       = useState(note.reviewed)
  const [saving, setSaving]           = useState(false)
  const [showGP, setShowGP]           = useState(false)

  const isPending  = note.aiGenerated && !reviewed
  const isApproved = reviewed

  const handleApprove = async () => {
    setSaving(true)
    try {
      const content = editing ? editContent : (typeof note.content === 'string' ? note.content : '')
      await supabase.from('clinical_notes').update({
        therapist_reviewed: true,
        therapist_reviewed_at: new Date().toISOString(),
        content: content,
      }).eq('id', note.id)
      setReviewed(true)
      setEditing(false)
    } catch (e) { /* silent */ }
    finally { setSaving(false) }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await supabase.from('clinical_notes').update({ content: editContent }).eq('id', note.id)
      setEditing(false)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const contentStr = typeof note.content === 'string' ? note.content : JSON.stringify(note.content, null, 2)
  const preview = contentStr.slice(0, 280) + (contentStr.length > 280 ? '…' : '')

  return (
    <>
      <div
        style={{ background: '#fff', border: `0.5px solid ${isPending ? '#FDE68A' : isApproved ? '#6EE7B7' : '#E2DDD5'}`, borderRadius: 16, overflow: 'hidden', boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: isPending ? '#FFFDF5' : isApproved ? '#F0FDF4' : '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D8EDDF', color: '#1B4332', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
              {(note.patientName || 'A')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1A1816' }}>{note.patientName}</p>
              <p style={{ fontSize: '0.775rem', color: '#8B8680', marginTop: 1 }}>
                {new Date(note.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#D8EDDF', color: '#1B4332' }}>{note.format || 'SOAP'}</span>
            {note.aiGenerated && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#EDE9FE', color: '#4C1D95' }}>AI generated</span>}
            {isPending && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#FEF3C7', color: '#92400E' }}>AWAITING REVIEW</span>}
            {isApproved && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: '#ECFDF5', color: '#065F46' }}>✓ APPROVED</span>}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '14px 20px' }}>
          {editing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={10}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #2D6A4F', fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif', color: '#1A1816', background: '#F7F5F0', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.65 }}
            />
          ) : (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#4A4744', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {expanded ? contentStr : preview}
              </p>
              {contentStr.length > 280 && (
                <button onClick={() => setExpanded(!expanded)}
                  style={{ marginTop: 8, fontSize: '0.78rem', color: '#2D6A4F', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600 }}>
                  {expanded ? 'Show less ↑' : 'Show full note ↓'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #F0EDE6', display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAF8' }}>
          {!isApproved && !editing && (
            <button onClick={() => setEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 9, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ padding: '8px 14px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
                {saving ? 'Saving...' : 'Save edits'}
              </button>
              <button onClick={() => { setEditing(false); setEditContent(contentStr) }}
                style={{ padding: '8px 14px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 9, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
                Cancel
              </button>
            </>
          )}
          {!isApproved && (
            <button onClick={handleApprove} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#ECFDF5', color: '#065F46', border: '0.5px solid #6EE7B7', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
              {saving ? 'Approving...' : 'Approve as clinical record'}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowGP(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#EFF6FF', color: '#1E40AF', border: '0.5px solid #BFDBFE', borderRadius: 9, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            GP letter
          </button>
        </div>
      </div>

      {showGP && (
        <GPLetterModal
          note={{ id: note.id, patientName: note.patientName, patientId: note.patientId || '', date: note.date, content: contentStr, format: note.format }}
          onClose={() => setShowGP(false)}
        />
      )}
    </>
  )
}
