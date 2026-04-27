'use client'

import { useEffect, useMemo, useState } from 'react'
import type { NominatimAddress, OSMData, OSMPlace } from '@/types'

interface EnrichmentCardProps {
  objectId: string
  initialEnabled?: string[]
}

const CATEGORY_ORDER: (keyof OSMData)[] = [
  'schools', 'groceries', 'restaurants', 'parks',
  'healthcare', 'transport', 'culture', 'service', 'coast',
]

const CATEGORY_LABELS: Record<keyof OSMData, string> = {
  schools:     'Skolor',
  groceries:   'Livsmedel',
  restaurants: 'Restauranger',
  parks:       'Rekreation',
  healthcare:  'Hälsa',
  coast:       'Hav och strand',
  culture:     'Kultur',
  transport:   'Transport',
  service:     'Service',
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`
  return `${(m / 1000).toFixed(1).replace('.', ',')}km`
}

function factId(category: keyof OSMData, name: string): string {
  return `osm:${category}:${name}`
}

export default function EnrichmentCard({ objectId, initialEnabled }: EnrichmentCardProps) {
  const [osm, setOsm]                 = useState<OSMData | null>(null)
  const [geoPosition, setGeoPosition] = useState<NominatimAddress | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [retrying, setRetrying]       = useState(false)
  const [explicitList, setExplicitList] = useState<string[]>(initialEnabled ?? [])
  const [allFactIds, setAllFactIds]   = useState<string[]>([])

  function doFetch(force = false) {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_id: objectId, ...(force ? { force: true } : {}) }),
    })
      .then((r) => r.json())
      .then((d: { osm: OSMData; error?: string; geoPosition?: NominatimAddress | null }) => {
        if (cancelled) return
        if (d.error) setError(d.error)
        setGeoPosition(d.geoPosition ?? null)
        if (d.osm) {
          setOsm(d.osm)
          const ids: string[] = []
          for (const cat of CATEGORY_ORDER) {
            for (const p of d.osm[cat] ?? []) ids.push(factId(cat, p.name))
          }
          setAllFactIds(ids)
        }
      })
      .catch((err) => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) { setLoading(false); setRetrying(false) } })
    return () => { cancelled = true }
  }

  useEffect(() => { doFetch() }, [objectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Effective enabled-set: empty list = all enabled.
  const enabledSet = useMemo(() => {
    if (explicitList.length === 0) return new Set(allFactIds)
    return new Set(explicitList)
  }, [explicitList, allFactIds])

  async function persistList(next: string[]) {
    try {
      await fetch(`/api/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_enrichment_facts: next }),
      })
    } catch (err) {
      console.error('[EnrichmentCard] persist error:', err)
    }
  }

  function toggle(id: string) {
    let baseList = explicitList
    if (baseList.length === 0) baseList = allFactIds
    const next = enabledSet.has(id)
      ? baseList.filter((f) => f !== id)
      : [...baseList, id]
    setExplicitList(next)
    persistList(next)
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        <span style={labelStyle}>Närservice</span>
        <span style={muteStyle}>Hämtar närservice från kartdata…</span>
      </div>
    )
  }

  if (error || !osm) {
    return (
      <div style={{ ...cardStyle, gap: '10px' }}>
        <span style={labelStyle}>Närservice</span>
        <span style={muteStyle}>{error ?? 'Ingen data tillgänglig'}</span>
        <button
          type="button"
          disabled={retrying}
          onClick={() => { setRetrying(true); doFetch(true) }}
          style={{
            marginLeft: 'auto',
            fontFamily: "'Geist Mono', monospace",
            fontSize: 11,
            letterSpacing: '-0.01em',
            padding: '3px 10px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'transparent',
            color: 'var(--mute)',
            cursor: retrying ? 'default' : 'pointer',
            opacity: retrying ? 0.5 : 1,
          }}
        >
          {retrying ? 'Försöker…' : 'Försök igen'}
        </button>
      </div>
    )
  }

  const hasAny = CATEGORY_ORDER.some((c) => (osm[c]?.length ?? 0) > 0)
  if (!hasAny) {
    return (
      <div style={cardStyle}>
        <span style={labelStyle}>Närservice</span>
        <span style={muteStyle}>Inga platser hittades inom 1,5 km.</span>
      </div>
    )
  }

  const geoLabel = geoPosition
    ? [geoPosition.suburb, geoPosition.borough, geoPosition.city_district?.toLowerCase()]
        .filter(Boolean).join(' · ')
    : null

  return (
    <div style={{ ...cardStyle, alignItems: 'flex-start', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <span style={{ ...labelStyle, minWidth: '92px' }}>Position</span>
        {geoLabel ? (
          <span style={muteStyle}>{geoLabel}</span>
        ) : (
          <span style={{ ...muteStyle, opacity: 0.6 }}>
            Geografisk position saknas —{' '}
            <button
              type="button"
              onClick={() => { setRetrying(true); doFetch(true) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Geist Mono', monospace", fontSize: 11, color: 'var(--mute)', textDecoration: 'underline', letterSpacing: '-0.01em' }}
            >
              uppdatera
            </button>
          </span>
        )}
      </div>
      <span style={labelStyle}>Närservice (klicka för att exkludera)</span>
      {CATEGORY_ORDER.map((cat) => {
        const items: OSMPlace[] = osm[cat] ?? []
        if (items.length === 0) return null
        return (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ ...muteStyle, minWidth: '92px' }}>{CATEGORY_LABELS[cat]}</span>
            {items.map((p) => {
              const id = factId(cat, p.name)
              const active = enabledSet.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '-0.01em',
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--mute)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title={active ? 'Klicka för att exkludera från text' : 'Klicka för att inkludera i text'}
                >
                  {cat === 'transport' ? (() => {
                    const suffix = p.vehicle_type === 'tåg' ? 'station' : p.vehicle_type === 'färja' ? 'brygga' : 'hållplats'
                    const lower = p.name.toLowerCase()
                    const hasKeyword = lower.includes('station') || lower.includes('hållplats') || lower.includes('brygga')
                    const label = hasKeyword ? p.name : `${p.name} ${suffix}`
                    return `${label} · ${Math.round(p.distance / 80)} min`
                  })() : `${p.name} · ${formatDistance(p.distance)}`}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  margin: '8px 32px 0',
  padding: '10px 14px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--tint)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: 10,
  color: 'var(--mute)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  flexShrink: 0,
}

const muteStyle: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: 11,
  color: 'var(--mute)',
  letterSpacing: '-0.01em',
}
