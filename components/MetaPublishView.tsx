'use client'

import { useEffect, useState } from 'react'
import { Agency, Channel, GenerateResult, PropertyObject } from '@/types'

interface MetaPublishViewProps {
  object: PropertyObject
  agency: Agency | null
  results?: Record<Channel, GenerateResult | null>
}

type Tab = 'hemnet' | 'email' | 'organic' | 'ad' | 'schedule'
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

export default function MetaPublishView({ object, agency, results }: MetaPublishViewProps) {
  const [tab, setTab] = useState<Tab>('hemnet')
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
            { key: 'hemnet',   label: 'Hemnet' },
            { key: 'email',    label: 'E-post' },
            { key: 'organic',  label: 'Meta' },
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
        {tab === 'hemnet'   && <HemnetTab   results={results} />}
        {tab === 'email'    && <EmailTab    object={object} results={results} />}
        {tab === 'organic'  && <OrganicTab  object={object} agency={agency} />}
        {tab === 'ad'       && <AdTab       object={object} agency={agency} />}
        {tab === 'schedule' && <ScheduleTab agency={agency} />}
      </div>
    </div>
  )
}

// ─── Hemnet tab ───────────────────────────────────────────────

function HemnetTab({ results }: { results?: Record<Channel, GenerateResult | null> }) {
  const [copied, setCopied] = useState<'hemnet' | 'raket' | null>(null)

  const hemnet = results?.hemnet?.content ?? null
  const raket  = results?.hemnet_raket?.content ?? null

  async function copy(text: string, key: 'hemnet' | 'raket') {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!hemnet && !raket) {
    return (
      <div className="py-10 text-center">
        <p className="font-data text-[11px] text-mute-2 tracking-snug leading-relaxed">
          Generera texter i Kopiera-fliken först,<br />sedan visas texterna här.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">

      {/* Hemnet */}
      {hemnet && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
              Hemnet
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="font-data text-[10px] text-mute-2"
              >
                {hemnet.length} tecken
              </span>
              <button
                onClick={() => copy(hemnet, 'hemnet')}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '11px',
                  padding: '4px 10px',
                  background: copied === 'hemnet' ? 'var(--ok)' : 'var(--ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied === 'hemnet' ? '✓ Kopierad' : 'Kopiera Hemnet-text'}
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              background: 'var(--tint)',
              maxHeight: '280px',
              overflowY: 'auto',
            }}
          >
            {/* Split first line as headline if followed by content */}
            {(() => {
              const lines = hemnet.split('\n')
              const first = lines[0]?.trim() ?? ''
              const rest  = lines.slice(1).join('\n').trim()
              if (first && rest) {
                return (
                  <>
                    <p
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        letterSpacing: '-0.018em',
                        lineHeight: 1.3,
                        marginBottom: '10px',
                      }}
                    >
                      {first}
                    </p>
                    <p
                      style={{
                        fontSize: '13px',
                        lineHeight: 1.65,
                        color: 'var(--ink-2)',
                        letterSpacing: '-0.003em',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {rest}
                    </p>
                  </>
                )
              }
              return (
                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.65,
                    color: 'var(--ink-2)',
                    letterSpacing: '-0.003em',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {hemnet}
                </p>
              )
            })()}
          </div>
        </div>
      )}

      {/* Hemnet Raket */}
      {raket && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
              Hemnet Raket
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="font-data text-[10px] text-mute-2">
                {raket.length} tecken
              </span>
              <button
                onClick={() => copy(raket, 'raket')}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '11px',
                  padding: '4px 10px',
                  background: copied === 'raket' ? 'var(--ok)' : 'var(--ink)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied === 'raket' ? '✓ Kopierad' : 'Kopiera Raket-text'}
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              background: 'var(--tint)',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'var(--ink-2)',
                letterSpacing: '-0.003em',
                whiteSpace: 'pre-wrap',
              }}
            >
              {raket}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Email tab ────────────────────────────────────────────────

function EmailTab({
  object,
  results,
}: {
  object: PropertyObject
  results?: Record<Channel, GenerateResult | null>
}) {
  const mailResult = results?.mail?.content ?? null

  // Parse subject + body from mail result (first line = subject, rest = body)
  const mailLines  = mailResult?.split('\n') ?? []
  const subjectRaw = mailLines[0]?.replace(/^ÄMNESRAD:\s*/i, '').trim() ?? ''
  const bodyRaw    = mailLines.slice(1).join('\n').replace(/^BRÖDTEXT:\s*/i, '').trim()

  const [recipients, setRecipients] = useState('')
  const [subject,    setSubject]    = useState(subjectRaw)
  const [body,       setBody]       = useState(bodyRaw)
  const [sending,    setSending]    = useState(false)
  const [status,     setStatus]     = useState<'idle' | 'ok' | 'error'>('idle')
  const [statusMsg,  setStatusMsg]  = useState('')

  // Sync if result arrives after mount
  const [synced, setSynced] = useState(false)
  if (!synced && mailResult) {
    setSubject(subjectRaw)
    setBody(bodyRaw)
    setSynced(true)
  }

  async function handleSend() {
    if (!recipients.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/publish/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object_id:  object.id,
          recipients,
          subject,
          body,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setStatus('error')
        setStatusMsg(d.error ?? 'Fel vid sändning')
      } else {
        setStatus('ok')
        setStatusMsg(`Skickat till ${d.sent_to} mottagare`)
      }
    } catch {
      setStatus('error')
      setStatusMsg('Nätverksfel')
    } finally {
      setSending(false)
    }
  }

  const recipientCount = recipients
    .split(',')
    .map(r => r.trim())
    .filter(Boolean).length

  return (
    <div className="space-y-5 max-w-lg">

      {/* Recipients */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
          <FieldLabel>Mottagare</FieldLabel>
          {recipientCount > 0 && (
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                color: 'var(--mute)',
              }}
            >
              {recipientCount} adress{recipientCount !== 1 ? 'er' : ''}
            </span>
          )}
        </div>
        <textarea
          value={recipients}
          onChange={e => setRecipients(e.target.value)}
          rows={3}
          className={`${inputCls} w-full resize-none leading-relaxed`}
          placeholder="namn@byrå.se, kund@example.se, …"
        />
        <p className="font-data text-[10px] text-mute-2 mt-1 tracking-snug">
          Komma-separerade e-postadresser
        </p>
      </div>

      {/* Subject */}
      <div>
        <FieldLabel>Ämnesrad</FieldLabel>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className={`${inputCls} w-full`}
          placeholder="Nytt objekt: Storgatan 1, Stockholm"
        />
      </div>

      {/* Body */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
          <FieldLabel>Brödtext</FieldLabel>
          {!mailResult && (
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                color: 'var(--mute-2)',
              }}
            >
              Generera i Kopiera-fliken för AI-förslag
            </span>
          )}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={10}
          className={`${inputCls} w-full resize-none leading-relaxed`}
          placeholder="Skriv e-posttext här, eller generera via AI i Kopiera-fliken…"
        />
        <p className="font-data text-[10px] text-mute-2 text-right mt-1">{body.length} tecken</p>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <p
          className="font-data text-[11px] tracking-snug"
          style={{ color: status === 'ok' ? 'var(--ok)' : 'var(--accent)' }}
        >
          {status === 'ok' ? '✓ ' : '✗ '}{statusMsg}
        </p>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={sending || !recipients.trim() || !subject.trim() || !body.trim()}
        className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
      >
        {sending && (
          <span className="w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin" />
        )}
        {sending
          ? 'Skickar…'
          : status === 'ok'
            ? `✓ Skickat till ${recipientCount} mottagare`
            : `Skicka till ${recipientCount > 0 ? recipientCount : '…'} mottagare`}
      </button>
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
