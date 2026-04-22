'use client'

import { useState } from 'react'
import { Agency, PropertyObject } from '@/types'
import VitecImportModal from './VitecImportModal'

interface SidebarProps {
  objects: PropertyObject[]
  selectedId: string | null
  currentView: string
  agency: Agency | null
  onSelect: (id: string) => void
  onNewObject: () => void
  onTone: () => void
  onHome: () => void
  onCompetition: () => void
  onProspects: () => void
  onFollowup: () => void
}

const STATUS_DOT: Record<string, string> = {
  draft:  'var(--line-2)',
  active: 'var(--accent)',
  sold:   'var(--mute-2)',
}

export default function Sidebar({
  objects,
  selectedId,
  currentView,
  agency,
  onSelect,
  onNewObject,
  onTone,
}: SidebarProps) {
  const [vitecOpen, setVitecOpen] = useState(false)
  const hasVitec = !!(agency?.vitec_api_key && agency?.vitec_customer_id)

  return (
    <aside
      style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        overflowY: 'hidden',
      }}
    >
      {/* New object */}
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={onNewObject}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            borderRadius: '6px',
            background: 'var(--ink)',
            color: '#fff',
            fontSize: '12.5px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '-0.005em',
          }}
        >
          <span>Nytt objekt</span>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '14px', lineHeight: 1 }}>+</span>
        </button>
        {hasVitec && (
          <button
            onClick={() => setVitecOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'none',
              color: 'var(--ink-2)',
              fontSize: '12px',
              fontWeight: 400,
              border: '1px solid var(--line)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.005em',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <span>Importera från Vitec</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>→</span>
          </button>
        )}
      </div>

      {/* Column headers */}
      <div
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Adress</span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>d</span>
      </div>

      {/* Object list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {objects.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute-2)', lineHeight: 1.5 }}>
              Inga objekt ännu
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {objects.map((obj, i) => {
              const isActive = selectedId === obj.id && currentView === 'detail'
              const daysOnMarket = Math.floor(
                (Date.now() - new Date(obj.created_at).getTime()) / 86_400_000
              )
              return (
                <li key={obj.id}>
                  <button
                    onClick={() => onSelect(obj.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '8px',
                      alignItems: 'center',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                      fontWeight: isActive ? 500 : 400,
                      background: isActive ? 'var(--tint)' : 'none',
                      border: 'none',
                      boxShadow: 'inset 0 -1px 0 var(--line)',
                      transition: 'background 0.1s',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--tint)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
                  >
                    {/* Status dot */}
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: STATUS_DOT[obj.status],
                        flexShrink: 0,
                      }}
                    />

                    {/* Address */}
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: isActive ? 500 : 400,
                          color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.3,
                        }}
                      >
                        {obj.address}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: '10px',
                          color: 'var(--mute)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '1px',
                        }}
                      >
                        {obj.area}
                      </p>
                    </div>

                    {/* Days */}
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '11px',
                        color: 'var(--mute)',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {daysOnMarket}d
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Tone footer */}
      <div style={{ borderTop: '1px solid var(--line)', padding: '8px' }}>
        <button
          onClick={onTone}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
        >
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              color: 'var(--mute)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              marginBottom: '3px',
            }}
          >
            Tonalitet
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: agency?.tone_profile ? 'var(--accent)' : 'var(--line-2)',
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11px',
                color: 'var(--ink-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agency?.tone_profile?.tags?.slice(0, 2).join(', ') ?? 'Ej konfigurerad'}
            </p>
          </div>
        </button>
      </div>

      {vitecOpen && (
        <VitecImportModal
          onClose={() => setVitecOpen(false)}
          onImported={(id) => { setVitecOpen(false); onSelect(id) }}
        />
      )}
    </aside>
  )
}
