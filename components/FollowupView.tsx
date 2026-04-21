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
  hot:  { label: 'Het',  dot: 'bg-accent',   text: 'text-accent' },
  warm: { label: 'Varm', dot: 'bg-amber-400', text: 'text-amber-600' },
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

      {/* Header */}
      <div className="border-b border-line px-8 py-6 shrink-0">
        <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
          Uppföljning.
        </h2>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          AI-personaliserade uppföljningar för era varmaste spekulanter
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        {queue.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="I kö"                   value={String(stats.total)} />
              <MiniStat label="Med e-post"             value={String(stats.has_email)} accent />
              <MiniStat label="Off-market matchningar" value={String(stats.off_market_count)} />
            </div>

            {/* Queue */}
            <div className="space-y-3">
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

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-line bg-tint">
        <div className="w-9 h-9 rounded-full bg-line flex items-center justify-center text-sm font-medium shrink-0">
          <span className="font-data text-[12px] text-mute">
            {prospect.email ? prospect.email[0].toUpperCase() : '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-ink truncate">
            {prospect.email ?? 'Anonym besökare'}
          </p>
          <p className="font-data text-[10px] text-mute tracking-snug">
            Senast aktiv {relativeTime(prospect.last_event_at)}
            {prospect.events_count > 0 && ` · ${prospect.events_count} händelser`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-data text-[11px] tabular-nums ${cfg.text}`}>
            {prospect.engagement_score}p
          </span>
          <span className={`w-[5px] h-[5px] rounded-full ${cfg.dot}`} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Viewed objects */}
        {prospect.viewed_objects.length > 0 && (
          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1.5">
              Besökta objekt
            </p>
            <div className="space-y-1">
              {prospect.viewed_objects.map(obj => (
                <div key={obj.id} className="flex items-center gap-2 text-[12px]">
                  <span className="text-mute-2">→</span>
                  <span className="text-ink-2">{obj.address}</span>
                  <span className="font-data text-[10px] text-mute tracking-snug">
                    {obj.type} · {new Intl.NumberFormat('sv-SE').format(obj.price)} kr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Off-market matches */}
        {prospect.off_market_matches.length > 0 && (
          <div className="border-l-2 border-line pl-3 py-1">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">
              Off-market matchning
            </p>
            {prospect.off_market_matches.map(m => (
              <p key={m.id} className="font-data text-[11px] text-mute tracking-snug">
                Ni har ett utkast som passar:{' '}
                <span className="text-ink font-medium">{m.address}</span>{' '}
                ({m.type} i {m.area})
              </p>
            ))}
          </div>
        )}

        {/* Draft or generate button */}
        {draft ? (
          <DraftDisplay draft={draft} copied={copied} onCopy={onCopy} />
        ) : (
          <div>
            {hasEmail ? (
              <button
                onClick={onGenerate}
                disabled={generating}
                className="bg-ink text-bg px-5 py-2 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
                    Genererar…
                  </>
                ) : (
                  'Generera uppföljning'
                )}
              </button>
            ) : (
              <p className="font-data text-[10px] text-mute-2 tracking-snug">
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
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-tint">
        <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
          Genererat utkast
        </p>
        <button
          onClick={onCopy}
          className={`font-data text-[10px] tracking-snug ${copied ? 'text-ink' : 'text-accent hover:underline'}`}
        >
          {copied ? '✓ Kopierat' : 'Kopiera allt'}
        </button>
      </div>
      <div className="px-4 py-3 space-y-3 bg-bg">
        <div>
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">Ämne</p>
          <p className="text-[13px] font-medium text-ink">{draft.subject}</p>
        </div>
        <div>
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">Brödtext</p>
          <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">{draft.body}</p>
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
    <div className="border border-line rounded-lg bg-tint px-4 py-3">
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">{label}</p>
      <p className={`font-data text-[24px] font-medium tabular-nums leading-none ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border border-line rounded-lg bg-tint px-8 py-10 text-center">
      <h3 className="font-display text-[28px] leading-[0.95] tracking-[-0.02em] text-ink mb-2">
        Inga spekulanter att <em className="italic text-mute">följa upp.</em>
      </h3>
      <p className="font-data text-[11px] text-mute max-w-xs mx-auto leading-relaxed tracking-snug">
        Installera spårningspixeln och samla in spekulanter som nått "varm"
        eller "het" status. De visas här automatiskt.
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────

function FollowupSkeleton() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-line px-8 py-6">
        <div className="h-9 w-40 bg-line rounded animate-pulse" />
        <div className="h-3 w-60 bg-line rounded mt-3 animate-pulse" />
      </div>
      <div className="px-8 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-line bg-tint animate-pulse" />
          ))}
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg border border-line bg-tint animate-pulse" />
        ))}
      </div>
    </div>
  )
}
