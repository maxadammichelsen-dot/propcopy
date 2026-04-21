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
}

export default function DashboardHome({ agency, onSelectObject, onNewObject, onProspects, onRevision }: DashboardHomeProps) {
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
    <div className="h-full overflow-y-auto">

      {/* Hero: greeting + KPI rail */}
      <div className="border-b border-line px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

        {/* Left: greeting */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <span className="dot-live" />
            <span className="font-data text-[10px] text-mute tracking-[0.02em] uppercase capitalize">
              {dateLabel}
            </span>
          </div>
          <h1 className="font-display text-[52px] leading-[0.93] tracking-[-0.03em] text-ink mb-4">
            {getGreeting()},<br />
            <em className="italic text-mute">
              {agency?.name?.split(' ')[0] ?? 'välkommen'}.
            </em>
          </h1>
          <p className="font-data text-[11px] text-mute tracking-snug">
            {data.stats.active_objects} aktiva objekt · {data.stats.texts_this_month} texter denna månad
          </p>

          {onRevision && (
            <button
              onClick={onRevision}
              className="inline-flex items-center gap-1.5 mt-4 font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug border border-line rounded-full px-3 py-1.5"
            >
              <span>Analysera befintlig annons</span>
              <span className="text-mute-2">→</span>
            </button>
          )}
        </div>

        {/* Right: KPI rail */}
        <div className="border border-line rounded-lg divide-y divide-line bg-tint">
          <KPIRow label="Aktiva objekt"      value={data.stats.active_objects} />
          <KPIRow label="Snitt dagar ute"    value={data.stats.avg_days_on_market} suffix="d" />
          <KPIRow label="Behöver åtgärd"     value={data.stats.needs_action} alert={data.stats.needs_action > 0} />
          <KPIRow label="Texter denna månad" value={data.stats.texts_this_month} />
        </div>
      </div>

      {/* Body: main + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] divide-x divide-line min-h-0">

        {/* Main: object list + today list */}
        <div className="px-8 py-6 space-y-8">
          <ObjectDocumentList
            items={data.object_health}
            onSelectObject={onSelectObject}
            onNewObject={onNewObject}
          />
          <ThingsToday items={data.action_items} onSelectObject={onSelectObject} />
        </div>

        {/* Right rail */}
        <div className="px-6 py-6 space-y-8">
          <PerformanceSparkline data={data.performance} />
          <ProspectsCard onProspects={onProspects} />
        </div>
      </div>
    </div>
  )
}

// ─── Greeting ─────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 13) return 'God förmiddag'
  if (h < 17) return 'God eftermiddag'
  return 'God kväll'
}

// ─── KPI row ──────────────────────────────────────────────────

function KPIRow({
  label, value, suffix = '', alert = false,
}: {
  label: string; value: number; suffix?: string; alert?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{label}</span>
      <span
        className="font-data text-[18px] font-medium tabular-nums leading-none"
        style={{ color: alert ? 'var(--accent)' : 'var(--ink)' }}
      >
        {value}{suffix}
      </span>
    </div>
  )
}

// ─── Object document list ─────────────────────────────────────

function ObjectDocumentList({
  items, onSelectObject, onNewObject,
}: {
  items: ObjectHealth[]
  onSelectObject: (id: string) => void
  onNewObject: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">Objekt</p>
        <button
          onClick={onNewObject}
          className="font-data text-[10px] text-mute hover:text-ink transition-colors tracking-snug"
        >
          + Nytt objekt
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-line rounded-lg">
          <p className="font-data text-[11px] text-mute-2 tracking-snug mb-4">Inga aktiva objekt</p>
          <button
            onClick={onNewObject}
            className="font-data text-[11px] text-accent hover:underline tracking-snug"
          >
            Skapa ditt första →
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item, i) => (
            <ObjectDocumentRow
              key={item.id}
              item={item}
              index={i + 1}
              onSelectObject={onSelectObject}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  draft:  'var(--line-2)',
  active: 'var(--accent)',
  sold:   'var(--mute-2)',
}

function ObjectDocumentRow({
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

  return (
    <li>
      <button
        onClick={() => onSelectObject(item.id)}
        className="w-full text-left py-3 flex items-center gap-4 group hover:pl-1 transition-all duration-150"
      >
        <span className="font-data text-[10px] text-mute-2 tabular-nums w-6 shrink-0">
          {String(index).padStart(2, '0')}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink truncate leading-snug">{item.address}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-data text-[10px] text-mute truncate tracking-snug">{item.area}</span>
            {item.issues.slice(0, 1).map(issue => (
              <span
                key={issue}
                className="font-data text-[9px] text-mute-2 bg-tint border border-line rounded px-1.5 py-0.5 leading-none"
              >
                {issue}
              </span>
            ))}
          </div>
        </div>

        {item.status === 'active' && item.days_on_market > 0 && (
          <span className="font-data text-[11px] text-mute tabular-nums shrink-0">
            {item.days_on_market}d
          </span>
        )}
        {item.status === 'draft' && (
          <span className="font-data text-[11px] text-mute-2 shrink-0">Utkast</span>
        )}

        <div className="w-16 shrink-0">
          <div className="h-[3px] bg-line rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.health_score}%`, background: healthColor }}
            />
          </div>
        </div>

        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ background: STATUS_DOT[item.status] }}
        />
      </button>
    </li>
  )
}

// ─── Three things today ───────────────────────────────────────

function ThingsToday({
  items, onSelectObject,
}: {
  items: ActionItem[]
  onSelectObject: (id: string) => void
}) {
  if (!items.length) return null

  return (
    <div>
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-0">
        Tre saker idag
      </p>
      <ol>
        {items.slice(0, 3).map((item, i) => (
          <li key={item.id}>
            <button
              onClick={() => item.object_id ? onSelectObject(item.object_id) : undefined}
              disabled={!item.object_id}
              className="w-full text-left flex items-start gap-4 py-3 border-t border-line group hover:pl-1 transition-all duration-150 disabled:cursor-default"
            >
              <span className="font-data text-[10px] text-mute-2 tabular-nums w-6 shrink-0 pt-[3px]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink-2 group-hover:text-ink transition-colors leading-snug">
                  {item.title}
                </p>
                <p className="font-data text-[10px] text-mute mt-0.5 tracking-snug leading-relaxed">
                  {item.description}
                </p>
              </div>
              {item.priority === 'high' && (
                <span className="w-[5px] h-[5px] rounded-full bg-accent shrink-0 mt-[6px]" />
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Performance sparkline ────────────────────────────────────

function PerformanceSparkline({ data }: { data: PerformancePoint[] }) {
  if (!data.length) return null

  const W = 200, H = 48, PAD = 4
  const maxVal = Math.max(...data.map(d => d.texts_generated), 1)
  const pts = data.map((d, i) => [
    PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
    H - PAD - (d.texts_generated / maxVal) * (H - PAD * 2),
  ] as [number, number])

  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${pts.at(-1)![0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  const total = data.reduce((s, d) => s + d.texts_generated, 0)

  return (
    <div>
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">Prestanda</p>
      <svg
        width="100%"
        height="48"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ph-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ph-grad)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between mt-1">
        {data.map(d => (
          <span key={d.month} className="font-data text-[9px] text-mute-2">{d.month}</span>
        ))}
      </div>
      <p className="font-data text-[10px] text-mute mt-2 tracking-snug">
        {total} {total === 1 ? 'text' : 'texter'} senaste 6 mån
      </p>
    </div>
  )
}

// ─── Prospects card ───────────────────────────────────────────

function ProspectsCard({ onProspects }: { onProspects?: () => void }) {
  return (
    <div>
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">
        Spekulanter
      </p>
      <div className="space-y-2 mb-3 pointer-events-none select-none">
        {['A', 'M', 'S'].map((initial, i) => (
          <div key={i} className="flex items-center gap-2.5 opacity-30">
            <div className="w-6 h-6 rounded-full bg-line flex items-center justify-center">
              <span className="font-data text-[9px] text-mute">{initial}</span>
            </div>
            <div className="flex-1 h-1.5 bg-line rounded-full" />
            <div className="w-8 h-1.5 bg-line rounded-full" />
          </div>
        ))}
      </div>
      <p className="font-data text-[10px] text-mute-2 tracking-snug leading-relaxed mb-2">
        Installera spårningspixeln för att se aktiva spekulanter i realtid.
      </p>
      {onProspects && (
        <button
          onClick={onProspects}
          className="font-data text-[10px] text-accent hover:underline tracking-snug"
        >
          Konfigurera →
        </button>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-3">
          <div className="h-3 w-24 bg-line rounded animate-pulse" />
          <div className="h-12 w-64 bg-line rounded animate-pulse" />
          <div className="h-3 w-40 bg-line rounded animate-pulse" />
        </div>
        <div className="border border-line rounded-lg divide-y divide-line">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="h-2.5 w-24 bg-line rounded animate-pulse" />
              <div className="h-5 w-8 bg-line rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] divide-x divide-line">
        <div className="px-8 py-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-tint rounded animate-pulse" />
          ))}
        </div>
        <div className="px-6 py-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-tint rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
