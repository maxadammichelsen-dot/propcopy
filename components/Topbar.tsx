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

export default function Topbar({
  agency,
  currentView,
  onHome,
  onSettings,
  // kept for API compatibility — navigation handled by DashboardHome right panel
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
    ? agency.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
      {/* ── Brand ─────────────────────────────────────── */}
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
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '13px', color: '#FF3D00', margin: '0 1px' }}>
          /
        </span>
        <span style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 500, fontSize: '13px', color: 'var(--ink)' }}>
          io
        </span>
      </button>

      {/* ── Search / center ───────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 11px',
          background: 'var(--tint)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          minWidth: '260px',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '12px',
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

      {/* ── Right ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onSettings}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: currentView === 'settings' ? 'var(--ink)' : 'var(--mute)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            padding: 0,
          }}
        >
          Min byrå
        </button>

        <button
          onClick={handleLogout}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            padding: 0,
          }}
        >
          Logga ut
        </button>

        {/* Avatar (.av) */}
        <button
          onClick={onSettings}
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
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            letterSpacing: 0,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
