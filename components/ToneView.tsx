'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Agency, ToneProfile } from '@/types'
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
      </div>
    </div>
  )
}
