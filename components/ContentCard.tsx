'use client'

import { useState } from 'react'
import { Channel, GenerateResult } from '@/types'
import ChannelBadge, { CHANNEL_CONFIG } from './ChannelBadge'

interface ContentCardProps {
  channel: Channel
  result: GenerateResult | null
  isActive: boolean
  onToggle: () => void
}

const CHANNEL_META: Record<Channel, { maxChars: number; description: string }> = {
  hemnet:         { maxChars: 1875, description: 'Rubrik + säljtext' },
  hemnet_raket:   { maxChars: 450,  description: 'Hook + komprimerad text' },
  meta:           { maxChars: 430,  description: 'Hook + primary text + CTA' },
  mail:           { maxChars: 900,  description: 'Ämnesrad + brödtext' },
  website:        { maxChars: 2500, description: 'Poetisk beskrivning' },
  booli:          { maxChars: 2075, description: 'Rubrik + faktabaserad beskrivning' },
  boneo:          { maxChars: 1875, description: 'Rubrik + säljtext' },
  boneo_kommande: { maxChars: 460,  description: 'Teaser för förhandsvisning' },
  hjem:           { maxChars: 965,  description: 'Rubrik + skandinavisk direkttext' },
  bovision:       { maxChars: 1575, description: 'Rubrik + unika särdrag' },
}

export default function ContentCard({ channel, result, isActive, onToggle }: ContentCardProps) {
  const [copied, setCopied] = useState(false)
  const meta = CHANNEL_META[channel]
  const cfg = CHANNEL_CONFIG[channel]
  const charCount = result?.char_count ?? 0
  const wordCount = result?.content
    ? result.content.trim().split(/\s+/).filter(Boolean).length
    : 0
  const overLimit = charCount > meta.maxChars
  const tooShort = !!result && charCount < meta.maxChars * 0.4
  const fillPct = Math.min((charCount / meta.maxChars) * 100, 100)

  async function handleCopy() {
    if (!result?.content) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Treat first non-empty line as headline if there are subsequent lines
  const lines = result?.content?.split('\n') ?? []
  const firstLine = lines[0]?.trim() ?? ''
  const rest = lines.slice(1).join('\n').trim()
  const hasStructure = firstLine && rest

  return (
    <div className={`border-b border-line transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>

      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">

          {/* Toggle */}
          <button
            onClick={onToggle}
            aria-label={isActive ? 'Inaktivera kanal' : 'Aktivera kanal'}
            className="w-8 h-[18px] rounded-full transition-colors relative shrink-0"
            style={{ background: isActive ? cfg.color : 'var(--line-2)' }}
          >
            <span
              className={`absolute top-[3px] w-3 h-3 rounded-full bg-bg transition-transform ${
                isActive ? 'translate-x-[17px]' : 'translate-x-[3px]'
              }`}
            />
          </button>

          <ChannelBadge channel={channel} />

          <div>
            <p className="text-[13px] font-medium text-ink">{cfg.label}</p>
            <p className="font-data text-[10px] text-mute tracking-snug">{meta.description}</p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-4 shrink-0">
            {/* Char fill bar */}
            <div className="text-right hidden sm:block">
              <p className={`font-data text-[11px] tabular-nums ${overLimit ? 'text-accent' : 'text-mute'}`}>
                {charCount} / {meta.maxChars}
              </p>
              <div className="w-20 h-[2px] bg-line rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    background: overLimit ? 'var(--accent)' : cfg.color,
                  }}
                />
              </div>
            </div>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="font-data text-[10px] uppercase tracking-[0.06em] text-mute hover:text-ink transition-colors px-3 py-1.5 border border-line rounded-full"
            >
              {copied ? '✓ Kopierad' : 'Kopiera'}
            </button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px] divide-y lg:divide-y-0 lg:divide-x divide-line border-t border-line">

          {/* Editorial text */}
          <div className="px-6 py-5">
            {result ? (
              <div className="space-y-3">
                {hasStructure ? (
                  <>
                    <p className="font-display text-[22px] leading-[1.1] tracking-[-0.02em] text-ink">
                      {firstLine}
                    </p>
                    <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">
                      {rest}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">
                    {result.content}
                  </p>
                )}
              </div>
            ) : (
              <p className="font-data text-[11px] text-mute-2 tracking-snug">
                Aktivera kanalen och generera texter för att se innehåll här
              </p>
            )}
          </div>

          {/* Metrics rail */}
          {result && (
            <div className="px-5 py-5 space-y-5">
              <MetricItem
                label="Tecken"
                value={charCount}
                note={`/ ${meta.maxChars}`}
                alert={overLimit}
              />
              <MetricItem label="Ord" value={wordCount} />

              {overLimit && (
                <p className="font-data text-[10px] text-accent tracking-snug leading-relaxed">
                  {charCount - meta.maxChars} tecken över gränsen
                </p>
              )}
              {tooShort && (
                <p className="font-data text-[10px] text-mute-2 tracking-snug leading-relaxed">
                  Texten kan vara kort för kanalen
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetricItem({
  label, value, note = '', alert = false,
}: {
  label: string; value: number; note?: string; alert?: boolean
}) {
  return (
    <div>
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className="font-data text-[20px] font-medium tabular-nums leading-none"
          style={{ color: alert ? 'var(--accent)' : 'var(--ink)' }}
        >
          {value}
        </span>
        {note && (
          <span className="font-data text-[10px] text-mute-2">{note}</span>
        )}
      </div>
    </div>
  )
}
