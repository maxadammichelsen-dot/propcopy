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

    const apiPromise = fetch('/api/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: agencyUrl }),
    })

    for (let i = 1; i <= STEPS.length; i++) {
      await delay(1300)
      setCompletedSteps(i)
    }

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

    for (let i = 1; i <= (tp.tags?.length ?? 0); i++) {
      await delay(250)
      setVisibleTags(i)
    }
  }

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-tint">
        <div>
          <p className="text-[13px] font-medium text-ink">Tonalitetsinsamling</p>
          <p className="font-data text-[10px] text-mute mt-0.5 tracking-snug">{agencyUrl}</p>
        </div>

        {status === 'idle' && (
          <button
            onClick={handleFetch}
            className="bg-ink text-bg px-4 py-1.5 rounded-full text-[12px] font-medium hover:opacity-80 transition-opacity"
          >
            Hämta tonalitet
          </button>
        )}
        {status === 'done' && (
          <button
            onClick={handleFetch}
            className="font-data text-[10px] text-mute hover:text-ink transition-colors tracking-snug border border-line rounded-full px-3 py-1.5"
          >
            Uppdatera
          </button>
        )}
        {status === 'running' && (
          <div className="w-4 h-4 border-[1.5px] border-line border-t-accent rounded-full animate-spin" />
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
                    <span className="text-accent text-[11px]">✓</span>
                  ) : active ? (
                    <div className="w-3 h-3 border border-line border-t-accent rounded-full animate-spin" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-line-2" />
                  )}
                </div>
                <span className={`font-data text-[11px] tracking-snug transition-colors ${
                  done ? 'text-mute-2' : active ? 'text-ink-2' : 'text-mute-2'
                }`}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="px-5 py-4 font-data text-[11px] text-accent tracking-snug">{error}</div>
      )}

      {/* Results */}
      {status === 'done' && profile && (
        <div className="px-5 pb-5 border-t border-line pt-4 space-y-4">
          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">
              Identifierade tonalitetsord
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag, i) => (
                <span
                  key={tag}
                  className="font-data text-[11px] px-3 py-1 rounded-full border border-line text-ink transition-all duration-500"
                  style={{
                    opacity: i < visibleTags ? 1 : 0,
                    transform: i < visibleTags ? 'translateY(0)' : 'translateY(6px)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {profile.examples && profile.examples.length > 0 && visibleTags >= profile.tags.length && (
            <div
              className="transition-all duration-500"
              style={{ opacity: visibleTags >= profile.tags.length ? 1 : 0 }}
            >
              <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-2">
                Baserat på – hämtat direkt från {profile.agency_name}
              </p>
              <div className="space-y-2">
                {profile.examples.map((ex, i) => (
                  <div key={i} className="flex gap-2 text-[13px] text-mute leading-relaxed">
                    <span className="text-accent shrink-0">"</span>
                    <span className="italic">{ex}</span>
                    <span className="text-accent shrink-0">"</span>
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
