'use client'

import { KeyInsights } from '@/types'

interface InsightsCardProps {
  insights: KeyInsights | null
  loading: boolean
}

export default function InsightsCard({ insights, loading }: InsightsCardProps) {
  if (loading) {
    return (
      <div
        style={{
          margin: '16px 32px 0',
          border: '1px solid var(--line)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--tint)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div className="animate-spin-fast" style={{ width: '10px', height: '10px', border: '1.5px solid var(--line)', borderTopColor: 'var(--mute)', borderRadius: '50%' }} />
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
            Analyserar objekt…
          </span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[180, 240, 140].map((w, i) => (
            <div key={i} className="animate-pulse" style={{ height: '12px', width: `${w}px`, background: 'var(--line)', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!insights) return null

  return (
    <div
      style={{
        margin: '16px 32px 0',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        overflow: 'hidden',
        fontSize: '13px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          background: 'var(--tint)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            color: 'var(--mute)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase' as const,
          }}
        >
          AI-analys
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10px',
            color: 'var(--mute-2)',
          }}
        >
          {insights.strengths.length} styrkor · {insights.risks.length} risker
        </span>
      </div>

      {/* Strengths — green */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--ok-tint)',
        }}
      >
        <p
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '9px',
            color: 'var(--ok)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '8px',
          }}
        >
          Styrkor
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {insights.strengths.map((s, i) => (
            <p key={i} style={{ color: 'var(--ink-2)', lineHeight: 1.5, letterSpacing: '-0.005em' }}>
              <span style={{ fontWeight: 500, color: 'var(--ok)' }}>{s.argument}</span>
              {' — '}
              <span style={{ color: 'var(--ink-3)' }}>{s.why}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Risks — amber */}
      {insights.risks.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--line)',
            background: '#FFFBEB',
          }}
        >
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '9px',
              color: '#92400E',
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
              marginBottom: '8px',
            }}
          >
            Hantera proaktivt
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {insights.risks.map((r, i) => (
              <p key={i} style={{ color: '#78350F', lineHeight: 1.5, letterSpacing: '-0.005em' }}>
                <span style={{ fontWeight: 500 }}>{r.issue}</span>
                {' — '}
                <span style={{ color: '#92400E' }}>{r.how_to_handle}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Positioning */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <span style={{ color: 'var(--mute-2)', flexShrink: 0, marginTop: '1px' }}>◈</span>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.5, letterSpacing: '-0.005em', fontStyle: 'italic' }}>
          {insights.positioning}
        </p>
      </div>
    </div>
  )
}
