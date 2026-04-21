'use client'

import { useEffect } from 'react'

interface MenuItem {
  icon: string
  label: string
  onClick?: () => void
  active?: boolean
  right?: React.ReactNode
}

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
  agencyName?: string
  agencyInitials?: string
  items: MenuItem[][]   // arrays of arrays = sections separated by dividers
  footerLabel?: string
  footerSub?: string
}

export default function MenuDrawer({
  open,
  onClose,
  agencyName,
  agencyInitials = 'E',
  items,
  footerLabel,
  footerSub,
}: MenuDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,10,9,0.08)',
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line)',
          padding: '56px 12px 16px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            background: 'none',
            color: 'var(--mute)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          ×
        </button>

        {/* Menu sections */}
        <div style={{ flex: 1 }}>
          {items.map((section, si) => (
            <div key={si}>
              {si > 0 && (
                <div
                  style={{
                    height: '1px',
                    background: 'var(--line)',
                    margin: '8px 12px',
                  }}
                />
              )}
              {section.map((item, ii) => (
                <button
                  key={ii}
                  onClick={() => { item.onClick?.(); onClose() }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'grid',
                    gridTemplateColumns: '18px 1fr auto',
                    gap: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: item.active ? 'var(--tint)' : 'none',
                    color: item.active ? 'var(--ink)' : 'var(--ink-2)',
                    fontWeight: item.active ? 500 : 400,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    alignItems: 'center',
                    fontFamily: 'inherit',
                    letterSpacing: '-0.005em',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = 'var(--tint)' }}
                  onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'none' }}
                >
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: '13px',
                      color: item.active ? 'var(--ink)' : 'var(--mute)',
                      lineHeight: 1,
                      textAlign: 'center',
                    }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.right && (
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '11px',
                        color: 'var(--mute-2)',
                      }}
                    >
                      {item.right}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        {(footerLabel || agencyName) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderTop: '1px solid var(--line)',
              marginTop: 'auto',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--ink)',
                color: '#fff',
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {agencyInitials}
            </span>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {footerLabel ?? agencyName}
              </p>
              {footerSub && (
                <p
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--mute)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {footerSub}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
