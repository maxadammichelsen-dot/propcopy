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
}

export default function DashboardHome({ agency, onSelectObject, onNewObject }: DashboardHomeProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!data) return null

  const dateLabel = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div>
        <h2 className="font-serif text-3xl text-[#f0ece4]">Översikt</h2>
        <p className="text-sm text-[#555] mt-1 capitalize">
          {agency?.name ?? 'Din byrå'} – {dateLabel}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Aktiva objekt" value={data.stats.active_objects} icon="🏠" />
        <StatCard label="Snitt dagar ute" value={data.stats.avg_days_on_market} icon="📅" />
        <StatCard
          label="Behöver åtgärd"
          value={data.stats.needs_action}
          icon="⚠️"
          highlight={data.stats.needs_action > 0}
        />
        <StatCard label="Texter denna månad" value={data.stats.texts_this_month} icon="✍️" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ObjectHealthList
            items={data.object_health}
            onSelectObject={onSelectObject}
            onNewObject={onNewObject}
          />
        </div>
        <div className="space-y-4">
          <ActionItems items={data.action_items} onSelectObject={onSelectObject} />
          <ProspectsList />
          <PerformanceChart data={data.performance} />
        </div>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
  label, value, icon, highlight = false,
}: {
  label: string; value: number; icon: string; highlight?: boolean
}) {
  const isAlert = highlight && value > 0
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: isAlert ? 'var(--brand-primary-dim, #b8965a44)' : '#2a2a2a',
        backgroundColor: '#1a1a1a',
      }}
    >
      <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-light tabular-nums"
          style={{ color: isAlert ? 'var(--brand-primary, #b8965a)' : '#f0ece4' }}
        >
          {value}
        </span>
        <span className="text-base mb-1 leading-none">{icon}</span>
      </div>
    </div>
  )
}

// ─── Health ring ──────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const R = 16
  const C = 2 * Math.PI * R
  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={R} fill="none" stroke="#2a2a2a" strokeWidth="3" />
      <circle
        cx="22" cy="22" r={R}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - score / 100)}
        transform="rotate(-90 22 22)"
      />
      <text
        x="22" y="22"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="10"
        fontWeight="600"
        fill={color}
      >
        {score}
      </text>
    </svg>
  )
}

// ─── Object health list ───────────────────────────────────────

function ObjectHealthList({
  items, onSelectObject, onNewObject,
}: {
  items: ObjectHealth[]
  onSelectObject: (id: string) => void
  onNewObject: () => void
}) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[#555]">Objekthälsa</p>
        <button
          onClick={onNewObject}
          className="text-[10px] text-[#555] hover:text-[var(--brand-primary,#b8965a)] transition-colors"
        >
          + Nytt objekt
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-[#444]">Inga aktiva objekt</p>
          <button
            onClick={onNewObject}
            className="mt-3 text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--brand-primary, #b8965a)' }}
          >
            Skapa ditt första objekt →
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#1e1e1e]">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#161616] transition-colors group"
            >
              <HealthRing score={item.health_score} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0ece4] truncate">{item.address}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-[#555]">{item.area}</span>
                  {item.status === 'active' && item.days_on_market > 0 && (
                    <span className="text-[10px] text-[#444]">{item.days_on_market} dagar</span>
                  )}
                  {item.status === 'draft' && (
                    <span className="text-[10px] text-[#444]">Utkast</span>
                  )}
                  {item.issues.slice(0, 2).map(issue => (
                    <span
                      key={issue}
                      className="text-[10px] text-[#555] bg-[#222] rounded px-1.5 py-0.5 leading-none"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onSelectObject(item.id)}
                className="shrink-0 text-[10px] text-[#555] border border-transparent px-2.5 py-1.5 rounded transition-all opacity-0 group-hover:opacity-100 hover:text-[var(--brand-primary,#b8965a)] hover:border-[var(--brand-primary-dim,#b8965a33)]"
              >
                Förbättra →
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Action items ─────────────────────────────────────────────

function ActionItems({
  items, onSelectObject,
}: {
  items: ActionItem[]
  onSelectObject: (id: string) => void
}) {
  const PRIORITY_DOT: Record<string, string> = {
    high: '#f87171',
    medium: '#fbbf24',
    low: '#4ade80',
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Idag bör du</p>
      <div className="space-y-1.5">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => item.object_id ? onSelectObject(item.object_id) : undefined}
            disabled={!item.object_id}
            className="w-full text-left flex items-start gap-3 p-2.5 rounded hover:bg-[#161616] transition-colors disabled:cursor-default group"
          >
            <span className="text-base leading-none mt-0.5 shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#d0ccc4] font-medium leading-snug group-hover:text-[#f0ece4] transition-colors">
                {item.title}
              </p>
              <p className="text-[10px] text-[#555] mt-0.5 leading-relaxed">{item.description}</p>
            </div>
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: PRIORITY_DOT[item.priority] }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Prospects placeholder ────────────────────────────────────

function ProspectsList() {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Varma spekulanter</p>
      <div className="space-y-2 mb-3 pointer-events-none select-none">
        {['Anna L.', 'Marcus K.', 'Sofia A.'].map((name, i) => (
          <div key={i} className="flex items-center gap-2.5 opacity-25">
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center">
              <span className="text-[9px] text-[#555]">{name[0]}</span>
            </div>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-[#2a2a2a] rounded w-20" />
            </div>
            <div className="h-1.5 bg-[#2a2a2a] rounded w-8" />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#444] leading-relaxed">
        Installera spårningspixeln för att se aktiva spekulanter i realtid.
      </p>
    </div>
  )
}

// ─── Performance sparkline ────────────────────────────────────

function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  if (!data.length) return null

  const W = 200, H = 50, PAD = 4
  const maxVal = Math.max(...data.map(d => d.texts_generated), 1)
  const pts = data.map((d, i) => [
    PAD + (i / (data.length - 1)) * (W - PAD * 2),
    H - PAD - (d.texts_generated / maxVal) * (H - PAD * 2),
  ] as [number, number])

  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${pts.at(-1)![0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  const total = data.reduce((s, d) => s + d.texts_generated, 0)

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
      <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Byråprestanda</p>
      <svg
        width="100%"
        height="50"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary,#b8965a)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--brand-primary,#b8965a)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pg)" />
        <path
          d={line}
          fill="none"
          stroke="var(--brand-primary,#b8965a)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between mt-2">
        {data.map(d => (
          <span key={d.month} className="text-[9px] text-[#444]">{d.month}</span>
        ))}
      </div>
      <p className="text-[10px] text-[#555] mt-1.5">
        {total} {total === 1 ? 'text' : 'texter'} genererade senaste 6 månaderna
      </p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="space-y-2">
        <div className="h-8 w-28 bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-4 w-52 bg-[#1a1a1a] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-64 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        <div className="space-y-4">
          <div className="h-40 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
          <div className="h-32 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
