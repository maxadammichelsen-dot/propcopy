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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 10) return 'God morgon'
  if (h < 13) return 'God förmiddag'
  if (h < 17) return 'God eftermiddag'
  return 'God kväll'
}

function getWeekNumber(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

export default function DashboardHome({
  agency, onSelectObject, onNewObject, onProspects, onRevision,
  onTone, onCompetition, onFollowup, onSettings,
}: DashboardHomeProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  )

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
    }, 30000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!data) return null

  const dateLabel = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const firstName = agency?.name?.split(' ')[0] ?? ''
  const tonePercent = agency?.tone_profile?.tags?.length
    ? Math.min(100, Math.round((agency.tone_profile.tags.length / 6) * 100))
    : 0
  const activeCount = data.object_health.filter(o => o.status === 'active').length

  return (
    <div className="h-full flex overflow-hidden">

      {/* ─── CENTER ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Hero */}
        <div className="px-10 pt-12 pb-10 border-b border-line">
          <div className="flex items-center gap-3 mb-8">
            <span className="dot-live" />
            <span className="font-data text-[11px] text-mute capitalize tracking-snug">{dateLabel}</span>
          </div>

          <h1 className="font-display text-[72px] leading-[0.92] tracking-[-0.04em] text-ink">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}.{' '}
            <em className="italic text-mute">Tre saker på bordet.</em>
          </h1>

          {data.stats.needs_action > 0 ? (
            <div className="flex items-baseline gap-5 mt-10 pt-8 border-t border-line">
              <span className="font-display text-[56px] leading-none tracking-[-0.03em] text-accent">
                {data.stats.needs_action}
              </span>
              <p className="text-[14px] text-ink-2 leading-relaxed">
                <strong className="font-medium">objekt behöver åtgärd</strong>
                {' '}· {data.stats.active_objects} aktiva · {data.stats.texts_this_month} texter denna månad
              </p>
            </div>
          ) : (
            <p className="font-data text-[11px] text-mute tracking-snug mt-6">
              {data.stats.active_objects} aktiva objekt · {data.stats.texts_this_month} texter denna månad
            </p>
          )}
        </div>

        {/* Three things today */}
        <ThingsToday
          items={data.action_items}
          onSelectObject={onSelectObject}
          onRevision={onRevision}
        />

        {/* Object list */}
        <ObjectDocumentList
          items={data.object_health}
          onSelectObject={onSelectObject}
          onNewObject={onNewObject}
        />
      </div>

      {/* ─── RIGHT NAV PANEL ────────────────────────────────── */}
      <aside className="w-[280px] border-l border-line bg-tint shrink-0 overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-5 border-b border-line flex items-baseline justify-between">
          <span className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
            Vecka {getWeekNumber()}
          </span>
          <span className="font-data text-[10px] text-mute tabular-nums">{time}</span>
        </div>

        {/* ARBETSYTA */}
        <NavSection label="Arbetsyta">
          <NavItem
            label="Today"
            active
            right={
              <span className="flex gap-0.5">
                {['G', 'T'].map(k => (
                  <kbd key={k} className="font-data text-[9px] text-mute-2 bg-bg border border-line rounded px-[5px] py-[2px] leading-none">
                    {k}
                  </kbd>
                ))}
              </span>
            }
          />
          <NavItem
            label="Alla objekt"
            right={
              <span className={`font-data text-[12px] tabular-nums ${activeCount > 0 ? 'text-accent' : 'text-mute'}`}>
                {activeCount}
              </span>
            }
          />
          <NavItem
            label="Spekulanter"
            onClick={onProspects}
            right={
              <span className="flex items-center gap-1.5 font-data text-[10px] text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                live
              </span>
            }
          />
          <NavItem
            label="Tonprofil"
            onClick={onTone}
            right={
              <span className="font-data text-[11px] text-mute tabular-nums">
                {tonePercent > 0 ? `${tonePercent}%` : '—'}
              </span>
            }
          />
        </NavSection>

        {/* ANALYS */}
        <NavSection label="Analys">
          <NavItem
            label="Konkurrensintelligens"
            onClick={onCompetition}
            right={<span className="font-data text-[10px] text-mute">0 nya</span>}
          />
          <NavItem
            label="Historik & statistik"
            onClick={onFollowup}
            right={<span className="font-data text-[10px] text-mute-2">v1</span>}
          />
        </NavSection>

        {/* INSTÄLLNINGAR */}
        <NavSection label="Inställningar">
          <NavItem label="Byrå & team" onClick={onSettings} />
          <NavItem
            label="Kortkommandon"
            right={
              <span className="font-data text-[10px] text-mute border border-line rounded px-[5px] py-[2px] leading-none">
                ?
              </span>
            }
          />
        </NavSection>
      </aside>
    </div>
  )
}

// ─── Nav helpers ──────────────────────────────────────────────

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-6 pb-2">
      <p className="px-6 font-data text-[9px] text-mute-2 tracking-[0.08em] uppercase mb-0.5">
        {label}
      </p>
      <div>{children}</div>
    </div>
  )
}

function NavItem({
  label, active = false, onClick, right,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  right?: React.ReactNode
}) {
  const baseClass = [
    'flex items-center gap-2.5 px-6 py-2.5 border-t border-line w-full text-left',
    onClick ? 'cursor-pointer hover:bg-bg/60 transition-colors' : 'cursor-default',
    active ? 'bg-bg/40' : '',
  ].join(' ')

  const inner = (
    <>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-accent' : 'opacity-0'}`} />
      <span className={`font-data text-[12px] flex-1 truncate ${active ? 'text-ink font-medium' : 'text-mute'}`}>
        {label}
      </span>
      {right && <span className="shrink-0">{right}</span>}
    </>
  )

  return onClick ? (
    <button onClick={onClick} className={baseClass}>{inner}</button>
  ) : (
    <div className={baseClass}>{inner}</div>
  )
}

// ─── Three things today ───────────────────────────────────────

const PRIORITY_TAG = {
  high:   { label: 'Prioritet',  cls: 'text-accent border-accent/40 bg-accent/5' },
  medium: { label: 'Att göra',   cls: 'text-ink-2 border-line-2' },
  low:    { label: 'Notering',   cls: 'text-mute border-line' },
} as const

function ThingsToday({
  items, onSelectObject, onRevision,
}: {
  items: ActionItem[]
  onSelectObject: (id: string) => void
  onRevision?: () => void
}) {
  const shown = items.slice(0, 3)
  if (!shown.length && !onRevision) return null

  return (
    <div className="px-10 py-10 border-b border-line">
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-[40px] leading-none tracking-[-0.028em] text-ink">
          Idag bör du <em className="italic text-mute">· kuraterat av Estatio</em>
        </h2>
        {shown.length > 0 && (
          <span className="font-data text-[11px] text-mute tracking-snug">
            <strong className="text-accent">{String(shown.length).padStart(2, '0')}</strong> saker
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-line rounded-lg">
          <p className="font-data text-[11px] text-mute-2 tracking-snug mb-3">Inga uppgifter just nu.</p>
          {onRevision && (
            <button
              onClick={onRevision}
              className="font-data text-[11px] text-accent hover:underline tracking-snug"
            >
              Analysera befintlig annons →
            </button>
          )}
        </div>
      ) : (
        <ol>
          {shown.map((item, i) => {
            const tag = PRIORITY_TAG[item.priority]
            return (
              <li key={item.id}>
                <button
                  onClick={() => item.object_id ? onSelectObject(item.object_id) : undefined}
                  disabled={!item.object_id}
                  className="w-full text-left flex items-start gap-6 py-6 border-t border-line group hover:pl-2 transition-all duration-150 disabled:cursor-default"
                  style={{ borderTopColor: i === 0 ? 'var(--ink)' : undefined }}
                >
                  {/* Index */}
                  <span className="font-display text-[30px] italic text-mute-2 leading-none w-9 shrink-0 tabular-nums pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[16px] font-medium text-ink leading-tight">{item.title}</p>
                    <p className="font-data text-[12px] text-mute leading-relaxed">{item.description}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1.5 flex-wrap justify-end shrink-0 max-w-[180px] pt-0.5">
                    <span className={`font-data text-[10px] px-2 py-0.5 border rounded leading-none ${tag.cls}`}>
                      {tag.label}
                    </span>
                    {item.object_id && (
                      <span className="font-data text-[10px] px-2 py-0.5 border border-line text-mute rounded leading-none">
                        Objekt
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <span className="font-data text-[16px] text-mute-2 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 pt-0.5">
                    →
                  </span>
                </button>
              </li>
            )
          })}
          {shown.length > 0 && (
            <li className="border-t border-line" />
          )}
        </ol>
      )}

      {onRevision && shown.length > 0 && (
        <div className="mt-4">
          <button
            onClick={onRevision}
            className="font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug border border-line rounded-full px-3 py-1.5"
          >
            Analysera befintlig annons →
          </button>
        </div>
      )}
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
  const activeItems = items.filter(o => o.status !== 'sold')

  return (
    <div className="px-10 py-10">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-display text-[40px] leading-none tracking-[-0.028em] text-ink">
          Aktiva objekt <em className="italic text-mute">· {activeItems.length}</em>
        </h2>
        <button
          onClick={onNewObject}
          className="font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug"
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
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[32px_1fr_56px_88px_28px] gap-4 py-2.5 border-b border-ink">
            {['#', 'Adress', 'Dagar', 'Hälsa', ''].map((h, i) => (
              <span
                key={i}
                className={`font-data text-[10px] text-mute uppercase tracking-[0.02em] ${i >= 2 ? 'text-right' : ''}`}
              >
                {h}
              </span>
            ))}
          </div>

          <ul>
            {items.map((item, i) => (
              <ObjectDocumentRow
                key={item.id}
                item={item}
                index={i + 1}
                onSelectObject={onSelectObject}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
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

  const daysLabel =
    item.status === 'sold'  ? 'Såld' :
    item.status === 'draft' ? '—' :
    `${item.days_on_market}d`

  const daysAlert = item.status === 'active' && item.days_on_market > 30

  return (
    <li>
      <button
        onClick={() => onSelectObject(item.id)}
        className="w-full text-left py-4 grid grid-cols-[32px_1fr_56px_88px_28px] gap-4 items-center border-t border-line group hover:pl-2 transition-all duration-150"
      >
        <span className="font-data text-[11px] text-mute-2 tabular-nums">{String(index).padStart(2, '0')}</span>

        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink leading-tight truncate">{item.address}</p>
          <p className="font-data text-[11px] text-mute mt-0.5 truncate">{item.area}</p>
        </div>

        <span className={`font-data text-[13px] tabular-nums text-right ${daysAlert ? 'text-accent' : 'text-mute'}`}>
          {daysLabel}
        </span>

        <div className="flex items-center gap-2 justify-end">
          <div className="w-10 h-[3px] bg-line rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.health_score}%`, background: healthColor }}
            />
          </div>
          <span
            className="font-data text-[12px] tabular-nums w-6 text-right"
            style={{ color: healthColor }}
          >
            {item.health_score}
          </span>
        </div>

        <span className="font-data text-[14px] text-mute-2 group-hover:text-accent transition-colors text-right">
          →
        </span>
      </button>
    </li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="h-full flex overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="px-10 pt-12 pb-10 border-b border-line space-y-4">
          <div className="h-3 w-28 bg-line rounded animate-pulse" />
          <div className="h-16 w-96 bg-line rounded animate-pulse" />
          <div className="h-3 w-40 bg-line rounded animate-pulse" />
        </div>
        <div className="px-10 py-10 border-b border-line space-y-4">
          <div className="h-8 w-64 bg-line rounded animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-tint rounded animate-pulse" />
          ))}
        </div>
        <div className="px-10 py-10 space-y-3">
          <div className="h-8 w-48 bg-line rounded animate-pulse" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-tint rounded animate-pulse" />
          ))}
        </div>
      </div>
      <aside className="w-[280px] border-l border-line bg-tint shrink-0">
        <div className="px-6 py-5 border-b border-line flex justify-between">
          <div className="h-2.5 w-16 bg-line rounded animate-pulse" />
          <div className="h-2.5 w-10 bg-line rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-9 bg-bg/60 rounded animate-pulse" />
          ))}
        </div>
      </aside>
    </div>
  )
}
