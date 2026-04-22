'use client'

import { useEffect, useState } from 'react'
import { Agency, Channel, GenerateResult, KeyInsights, PropertyObject } from '@/types'
import ContentCard from './ContentCard'
import InsightsCard from './InsightsCard'
import MetaPublishView from './MetaPublishView'
import RevisionView from './RevisionView'

type DetailTab = 'copy' | 'publish' | 'revision'

interface ObjectDetailProps {
  object: PropertyObject
  agency: Agency | null
}

const ALL_CHANNELS: Channel[] = [
  'hemnet', 'hemnet_raket', 'meta', 'mail', 'website',
  'booli', 'boneo', 'boneo_kommande', 'hjem', 'bovision',
]

const EMPTY_RESULTS = Object.fromEntries(
  ALL_CHANNELS.map((c) => [c, null])
) as Record<Channel, GenerateResult | null>

export default function ObjectDetail({ object, agency }: ObjectDetailProps) {
  const [detailTab, setDetailTab] = useState<DetailTab>('copy')
  const [activeChannels, setActiveChannels] = useState<Set<Channel>>(new Set(ALL_CHANNELS))
  const [results, setResults] = useState<Record<Channel, GenerateResult | null>>(EMPTY_RESULTS)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState<KeyInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    setInsights(null)
    setInsightsLoading(true)
    fetch('/api/keyinsights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_id: object.id }),
    })
      .then(r => r.json())
      .then(d => { if (d.insights) setInsights(d.insights) })
      .catch(() => {})
      .finally(() => setInsightsLoading(false))
  }, [object.id])

  function toggleChannel(channel: Channel) {
    setActiveChannels((prev) => {
      const next = new Set(prev)
      if (next.has(channel)) next.delete(channel)
      else next.add(channel)
      return next
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ object_id: object.id }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Generering misslyckades')
      setGenerating(false)
      return
    }

    const resultMap: Record<Channel, GenerateResult | null> = { ...EMPTY_RESULTS }
    for (const r of data.results as GenerateResult[]) {
      resultMap[r.channel] = r
    }
    setResults(resultMap)
    setGenerating(false)
  }

  const hasResults = Object.values(results).some(Boolean)

  return (
    <div className="flex flex-col h-full">

      {/* Object header */}
      <div className="border-b border-line px-8 py-6 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-[32px] leading-[0.93] tracking-[-0.025em] text-ink truncate">
              {object.address}
            </h2>
            <p className="font-data text-[11px] text-mute mt-1.5 tracking-snug">
              {object.area} · {object.type} · {object.size} kvm ·{' '}
              {new Intl.NumberFormat('sv-SE').format(object.price)} kr
            </p>
            {agency?.tone_profile?.tags && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {agency.tone_profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-data text-[10px] text-mute border border-line rounded-full px-2.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {detailTab === 'copy' && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="shrink-0 bg-ink text-bg px-5 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
                  Genererar…
                </>
              ) : (
                hasResults ? 'Generera igen' : 'Generera texter'
              )}
            </button>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-0.5 mt-5 p-[3px] bg-tint rounded-full w-fit">
          {([
            { key: 'copy',     label: 'Kanaltexter' },
            { key: 'revision', label: 'Revision' },
            { key: 'publish',  label: 'Publicera' },
          ] as { key: DetailTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDetailTab(key)}
              className={[
                'px-4 py-[6px] rounded-full text-[12px] font-medium transition-all duration-150 leading-none',
                detailTab === key
                  ? 'bg-bg text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_var(--line)]'
                  : 'text-mute hover:text-ink-2',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {detailTab === 'copy' ? (
        <>
          {error && (
            <div className="mx-8 mt-4 px-4 py-2.5 border border-accent/20 bg-accent/5 rounded-lg">
              <p className="font-data text-[11px] text-accent tracking-snug">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <InsightsCard insights={insights} loading={insightsLoading} />
            {generating ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-5 h-5 border-[1.5px] border-line border-t-accent rounded-full animate-spin mb-4" />
                <p className="font-data text-[11px] text-mute tracking-snug">
                  Genererar alla kanaler parallellt…
                </p>
                <p className="font-data text-[10px] text-mute-2 mt-1 tracking-snug">
                  Vanligtvis klart inom 10–15 sekunder
                </p>
              </div>
            ) : (
              ALL_CHANNELS.map((channel) => (
                <ContentCard
                  key={channel}
                  channel={channel}
                  result={results[channel]}
                  isActive={activeChannels.has(channel)}
                  onToggle={() => toggleChannel(channel)}
                  objectId={object.id}
                  agencyId={object.agency_id}
                />
              ))
            )}
          </div>
        </>
      ) : detailTab === 'revision' ? (
        <div className="flex-1 overflow-hidden">
          <RevisionView objectId={object.id} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MetaPublishView object={object} agency={agency} results={results} />
        </div>
      )}
    </div>
  )
}
