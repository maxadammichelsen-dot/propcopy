'use client'

import { useState } from 'react'
import { Channel, GenerateResult } from '@/types'

interface ContentCardProps {
  channel: Channel
  result: GenerateResult | null
  isActive: boolean
  onToggle: () => void
}

const CHANNEL_META: Record<Channel, { label: string; maxChars: number; description: string }> = {
  hemnet: { label: 'Hemnet', maxChars: 1875, description: 'Rubrik + säljtext' },
  hemnet_raket: { label: 'Hemnet Raket', maxChars: 450, description: 'Hook + komprimerad text' },
  meta: { label: 'Meta Ads', maxChars: 430, description: 'Hook + primary text + CTA' },
  mail: { label: 'E-post', maxChars: 900, description: 'Ämnesrad + brödtext' },
  website: { label: 'Hemsida', maxChars: 2500, description: 'Poetisk beskrivning' },
}

export default function ContentCard({ channel, result, isActive, onToggle }: ContentCardProps) {
  const [copied, setCopied] = useState(false)
  const meta = CHANNEL_META[channel]
  const charCount = result?.char_count ?? 0
  const overLimit = charCount > meta.maxChars
  const fillPct = Math.min((charCount / meta.maxChars) * 100, 100)

  async function handleCopy() {
    if (!result?.content) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`rounded-lg border transition-all ${
        isActive
          ? 'border-[#2a2a2a] bg-[#1a1a1a]'
          : 'border-[#1e1e1e] bg-[#151515] opacity-60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              isActive ? 'bg-[#b8965a]' : 'bg-[#2a2a2a]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#111111] transition-transform ${
                isActive ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
          <div>
            <p className="text-sm text-[#f0ece4] font-medium">{meta.label}</p>
            <p className="text-[10px] text-[#555]">{meta.description}</p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={`text-xs font-mono ${overLimit ? 'text-red-400' : 'text-[#888]'}`}>
                {charCount} / {meta.maxChars}
              </p>
              <div className="w-20 h-0.5 bg-[#2a2a2a] rounded-full mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    overLimit ? 'bg-red-400' : 'bg-[#b8965a]'
                  }`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="text-[10px] uppercase tracking-widest text-[#555] hover:text-[#b8965a] transition-colors px-2 py-1 border border-[#2a2a2a] rounded"
            >
              {copied ? '✓ Kopierad' : 'Kopiera'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isActive && (
        <div className="p-4">
          {result ? (
            <pre className="text-sm text-[#c8c4bc] whitespace-pre-wrap leading-relaxed font-sans">
              {result.content}
            </pre>
          ) : (
            <p className="text-[#444] text-sm italic">
              Generera text för att se innehåll här
            </p>
          )}
        </div>
      )}
    </div>
  )
}
