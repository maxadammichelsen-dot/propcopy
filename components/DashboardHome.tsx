'use client'

import { useEffect, useState } from 'react'
import type { Agency, DashboardStats, ObjectHealth, ActionItem, PerformancePoint } from '@/types'

interface DashboardData {
  stats: DashboardStats
  object_health: ObjectHealth[]
  action_items: ActionItem[]
  performance: PerformancePoint[]
}

interface DashboardHomeProps {
  agency: Agency | null
  onSelectObject: (id: string) => void
  onNewObject: () => void
  onProspects?: () => void
  onRevision?: () => void
  onTone?: () => void
  onCompetition?: () => void
  onFollowup?: () => void
  onSettings?: () => void
}

const WEEKDAYS = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 13) return 'God förmiddag'
  if (h < 17) return 'God eftermiddag'
  return 'God kväll'
}

function getWeekNumber(d: Date): number {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const w1 = new Date(t.getFullYear(), 0, 4)
  return 1 + Math.round(((t.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

function p2(n: number) { return String(n).padStart(2, '0') }

export default function DashboardHome({
  agency, onSelectObject, onNewObject, onProspects, onTone,
  onCompetition, onFollowup, onSettings,
}: DashboardHomeProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <Skeleton />
  if (!data) return null

  const eyebrow = `${WEEKDAYS[now.getDay()]} · ${p2(now.getDate())}.${p2(now.getMonth() + 1)}.${now.getFullYear()} · V.${getWeekNumber(now)} · ${p2(now.getHours())}:${p2(now.getMinutes())}`
  const firstName = agency?.name?.split(' ')[0] ?? ''
  const cards = data.action_items.slice(0, 3)
  const activeCount = data.object_health.filter(o => o.status === 'active').length

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: '88px 40px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        overflowY: 'auto',
        background: 'var(--bg)',
      }}
    >

      {/* ── .greet ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* .eyebrow */}
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
            letterSpacing: 0,
          }}
        >
          {eyebrow}
        </span>
        {/* .hi */}
        <span
          style={{
            fontSize: '13px',
            color: 'var(--mute)',
            fontWeight: 450,
            letterSpacing: '-0.003em',
          }}
        >
          {getGreeting()}{firstName ? ', ' : ''}
          {firstName && <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{firstName}</b>}
          {'. Tre saker på bordet idag.'}
        </span>
      </div>

      {/* ── .cards ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {cards.length > 0 ? cards.map(item => (
          <ActionCard
            key={item.id}
            item={item}
            onSelect={() => { if (item.object_id) onSelectObject(item.object_id) }}
          />
        )) : (
          // Fallback: 3 placeholder cards when no action items
          [
            { id: 'p1', icon: '✦', title: 'Generera texter', desc: 'Inga aktiva uppgifter. Skapa ett nytt objekt för att komma igång.', action: onNewObject, label: 'Nytt objekt' },
            { id: 'p2', icon: '◈', title: 'Tonprofil', desc: 'Ställ in byråns röst och tonalitet för konsekvent kommunikation.', action: onTone ?? (() => {}), label: 'Konfigurera' },
            { id: 'p3', icon: '◉', title: 'Spekulanter', desc: 'Spåra och kommunicera med dina potentiella köpare.', action: onProspects ?? (() => {}), label: 'Öppna' },
          ].map(p => (
            <div
              key={p.id}
              className="card-hover"
              style={{
                padding: '18px',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                minHeight: '220px',
                cursor: 'pointer',
              }}
              onClick={p.action}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '28px', height: '28px', background: 'var(--tint)',
                  borderRadius: '6px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontFamily: "'Geist Mono', monospace",
                  fontSize: '11px', color: 'var(--ink-2)', fontWeight: 500,
                }}>{p.icon}</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.018em', lineHeight: 1.3, color: 'var(--ink)', flex: 1 }}>{p.title}</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--mute)', lineHeight: 1.5, letterSpacing: '-0.003em' }}>{p.desc}</p>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <button onClick={e => { e.stopPropagation(); p.action() }} style={{ padding: '7px 12px', background: 'var(--ink)', color: '#fff', fontWeight: 500, fontSize: '12.5px', borderRadius: '6px', border: 'none', cursor: 'pointer', letterSpacing: '-0.005em', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  {p.label}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── .quick ────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Chip onClick={onNewObject} icon="+" label="Nytt objekt" />
          {activeCount > 0 && (
            <Chip
              onClick={() => onSelectObject(data.object_health.find(o => o.status === 'active')?.id ?? '')}
              icon="◉"
              label={`${activeCount} aktiv${activeCount !== 1 ? 'a' : 't'}`}
            />
          )}
          {onProspects && <Chip onClick={onProspects} icon="◈" label="Spekulanter" />}
          {onCompetition && <Chip onClick={onCompetition} icon="◎" label="Konkurrens" />}
          {onTone && <Chip onClick={onTone} icon="✦" label="Tonprofil" />}
          {onFollowup && <Chip onClick={onFollowup} icon="↗" label="Statistik" />}
          {onSettings && <Chip onClick={onSettings} icon="⚙" label="Inställningar" />}
        </div>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute-2)',
          }}
        >
          {data.stats.texts_this_month} texter · v{getWeekNumber(now)}
        </span>
      </div>

    </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────

function ActionCard({ item, onSelect }: { item: ActionItem; onSelect: () => void }) {
  const isHot = item.priority === 'high'

  return (
    <div
      className="card-hover"
      onClick={onSelect}
      style={{
        padding: '18px',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minHeight: '220px',
        cursor: 'pointer',
      }}
    >
      {/* .hdr */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* .ic [.hot] */}
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            fontWeight: 500,
            flexShrink: 0,
            background: isHot ? 'var(--accent-tint)' : 'var(--tint)',
            color: isHot ? 'var(--accent)' : 'var(--ink-2)',
          }}
        >
          {item.icon ?? (isHot ? '⚡' : '·')}
        </span>
        {/* .tag [.hot] */}
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10.5px',
            letterSpacing: 0,
            padding: '3px 8px',
            border: `1px solid ${isHot ? 'var(--accent-tint)' : 'var(--line)'}`,
            borderRadius: '100px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: isHot ? 'var(--accent)' : 'var(--mute)',
            background: isHot ? 'var(--accent-tint-2)' : 'transparent',
          }}
        >
          {isHot && (
            <span
              className="dot-live"
              style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
            />
          )}
          {item.priority === 'high' ? 'Prioritet' : item.priority === 'medium' ? 'Att göra' : 'Notering'}
        </span>
      </div>

      {/* h3 */}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '-0.018em',
          lineHeight: 1.3,
          color: 'var(--ink)',
          flex: 1,
        }}
      >
        {item.title}
      </h3>

      {/* p */}
      <p
        style={{
          fontSize: '13.5px',
          color: 'var(--mute)',
          lineHeight: 1.5,
          letterSpacing: '-0.003em',
        }}
      >
        {item.description}
      </p>

      {/* .cta */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--line)',
        }}
      >
        {item.object_id ? (
          <button
            onClick={e => { e.stopPropagation(); onSelect() }}
            style={{
              padding: '7px 12px',
              background: 'var(--ink)',
              color: '#fff',
              fontWeight: 500,
              fontSize: '12.5px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.005em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'inherit',
            }}
          >
            Öppna objekt →
          </button>
        ) : (
          <span />
        )}
        {/* .cta meta */}
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
          }}
        >
          {item.priority === 'high' ? 'Idag' : item.priority === 'medium' ? 'Denna vecka' : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── Chip ─────────────────────────────────────────────────────

function Chip({ onClick, icon, label }: { onClick?: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className="chip-btn"
      style={{
        padding: '6px 12px',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: '100px',
        fontSize: '12.5px',
        color: 'var(--ink-2)',
        fontWeight: 450,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '-0.003em',
      }}
    >
      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)' }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: '88px 40px 40px', display: 'flex', flexDirection: 'column', gap: '32px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className="animate-pulse" style={{ height: '11px', width: '220px', background: 'var(--line)', borderRadius: '4px' }} />
        <div className="animate-pulse" style={{ height: '13px', width: '180px', background: 'var(--line)', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: '220px', background: 'var(--tint)', borderRadius: '10px' }} />
        ))}
      </div>
    </div>
  )
}
