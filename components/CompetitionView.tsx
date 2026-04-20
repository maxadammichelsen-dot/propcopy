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
  rising: '#4ade80',
  stable: '#888',
  falling: '#f87171',
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
      <div className="p-6 border-b border-[#2a2a2a] flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl text-[#f0ece4]">Marknadsläge</h2>
          <p className="text-sm text-[#555] mt-1">
            AI-genererad analys av konkurrensläget i era säljområden
          </p>
        </div>
        {hasData && !refreshing && (
          <div className="text-right">
            {lastRefreshed && (
              <p className="text-[10px] text-[#444] mb-1.5">
                Uppdaterat {formatTime(lastRefreshed)}
              </p>
            )}
            <button
              onClick={handleRefresh}
              className="text-[10px] text-[#555] hover:text-[var(--brand-primary,#b8965a)] transition-colors"
            >
              Uppdatera
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {refreshing ? (
          <RefreshingState step={refreshStep} />
        ) : !hasData ? (
          <EmptyState onFetch={handleRefresh} />
        ) : (
          <div className="space-y-6">
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
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      {/* Area header */}
      <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-xl text-[#f0ece4]">{area.area}</h3>
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: TREND_COLOR[trend] }}
            title={`Pristrend: ${trend}`}
          >
            {TREND_ICON[trend]}
          </span>
        </div>
        <p className="text-[10px] text-[#444]">
          AI-uppskattning • {formatTime(area.refreshed_at)}
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Market stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Aktiva objekt" value={String(area.market_count)} />
          <MiniStat label="Snitt pris" value={formatPrice(area.avg_price)} />
          <MiniStat label="Snitt dagar" value={`${area.avg_days_on_market} d`} />
        </div>

        {/* Our objects pricing */}
        {area.our_objects.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Våra objekt</p>
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

        {/* Competitor listings */}
        {area.listings.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Konkurrenter</p>
            <div className="rounded border border-[#232323] overflow-hidden">
              {area.listings.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e1e1e] last:border-0 hover:bg-[#161616] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#d0ccc4] truncate">{l.address}</p>
                    <p className="text-[10px] text-[#444]">{l.object_type}</p>
                  </div>
                  <p className="text-xs text-[#888] tabular-nums shrink-0">
                    {new Intl.NumberFormat('sv-SE').format(l.price)} kr
                  </p>
                  <p className="text-[10px] text-[#444] w-10 text-right shrink-0">{l.days_on_market}d</p>
                  <p className="text-[10px] text-[#333] w-28 text-right truncate shrink-0 hidden sm:block">
                    {l.competitor_agency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI insight */}
        {area.insight && (
          <div
            className="rounded border-l-2 pl-4 py-2"
            style={{ borderColor: 'var(--brand-primary-dim, #b8965a33)' }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[#444] mb-1">AI-analys</p>
            <p className="text-xs text-[#888] leading-relaxed italic">{area.insight}</p>
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
    diff === null ? '#555'
    : Math.abs(diff) < 2 ? '#888'
    : diff > 5 ? '#fbbf24'
    : '#4ade80'

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded border"
      style={{ borderColor: 'var(--brand-primary-dim, #b8965a33)', backgroundColor: '#161616' }}
    >
      <div>
        <p className="text-sm text-[#f0ece4]">{obj.address}</p>
        <p className="text-[10px] text-[#555]">
          {obj.type} · {obj.size} kvm
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-[#f0ece4] tabular-nums">{formatPrice(obj.price)}</p>
        {diffLabel && (
          <p className="text-[10px] tabular-nums" style={{ color: diffColor }}>
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
    <div className="rounded border border-[#232323] bg-[#161616] p-3">
      <p className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{label}</p>
      <p className="text-sm text-[#d0ccc4] tabular-nums font-medium">{value}</p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState({ onFetch }: { onFetch: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-20">
      <div className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center mb-4">
        <span className="text-xl">◎</span>
      </div>
      <h3 className="font-serif text-2xl text-[#f0ece4] mb-2">Hämta marknadsdata</h3>
      <p className="text-sm text-[#555] max-w-xs leading-relaxed mb-6">
        Analysera konkurrensläget i era säljområden. AI genererar prisdata, konkurrentöversikt och rekommendationer.
      </p>
      <button
        onClick={onFetch}
        className="px-6 py-2.5 rounded text-sm font-medium transition-colors text-[#111111]"
        style={{ backgroundColor: 'var(--brand-primary, #b8965a)' }}
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
      <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[var(--brand-primary,#b8965a)] rounded-full animate-spin mb-6" />
      <div className="space-y-3 w-56">
        {REFRESH_STEPS.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 transition-opacity duration-500"
            style={{ opacity: i <= step ? 1 : 0.2 }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300"
              style={{
                backgroundColor: i < step
                  ? 'var(--brand-primary, #b8965a)'
                  : i === step
                  ? 'var(--brand-primary, #b8965a)'
                  : '#333',
              }}
            />
            <p
              className="text-xs text-left"
              style={{ color: i === step ? '#f0ece4' : '#555' }}
            >
              {s}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────

function CompetitionSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <div className="h-8 w-40 bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-4 w-64 bg-[#1a1a1a] rounded mt-2 animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        <div className="h-48 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        <div className="h-48 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
      </div>
    </div>
  )
}
