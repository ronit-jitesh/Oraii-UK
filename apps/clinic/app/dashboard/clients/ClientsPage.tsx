'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AddClientModal from './AddClientModal'

interface Client { id: string; name: string; status: string; createdAt: string }

const PALETTE = [
  { bg: '#D8EDDF', text: '#1B4332' }, { bg: '#DBEAFE', text: '#1E3A8A' },
  { bg: '#EDE9FE', text: '#4C1D95' }, { bg: '#FCE7F3', text: '#831843' },
  { bg: '#FEF3C7', text: '#78350F' }, { bg: '#D1FAE5', text: '#064E3B' },
]
const av = (n: string) => PALETTE[(n || 'A').charCodeAt(0) % 6]

export default function ClientsPage({ clients: initial }: { clients: Client[] }) {
  const router = useRouter()
  const [clients, setClients]     = useState<Client[]>(initial)
  const [showModal, setShowModal] = useState(false)

  const handleAdded = (client: Client) => {
    setClients(prev => [client, ...prev])
  }

  return (
    <div style={{ padding: '2rem 2.5rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '1.5rem', fontWeight: 700, color: '#1A1816', letterSpacing: '-0.02em', marginBottom: 5 }}>
            Clients
          </h1>
          <p style={{ color: '#8B8680', fontSize: '0.9rem' }}>
            All pseudonymous client records · {clients.length} total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add client
        </button>
      </div>

      {clients.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, padding: '4rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#F0EDE6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '0.5px solid #E2DDD5' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B8B3AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1816', marginBottom: 6 }}>No clients yet</p>
          <p style={{ color: '#8B8680', fontSize: '0.875rem', marginBottom: 20 }}>Add your first client to get started</p>
          <button onClick={() => setShowModal(true)} style={{ background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Add first client
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {clients.map((c) => {
            const ac = av(c.name)
            const isActive = c.status === 'active'
            return <ClientCard key={c.id} client={c} ac={ac} isActive={isActive} onOpen={() => router.push(`/dashboard/clients/${c.id}`)} onStart={() => router.push(`/session/${c.id}`)} />
          })}
        </div>
      )}

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onAdded={handleAdded} />}
    </div>
  )
}

function ClientCard({ client: c, ac, isActive, onOpen, onStart }: {
  client: Client; ac: { bg: string; text: string }; isActive: boolean
  onOpen: () => void; onStart: () => void
}) {
  return (
    <div
      style={{ background: '#fff', border: '0.5px solid #E2DDD5', borderRadius: 18, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 14, transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer' }}
      onClick={onOpen}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.0625rem', fontFamily: 'Lora, Georgia, serif' }}>
          {(c.name || 'A')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1A1816', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
          <p style={{ fontSize: '0.775rem', color: '#8B8680', marginTop: 2 }}>
            Added {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0, background: isActive ? '#D8EDDF' : '#FEF3C7', color: isActive ? '#1B4332' : '#92400E' }}>
          {c.status}
        </span>
      </div>

      <div style={{ height: '0.5px', background: '#F0EDE6' }} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={e => { e.stopPropagation(); onOpen() }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#F7F5F0', color: '#4A4744', border: '0.5px solid #E2DDD5', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F0EDE6'}
          onMouseLeave={e => e.currentTarget.style.background = '#F7F5F0'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View profile
        </button>
        <button onClick={e => { e.stopPropagation(); onStart() }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1B4332'}
          onMouseLeave={e => e.currentTarget.style.background = '#2D6A4F'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
          Start session
        </button>
      </div>
    </div>
  )
}
