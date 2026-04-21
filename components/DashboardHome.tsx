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
  agency, onSelectObject, onNewObject,
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

  if (loading) return <DashboardSkeleton />
  if (!data) return null

  const eyebrow = `${WEEKDAYS[now.getDay()]} · ${p2(now.getDate())}.${p2(now.getMonth() + 1)}.${now.getFullYear()} · V.${getWeekNumber(now)} · ${p2(now.getHours())}:${p2(now.getMinutes())}`
  const firstName = agency?.name?.split(' ')[0] ?? ''
  const cards = data.action_items.slice(0, 3)

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

      {/* ── Greet ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
            letterSpacing: '-0.01em',
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}
        >
          {getGreeting()}{firstName ? ', ' : ''}
          {firstName && <b style={{ fontWeight: 700 }}>{firstName}</b>}
          {'. Tre saker på bordet.'}
        </span>
      </div>

      {/* ── Cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {cards.length > 0 ? (
          cards.map(item => (
            <ActionCard
              key={item.id}
              item={item}
              onSelect={() => { if (item.object_id) onSelectObject(item.object_id) }}
            />
          ))
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '32px',
              border: '1px dashed var(--line)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '12px',
                color: 'var(--mute-2)',
              }}
            >
              Inga uppgifter just nu
            </span>
          </div>
        )}
      </div>

      {/* ── Quick list ─────────────────────────────────────── */}
      <QuickList
        items={data.object_health}
        onSelectObject={onSelectObject}
        onNewObject={onNewObject}
      />

    </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────

function ActionCard({ item, onSelect }: { item: ActionItem; onSelect: () => void }) {
  const isHot = item.priority === 'high'

  return (
    <div
      style={{
        padding: '18px',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--bg)',
      }}
    >
      {/* .hdr */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* .ic[.hot] */}
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0,
            background: isHot ? 'var(--accent-tint)' : 'var(--tint)',
            color: isHot ? 'var(--accent)' : 'var(--ink-3)',
          }}
        >
          {item.icon ?? (isHot ? '⚡' : '·')}
        </span>
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '9px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            color: isHot ? 'var(--accent)' : 'var(--mute)',
          }}
        >
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

      {/* .btn.primary */}
      {item.object_id && (
        <button
          onClick={onSelect}
          style={{
            alignSelf: 'flex-start',
            padding: '7px 12px',
            background: 'var(--ink)',
            color: '#fff',
            fontWeight: 500,
            fontSize: '12.5px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Geist Mono', monospace",
            letterSpacing: '-0.01em',
          }}
        >
          Öppna objekt →
        </button>
      )}
    </div>
  )
}

// ─── Quick object list ────────────────────────────────────────

function QuickList({
  items, onSelectObject, onNewObject,
}: {
  items: ObjectHealth[]
  onSelectObject: (id: string) => void
  onNewObject: () => void
}) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          border: '1px dashed var(--line)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute-2)',
          }}
        >
          Inga aktiva objekt
        </span>
        <button
          onClick={onNewObject}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--accent)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Skapa ditt första →
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 56px 88px 24px',
          gap: '16px',
          padding: '8px 0',
          borderBottom: '1px solid var(--ink)',
        }}
      >
        {['#', 'Adress', 'Dagar', 'Hälsa', ''].map((h, i) => (
          <span
            key={i}
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              color: 'var(--mute)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.02em',
              textAlign: i >= 2 ? 'right' as const : 'left' as const,
            }}
          >
            {h}
          </span>
        ))}
      </div>

      <ul style={{ listStyle: 'none' }}>
        {items.map((item, i) => (
          <QuickRow
            key={item.id}
            item={item}
            index={i + 1}
            onSelectObject={onSelectObject}
          />
        ))}
      </ul>
    </div>
  )
}

function QuickRow({
  item, index, onSelectObject,
}: {
  item: ObjectHealth
  index: number
  onSelectObject: (id: string) => void
}) {
  const healthColor =
    item.health_score >= 70 ? 'var(--ink)' :
    item.health_score >= 40 ? 'var(--mute)' :
    'var(--accent)'

  const daysLabel =
    item.status === 'sold'  ? 'Såld' :
    item.status === 'draft' ? '—' :
    `${item.days_on_market}d`

  const daysAlert = item.status === 'active' && item.days_on_market > 30

  return (
    <li style={{ borderTop: '1px solid var(--line)' }}>
      <button
        onClick={() => onSelectObject(item.id)}
        className="doc-row"
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: '32px 1fr 56px 88px 24px',
          gap: '16px',
          alignItems: 'center',
          padding: '14px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(index).padStart(2, '0')}
        </span>

        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--ink)',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.address}
          </p>
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '11px',
              color: 'var(--mute)',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.area}
          </p>
        </div>

        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '13px',
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
            color: daysAlert ? 'var(--accent)' : 'var(--mute)',
          }}
        >
          {daysLabel}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <div
            style={{
              width: '40px',
              height: '3px',
              background: 'var(--line)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${item.health_score}%`,
                background: healthColor,
                borderRadius: '2px',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '12px',
              fontVariantNumeric: 'tabular-nums',
              width: '24px',
              textAlign: 'right',
              color: healthColor,
            }}
          >
            {item.health_score}
          </span>
        </div>

        <span
          className="tod-arrow"
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '14px',
            color: 'var(--mute-2)',
            textAlign: 'right',
          }}
        >
          →
        </span>
      </button>
    </li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function DashboardSkeleton() {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '12px', width: '240px', background: 'var(--line)', borderRadius: '4px' }} className="animate-pulse" />
        <div style={{ height: '28px', width: '320px', background: 'var(--line)', borderRadius: '4px' }} className="animate-pulse" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{ height: '220px', background: 'var(--tint)', borderRadius: '10px' }}
            className="animate-pulse"
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        <div style={{ height: '1px', background: 'var(--ink)', marginBottom: '1px' }} />
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{ height: '48px', background: 'var(--tint)', borderRadius: '4px', marginTop: '8px' }}
            className="animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
