'use client'

import { useEffect, useRef, useState } from 'react'
import { LocationArgument } from '@/types'

const STEPS = [
  (area: string) => `Analyserar ${area}...`,
  () => 'Hämtar kommunikationer...',
  () => 'Kontrollerar naturläge...',
  () => 'Beräknar avstånd till service...',
]

type Status = 'idle' | 'running' | 'done' | 'error'

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

interface LocationCardProps {
  address: string
  area: string
  onInclude: (text: string) => void
}

export default function LocationCard({ address, area, onInclude }: LocationCardProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [completedSteps, setCompletedSteps] = useState(0)
  const [args, setArgs] = useState<LocationArgument[]>([])
  const [included, setIncluded] = useState<Set<string>>(new Set())
  const [visibleArgs, setVisibleArgs] = useState(0)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevKeyRef = useRef('')

  useEffect(() => {
    const key = `${address.trim()}|${area.trim()}`
    const ready = address.trim().length >= 5 && area.trim().length >= 3

    if (!ready || key === prevKeyRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      prevKeyRef.current = key
      runAnalysis()
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, area])

  async function runAnalysis() {
    setStatus('running')
    setCompletedSteps(0)
    setArgs([])
    setIncluded(new Set())
    setVisibleArgs(0)
    setError('')

    const apiPromise = fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, area }),
    })

    for (let i = 1; i <= STEPS.length; i++) {
      await delay(900)
      setCompletedSteps(i)
    }

    const res = await apiPromise
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Analysen misslyckades')
      setStatus('error')
      return
    }

    const result: LocationArgument[] = data.arguments
    setArgs(result)
    setStatus('done')

    for (let i = 1; i <= result.length; i++) {
      await delay(200)
      setVisibleArgs(i)
    }
  }

  function handleToggle(arg: LocationArgument) {
    if (included.has(arg.id)) {
      setIncluded((prev) => {
        const next = new Set(prev)
        next.delete(arg.id)
        return next
      })
    } else {
      setIncluded((prev) => new Set(prev).add(arg.id))
      onInclude(arg.text)
    }
  }

  if (status === 'idle') return null

  return (
    <div className="border border-line rounded-lg overflow-hidden bg-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-tint">
        <div className="flex items-center gap-2">
          <span className="text-accent text-[11px]">◆</span>
          <p className="font-data text-[11px] text-ink font-medium">Platsanalys</p>
          {area && (
            <>
              <span className="text-mute-2 text-[10px]">·</span>
              <span className="font-data text-[10px] text-mute truncate max-w-[80px]">{area}</span>
            </>
          )}
        </div>
        {status === 'running' && (
          <div className="w-3 h-3 border border-line border-t-accent rounded-full animate-spin shrink-0" />
        )}
        {status === 'done' && (
          <span className="font-data text-[10px] text-mute shrink-0">
            {included.size}/{args.length}
          </span>
        )}
      </div>

      {/* Steps */}
      {(status === 'running' || status === 'done') && (
        <div className="px-4 py-3 space-y-1.5">
          {STEPS.map((stepFn, i) => {
            const done = completedSteps > i
            const active = completedSteps === i && status === 'running'
            return (
              <div
                key={i}
                className="flex items-center gap-2 transition-opacity duration-300"
                style={{ opacity: completedSteps >= i ? 1 : 0.25 }}
              >
                <div className="w-3 h-3 flex items-center justify-center shrink-0">
                  {done ? (
                    <span className="text-accent text-[10px]">✓</span>
                  ) : active ? (
                    <div className="w-2.5 h-2.5 border border-line border-t-accent rounded-full animate-spin" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-line-2" />
                  )}
                </div>
                <span className={`font-data text-[10px] tracking-snug ${
                  done ? 'text-mute-2' : active ? 'text-ink-2' : 'text-mute-2'
                }`}>
                  {stepFn(area)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {status === 'error' && (
        <p className="px-4 py-3 font-data text-[11px] text-accent">{error}</p>
      )}

      {/* Arguments */}
      {status === 'done' && args.length > 0 && (
        <div className="border-t border-line">
          <p className="px-4 pt-3 pb-2 font-data text-[10px] uppercase tracking-[0.02em] text-mute">
            Klicka för att inkludera
          </p>
          <div className="px-3 pb-3 space-y-1">
            {args.map((arg, i) => {
              const isIncluded = included.has(arg.id)
              return (
                <button
                  key={arg.id}
                  onClick={() => handleToggle(arg)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200 hover:bg-tint"
                  style={{
                    opacity: i < visibleArgs ? 1 : 0,
                    transform: i < visibleArgs ? 'translateY(0)' : 'translateY(6px)',
                    transition: `opacity 0.3s ease ${i * 0.05}s, transform 0.3s ease ${i * 0.05}s`,
                    backgroundColor: isIncluded ? 'var(--accent-tint)' : undefined,
                  }}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">{arg.icon}</span>
                  <span
                    className={`font-data text-[11px] leading-relaxed flex-1 tracking-snug transition-colors ${
                      isIncluded ? 'text-ink' : 'text-mute'
                    }`}
                  >
                    {arg.text}
                  </span>
                  <div className="shrink-0 flex items-center gap-2 mt-0.5">
                    <span className="font-data text-[9px] text-mute-2">{arg.source}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isIncluded ? 'border-accent bg-accent' : 'border-line-2'
                      }`}
                    >
                      {isIncluded && (
                        <span className="text-[8px] text-bg font-bold leading-none">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
