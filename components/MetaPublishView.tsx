'use client'

import { useEffect, useState } from 'react'
import { Agency, PropertyObject } from '@/types'

interface MetaPublishViewProps {
  object: PropertyObject
  agency: Agency | null
}

type Tab = 'organic' | 'ad' | 'schedule'
type Platform = 'facebook' | 'instagram' | 'both'

interface ScheduledPost {
  id: string
  platform: Platform
  status: string
  scheduled_for: string | null
  published_at: string | null
  content: string
}

interface AdCopy {
  primary_text: string
  headline: string
  cta: string
}

function relativeTime(iso: string) {
  const diffDays = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diffDays <= 0) return 'Idag'
  if (diffDays === 1) return 'Imorgon'
  return `Om ${diffDays} dagar`
}

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook:  'Facebook',
  instagram: 'Instagram',
  both:      'Facebook & Instagram',
}

// ─── Field label helper ───────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">{children}</p>
  )
}

// ─── Input base classes ───────────────────────────────────────

const inputCls = 'bg-transparent border border-line rounded-lg px-3 py-2 text-[14px] text-ink focus:border-ink outline-none transition-colors placeholder:text-mute-2'

export default function MetaPublishView({ object, agency }: MetaPublishViewProps) {
  const [tab, setTab] = useState<Tab>('organic')
  const isConnected = !!agency?.meta_page_id

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-5">
        <div className="w-12 h-12 rounded-full border border-line flex items-center justify-center">
          <span className="font-data text-[18px] text-mute">f</span>
        </div>
        <div>
          <h3 className="font-display text-[28px] leading-[0.95] tracking-[-0.02em] text-ink mb-2">
            Meta ej kopplat.
          </h3>
          <p className="font-data text-[11px] text-mute max-w-xs leading-relaxed tracking-snug">
            Gå till <strong className="text-ink">Varumärke & tonalitet</strong> och koppla
            Facebook & Instagram för att publicera direkt härifrån.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* Header */}
      <div className="border-b border-line px-6 py-4 shrink-0">
        <p className="text-[13px] font-medium text-ink">{object.address}</p>
        <p className="font-data text-[10px] text-mute tracking-snug mt-0.5">
          Publicera på sociala medier
        </p>
      </div>

      {/* Pill tabs */}
      <div className="px-6 pt-4 pb-0 shrink-0">
        <div className="flex gap-0.5 p-[3px] bg-tint rounded-full w-fit">
          {([
            { key: 'organic',  label: 'Organiskt' },
            { key: 'ad',       label: 'Annons' },
            { key: 'schedule', label: 'Schemalagt' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'px-4 py-[6px] rounded-full text-[12px] font-medium transition-all duration-150 leading-none',
                tab === key
                  ? 'bg-bg text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_var(--line)]'
                  : 'text-mute hover:text-ink-2',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'organic'  && <OrganicTab  object={object} agency={agency} />}
        {tab === 'ad'       && <AdTab       object={object} agency={agency} />}
        {tab === 'schedule' && <ScheduleTab agency={agency} />}
      </div>
    </div>
  )
}

// ─── Organic tab ──────────────────────────────────────────────

function OrganicTab({ object, agency }: { object: PropertyObject; agency: Agency }) {
  const [platform, setPlatform]     = useState<Platform>('both')
  const [caption, setCaption]       = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [status, setStatus]         = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg]   = useState('')
  const [publishing, setPublishing] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/meta/publish/organic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ object_id: object.id, platform, generate_only: true }),
      })
      const data = await res.json()
      if (data.caption) setCaption(data.caption)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/meta/publish/organic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_id: object.id,
          platform,
          ...(scheduledFor ? { scheduled_for: new Date(scheduledFor).toISOString() } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setStatusMsg(data.scheduled ? 'Inlägg schemalagt!' : 'Publicerat!')
      } else {
        setStatus('error')
        setStatusMsg(data.error ?? 'Fel')
      }
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg">

      {/* Platform */}
      <div>
        <FieldLabel>Plattform</FieldLabel>
        <div className="flex gap-1.5">
          {(['facebook', 'instagram', 'both'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={[
                'font-data text-[11px] px-3 py-1.5 rounded-full border transition-colors',
                platform === p
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line text-mute hover:text-ink',
              ].join(' ')}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Caption</FieldLabel>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="font-data text-[10px] text-accent hover:underline tracking-snug disabled:opacity-40 flex items-center gap-1.5"
          >
            {generating && (
              <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {generating ? 'Genererar…' : 'Generera AI-caption'}
          </button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          className={`${inputCls} w-full resize-none leading-relaxed`}
          placeholder="Skriv eller generera en caption…"
        />
        <p className="font-data text-[10px] text-mute-2 text-right mt-1">{caption.length} tecken</p>
      </div>

      {/* Preview */}
      {caption && (
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line bg-tint">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">Förhandsvisning</p>
          </div>
          <div className="px-4 py-3 flex items-start gap-3 bg-bg">
            <div className="w-8 h-8 rounded-full bg-line flex items-center justify-center shrink-0">
              <span className="font-data text-[11px] text-mute font-medium">{agency.name[0]}</span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink">{agency.name}</p>
              <p className="font-data text-[12px] text-mute-2 mt-1 leading-relaxed whitespace-pre-wrap">
                {caption}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule */}
      <div>
        <FieldLabel>Schemalägg (valfritt)</FieldLabel>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className={inputCls}
        />
      </div>

      {status === 'success' && (
        <p className="font-data text-[11px] text-ink tracking-snug">✓ {statusMsg}</p>
      )}
      {status === 'error' && (
        <p className="font-data text-[11px] text-accent tracking-snug">{statusMsg}</p>
      )}

      <button
        onClick={handlePublish}
        disabled={!caption || publishing}
        className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
      >
        {publishing ? 'Publicerar…' : scheduledFor ? 'Schemalägg inlägg' : 'Publicera nu'}
      </button>
    </div>
  )
}

// ─── Ad tab ───────────────────────────────────────────────────

function AdTab({ object, agency: _agency }: { object: PropertyObject; agency: Agency }) {
  const [dailyBudget, setDailyBudget] = useState('100')
  const [ageMin, setAgeMin]           = useState('25')
  const [ageMax, setAgeMax]           = useState('65')
  const [placements, setPlacements]   = useState<string[]>(['feed', 'story'])
  const [adCopy, setAdCopy]           = useState<AdCopy | null>(null)
  const [generating, setGenerating]   = useState(false)
  const [adsManagerUrl, setAdsManagerUrl] = useState('')

  function togglePlacement(p: string) {
    setPlacements((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/meta/publish/ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_id: object.id,
          daily_budget_sek: parseInt(dailyBudget),
          age_min: parseInt(ageMin),
          age_max: parseInt(ageMax),
          location: object.area,
          placements,
        }),
      })
      const data = await res.json()
      if (data.ad_copy)       setAdCopy(data.ad_copy)
      if (data.ads_manager_url) setAdsManagerUrl(data.ads_manager_url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg">

      {/* Budget */}
      <div>
        <FieldLabel>Daglig budget (kr)</FieldLabel>
        <input
          type="number"
          min="10"
          value={dailyBudget}
          onChange={(e) => setDailyBudget(e.target.value)}
          className={`${inputCls} w-32`}
        />
      </div>

      {/* Age range */}
      <div>
        <FieldLabel>Målgrupp – ålder</FieldLabel>
        <div className="flex items-center gap-3">
          <input
            type="number" min="18" max="65"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            className={`${inputCls} w-20`}
          />
          <span className="font-data text-[11px] text-mute">–</span>
          <input
            type="number" min="18" max="65"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            className={`${inputCls} w-20`}
          />
          <span className="font-data text-[11px] text-mute">år</span>
        </div>
        <p className="font-data text-[10px] text-mute-2 mt-1 tracking-snug">
          Område: {object.area} (automatiskt)
        </p>
      </div>

      {/* Placements */}
      <div>
        <FieldLabel>Placering</FieldLabel>
        <div className="flex gap-1.5 flex-wrap">
          {['feed', 'story', 'reels'].map((p) => (
            <button
              key={p}
              onClick={() => togglePlacement(p)}
              className={[
                'font-data text-[11px] capitalize px-3 py-1.5 rounded-full border transition-colors',
                placements.includes(p)
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line text-mute hover:text-ink',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
      >
        {generating && (
          <span className="w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
        )}
        {generating ? 'Genererar annonstext…' : 'Generera annons'}
      </button>

      {adCopy && (
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line bg-tint">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
              Genererad annonstext
            </p>
          </div>
          <div className="px-4 py-4 space-y-4 bg-bg">
            {[
              { label: 'Primary text', value: adCopy.primary_text },
              { label: 'Rubrik',       value: adCopy.headline },
              { label: 'CTA',          value: adCopy.cta },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">{label}</p>
                <p className="text-[13px] text-ink-2 leading-relaxed">{value}</p>
              </div>
            ))}

            {adsManagerUrl && (
              <a
                href={adsManagerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-data text-[11px] text-accent hover:underline tracking-snug"
              >
                Skapa annons i Ads Manager →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Schedule tab ─────────────────────────────────────────────

function ScheduleTab({ agency }: { agency: Agency }) {
  const [posts, setPosts]   = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/meta/insights')
      .then(r => r.json())
      .then(d => { setPosts(d.scheduled_posts ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [agency.id])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-line bg-tint animate-pulse" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-data text-[11px] text-mute tracking-snug">Inga schemalagda inlägg ännu.</p>
        <p className="font-data text-[10px] text-mute-2 mt-1 tracking-snug">
          Schemalägg inlägg från fliken Organiskt.
        </p>
      </div>
    )
  }

  const upcoming  = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')

  return (
    <div className="space-y-6 max-w-lg">
      {upcoming.length > 0 && (
        <div>
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">Kommande</p>
          <div className="space-y-2">
            {upcoming.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        </div>
      )}
      {published.length > 0 && (
        <div>
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">Publicerade</p>
          <div className="space-y-2">
            {published.map((p) => <PostRow key={p.id} post={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Post row ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'text-amber-600',
  published: 'text-ink',
  failed:    'text-accent',
  cancelled: 'text-mute-2',
}

function PostRow({ post }: { post: ScheduledPost }) {
  const date = post.scheduled_for ?? post.published_at
  return (
    <div className="flex items-start gap-4 border border-line rounded-lg px-4 py-3 bg-bg hover:bg-tint transition-colors">
      <div className="shrink-0 text-right min-w-[80px]">
        <p className={`font-data text-[11px] font-medium ${STATUS_STYLE[post.status] ?? 'text-mute'}`}>
          {post.status === 'scheduled' && date ? relativeTime(date) : post.status}
        </p>
        <p className="font-data text-[10px] text-mute-2 uppercase tracking-snug">
          {PLATFORM_LABELS[post.platform]}
        </p>
      </div>
      <p className="font-data text-[11px] text-mute leading-relaxed line-clamp-2 flex-1 tracking-snug">
        {post.content}
      </p>
    </div>
  )
}
