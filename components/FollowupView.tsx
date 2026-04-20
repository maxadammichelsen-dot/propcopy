'use client'

import { useEffect, useState } from 'react'

interface ViewedObject {
  id: string
  address: string
  area: string
  type: string
  price: number
}

interface OffMarketMatch {
  id: string
  address: string
  area: string
  type: string
}

interface QueueItem {
  id: string
  email: string | null
  status: 'hot' | 'warm'
  engagement_score: number
  events_count: number
  last_event_at: string | null
  viewed_objects: ViewedObject[]
  off_market_matches: OffMarketMatch[]
}

interface Stats {
  total: number
  has_email: number
  off_market_count: number
}

interface Draft {
  subject: string
  body: string
}

const STATUS_CONFIG = {
  hot:  { label: 'Het',  icon: '🔥', color: '#f87171' },
  warm: { label: 'Varm', icon: '🌡', color: '#fbbf24' },
}

function relativeTime(iso: string | null) {
  if (!iso) return 'okänt'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days === 0) return 'idag'
  if (days === 1) return 'igår'
  return `${days} dagar sedan`
}

export default function FollowupView() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, has_email: 0, off_market_count: 0 })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/followup')
      .then(r => r.json())
      .then(d => {
        setQueue(d.queue ?? [])
        setStats(d.stats ?? { total: 0, has_email: 0, off_market_count: 0 })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleGenerate(id: string) {
    setGenerating(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/followup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: id }),
      })
      const data = await res.json()
      if (res.ok) setDrafts(prev => ({ ...prev, [id]: data }))
    } finally {
      setGenerating(prev => ({ ...prev, [id]: false }))
    }
  }

  async function handleCopy(id: string) {
    const draft = drafts[id]
    if (!draft) return
    try {
      await navigator.clipboard.writeText(`Ämne: ${draft.subject}\n\n${draft.body}`)
      setCopied(prev => ({ ...prev, [id]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [id]: false })), 2000)
    } catch {}
  }

  if (loading) return <FollowupSkeleton />

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h2 className="font-serif text-3xl text-[#f0ece4]">Uppföljning</h2>
        <p className="text-sm text-[#555] mt-1">
          AI-personaliserade uppföljningar för era varmaste spekulanter
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {queue.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="I kö" value={String(stats.total)} />
              <MiniStat label="Med e-post" value={String(stats.has_email)} accent />
              <MiniStat label="Off-market matchningar" value={String(stats.off_market_count)} />
            </div>

            {/* Queue */}
            <div className="space-y-4">
              {queue.map(prospect => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  draft={drafts[prospect.id] ?? null}
                  generating={generating[prospect.id] ?? false}
                  copied={copied[prospect.id] ?? false}
                  onGenerate={() => handleGenerate(prospect.id)}
                  onCopy={() => handleCopy(prospect.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Prospect card ────────────────────────────────────────────

function ProspectCard({
  prospect, draft, generating, copied, onGenerate, onCopy,
}: {
  prospect: QueueItem
  draft: Draft | null
  generating: boolean
  copied: boolean
  onGenerate: () => void
  onCopy: () => void
}) {
  const cfg = STATUS_CONFIG[prospect.status]
  const hasEmail = !!prospect.email
  const canGenerate = hasEmail && !generating && !draft

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-[#1e1e1e]">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
          style={{
            backgroundColor: 'var(--brand-primary-dim, #b8965a33)',
            color: 'var(--brand-primary, #b8965a)',
          }}
        >
          {prospect.email ? prospect.email[0].toUpperCase() : '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#f0ece4] truncate">
            {prospect.email ?? 'Anonym besökare'}
          </p>
          <p className="text-[10px] text-[#555]">
            Senast aktiv {relativeTime(prospect.last_event_at)}
            {prospect.events_count > 0 && ` · ${prospect.events_count} händelser`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums" style={{ color: cfg.color }}>
            {cfg.icon} {prospect.engagement_score}p
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Viewed objects */}
        {prospect.viewed_objects.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#444] mb-1.5">Besökta objekt</p>
            <div className="space-y-1">
              {prospect.viewed_objects.map(obj => (
                <div key={obj.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-[#444]">→</span>
                  <span className="text-[#888]">{obj.address}</span>
                  <span className="text-[#444]">{obj.type} · {new Intl.NumberFormat('sv-SE').format(obj.price)} kr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Off-market matches */}
        {prospect.off_market_matches.length > 0 && (
          <div
            className="rounded border-l-2 pl-3 py-2"
            style={{ borderColor: 'var(--brand-primary-dim, #b8965a33)' }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-1">Off-market matchning</p>
            {prospect.off_market_matches.map(m => (
              <p key={m.id} className="text-[11px] text-[#888]">
                Ni har ett utkast som passar: <span className="text-[#d0ccc4]">{m.address}</span> ({m.type} i {m.area})
              </p>
            ))}
          </div>
        )}

        {/* Draft or Generate button */}
        {draft ? (
          <DraftDisplay draft={draft} copied={copied} onCopy={onCopy} />
        ) : (
          <div className="flex items-center gap-3">
            {hasEmail ? (
              <button
                onClick={onGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition-colors text-[#111111] disabled:opacity-60"
                style={{ backgroundColor: 'var(--brand-primary, #b8965a)' }}
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-[#11111166] border-t-[#111111] rounded-full animate-spin" />
                    Genererar…
                  </>
                ) : (
                  '✦ Generera uppföljning'
                )}
              </button>
            ) : (
              <p className="text-[10px] text-[#444]">
                Anonym besökare – e-post behövs för uppföljning
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Draft display ────────────────────────────────────────────

function DraftDisplay({
  draft, copied, onCopy,
}: {
  draft: Draft
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="rounded border border-[#232323] bg-[#111] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e1e1e]">
        <p className="text-[10px] uppercase tracking-widest text-[#555]">Genererat utkast</p>
        <button
          onClick={onCopy}
          className="text-[10px] transition-colors"
          style={{ color: copied ? '#4ade80' : 'var(--brand-primary, #b8965a)' }}
        >
          {copied ? '✓ Kopierat' : 'Kopiera allt'}
        </button>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[#444] mb-1">Ämne</p>
          <p className="text-xs text-[#d0ccc4] font-medium">{draft.subject}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-[#444] mb-1">Brödtext</p>
          <p className="text-xs text-[#888] leading-relaxed whitespace-pre-wrap">{draft.body}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Mini stat ────────────────────────────────────────────────

function MiniStat({ label, value, accent = false }: {
  label: string; value: string; accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">{label}</p>
      <p
        className="text-2xl font-light tabular-nums"
        style={{ color: accent ? 'var(--brand-primary, #b8965a)' : '#f0ece4' }}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-10 text-center">
      <div className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center mx-auto mb-4">
        <span className="text-xl">✦</span>
      </div>
      <h3 className="font-serif text-2xl text-[#f0ece4] mb-2">Inga spekulanter att följa upp</h3>
      <p className="text-sm text-[#555] max-w-xs mx-auto leading-relaxed">
        Installera spårningspixeln och samla in spekulanter som nått "varm" eller "het" status. De visas här automatiskt.
      </p>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────

function FollowupSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <div className="h-8 w-36 bg-[#1e1e1e] rounded animate-pulse" />
        <div className="h-4 w-60 bg-[#1a1a1a] rounded mt-2 animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
