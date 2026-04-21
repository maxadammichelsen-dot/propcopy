'use client'

import { useEffect, useState } from 'react'
import type { CompetitionAreaData } from '@/types'

const REFRESH_STEPS = [
  'Analyserar era aktiva objekt…',
  'Hämtar marknadsdata för era områden…',
  'Identifierar konkurrenter på Hemnet…',
  'Genererar prisanalys med AI…',
]

const TREND_ICON: Record<string, string> = {
  rising: '↑',
  stable: '→',
  falling: '↓',
}

const TREND_COLOR: Record<string, string> = {
  rising:  'var(--accent)',
  stable:  'var(--mute)',
  falling: 'var(--mute-2)',
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('sv-SE').format(n) + ' kr'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('sv-SE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function CompetitionView() {
  const [areas, setAreas] = useState<CompetitionAreaData[]>([])
  const [hasData, setHasData] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshStep, setRefreshStep] = useState(0)

  useEffect(() => {
    fetch('/api/competition')
      .then(r => r.json())
      .then(d => {
        setAreas(d.areas ?? [])
        setHasData(d.has_data ?? false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshStep(0)

    const interval = setInterval(() => {
      setRefreshStep(prev => Math.min(prev + 1, REFRESH_STEPS.length - 1))
    }, 1100)

    try {
      const res = await fetch('/api/competition', { method: 'POST' })
      const data = await res.json()
      clearInterval(interval)
      setAreas(data.areas ?? [])
      setHasData(data.has_data ?? false)
    } catch {
      clearInterval(interval)
    } finally {
      setRefreshing(false)
      setRefreshStep(0)
    }
  }

  const lastRefreshed = areas[0]?.refreshed_at

  if (loading) return <CompetitionSkeleton />

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="border-b border-line px-8 py-6 flex items-start justify-between shrink-0">
        <div>
          <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
            Marknadsläge.
          </h2>
          <p className="font-data text-[11px] text-mute tracking-snug mt-2">
            AI-genererad analys av konkurrensläget i era säljområden
          </p>
        </div>

        {hasData && !refreshing && (
          <div className="text-right shrink-0">
            {lastRefreshed && (
              <p className="font-data text-[10px] text-mute-2 mb-1.5">
                {formatTime(lastRefreshed)}
              </p>
            )}
            <button
              onClick={handleRefresh}
              className="font-data text-[10px] text-mute hover:text-ink transition-colors tracking-snug"
            >
              Uppdatera
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {refreshing ? (
          <RefreshingState step={refreshStep} />
        ) : !hasData ? (
          <EmptyState onFetch={handleRefresh} />
        ) : (
          <div className="space-y-6 max-w-3xl">
            {areas.map(area => (
              <AreaSection key={area.area} area={area} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Area section ─────────────────────────────────────────────

function AreaSection({ area }: { area: CompetitionAreaData }) {
  const trend = area.price_trend ?? 'stable'

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">
      {/* Area header */}
      <div className="px-5 py-4 border-b border-line bg-tint flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[22px] leading-none tracking-[-0.02em] text-ink">
            {area.area}
          </h3>
          <span
            className="font-data text-[12px] font-medium"
            style={{ color: TREND_COLOR[trend] }}
            title={`Pristrend: ${trend}`}
          >
            {TREND_ICON[trend]}
          </span>
        </div>
        <p className="font-data text-[10px] text-mute-2">
          AI-uppskattning · {formatTime(area.refreshed_at)}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Market stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Aktiva objekt" value={String(area.market_count)} />
          <MiniStat label="Snitt pris"    value={formatPrice(area.avg_price)} />
          <MiniStat label="Snitt dagar"   value={`${area.avg_days_on_market}d`} />
        </div>

        {/* Our objects */}
        {area.our_objects.length > 0 && (
          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">
              Våra objekt
            </p>
            <div className="space-y-2">
              {area.our_objects.map(obj => (
                <OurObjectRow
                  key={obj.id}
                  obj={obj}
                  avgMarketPrice={area.avg_price}
                  priceDiffPct={area.price_diff_pct}
                />
              ))}
            </div>
          </div>
        )}

        {/* Competitors */}
        {area.listings.length > 0 && (
          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">
              Konkurrenter
            </p>
            <div className="border border-line rounded-lg overflow-hidden">
              {area.listings.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 hover:bg-tint transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink truncate">{l.address}</p>
                    <p className="font-data text-[10px] text-mute">{l.object_type}</p>
                  </div>
                  <p className="font-data text-[11px] text-ink-2 tabular-nums shrink-0">
                    {new Intl.NumberFormat('sv-SE').format(l.price)} kr
                  </p>
                  <p className="font-data text-[10px] text-mute w-10 text-right shrink-0">
                    {l.days_on_market}d
                  </p>
                  <p className="font-data text-[10px] text-mute-2 w-28 text-right truncate shrink-0 hidden sm:block">
                    {l.competitor_agency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI insight */}
        {area.insight && (
          <div className="border-l-2 border-line pl-4 py-1">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">
              AI-analys
            </p>
            <p className="text-[13px] text-mute italic leading-relaxed">{area.insight}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Our object row ───────────────────────────────────────────

function OurObjectRow({
  obj, avgMarketPrice, priceDiffPct,
}: {
  obj: { address: string; price: number; size: number; type: string }
  avgMarketPrice: number
  priceDiffPct: number | null
}) {
  const diff = priceDiffPct
  const diffLabel =
    diff === null ? null
    : Math.abs(diff) < 2 ? 'I linje med marknad'
    : diff > 0 ? `${diff}% över marknad`
    : `${Math.abs(diff)}% under marknad`

  const diffColor =
    diff === null ? 'var(--mute)'
    : Math.abs(diff) < 2 ? 'var(--mute)'
    : diff > 5 ? 'var(--accent)'
    : 'var(--ink-2)'

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-line bg-tint">
      <div>
        <p className="text-[13px] font-medium text-ink">{obj.address}</p>
        <p className="font-data text-[10px] text-mute">{obj.type} · {obj.size} kvm</p>
      </div>
      <div className="text-right">
        <p className="font-data text-[13px] text-ink tabular-nums">{formatPrice(obj.price)}</p>
        {diffLabel && (
          <p className="font-data text-[10px] tabular-nums" style={{ color: diffColor }}>
            {diffLabel}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Mini stat ────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-lg bg-tint px-4 py-3">
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">{label}</p>
      <p className="font-data text-[14px] text-ink tabular-nums font-medium">{value}</p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ onFetch }: { onFetch: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-20">
      <h3 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink mb-3">
        Hämta <em className="italic text-mute">marknadsdata.</em>
      </h3>
      <p className="font-data text-[11px] text-mute max-w-xs leading-relaxed mb-6 tracking-snug">
        Analysera konkurrensläget i era säljområden. AI genererar prisdata,
        konkurrentöversikt och rekommendationer.
      </p>
      <button
        onClick={onFetch}
        className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity"
      >
        Hämta marknadsdata
      </button>
    </div>
  )
}

// ─── Refreshing animation ─────────────────────────────────────

function RefreshingState({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-5 h-5 border-[1.5px] border-line border-t-accent rounded-full animate-spin mb-6" />
      <div className="space-y-2 w-64">
        {REFRESH_STEPS.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 transition-opacity duration-500"
            style={{ opacity: i <= step ? 1 : 0.2 }}
          >
            <div className="w-3 h-3 flex items-center justify-center shrink-0">
              {i < step ? (
                <span className="text-accent text-[10px]">✓</span>
              ) : i === step ? (
                <div className="w-2 h-2 rounded-full bg-accent" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-line-2" />
              )}
            </div>
            <p className={`font-data text-[11px] text-left tracking-snug ${
              i === step ? 'text-ink-2' : 'text-mute-2'
            }`}>
              {s}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function CompetitionSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-line px-8 py-6">
        <div className="h-9 w-48 bg-line rounded animate-pulse" />
        <div className="h-3 w-64 bg-line rounded mt-3 animate-pulse" />
      </div>
      <div className="px-8 py-6 space-y-4 max-w-3xl">
        <div className="h-48 rounded-lg border border-line bg-tint animate-pulse" />
        <div className="h-48 rounded-lg border border-line bg-tint animate-pulse" />
      </div>
    </div>
  )
}
