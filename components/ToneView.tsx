'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Agency, SocialToneProfile, ToneProfile } from '@/types'
import ToneFetcherCard from './ToneFetcherCard'

interface ToneViewProps {
  agency: Agency
  onToneUpdated: (profile: ToneProfile) => void
  onAgencyUpdated?: (agency: Agency) => void
}

export default function ToneView({ agency, onToneUpdated, onAgencyUpdated }: ToneViewProps) {
  const hasTone = !!agency.tone_profile?.tags?.length
  const hasBranding = !!(agency.logo_url || agency.brand_colors?.primary)
  const [rescrapingBrand, setRescrapingBrand] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [metaNotice, setMetaNotice] = useState<'connected' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const meta = params.get('meta')
    if (meta === 'connected' || meta === 'error') {
      setMetaNotice(meta)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function handleScanMeta() {
    setScanning(true)
    setScanError('')
    try {
      const res = await fetch('/api/meta/scan', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setScanError(data.error ?? 'Fel vid analys'); return }
      if (onAgencyUpdated) {
        onAgencyUpdated({ ...agency, social_tone_profile: data.social_tone_profile })
      }
    } catch {
      setScanError('Nätverksfel')
    } finally {
      setScanning(false)
    }
  }

  function buildMetaOAuthUrl(): string {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? ''
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/meta/connect`)
    const scope = ['pages_read_engagement', 'pages_read_user_content', 'instagram_basic'].join(',')
    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`
  }

  async function handleRescrapeBrand() {
    setRescrapingBrand(true)
    try {
      const res = await fetch('/api/scrape', { method: 'POST' })
      if (res.ok && onAgencyUpdated) {
        const data = await res.json()
        onAgencyUpdated({
          ...agency,
          logo_url: data.data?.logo_url ?? agency.logo_url,
          brand_colors: data.data?.brand_colors ?? agency.brand_colors,
          scraped_data: data.data?.scraped_data ?? agency.scraped_data,
        })
      }
    } finally {
      setRescrapingBrand(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">

      {/* Header */}
      <div className="border-b border-line px-8 py-6">
        <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
          Varumärke & tonalitet.
        </h2>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          Hämtas automatiskt från {agency.url || 'er hemsida'} och används i all textgenerering
        </p>
      </div>

      <div className="px-8 py-6 space-y-5 max-w-2xl">

        {/* Branding card */}
        <Section label="Varumärkesdata" action={
          <button
            onClick={handleRescrapeBrand}
            disabled={rescrapingBrand || !agency.url}
            className="font-data text-[10px] text-mute hover:text-ink transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {rescrapingBrand && (
              <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
            )}
            {rescrapingBrand ? 'Hämtar…' : 'Uppdatera'}
          </button>
        }>
          <div className="flex items-start gap-6 p-4">
            {/* Logo */}
            <div className="shrink-0">
              {agency.logo_url ? (
                <div className="relative w-24 h-14 bg-tint rounded border border-line overflow-hidden">
                  <Image
                    src={agency.logo_url}
                    alt={agency.name}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-24 h-14 bg-tint rounded border border-dashed border-line-2 flex items-center justify-center">
                  <span className="font-data text-[10px] text-mute-2">Ingen logotyp</span>
                </div>
              )}
              <p className="font-data text-[9px] text-mute-2 mt-1 text-center">Logotyp</p>
            </div>

            {/* Colors */}
            <div className="flex-1">
              {hasBranding ? (
                <div className="space-y-2">
                  {[
                    { label: 'Primär',    value: agency.brand_colors?.primary },
                    { label: 'Sekundär',  value: agency.brand_colors?.secondary },
                    { label: 'Accent',    value: agency.brand_colors?.accent },
                  ].filter(c => c.value).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded border border-line shrink-0"
                        style={{ backgroundColor: value! }}
                      />
                      <span className="font-data text-[11px] text-ink-2">{value}</span>
                      <span className="font-data text-[10px] text-mute">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-data text-[11px] text-mute">
                  Ingen varumärkesdata hittad.{agency.url && (
                    <button onClick={handleRescrapeBrand} className="ml-1 text-accent hover:underline">
                      Hämta nu
                    </button>
                  )}
                </p>
              )}
              {agency.scraped_data?.phone && (
                <p className="font-data text-[10px] text-mute mt-3">
                  {agency.scraped_data.phone}
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Active tone profile */}
        {hasTone && agency.tone_profile && (
          <Section label="Aktiv tonprofil">
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {agency.tone_profile.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-data text-[11px] px-3 py-1 rounded-full border border-line text-ink"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {(agency.tone_profile.examples?.length ?? 0) > 0 && (
                <div>
                  <p className="font-data text-[10px] text-mute uppercase tracking-[0.02em] mb-2">
                    Baserat på – hämtat från {agency.tone_profile.agency_name}
                  </p>
                  <div className="space-y-2">
                    {(agency.tone_profile.examples ?? []).map((ex, i) => (
                      <div key={i} className="flex gap-2 text-[13px] text-mute leading-relaxed">
                        <span className="shrink-0 text-accent">"</span>
                        <span className="italic">{ex}</span>
                        <span className="shrink-0 text-accent">"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Tone fetcher */}
        {agency.url ? (
          <ToneFetcherCard agencyUrl={agency.url} onComplete={onToneUpdated} />
        ) : (
          <Section label="Tonanalys">
            <p className="font-data text-[11px] text-mute p-4">Ingen hemsida är registrerad för din byrå.</p>
          </Section>
        )}

        {/* Meta social */}
        <MetaSocialCard
          agency={agency}
          notice={metaNotice}
          scanning={scanning}
          scanError={scanError}
          onConnect={() => { window.location.href = buildMetaOAuthUrl() }}
          onScan={handleScanMeta}
        />
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────

function Section({
  label, action, children,
}: {
  label: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-tint">
        <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{label}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Meta Social Card ─────────────────────────────────────────

function MetaSocialCard({
  agency, notice, scanning, scanError, onConnect, onScan,
}: {
  agency: Agency
  notice: 'connected' | 'error' | null
  scanning: boolean
  scanError: string
  onConnect: () => void
  onScan: () => void
}) {
  const isConnected = !!agency.meta_page_id
  const hasSocialTone = !!agency.social_tone_profile?.tone_tags?.length
  const profile: SocialToneProfile | null = agency.social_tone_profile ?? null

  return (
    <Section
      label="Sociala medier"
      action={
        <span className={`font-data text-[10px] px-2 py-0.5 rounded-full border ${
          isConnected
            ? 'border-accent/20 text-accent bg-accent/5'
            : 'border-line text-mute'
        }`}>
          {isConnected ? '● Kopplad' : '○ Ej kopplad'}
        </span>
      }
    >
      <div className="p-4 space-y-4">
        <p className="font-data text-[11px] text-mute tracking-snug">
          Koppla Facebook & Instagram för att analysera byråns sociala ton
        </p>

        {notice === 'connected' && (
          <div className="border border-line rounded-lg px-3 py-2.5 bg-tint">
            <p className="font-data text-[11px] text-ink tracking-snug">
              ✓ Facebook & Instagram kopplat. Analysera inlägg nedan.
            </p>
          </div>
        )}
        {notice === 'error' && (
          <div className="border border-accent/20 rounded-lg px-3 py-2.5 bg-accent/5">
            <p className="font-data text-[11px] text-accent tracking-snug">
              Koppling misslyckades. Kontrollera att Meta App ID är konfigurerat.
            </p>
          </div>
        )}
        {scanError && (
          <p className="font-data text-[11px] text-accent tracking-snug">{scanError}</p>
        )}

        {!isConnected ? (
          <button
            onClick={onConnect}
            className="bg-ink text-bg px-5 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity"
          >
            Koppla Facebook & Instagram
          </button>
        ) : (
          <button
            onClick={onScan}
            disabled={scanning}
            className="bg-ink text-bg px-5 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-2"
          >
            {scanning ? (
              <>
                <span className="w-3 h-3 border-2 border-bg/40 border-t-bg rounded-full animate-spin inline-block" />
                Analyserar inlägg…
              </>
            ) : (
              `${hasSocialTone ? 'Uppdatera' : 'Analysera'} social ton`
            )}
          </button>
        )}

        {hasSocialTone && profile && (
          <div className="space-y-3 pt-2 border-t border-line">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
              Social tonprofil
            </p>

            <div className="flex flex-wrap gap-1.5">
              {profile.tone_tags.map((tag) => (
                <span
                  key={tag}
                  className="font-data text-[11px] px-2.5 py-0.5 rounded-full border border-line text-ink"
                >
                  {tag}
                </span>
              ))}
            </div>

            {profile.voice && (
              <p className="text-[13px] text-mute italic leading-relaxed">"{profile.voice}"</p>
            )}

            {profile.hashtags?.length > 0 && (
              <p className="font-data text-[10px] text-mute tracking-snug">
                {profile.hashtags.slice(0, 8).join(' ')}
              </p>
            )}

            {profile.formats?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.formats.map((f) => (
                  <span key={f} className="font-data text-[10px] text-mute border border-line rounded px-2 py-0.5">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
