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
      // Clean URL without reloading
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
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
    const scope = [
      'pages_read_engagement',
      'pages_read_user_content',
      'instagram_basic',
    ].join(',')
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
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h2 className="font-serif text-3xl text-[#f0ece4]">Varumärke & tonalitet</h2>
        <p className="text-sm text-[#555] mt-1">
          Hämtas automatiskt från {agency.url || 'er hemsida'} och används i all textgenerering.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Branding card */}
        <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-widest text-[#555]">Varumärkesdata</p>
            <button
              onClick={handleRescrapeBrand}
              disabled={rescrapingBrand || !agency.url}
              className="text-[10px] text-[#555] hover:text-[var(--brand-primary,#b8965a)] transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {rescrapingBrand && (
                <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              )}
              {rescrapingBrand ? 'Hämtar…' : 'Uppdatera'}
            </button>
          </div>

          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="shrink-0">
              {agency.logo_url ? (
                <div className="relative w-24 h-14 bg-[#111] rounded border border-[#2a2a2a] overflow-hidden">
                  <Image
                    src={agency.logo_url}
                    alt={agency.name}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-24 h-14 bg-[#161616] rounded border border-dashed border-[#2a2a2a] flex items-center justify-center">
                  <span className="text-[10px] text-[#333]">Ingen logotyp</span>
                </div>
              )}
              <p className="text-[9px] text-[#444] mt-1 text-center">Logotyp</p>
            </div>

            {/* Colors */}
            <div className="flex-1">
              {hasBranding ? (
                <div className="space-y-2">
                  {[
                    { label: 'Primär', value: agency.brand_colors?.primary },
                    { label: 'Sekundär', value: agency.brand_colors?.secondary },
                    { label: 'Accent', value: agency.brand_colors?.accent },
                  ].filter(c => c.value).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div
                        className="w-5 h-5 rounded border border-[#ffffff11] shrink-0"
                        style={{ backgroundColor: value! }}
                      />
                      <span className="text-xs text-[#888] font-mono">{value}</span>
                      <span className="text-[10px] text-[#444]">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#444] mt-1">
                  Ingen varumärkesdata hittad ännu.
                  {agency.url && (
                    <button
                      onClick={handleRescrapeBrand}
                      className="ml-1 text-[var(--brand-primary,#b8965a)] hover:opacity-80 transition-opacity"
                    >
                      Hämta nu
                    </button>
                  )}
                </p>
              )}

              {/* Scraped meta */}
              {agency.scraped_data?.phone && (
                <p className="text-[10px] text-[#555] mt-3">
                  📞 {agency.scraped_data.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Active tone profile */}
        {hasTone && agency.tone_profile && (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">
              Aktiv tonprofil
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {agency.tone_profile.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full border text-xs font-medium"
                  style={{
                    borderColor: 'var(--brand-primary-dim, #b8965a33)',
                    color: 'var(--brand-primary, #b8965a)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            {agency.tone_profile.examples?.length && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#444] mb-2">
                  Baserat på – hämtat direkt från {agency.tone_profile.agency_name}
                </p>
                <div className="space-y-2">
                  {agency.tone_profile.examples.map((ex, i) => (
                    <div key={i} className="flex gap-2 text-xs text-[#666] leading-relaxed">
                      <span className="shrink-0" style={{ color: 'var(--brand-primary,#b8965a)' }}>"</span>
                      <span className="italic">{ex}</span>
                      <span className="shrink-0" style={{ color: 'var(--brand-primary,#b8965a)' }}>"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tone fetcher */}
        {agency.url ? (
          <ToneFetcherCard agencyUrl={agency.url} onComplete={onToneUpdated} />
        ) : (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
            <p className="text-sm text-[#555]">Ingen hemsida är registrerad för din byrå.</p>
          </div>
        )}

        {/* Meta social connection */}
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
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Sociala medier</p>
          <p className="text-xs text-[#888] mt-0.5">
            Koppla Facebook & Instagram för att analysera byråns sociala ton
          </p>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isConnected ? 'var(--brand-primary-dim,#b8965a33)' : '#1e1e1e',
            color: isConnected ? 'var(--brand-primary,#b8965a)' : '#444',
          }}
        >
          {isConnected ? '● Kopplad' : '○ Ej kopplad'}
        </span>
      </div>

      {notice === 'connected' && (
        <p className="text-xs text-green-400 bg-green-900/20 border border-green-900/30 rounded px-3 py-2">
          ✓ Facebook & Instagram kopplat. Analysera inlägg nedan.
        </p>
      )}
      {notice === 'error' && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded px-3 py-2">
          Koppling misslyckades. Kontrollera att Meta App ID är konfigurerat.
        </p>
      )}
      {scanError && (
        <p className="text-xs text-red-400">{scanError}</p>
      )}

      {!isConnected ? (
        <button
          onClick={onConnect}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors text-[#111111]"
          style={{ backgroundColor: 'var(--brand-primary,#b8965a)' }}
        >
          <span className="text-base leading-none">f</span>
          Koppla Facebook & Instagram
        </button>
      ) : (
        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-60 text-[#111111]"
          style={{ backgroundColor: 'var(--brand-primary,#b8965a)' }}
        >
          {scanning ? (
            <>
              <span className="w-3 h-3 border-2 border-[#11111166] border-t-[#111111] rounded-full animate-spin inline-block" />
              Analyserar inlägg…
            </>
          ) : (
            `✦ ${hasSocialTone ? 'Uppdatera' : 'Analysera'} social ton`
          )}
        </button>
      )}

      {hasSocialTone && profile && (
        <div className="space-y-3 pt-2 border-t border-[#2a2a2a]">
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Social tonprofil</p>

          <div className="flex flex-wrap gap-1.5">
            {profile.tone_tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full border text-[10px]"
                style={{ borderColor: 'var(--brand-primary-dim,#b8965a33)', color: 'var(--brand-primary,#b8965a)' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {profile.voice && (
            <p className="text-xs text-[#888] leading-relaxed italic">"{profile.voice}"</p>
          )}

          {profile.hashtags?.length > 0 && (
            <p className="text-[10px] text-[#555] font-mono">
              {profile.hashtags.slice(0, 8).join(' ')}
            </p>
          )}

          {profile.formats?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.formats.map((f) => (
                <span key={f} className="text-[10px] text-[#666] bg-[#111] border border-[#2a2a2a] px-2 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
