'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Agency, ToneProfile } from '@/types'

const TONE_STEPS = [
  'Hämtar byråns hemsida…',
  'Identifierar objektsidor…',
  'Läser objekttexter…',
  'Analyserar skrivstil…',
]

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// ─── Field wrapper ────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-data text-[10px] text-mute tracking-[0.02em] uppercase block mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-transparent border-b border-line focus:border-ink outline-none py-2 text-[15px] text-ink placeholder:text-mute-2 transition-colors'

// ─── Section wrapper ──────────────────────────────────────────

function Section({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-line px-8 py-10">
      <div className="mb-6">
        <h3 className="font-display text-[22px] leading-none tracking-[-0.02em] text-ink">{title}</h3>
        {subtitle && (
          <p className="font-data text-[10px] text-mute tracking-snug mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Integration card ─────────────────────────────────────────

function IntegrationCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">
      <div className="px-4 py-3 border-b border-line bg-tint">
        <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{title}</p>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </div>
  )
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block w-[6px] h-[6px] rounded-full shrink-0 ${active ? 'bg-accent' : 'bg-line-2'}`}
    />
  )
}

// ─── Main view ────────────────────────────────────────────────

interface SettingsViewProps {
  agency: Agency
  userEmail: string
  onAgencyUpdated: (a: Agency) => void
}

export default function SettingsView({ agency, userEmail, onAgencyUpdated }: SettingsViewProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-line px-8 py-8">
        <h2 className="font-display text-[44px] leading-[0.93] tracking-[-0.03em] text-ink">
          Min byrå.
        </h2>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          Inställningar och integrationer
        </p>
      </div>

      <AgencyInfoSection agency={agency} onAgencyUpdated={onAgencyUpdated} />
      <BrandSection agency={agency} onAgencyUpdated={onAgencyUpdated} />
      <IntegrationsSection agency={agency} onAgencyUpdated={onAgencyUpdated} />
      <MaklarsystemSection agency={agency} onAgencyUpdated={onAgencyUpdated} />
      <BrainSection />
      <AccountSection userEmail={userEmail} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 1 – BYRÅINFORMATION
// ══════════════════════════════════════════════════════════════

function AgencyInfoSection({ agency, onAgencyUpdated }: {
  agency: Agency
  onAgencyUpdated: (a: Agency) => void
}) {
  const [form, setForm] = useState({
    name:          agency.name          ?? '',
    url:           agency.url           ?? '',
    phone:         agency.phone         ?? '',
    contact_email: agency.contact_email ?? '',
    address:       agency.address       ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [saved,  setSaved]    = useState(false)
  const [error,  setError]    = useState('')

  // Tone fetch state
  const [toneStep,    setToneStep]    = useState(0)
  const [toneFetching, setToneFetching] = useState(false)
  const [toneError,   setToneError]   = useState('')
  const [toneProfile, setToneProfile] = useState<ToneProfile | null>(agency.tone_profile)
  const [visibleTags, setVisibleTags] = useState(toneProfile?.tags.length ?? 0)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Fel'); setSaving(false); return }
    onAgencyUpdated(data.agency)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleFetchTone() {
    if (!form.url) return
    setToneFetching(true)
    setToneStep(0)
    setToneError('')

    const apiPromise = fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: form.url }),
    })

    for (let i = 1; i <= TONE_STEPS.length; i++) {
      await delay(1200)
      setToneStep(i)
    }

    const res = await apiPromise
    const data = await res.json()
    setToneFetching(false)

    if (!res.ok) { setToneError(data.error ?? 'Fel'); return }

    const tp: ToneProfile = data.tone_profile
    setToneProfile(tp)
    setVisibleTags(0)
    onAgencyUpdated({ ...agency, tone_profile: tp })

    for (let i = 1; i <= tp.tags.length; i++) {
      await delay(200)
      setVisibleTags(i)
    }
  }

  const hasTone = !!toneProfile?.tags?.length

  return (
    <Section title="Byråinformation">
      <div className="max-w-lg space-y-6">
        <FormField label="Byrånamn">
          <input value={form.name} onChange={e => update('name', e.target.value)}
            className={inputCls} placeholder="Fastighetsbyrån AB" />
        </FormField>

        <div>
          <FormField label="Hemsida (URL)">
            <input value={form.url} onChange={e => update('url', e.target.value)}
              className={inputCls} placeholder="https://example.se" type="url" />
          </FormField>

          {/* Tone status under URL */}
          {form.url && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <StatusDot active={hasTone} />
                <span className="font-data text-[11px] text-mute tracking-snug">
                  {hasTone ? 'Tonalitet hämtad' : 'Tonalitet ej hämtad'}
                </span>
                {!toneFetching && (
                  <button
                    onClick={handleFetchTone}
                    className="font-data text-[10px] text-mute border border-line rounded-full px-3 py-1 hover:text-ink transition-colors ml-2"
                  >
                    {hasTone ? 'Uppdatera' : 'Hämta nu'}
                  </button>
                )}
              </div>

              {toneFetching && (
                <div className="space-y-1.5 pl-4">
                  {TONE_STEPS.map((s, i) => {
                    const done   = toneStep > i
                    const active = toneStep === i
                    return (
                      <div key={i} className="flex items-center gap-2 transition-opacity duration-300"
                        style={{ opacity: i <= toneStep ? 1 : 0.25 }}>
                        <div className="w-3 h-3 flex items-center justify-center shrink-0">
                          {done   ? <span className="text-accent text-[10px]">✓</span>
                          : active ? <div className="w-2.5 h-2.5 border border-line border-t-accent rounded-full animate-spin" />
                          : <div className="w-1 h-1 rounded-full bg-line-2" />}
                        </div>
                        <span className={`font-data text-[10px] tracking-snug ${done ? 'text-mute-2' : active ? 'text-ink-2' : 'text-mute-2'}`}>
                          {s}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {toneError && (
                <p className="font-data text-[10px] text-accent tracking-snug pl-4">{toneError}</p>
              )}

              {hasTone && toneProfile && (
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {toneProfile.tags.map((tag, i) => (
                    <span key={tag}
                      className="font-data text-[11px] px-2.5 py-0.5 rounded-full border border-line text-ink transition-all duration-300"
                      style={{ opacity: i < visibleTags ? 1 : 0, transform: i < visibleTags ? 'translateY(0)' : 'translateY(4px)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <FormField label="Telefon">
          <input value={form.phone} onChange={e => update('phone', e.target.value)}
            className={inputCls} placeholder="+46 8 123 456 78" type="tel" />
        </FormField>

        <FormField label="E-post">
          <input value={form.contact_email} onChange={e => update('contact_email', e.target.value)}
            className={inputCls} placeholder="info@byrå.se" type="email" />
        </FormField>

        <FormField label="Adress">
          <input value={form.address} onChange={e => update('address', e.target.value)}
            className={inputCls} placeholder="Storgatan 1, 411 38 Göteborg" />
        </FormField>

        {error && <p className="font-data text-[11px] text-accent tracking-snug">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {saving ? 'Sparar…' : saved ? '✓ Sparat' : 'Spara ändringar'}
        </button>
      </div>
    </Section>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 2 – VARUMÄRKE
// ══════════════════════════════════════════════════════════════

function BrandSection({ agency, onAgencyUpdated }: {
  agency: Agency
  onAgencyUpdated: (a: Agency) => void
}) {
  const [scraping, setScraping] = useState(false)
  const hasBrand = !!(agency.logo_url || agency.brand_colors?.primary)

  async function handleScrape() {
    if (!agency.url) return
    setScraping(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        onAgencyUpdated({
          ...agency,
          logo_url:    data.data?.logo_url    ?? agency.logo_url,
          brand_colors: data.data?.brand_colors ?? agency.brand_colors,
          scraped_data: data.data?.scraped_data ?? agency.scraped_data,
        })
      }
    } finally {
      setScraping(false)
    }
  }

  return (
    <Section title="Varumärke" subtitle="Hämtas automatiskt från er hemsida">
      {!agency.url ? (
        <p className="font-data text-[11px] text-mute tracking-snug">
          Lägg till hemsida ovan för att hämta varumärkesdata.
        </p>
      ) : (
        <div className="flex items-start gap-8 max-w-lg">
          {/* Logo */}
          <div className="shrink-0">
            {agency.logo_url ? (
              <div className="relative w-28 h-16 bg-tint rounded-lg border border-line overflow-hidden">
                <Image src={agency.logo_url} alt={agency.name} fill className="object-contain p-2" unoptimized />
              </div>
            ) : (
              <div className="w-28 h-16 bg-tint rounded-lg border border-dashed border-line-2 flex items-center justify-center">
                <span className="font-data text-[10px] text-mute-2">Ingen logotyp</span>
              </div>
            )}
            <p className="font-data text-[9px] text-mute-2 mt-1 text-center">Logotyp</p>
          </div>

          {/* Colors + action */}
          <div className="flex-1 space-y-4">
            {hasBrand ? (
              <div className="space-y-2">
                {[
                  { label: 'Primär',   value: agency.brand_colors?.primary },
                  { label: 'Sekundär', value: agency.brand_colors?.secondary },
                  { label: 'Accent',   value: agency.brand_colors?.accent },
                ].filter(c => c.value).map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full border border-line shrink-0" style={{ backgroundColor: value! }} />
                    <span className="font-data text-[11px] text-ink">{value}</span>
                    <span className="font-data text-[10px] text-mute">{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-data text-[11px] text-mute tracking-snug">Ingen varumärkesdata hämtad än.</p>
            )}

            <button
              onClick={handleScrape}
              disabled={scraping}
              className="font-data text-[11px] text-mute border border-line rounded-full px-4 py-1.5 hover:text-ink transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {scraping && <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />}
              {scraping ? 'Hämtar…' : hasBrand ? 'Uppdatera varumärkesdata' : 'Hämta varumärkesdata'}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 3 – INTEGRATIONER
// ══════════════════════════════════════════════════════════════

function IntegrationsSection({ agency, onAgencyUpdated }: {
  agency: Agency
  onAgencyUpdated: (a: Agency) => void
}) {
  return (
    <Section title="Integrationer">
      <div className="space-y-4 max-w-xl">
        <MetaCard agency={agency} onAgencyUpdated={onAgencyUpdated} />
        <HemnetCard />
        <PixelCard agency={agency} />
      </div>
    </Section>
  )
}

// ─── Meta card ────────────────────────────────────────────────

function MetaCard({ agency, onAgencyUpdated }: {
  agency: Agency
  onAgencyUpdated: (a: Agency) => void
}) {
  const isConnected  = !!agency.meta_page_id
  const hasSocialTone = !!agency.social_tone_profile?.tone_tags?.length
  const [scanning, setScanning]   = useState(false)
  const [scanError, setScanError] = useState('')

  function buildOAuthUrl() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/connect`)
    const scope = ['pages_read_engagement', 'pages_read_user_content', 'instagram_basic'].join(',')
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
  }

  async function handleScan() {
    setScanning(true)
    setScanError('')
    try {
      const res  = await fetch('/api/meta/scan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setScanError(data.error ?? 'Fel'); return }
      onAgencyUpdated({ ...agency, social_tone_profile: data.social_tone_profile })
    } catch { setScanError('Nätverksfel') }
    finally  { setScanning(false) }
  }

  return (
    <IntegrationCard title="Meta – Facebook & Instagram">
      <div className="flex items-center gap-2">
        <StatusDot active={isConnected} />
        <span className="font-data text-[11px] text-mute tracking-snug">
          {isConnected ? 'Kopplad' : 'Ej kopplad'}
        </span>
        {isConnected && agency.meta_page_id && (
          <span className="font-data text-[10px] text-mute-2 ml-1">· {agency.meta_page_id}</span>
        )}
      </div>

      {!isConnected ? (
        <>
          <p className="font-data text-[11px] text-mute tracking-snug leading-relaxed">
            Koppla för att publicera direkt och analysera byråns sociala ton.
          </p>
          <button
            onClick={() => { window.location.href = buildOAuthUrl() }}
            className="bg-ink text-bg px-5 py-2 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity"
          >
            Koppla Facebook & Instagram
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-ink text-bg px-5 py-2 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
            >
              {scanning && <span className="w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin inline-block" />}
              {scanning ? 'Skannar…' : hasSocialTone ? 'Uppdatera social ton' : 'Skanna sociala medier'}
            </button>
            <button
              onClick={() => { window.location.href = buildOAuthUrl() }}
              className="font-data text-[11px] text-mute border border-line rounded-full px-4 py-1.5 hover:text-ink transition-colors"
            >
              Koppla om
            </button>
          </div>

          {scanError && <p className="font-data text-[10px] text-accent tracking-snug">{scanError}</p>}

          {hasSocialTone && agency.social_tone_profile && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {agency.social_tone_profile.tone_tags.map(tag => (
                <span key={tag} className="font-data text-[11px] px-2.5 py-0.5 rounded-full border border-line text-ink">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </IntegrationCard>
  )
}

// ─── Hemnet card ──────────────────────────────────────────────

function HemnetCard() {
  const formats = ['Hemnet', 'Hemnet Raket', 'Booli', 'Boneo', 'Bovision', 'Hjem']
  return (
    <IntegrationCard title="Hemnet & portaler">
      <div className="flex items-center gap-2">
        <StatusDot active />
        <span className="font-data text-[11px] text-mute tracking-snug">Alltid aktiv</span>
      </div>
      <p className="font-data text-[11px] text-mute tracking-snug leading-relaxed">
        Estatio genererar optimerad text för alla portaler automatiskt.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {formats.map(f => (
          <span key={f} className="font-data text-[10px] text-mute border border-line rounded px-2 py-0.5">
            {f}
          </span>
        ))}
      </div>
    </IntegrationCard>
  )
}

// ─── Pixel card ───────────────────────────────────────────────

function PixelCard({ agency }: { agency: Agency }) {
  const [copied, setCopied] = useState(false)
  const [events, setEvents] = useState<number | null>(null)

  const origin  = typeof window !== 'undefined' ? window.location.origin : 'https://app.estatio.se'
  const snippet = `<script src="${origin}/track.js" data-agency="${agency.id}" async></script>`

  useEffect(() => {
    fetch('/api/prospects')
      .then(r => r.json())
      .then(d => setEvents(d.stats?.total ?? 0))
      .catch(() => {})
  }, [])

  async function handleCopy() {
    try { await navigator.clipboard.writeText(snippet) }
    catch { return }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isActive = (events ?? 0) > 0

  return (
    <IntegrationCard title="Spårningspixel">
      <div className="flex items-center gap-2">
        <StatusDot active={isActive} />
        <span className="font-data text-[11px] text-mute tracking-snug">
          {events === null ? 'Kontrollerar…'
           : isActive    ? `${events} events`
           :               'Inga events registrerade'}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">Kodfragment</p>
          <button
            onClick={handleCopy}
            className={`font-data text-[10px] tracking-snug ${copied ? 'text-ink' : 'text-accent hover:underline'}`}
          >
            {copied ? '✓ Kopierat' : 'Kopiera kod'}
          </button>
        </div>
        <pre className="bg-tint border border-line rounded-lg p-3 font-data text-[10px] text-ink-2 leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
          {snippet}
        </pre>
        <p className="font-data text-[10px] text-mute-2 tracking-snug">
          Klistra in i &lt;head&gt; på er hemsida
        </p>
      </div>
    </IntegrationCard>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 4 – MÄKLARSYSTEM (VITEC)
// ══════════════════════════════════════════════════════════════

function MaklarsystemSection({ agency, onAgencyUpdated }: {
  agency: Agency
  onAgencyUpdated: (a: Agency) => void
}) {
  const [apiKey,     setApiKey]     = useState(agency.vitec_api_key     ?? '')
  const [customerId, setCustomerId] = useState(agency.vitec_customer_id ?? '')
  const [testing,    setTesting]    = useState(false)
  const [status,     setStatus]     = useState<'idle' | 'ok' | 'error'>('idle')
  const [statusMsg,  setStatusMsg]  = useState('')

  const isConnected = !!agency.vitec_api_key && !!agency.vitec_customer_id

  async function handleTest() {
    if (!apiKey || !customerId) return
    setTesting(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/vitec/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, customer_id: customerId }),
      })
      const d = await res.json()
      if (d.error) {
        setStatus('error')
        setStatusMsg(d.error)
      } else {
        setStatus('ok')
        setStatusMsg(`Kopplad — ${d.estate_count} aktiva objekt hittade`)
        onAgencyUpdated({ ...agency, vitec_api_key: apiKey, vitec_customer_id: customerId })
      }
    } catch {
      setStatus('error')
      setStatusMsg('Nätverksfel')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Section title="Mäklarsystem" subtitle="Koppla Vitec för att importera objekt direkt">
      <div className="max-w-lg space-y-5">
        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? 'var(--ok)' : 'var(--line-2)',
              flexShrink: 0,
            }}
          />
          <span className="font-data text-[11px] text-mute tracking-snug">
            {isConnected ? 'Vitec kopplat' : 'Vitec ej kopplat'}
          </span>
        </div>

        <FormField label="Vitec API-nyckel">
          <input
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setStatus('idle') }}
            className={inputCls}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            type="password"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Kund-ID (Customer ID)">
          <input
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setStatus('idle') }}
            className={inputCls}
            placeholder="12345"
          />
        </FormField>

        <p className="font-data text-[10px] text-mute-2 tracking-snug leading-relaxed">
          Hittas i Vitec Express → Inställningar → API. Kontakta Vitec support om du saknar tillgång.
        </p>

        {status !== 'idle' && (
          <p
            className="font-data text-[11px] tracking-snug"
            style={{ color: status === 'ok' ? 'var(--ok)' : 'var(--accent)' }}
          >
            {status === 'ok' ? '✓ ' : '✗ '}{statusMsg}
          </p>
        )}

        <button
          onClick={handleTest}
          disabled={testing || !apiKey || !customerId}
          className="font-data text-[11px] text-mute border border-line rounded-full px-5 py-2 hover:text-ink transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {testing && <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />}
          {testing ? 'Testar koppling…' : 'Testa koppling'}
        </button>
      </div>
    </Section>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 5 – BYRÅHJÄRNAN
// ══════════════════════════════════════════════════════════════

interface BrainStats {
  total: number
  byCategory: Record<string, number>
  topSignals: { category: string; key: string; value: string; confidence: number }[]
  recentFeedback: { id: string; channel: string; action: string; created_at: string }[]
}

const CATEGORY_LABEL: Record<string, string> = {
  tone:          'Ton',
  winning_text:  'Vinnande texter',
  area_insight:  'Områdesinsikter',
  buyer_profile: 'Köparprofil',
  feedback:      'Feedback',
  market:        'Marknad',
  object_type:   'Objekttyp',
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: 'Godkänd',  color: 'var(--ok)' },
  rejected: { label: 'Avvisad',  color: 'var(--accent)' },
  edited:   { label: 'Redigerad', color: 'var(--ink-2)' },
}

function BrainSection() {
  const [stats, setStats]       = useState<BrainStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [allEntries, setAllEntries] = useState<BrainStats['topSignals']>([])
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/brain/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    const res = await fetch('/api/brain/stats')
    const d   = await res.json()
    setStats(d)
    setAllEntries(d.topSignals ?? [])
    setExpanded(true)
  }

  async function handleReset() {
    if (!window.confirm('Är du säker? Allt hjärnan har lärt sig kommer att raderas.')) return
    setResetting(true)
    await fetch('/api/brain/reset', { method: 'DELETE' })
    setStats({ total: 0, byCategory: {}, topSignals: [], recentFeedback: [] })
    setAllEntries([])
    setExpanded(false)
    setResetting(false)
  }

  if (loading) {
    return (
      <Section title="Byråhjärnan" subtitle="Kontextuellt minnessystem — lär sig från feedback">
        <div style={{ display: 'flex', gap: '8px' }}>
          {[80, 120, 100].map((w, i) => (
            <div key={i} className="animate-pulse" style={{ height: '12px', width: `${w}px`, background: 'var(--line)', borderRadius: '4px' }} />
          ))}
        </div>
      </Section>
    )
  }

  const noData = !stats || stats.total === 0

  return (
    <Section title="Byråhjärnan" subtitle="Kontextuellt minnessystem — lär sig från feedback">
      <div className="max-w-lg space-y-6">

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          <BrainStat
            label="Inlärda preferenser"
            value={stats?.total ?? 0}
          />
          <BrainStat
            label="Feedback-händelser"
            value={stats?.recentFeedback?.length ?? 0}
            note="senaste 5"
          />
          <BrainStat
            label="Kategorier"
            value={Object.keys(stats?.byCategory ?? {}).length}
          />
        </div>

        {/* Category breakdown */}
        {!noData && stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <span
                key={cat}
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '100px',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-2)',
                  background: 'var(--tint)',
                }}
              >
                {CATEGORY_LABEL[cat] ?? cat} · {count}
              </span>
            ))}
          </div>
        )}

        {/* Top tone signals */}
        {!noData && stats?.topSignals && stats.topSignals.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                color: 'var(--mute)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                marginBottom: '10px',
              }}
            >
              Starkaste ton-signaler
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.topSignals.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--ink-2)', letterSpacing: '-0.003em' }}>
                      {s.value}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--mute)',
                      }}
                    >
                      {Math.round(s.confidence * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '2px', background: 'var(--line)', borderRadius: '1px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${s.confidence * 100}%`,
                        background: s.confidence >= 0.7 ? 'var(--ok)' : s.confidence >= 0.5 ? 'var(--ink)' : 'var(--mute)',
                        borderRadius: '1px',
                        transition: 'width 0.4s',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent feedback */}
        {stats?.recentFeedback && stats.recentFeedback.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                color: 'var(--mute)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                marginBottom: '8px',
              }}
            >
              Senaste feedback
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {stats.recentFeedback.map((f) => {
                const al = ACTION_LABEL[f.action] ?? { label: f.action, color: 'var(--mute)' }
                const d  = new Date(f.created_at)
                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: al.color,
                        minWidth: '70px',
                      }}
                    >
                      {al.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--mute)',
                        flex: 1,
                      }}
                    >
                      {f.channel}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--mute-2)',
                      }}
                    >
                      {d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {noData && (
          <p
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '11px',
              color: 'var(--mute-2)',
              lineHeight: 1.6,
            }}
          >
            Hjärnan är tom. Godkänn, avvisa eller redigera genererade texter för att börja lära systemet.
          </p>
        )}

        {/* Expanded all-entries */}
        {expanded && allEntries.length > 0 && (
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--line)',
                background: 'var(--tint)',
              }}
            >
              <p
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '10px',
                  color: 'var(--mute)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                Allt hjärnan vet ({allEntries.length})
              </p>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {allEntries.map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 40px',
                    gap: '8px',
                    padding: '7px 12px',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: '9.5px',
                      color: 'var(--mute)',
                    }}
                  >
                    {CATEGORY_LABEL[e.category] ?? e.category}
                  </span>
                  <span style={{ color: 'var(--ink-2)', letterSpacing: '-0.003em', fontSize: '12px' }}>
                    {e.value}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: '9.5px',
                      color: 'var(--mute)',
                      textAlign: 'right',
                    }}
                  >
                    {Math.round(e.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
          {!noData && (
            <button
              onClick={handleExpand}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11px',
                color: 'var(--mute)',
                border: '1px solid var(--line)',
                borderRadius: '100px',
                padding: '6px 14px',
                background: 'none',
                cursor: 'pointer',
                letterSpacing: '0',
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--mute)' }}
            >
              {expanded ? 'Dölj' : 'Visa allt hjärnan vet'}
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetting || noData}
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '11px',
              color: noData ? 'var(--mute-2)' : 'var(--accent)',
              border: `1px solid ${noData ? 'var(--line)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: '100px',
              padding: '6px 14px',
              background: 'none',
              cursor: resetting || noData ? 'default' : 'pointer',
              opacity: resetting ? 0.5 : 1,
              letterSpacing: '0',
            }}
          >
            {resetting ? 'Återställer…' : 'Återställ hjärnan'}
          </button>
        </div>
      </div>
    </Section>
  )
}

function BrainStat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        background: 'var(--tint)',
      }}
    >
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '20px',
          fontWeight: 500,
          color: 'var(--ink)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '9.5px',
          color: 'var(--mute)',
          marginTop: '5px',
          lineHeight: 1.4,
        }}
      >
        {label}
        {note && <span style={{ color: 'var(--mute-2)' }}> · {note}</span>}
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SEKTION 5 – KONTO
// ══════════════════════════════════════════════════════════════

function AccountSection({ userEmail }: { userEmail: string }) {
  const router   = useRouter()
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg]   = useState('')

  async function handleResetPassword() {
    setResetting(true)
    setResetMsg('')
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      setResetMsg(error ? 'Fel: ' + error.message : 'Återställningslänk skickad till ' + userEmail)
    } finally {
      setResetting(false)
    }
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Section title="Konto">
      <div className="max-w-lg space-y-5">
        <FormField label="E-post">
          <p className="py-2 text-[15px] text-mute border-b border-line">{userEmail}</p>
        </FormField>

        {resetMsg && (
          <p className="font-data text-[11px] text-mute tracking-snug">{resetMsg}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleResetPassword}
            disabled={resetting}
            className="font-data text-[11px] text-mute border border-line rounded-full px-4 py-2 hover:text-ink transition-colors disabled:opacity-40"
          >
            {resetting ? 'Skickar…' : 'Byt lösenord'}
          </button>
          <button
            onClick={handleLogout}
            className="font-data text-[11px] text-accent border border-accent/20 rounded-full px-4 py-2 hover:bg-accent/5 transition-colors"
          >
            Logga ut
          </button>
        </div>
      </div>
    </Section>
  )
}
