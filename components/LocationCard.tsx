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
    <div className="rounded-lg border border-[#2a2a2a] bg-[#161616] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#b8965a]">◆</span>
          <p className="text-xs font-medium text-[#f0ece4]">Platsanalys</p>
          <span className="text-[10px] text-[#444]">·</span>
          <span className="text-[10px] text-[#555]">{area}</span>
        </div>
        {status === 'running' && (
          <div className="w-3 h-3 border border-[#2a2a2a] border-t-[#b8965a] rounded-full animate-spin" />
        )}
        {status === 'done' && (
          <span className="text-[10px] text-[#555]">
            {included.size} av {args.length} inkluderade
          </span>
        )}
      </div>

      {/* Steps */}
      {(status === 'running' || status === 'done') && (
        <div className="px-4 py-3 flex gap-4 flex-wrap">
          {STEPS.map((stepFn, i) => {
            const done = completedSteps > i
            const active = completedSteps === i && status === 'running'
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 transition-opacity duration-300"
                style={{ opacity: completedSteps >= i ? 1 : 0.25 }}
              >
                <div className="w-3 h-3 flex items-center justify-center">
                  {done ? (
                    <span className="text-[#b8965a] text-[10px]">✓</span>
                  ) : active ? (
                    <div className="w-2.5 h-2.5 border border-[#b8965a] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-[#333]" />
                  )}
                </div>
                <span className={`text-[10px] ${done ? 'text-[#555]' : active ? 'text-[#ccc]' : 'text-[#333]'}`}>
                  {stepFn(area)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <p className="px-4 py-3 text-xs text-red-400">{error}</p>
      )}

      {/* Arguments */}
      {status === 'done' && args.length > 0 && (
        <div className="border-t border-[#1e1e1e]">
          <p className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-widest text-[#444]">
            Föreslagna säljargument – klicka för att inkludera i detaljer
          </p>
          <div className="px-3 pb-3 space-y-1">
            {args.map((arg, i) => {
              const isIncluded = included.has(arg.id)
              return (
                <button
                  key={arg.id}
                  onClick={() => handleToggle(arg)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-200 group"
                  style={{
                    opacity: i < visibleArgs ? 1 : 0,
                    transform: i < visibleArgs ? 'translateY(0)' : 'translateY(6px)',
                    transition: `opacity 0.3s ease ${i * 0.05}s, transform 0.3s ease ${i * 0.05}s, background-color 0.15s`,
                    backgroundColor: isIncluded ? '#b8965a0f' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isIncluded) e.currentTarget.style.backgroundColor = '#ffffff08'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isIncluded ? '#b8965a0f' : 'transparent'
                  }}
                >
                  <span className="text-base leading-none mt-0.5 shrink-0">{arg.icon}</span>
                  <span
                    className={`text-xs leading-relaxed flex-1 transition-colors ${
                      isIncluded ? 'text-[#d4b07a]' : 'text-[#888] group-hover:text-[#bbb]'
                    }`}
                  >
                    {arg.text}
                  </span>
                  <div className="shrink-0 flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[#333]">{arg.source}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                        isIncluded
                          ? 'border-[#b8965a] bg-[#b8965a]'
                          : 'border-[#333] bg-transparent'
                      }`}
                    >
                      {isIncluded && (
                        <span className="text-[8px] text-[#111] font-bold leading-none">✓</span>
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
