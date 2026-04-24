'use client'

import { KeyInsights } from '@/types'

interface InsightsCardProps {
  insights: KeyInsights | null
  loading: boolean
}

export default function InsightsCard({ insights, loading }: InsightsCardProps) {
  if (loading) {
    return (
      <div style={{
        margin: '16px 32px 0',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        {/* Header skeleton */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--tint)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div
            className="animate-spin-fast"
            style={{ width: '10px', height: '10px', border: '1.5px solid var(--line)', borderTopColor: 'var(--mute)', borderRadius: '50%' }}
          />
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
            Analyserar objekt…
          </span>
        </div>
        {/* Body skeleton */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[200, 240, 170, 210].map((w, i) => (
              <div key={i} className="animate-pulse" style={{ height: '11px', width: `${w}px`, background: 'var(--line)', borderRadius: '4px' }} />
            ))}
          </div>
          <div style={{ height: '1px', background: 'var(--line)' }} />
          <div className="animate-pulse" style={{ height: '11px', width: '280px', background: 'var(--line)', borderRadius: '4px' }} />
        </div>
      </div>
    )
  }

  if (!insights) return null

  const strengths = insights.strengths.slice(0, 5)
  const risks     = insights.risks.slice(0, 2)

  return (
    <div style={{
      margin: '16px 32px 0',
      border: '1px solid var(--line)',
      borderRadius: '10px',
      overflow: 'hidden',
      fontSize: '13px',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--tint)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          color: 'var(--mute)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
        }}>
          Objektanalys
        </span>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          color: 'var(--mute-2)',
        }}>
          {strengths.length} styrkor · {risks.length} att hantera
        </span>
      </div>

      {/* Strengths — green */}
      <div style={{
        padding: '12px 16px',
        borderBottom: risks.length > 0 ? '1px solid var(--line)' : undefined,
        background: 'rgba(22,163,74,0.04)',
      }}>
        <p style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '9px',
          color: '#15803d',
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          marginBottom: '8px',
        }}>
          Styrkor
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '12px', lineHeight: '1.6', flexShrink: 0 }}>✓</span>
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, letterSpacing: '-0.005em', margin: 0 }}>
                {s.argument}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Risks — amber */}
      {risks.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'rgba(245,158,11,0.05)',
        }}>
          <p style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '9px',
            color: '#b45309',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '8px',
          }}>
            Hantera proaktivt
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {risks.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#d97706', fontWeight: 600, fontSize: '12px', lineHeight: '1.6', flexShrink: 0 }}>!</span>
                <p style={{ color: '#78350f', lineHeight: 1.6, letterSpacing: '-0.005em', margin: 0 }}>
                  {r.issue}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positioning */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '10px',
          color: 'var(--mute)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          flexShrink: 0,
          paddingTop: '2px',
        }}>
          Positionering:
        </span>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.5, letterSpacing: '-0.005em', fontStyle: 'italic', margin: 0 }}>
          {insights.positioning}
        </p>
      </div>
    </div>
  )
}
