'use client'

import { useState } from 'react'
import { Agency, Channel, GenerateResult, PropertyObject } from '@/types'
import ContentCard from './ContentCard'
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
      <div className="p-6 border-b border-[#2a2a2a]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-3xl text-[#f0ece4] leading-tight">{object.address}</h2>
            <p className="text-sm text-[#555] mt-1">
              {object.area} · {object.type} · {object.size} kvm ·{' '}
              {new Intl.NumberFormat('sv-SE').format(object.price)} kr
            </p>
            {agency?.tone_profile?.tags && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {agency.tone_profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest text-[#b8965a] border border-[#b8965a33] rounded-full px-2 py-0.5"
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
              className="shrink-0 ml-4 flex items-center gap-2 px-5 py-2.5 bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-[#11111166] border-t-[#111111] rounded-full animate-spin" />
                  Genererar…
                </>
              ) : (
                hasResults ? 'Generera igen' : 'Generera texter'
              )}
            </button>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 mt-4">
          {([
            { key: 'copy',     label: 'Kanaltexter' },
            { key: 'revision', label: 'Revision' },
            { key: 'publish',  label: 'Publicera' },
          ] as { key: DetailTab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDetailTab(key)}
              className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded transition-colors border ${
                detailTab === key
                  ? 'border-[#b8965a33] bg-[#b8965a0d] text-[#b8965a]'
                  : 'border-transparent text-[#555] hover:text-[#888]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {detailTab === 'copy' ? (
        <>
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-900/40 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {generating && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-[#b8965a] rounded-full animate-spin mb-4" />
                <p className="text-[#555] text-sm">Genererar alla kanaler parallellt…</p>
                <p className="text-[#333] text-xs mt-1">Vanligtvis klart inom 10–15 sekunder</p>
              </div>
            )}

            {!generating && ALL_CHANNELS.map((channel) => (
              <ContentCard
                key={channel}
                channel={channel}
                result={results[channel]}
                isActive={activeChannels.has(channel)}
                onToggle={() => toggleChannel(channel)}
              />
            ))}
          </div>
        </>
      ) : detailTab === 'revision' ? (
        <div className="flex-1 overflow-hidden">
          <RevisionView objectId={object.id} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MetaPublishView object={object} agency={agency} />
        </div>
      )}
    </div>
  )
}
