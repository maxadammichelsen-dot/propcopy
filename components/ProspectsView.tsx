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
  hot:  { label: 'Het',  icon: '🔥', color: '#f87171' },
  warm: { label: 'Varm', icon: '🌡', color: '#fbbf24' },
  cold: { label: 'Kall', icon: '❄️', color: '#60a5fa' },
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
    } catch {
      // fallback: select the text
    }
  }

  if (loading) return <ProspectsSkeleton />

  const hasProspects = stats.total > 0

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-3xl text-[#f0ece4]">Spekulanter</h2>
          {hasProspects && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium tabular-nums"
              style={{
                backgroundColor: 'var(--brand-primary-dim, #b8965a33)',
                color: 'var(--brand-primary, #b8965a)',
              }}
            >
              {stats.total}
            </span>
          )}
        </div>
        <p className="text-sm text-[#555] mt-1">
          Besökare som interagerat med era bostäder
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {hasProspects ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {(['hot', 'warm', 'cold'] as const).map(s => (
                <div key={s} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                  <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">
                    {STATUS_CONFIG[s].label}
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-light tabular-nums" style={{ color: STATUS_CONFIG[s].color }}>
                      {stats[s]}
                    </span>
                    <span className="text-base mb-0.5">{STATUS_CONFIG[s].icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Prospect list */}
            <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#2a2a2a]">
                <p className="text-[10px] uppercase tracking-widest text-[#555]">
                  Sorterat efter engagemang
                </p>
              </div>
              <ul className="divide-y divide-[#1e1e1e]">
                {prospects.map(p => {
                  const cfg = STATUS_CONFIG[p.status]
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#161616] transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--brand-primary-dim, #b8965a33)',
                          color: 'var(--brand-primary, #b8965a)',
                        }}
                      >
                        {p.email ? p.email[0].toUpperCase() : '?'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f0ece4] truncate">
                          {p.name || p.email || 'Anonym besökare'}
                        </p>
                        <p className="text-[10px] text-[#555] mt-0.5">
                          {p.email && !p.name ? '' : p.email ? p.email + ' · ' : ''}
                          {relativeTime(p.created_at)}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <p className="text-sm tabular-nums" style={{ color: cfg.color }}>
                          {p.engagement_score}p
                        </p>
                        <p className="text-[10px] text-[#444]">
                          {cfg.icon} {cfg.label}
                        </p>
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
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
          <button
            onClick={() => setShowSnippet(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#161616] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">◉</span>
              <div className="text-left">
                <p className="text-sm text-[#d0ccc4] font-medium">
                  {hasProspects ? 'Hantera spårningspixeln' : 'Installera spårningspixeln'}
                </p>
                <p className="text-[10px] text-[#555]">
                  Klistra in en kodrad på er hemsida
                </p>
              </div>
            </div>
            <span className="text-[#555] text-sm transition-transform" style={{
              transform: showSnippet ? 'rotate(180deg)' : 'none',
            }}>
              ↓
            </span>
          </button>

          {showSnippet && (
            <div className="px-5 pb-5 space-y-4 border-t border-[#1e1e1e] pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-[#555]">Kodfragment</p>
                  <button
                    onClick={handleCopy}
                    className="text-[10px] transition-colors"
                    style={{ color: copied ? '#4ade80' : 'var(--brand-primary, #b8965a)' }}
                  >
                    {copied ? '✓ Kopierat' : 'Kopiera'}
                  </button>
                </div>
                <pre className="bg-[#111] border border-[#232323] rounded p-3 text-[10px] text-[#888] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                  {snippet}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-[#555]">Instruktioner</p>
                {[
                  'Klistra in kodstycket i <head> på alla sidor ni vill spåra',
                  'Lägg till data-object="OBJEKT_ID" för listningsnivå-spårning',
                  'Besökare spåras automatiskt – email fångas vid formulärskick',
                  'Engagemangspoäng: sidvisning +1, scroll 50%+ +2, tid +3, mail +20',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span
                      className="text-[10px] mt-0.5 shrink-0 tabular-nums"
                      style={{ color: 'var(--brand-primary, #b8965a)' }}
                    >
                      {i + 1}.
                    </span>
                    <p className="text-[10px] text-[#666] leading-relaxed">{tip}</p>
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
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
      <div className="w-10 h-10 rounded-full border border-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
        <span className="text-lg">◉</span>
      </div>
      <h3 className="font-serif text-xl text-[#f0ece4] mb-2">Inga spekulanter än</h3>
      <p className="text-sm text-[#555] max-w-xs mx-auto leading-relaxed">
        Installera spårningspixeln på er hemsida för att börja samla in besöksdata och identifiera potentiella köpare.
      </p>
      <div className="mt-4 flex items-center justify-center gap-4">
        {[
          { score: 28, label: 'anna@...', status: 'hot', icon: '🔥' },
          { score: 12, label: 'Anonym', status: 'warm', icon: '🌡' },
          { score: 3,  label: 'Anonym', status: 'cold', icon: '❄️' },
        ].map((p, i) => (
          <div key={i} className="opacity-20 text-center">
            <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center mx-auto mb-1 text-xs">?</div>
            <p className="text-[9px] text-[#555]">{p.label}</p>
            <p className="text-[9px]">{p.icon} {p.score}p</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────

function ProspectsSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <div className="h-8 w-36 bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-4 w-56 bg-[#1a1a1a] rounded mt-2 animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
      </div>
    </div>
  )
}
