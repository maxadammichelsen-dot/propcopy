'use client'

import { Agency, ToneProfile } from '@/types'
import ToneFetcherCard from './ToneFetcherCard'

interface ToneViewProps {
  agency: Agency
  onToneUpdated: (profile: ToneProfile) => void
}

export default function ToneView({ agency, onToneUpdated }: ToneViewProps) {
  const hasTone = !!agency.tone_profile?.tags?.length

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-[#2a2a2a]">
        <h2 className="font-serif text-3xl text-[#f0ece4]">Byråns tonalitet</h2>
        <p className="text-sm text-[#555] mt-1">
          Hämtas automatiskt från {agency.url || 'er hemsida'} och används i all textgenerering.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Current tone tags – shown when already fetched */}
        {hasTone && agency.tone_profile && (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">
              Aktiv tonprofil
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {agency.tone_profile.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full border border-[#b8965a55] text-xs text-[#b8965a] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
            {agency.tone_profile.examples && agency.tone_profile.examples.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#444] mb-2">
                  Baserat på – hämtat direkt från {agency.tone_profile.agency_name}
                </p>
                <div className="space-y-2">
                  {agency.tone_profile.examples.map((ex, i) => (
                    <div key={i} className="flex gap-2 text-xs text-[#666] leading-relaxed">
                      <span className="text-[#b8965a] shrink-0">"</span>
                      <span className="italic">{ex}</span>
                      <span className="text-[#b8965a] shrink-0">"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fetcher card */}
        {agency.url ? (
          <ToneFetcherCard
            agencyUrl={agency.url}
            onComplete={onToneUpdated}
          />
        ) : (
          <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-5">
            <p className="text-sm text-[#555]">
              Ingen hemsida är registrerad för din byrå. Kontakta support.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
