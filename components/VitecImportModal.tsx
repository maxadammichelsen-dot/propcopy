'use client'

import { useEffect, useState } from 'react'
import { VitecEstate } from '@/types'

interface VitecImportModalProps {
  onClose: () => void
  onImported: (objectId: string) => void
}

export default function VitecImportModal({ onClose, onImported }: VitecImportModalProps) {
  const [estates, setEstates]   = useState<VitecEstate[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [importing, setImporting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vitec/estates')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setEstates(d.estates ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Nätverksfel'); setLoading(false) })
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleImport(vitec_id: string, base_type: string) {
    setImporting(vitec_id)
    try {
      const res = await fetch('/api/vitec/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vitec_id, base_type }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      onImported(d.object.id)
    } finally {
      setImporting(null)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,10,9,0.24)',
          zIndex: 60,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '80vh',
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Importera från Vitec
            </p>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', marginTop: '2px' }}>
              Välj objekt att importera
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'none',
              color: 'var(--mute)',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse" style={{ height: '56px', background: 'var(--tint)', borderRadius: '8px' }} />
              ))}
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: '24px 20px' }}>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--accent)', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && estates.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute-2)' }}>
                Inga aktiva objekt hittades i Vitec
              </p>
            </div>
          )}

          {!loading && estates.length > 0 && (
            <div>
              {estates.map(estate => (
                <div
                  key={estate.vitecId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--line)',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {estate.address}
                    </p>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', marginTop: '2px' }}>
                      {estate.area} · {estate.type} · {estate.size} kvm
                      {estate.price > 0 && ` · ${new Intl.NumberFormat('sv-SE').format(estate.price)} kr`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleImport(estate.vitecId, estate.baseType)}
                    disabled={importing === estate.vitecId}
                    style={{
                      flexShrink: 0,
                      padding: '6px 12px',
                      background: 'var(--ink)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: importing === estate.vitecId ? 'default' : 'pointer',
                      opacity: importing === estate.vitecId ? 0.5 : 1,
                      fontFamily: 'inherit',
                      letterSpacing: '-0.005em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {importing === estate.vitecId ? 'Importerar…' : 'Importera →'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
