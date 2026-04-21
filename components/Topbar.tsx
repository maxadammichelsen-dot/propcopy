'use client'

import { Agency } from '@/types'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type View = 'home' | 'detail' | 'new' | 'tone' | 'competition' | 'prospects' | 'followup' | 'revision' | 'settings'

interface TopbarProps {
  agency: Agency | null
  currentView: View
  onHome: () => void
  onCompetition: () => void
  onProspects: () => void
  onFollowup: () => void
  onTone: () => void
  onSettings: () => void
}

function IcSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3.2 3.2l1.06 1.06M9.74 9.74l1.06 1.06M3.2 10.8l1.06-1.06M9.74 4.26l1.06-1.06"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IcLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 2.5H3a1 1 0 00-1 1v7a1 1 0 001 1h2.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M9 4.5L12 7l-3 2.5M12 7H5.5"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Topbar({
  agency,
  currentView,
  onHome,
  onSettings,
  onCompetition: _oc,
  onProspects: _op,
  onFollowup: _of,
  onTone: _ot,
}: TopbarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = agency?.name
    ? agency.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'E'

  return (
    <header
      style={{
        height: '48px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        padding: '0 14px',
        gap: '16px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <button
        onClick={onHome}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          Estat
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '13px', color: '#FF3D00', margin: '0 1px', letterSpacing: '-0.04em' }}>
          /
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 500, fontSize: '13px', letterSpacing: '-0.04em', color: 'var(--ink)' }}>
          io
        </span>
      </button>

      {/* ── Search / center (.center) ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 11px',
          background: 'var(--tint)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          minWidth: '260px',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '12.5px',
            color: 'var(--mute)',
            flex: 1,
            letterSpacing: '-0.01em',
          }}
        >
          Sök eller kommando
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            color: 'var(--mute-2)',
            padding: '2px 5px',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ⌘K
        </span>
      </div>

      {/* ── Right (.right) ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

        {/* Settings .ibtn */}
        <button
          onClick={onSettings}
          className="ibtn"
          title="Min byrå"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: currentView === 'settings' ? 'var(--tint)' : 'none',
            color: currentView === 'settings' ? 'var(--ink)' : 'var(--mute)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IcSettings />
        </button>

        {/* Logout .ibtn */}
        <button
          onClick={handleLogout}
          className="ibtn"
          title="Logga ut"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'none',
            color: 'var(--mute)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IcLogout />
        </button>

        {/* Avatar .av */}
        <button
          onClick={onSettings}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--ink)',
            color: '#fff',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
