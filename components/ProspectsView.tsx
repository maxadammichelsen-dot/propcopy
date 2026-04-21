'use client'

import { useEffect, useState } from 'react'
import type { Agency } from '@/types'

interface Prospect {
  id: string
  email: string | null
  name: string | null
  engagement_score: number
  status: 'cold' | 'warm' | 'hot'
  created_at: string
}

interface Stats {
  total: number
  hot: number
  warm: number
  cold: number
}

const STATUS_CONFIG = {
  hot:  { label: 'Het',  dot: 'bg-accent',    text: 'text-accent' },
  warm: { label: 'Varm', dot: 'bg-amber-400',  text: 'text-amber-600' },
  cold: { label: 'Kall', dot: 'bg-line-2',     text: 'text-mute' },
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'idag'
  if (days === 1) return 'igår'
  return `${days} dagar sedan`
}

interface ProspectsViewProps {
  agency: Agency | null
}

export default function ProspectsView({ agency }: ProspectsViewProps) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, hot: 0, warm: 0, cold: 0 })
  const [loading, setLoading] = useState(true)
  const [showSnippet, setShowSnippet] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(d => {
        setProspects(d.prospects ?? [])
        setStats(d.stats ?? { total: 0, hot: 0, warm: 0, cold: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.estatio.se'
  const snippet = agency?.id
    ? `<script src="${origin}/track.js" data-agency="${agency.id}" async></script>`
    : `<script src="${origin}/track.js" data-agency="DITT_AGENCY_ID" async></script>`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (loading) return <ProspectsSkeleton />

  const hasProspects = stats.total > 0

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="border-b border-line px-8 py-6 shrink-0">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
            Spekulanter.
          </h2>
          {hasProspects && (
            <span className="font-data text-[11px] text-mute tabular-nums">{stats.total}</span>
          )}
        </div>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          Besökare som interagerat med era bostäder
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {hasProspects ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {(['hot', 'warm', 'cold'] as const).map(s => (
                <div key={s} className="border border-line rounded-lg bg-tint px-4 py-3">
                  <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">
                    {STATUS_CONFIG[s].label}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`font-data text-[24px] font-medium tabular-nums leading-none ${STATUS_CONFIG[s].text}`}>
                      {stats[s]}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Prospect list */}
            <div className="border border-line rounded-lg overflow-hidden bg-bg">
              <div className="px-5 py-3 border-b border-line bg-tint">
                <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
                  Sorterat efter engagemang
                </p>
              </div>
              <ul className="divide-y divide-line">
                {prospects.map(p => {
                  const cfg = STATUS_CONFIG[p.status]
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-tint transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center shrink-0">
                        <span className="font-data text-[11px] text-mute font-medium">
                          {p.email ? p.email[0].toUpperCase() : '?'}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">
                          {p.name || p.email || 'Anonym besökare'}
                        </p>
                        <p className="font-data text-[10px] text-mute mt-0.5 tracking-snug">
                          {p.email && !p.name ? '' : p.email ? p.email + ' · ' : ''}
                          {relativeTime(p.created_at)}
                        </p>
                      </div>

                      {/* Score + status */}
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className={`font-data text-[11px] tabular-nums ${cfg.text}`}>
                          {p.engagement_score}p
                        </span>
                        <span className={`w-[5px] h-[5px] rounded-full ${cfg.dot}`} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        ) : (
          <EmptyState />
        )}

        {/* Install section */}
        <div className="border border-line rounded-lg overflow-hidden bg-bg">
          <button
            onClick={() => setShowSnippet(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-tint transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <div className="text-left">
                <p className="text-[13px] font-medium text-ink">
                  {hasProspects ? 'Hantera spårningspixeln' : 'Installera spårningspixeln'}
                </p>
                <p className="font-data text-[10px] text-mute tracking-snug">
                  Klistra in en kodrad på er hemsida
                </p>
              </div>
            </div>
            <span className="font-data text-[11px] text-mute transition-transform duration-200"
              style={{ display: 'inline-block', transform: showSnippet ? 'rotate(180deg)' : 'none' }}>
              ↓
            </span>
          </button>

          {showSnippet && (
            <div className="px-5 pb-5 space-y-4 border-t border-line pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">Kodfragment</p>
                  <button
                    onClick={handleCopy}
                    className={`font-data text-[10px] tracking-snug ${copied ? 'text-ink' : 'text-accent hover:underline'}`}
                  >
                    {copied ? '✓ Kopierat' : 'Kopiera'}
                  </button>
                </div>
                <pre className="bg-tint border border-line rounded-lg p-3 font-data text-[10px] text-ink-2 leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {snippet}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">Instruktioner</p>
                {[
                  'Klistra in kodstycket i <head> på alla sidor ni vill spåra',
                  'Lägg till data-object="OBJEKT_ID" för listningsnivå-spårning',
                  'Besökare spåras automatiskt – email fångas vid formulärskick',
                  'Engagemangspoäng: sidvisning +1, scroll 50%+ +2, tid +3, mail +20',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="font-data text-[10px] text-mute tabular-nums shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <p className="font-data text-[10px] text-mute leading-relaxed tracking-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border border-line rounded-lg bg-tint px-8 py-10 text-center">
      <h3 className="font-display text-[28px] leading-[0.95] tracking-[-0.02em] text-ink mb-2">
        Inga spekulanter <em className="italic text-mute">än.</em>
      </h3>
      <p className="font-data text-[11px] text-mute max-w-xs mx-auto leading-relaxed tracking-snug mb-5">
        Installera spårningspixeln på er hemsida för att börja samla in
        besöksdata och identifiera potentiella köpare.
      </p>
      <div className="flex items-center justify-center gap-6 opacity-25 pointer-events-none select-none">
        {[
          { initial: 'A', score: 28, label: 'Het' },
          { initial: 'M', score: 12, label: 'Varm' },
          { initial: 'S', score: 3,  label: 'Kall' },
        ].map((p, i) => (
          <div key={i} className="text-center">
            <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center mx-auto mb-1">
              <span className="font-data text-[11px] text-mute">{p.initial}</span>
            </div>
            <p className="font-data text-[9px] text-mute-2">{p.score}p</p>
            <p className="font-data text-[9px] text-mute-2">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function ProspectsSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-line px-8 py-6">
        <div className="h-9 w-40 bg-line rounded animate-pulse" />
        <div className="h-3 w-56 bg-line rounded mt-3 animate-pulse" />
      </div>
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-line bg-tint animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-line bg-tint animate-pulse" />
      </div>
    </div>
  )
}
