'use client'

import { useState } from 'react'
import { ToneProfile } from '@/types'

const STEPS = [
  'Hämtar byråns hemsida...',
  'Identifierar objektsidor...',
  'Läser objekttexter...',
  'Analyserar skrivstil...',
]

type Status = 'idle' | 'running' | 'done' | 'error'

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

interface ToneFetcherCardProps {
  agencyUrl: string
  onComplete: (profile: ToneProfile) => void
}

export default function ToneFetcherCard({ agencyUrl, onComplete }: ToneFetcherCardProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [completedSteps, setCompletedSteps] = useState(0)
  const [profile, setProfile] = useState<ToneProfile | null>(null)
  const [visibleTags, setVisibleTags] = useState(0)
  const [error, setError] = useState('')

  async function handleFetch() {
    setStatus('running')
    setCompletedSteps(0)
    setProfile(null)
    setVisibleTags(0)
    setError('')

    // Start API call immediately – runs in parallel with animation
    const apiPromise = fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: agencyUrl }),
    })

    // Animate each step (1300ms each → ~5s total)
    for (let i = 1; i <= STEPS.length; i++) {
      await delay(1300)
      setCompletedSteps(i)
    }

    // Wait for API if still pending
    const res = await apiPromise
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setStatus('error')
      return
    }

    const tp: ToneProfile = data.tone_profile
    setProfile(tp)
    setStatus('done')
    onComplete(tp)

    // Animate tags in one by one
    for (let i = 1; i <= (tp.tags?.length ?? 0); i++) {
      await delay(250)
      setVisibleTags(i)
    }
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
        <div>
          <p className="text-sm font-medium text-[#f0ece4]">Tonalitetsinsamling</p>
          <p className="text-[10px] text-[#555] mt-0.5">{agencyUrl}</p>
        </div>
        {status === 'idle' && (
          <button
            onClick={handleFetch}
            className="text-xs px-3 py-1.5 bg-[#b8965a] hover:bg-[#d4b07a] text-[#111111] rounded font-medium transition-colors"
          >
            Hämta tonalitet
          </button>
        )}
        {status === 'done' && (
          <button
            onClick={handleFetch}
            className="text-[10px] px-3 py-1.5 border border-[#2a2a2a] text-[#555] hover:text-[#b8965a] rounded transition-colors"
          >
            Uppdatera
          </button>
        )}
        {status === 'running' && (
          <div className="w-4 h-4 border-2 border-[#2a2a2a] border-t-[#b8965a] rounded-full animate-spin" />
        )}
      </div>

      {/* Steps */}
      {(status === 'running' || status === 'done') && (
        <div className="px-5 py-4 space-y-2.5">
          {STEPS.map((step, i) => {
            const done = completedSteps > i
            const active = completedSteps === i && status === 'running'
            return (
              <div
                key={step}
                className="flex items-center gap-3 transition-opacity duration-500"
                style={{ opacity: completedSteps >= i ? 1 : 0.2 }}
              >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  {done ? (
                    <span className="text-[#b8965a] text-sm leading-none">✓</span>
                  ) : active ? (
                    <div className="w-3 h-3 border border-[#b8965a] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
                  )}
                </div>
                <span
                  className={`text-xs transition-colors ${
                    done ? 'text-[#888]' : active ? 'text-[#f0ece4]' : 'text-[#333]'
                  }`}
                >
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="px-5 py-4 text-sm text-red-400">{error}</div>
      )}

      {/* Results */}
      {status === 'done' && profile && (
        <div className="px-5 pb-5 border-t border-[#222] pt-4 space-y-4">
          {/* Tags */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#555] mb-3">
              Identifierade tonalitetsord
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag, i) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full border text-xs font-medium transition-all duration-500"
                  style={{
                    opacity: i < visibleTags ? 1 : 0,
                    transform: i < visibleTags ? 'translateY(0)' : 'translateY(6px)',
                    borderColor: i < visibleTags ? '#b8965a55' : 'transparent',
                    color: i < visibleTags ? '#b8965a' : 'transparent',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Examples */}
          {profile.examples && profile.examples.length > 0 && visibleTags >= profile.tags.length && (
            <div
              className="transition-all duration-500"
              style={{ opacity: visibleTags >= profile.tags.length ? 1 : 0 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-[#555] mb-2">
                Baserat på – hämtat direkt från {profile.agency_name}
              </p>
              <div className="space-y-2">
                {profile.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="flex gap-2 text-xs text-[#666] leading-relaxed"
                  >
                    <span className="text-[#b8965a] shrink-0 mt-0.5">"</span>
                    <span className="italic">{ex}</span>
                    <span className="text-[#b8965a] shrink-0 mt-0.5">"</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
