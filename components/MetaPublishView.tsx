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
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86_400_000)
  if (diffDays <= 0) return 'Idag'
  if (diffDays === 1) return 'Imorgon'
  return `Om ${diffDays} dagar`
}

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  both: 'Facebook & Instagram',
}

export default function MetaPublishView({ object, agency }: MetaPublishViewProps) {
  const [tab, setTab] = useState<Tab>('organic')
  const isConnected = !!agency?.meta_page_id

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-4">
        <div className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center text-xl">f</div>
        <h3 className="font-serif text-2xl text-[#f0ece4]">Meta inte kopplat</h3>
        <p className="text-sm text-[#555] max-w-xs leading-relaxed">
          Gå till <strong className="text-[#888]">Varumärke & tonalitet</strong> och koppla Facebook & Instagram för att publicera direkt härifrån.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h2 className="font-serif text-2xl text-[#f0ece4]">Publicera</h2>
        <p className="text-sm text-[#555] mt-0.5">{object.address}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2a2a2a] px-6">
        {([
          { key: 'organic', label: 'Organiskt inlägg' },
          { key: 'ad',      label: 'Meta-annons' },
          { key: 'schedule', label: 'Schemalagda' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-xs font-medium uppercase tracking-widest px-4 py-3 border-b-2 transition-colors ${
              tab === key
                ? 'text-[#b8965a] border-[#b8965a]'
                : 'text-[#555] border-transparent hover:text-[#888]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'organic' && (
          <OrganicTab object={object} agency={agency} />
        )}
        {tab === 'ad' && (
          <AdTab object={object} agency={agency} />
        )}
        {tab === 'schedule' && (
          <ScheduleTab agency={agency} />
        )}
      </div>
    </div>
  )
}

// ─── Organiskt inlägg ─────────────────────────────────────────

function OrganicTab({ object, agency }: { object: PropertyObject; agency: Agency }) {
  const [platform, setPlatform] = useState<Platform>('both')
  const [caption, setCaption] = useState('')
  const [generating, setGenerating] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
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
    <div className="space-y-5 max-w-xl">
      {/* Platform picker */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Plattform</p>
        <div className="flex gap-2">
          {(['facebook', 'instagram', 'both'] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                platform === p
                  ? 'border-[#b8965a33] bg-[#b8965a0d] text-[#b8965a]'
                  : 'border-[#2a2a2a] text-[#555] hover:text-[#888]'
              }`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Caption editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Caption</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-[10px] flex items-center gap-1 transition-colors disabled:opacity-50"
            style={{ color: 'var(--brand-primary,#b8965a)' }}
          >
            {generating && (
              <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
            )}
            {generating ? 'Genererar…' : '✦ Generera AI-caption'}
          </button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a33] resize-none leading-relaxed font-sans"
          placeholder="Skriv eller generera en caption…"
        />
        <p className="text-[10px] text-[#444] text-right mt-1">{caption.length} tecken</p>
      </div>

      {/* Preview */}
      {caption && (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Förhandsvisning</p>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-medium"
              style={{ backgroundColor: 'var(--brand-primary-dim,#b8965a33)', color: 'var(--brand-primary,#b8965a)' }}>
              {agency.name[0]}
            </div>
            <div>
              <p className="text-xs text-[#f0ece4] font-medium">{agency.name}</p>
              <p className="text-xs text-[#888] mt-1 leading-relaxed whitespace-pre-wrap">{caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Schemalägg (valfritt)</p>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a33]"
        />
      </div>

      {/* Status */}
      {status === 'success' && (
        <p className="text-xs text-green-400">✓ {statusMsg}</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-400">{statusMsg}</p>
      )}

      <button
        onClick={handlePublish}
        disabled={!caption || publishing}
        className="px-5 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 text-[#111111]"
        style={{ backgroundColor: 'var(--brand-primary,#b8965a)' }}
      >
        {publishing
          ? 'Publicerar…'
          : scheduledFor
            ? 'Schemalägg inlägg'
            : 'Publicera nu'}
      </button>
    </div>
  )
}

// ─── Meta-annons ──────────────────────────────────────────────

function AdTab({ object, agency: _agency }: { object: PropertyObject; agency: Agency }) {
  const [dailyBudget, setDailyBudget] = useState('100')
  const [ageMin, setAgeMin] = useState('25')
  const [ageMax, setAgeMax] = useState('65')
  const [placements, setPlacements] = useState<string[]>(['feed', 'story'])
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null)
  const [generating, setGenerating] = useState(false)
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
      if (data.ad_copy) setAdCopy(data.ad_copy)
      if (data.ads_manager_url) setAdsManagerUrl(data.ads_manager_url)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Budget */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Daglig budget (kr)</p>
        <input
          type="number"
          min="10"
          value={dailyBudget}
          onChange={(e) => setDailyBudget(e.target.value)}
          className="w-32 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a33]"
        />
      </div>

      {/* Audience */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Målgrupp – ålder</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min="18" max="65"
            value={ageMin}
            onChange={(e) => setAgeMin(e.target.value)}
            className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a33]"
          />
          <span className="text-[#555] text-sm">–</span>
          <input
            type="number" min="18" max="65"
            value={ageMax}
            onChange={(e) => setAgeMax(e.target.value)}
            className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm text-[#f0ece4] focus:outline-none focus:border-[#b8965a33]"
          />
          <span className="text-[#555] text-sm">år</span>
        </div>
        <p className="text-[10px] text-[#444] mt-1">Område: {object.area} (automatiskt)</p>
      </div>

      {/* Placements */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">Placering</p>
        <div className="flex gap-2 flex-wrap">
          {['feed', 'story', 'reels'].map((p) => (
            <button
              key={p}
              onClick={() => togglePlacement(p)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors border ${
                placements.includes(p)
                  ? 'border-[#b8965a33] bg-[#b8965a0d] text-[#b8965a]'
                  : 'border-[#2a2a2a] text-[#555] hover:text-[#888]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50 text-[#111111]"
        style={{ backgroundColor: 'var(--brand-primary,#b8965a)' }}
      >
        {generating && (
          <span className="w-3 h-3 border-2 border-[#11111166] border-t-[#111111] rounded-full animate-spin" />
        )}
        {generating ? 'Genererar annonstext…' : '✦ Generera annons'}
      </button>

      {adCopy && (
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Genererad annonstext</p>
          {[
            { label: 'Primary text', value: adCopy.primary_text },
            { label: 'Rubrik', value: adCopy.headline },
            { label: 'CTA', value: adCopy.cta },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] uppercase tracking-widest text-[#444] mb-1">{label}</p>
              <p className="text-sm text-[#d0ccc4]">{value}</p>
            </div>
          ))}

          {adsManagerUrl && (
            <a
              href={adsManagerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition-colors text-[#111111]"
              style={{ backgroundColor: 'var(--brand-primary,#b8965a)' }}
            >
              Skapa annons i Ads Manager →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Schemalagda inlägg ───────────────────────────────────────

function ScheduleTab({ agency }: { agency: Agency }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/meta/insights')
      .then(r => r.json())
      .then(d => {
        setPosts(d.scheduled_posts ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agency.id])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] animate-pulse" />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[#555] text-sm">Inga schemalagda inlägg ännu.</p>
        <p className="text-[#444] text-xs mt-1">Schemalägg inlägg från fliken "Organiskt inlägg".</p>
      </div>
    )
  }

  const upcoming = posts.filter(p => p.status === 'scheduled')
  const published = posts.filter(p => p.status === 'published')

  return (
    <div className="space-y-6 max-w-xl">
      {upcoming.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Kommande</p>
          <div className="space-y-2">
            {upcoming.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
      {published.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">Publicerade</p>
          <div className="space-y-2">
            {published.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PostRow({ post }: { post: ScheduledPost }) {
  const date = post.scheduled_for ?? post.published_at
  const statusColor: Record<string, string> = {
    scheduled: '#fbbf24',
    published: '#4ade80',
    failed: '#f87171',
    cancelled: '#555',
  }
  return (
    <div className="flex items-start gap-4 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium" style={{ color: statusColor[post.status] ?? '#888' }}>
          {post.status === 'scheduled' && date ? relativeTime(date) : post.status}
        </p>
        <p className="text-[10px] text-[#444] uppercase">{PLATFORM_LABELS[post.platform]}</p>
      </div>
      <p className="text-xs text-[#888] leading-relaxed line-clamp-2 flex-1">{post.content}</p>
    </div>
  )
}
