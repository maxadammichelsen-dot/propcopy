'use client'

import { useEffect, useRef, useState } from 'react'

interface Risk {
  title: string
  problem: string
  psychology: string
  fix: string
  severity: 'HÖG' | 'MEDEL' | 'LÅG'
}

interface Positioning {
  strength: string
  weakness: string
  suggestion: string
}

interface RevisionAnalysis {
  risks: Risk[]
  positioning: Positioning
  copy_score: number
  strategy_score: number
  verdict: string
  estatio_advantage?: string
}

interface RevisionViewProps {
  objectId?: string
  onAppendDetail?: (text: string) => void
}

const LOAD_STEPS = [
  'Läser annonsen…',
  'Identifierar riskfaktorer…',
  'Analyserar positionering…',
  'Skriver förbättringsförslag…',
]

const SEVERITY_LABEL: Record<string, string> = {
  HÖG: 'Hög risk',
  MEDEL: 'Medel',
  LÅG: 'Låg risk',
}

const SEVERITY_STYLE: Record<string, string> = {
  HÖG:   'bg-accent/10 text-accent border-accent/20',
  MEDEL: 'bg-amber-50 text-amber-700 border-amber-200',
  LÅG:   'bg-tint text-mute border-line',
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export default function RevisionView({ objectId, onAppendDetail }: RevisionViewProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [analysis, setAnalysis] = useState<RevisionAnalysis | null>(null)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  async function handleAnalyze() {
    if (!text.trim() || loading) return
    setLoading(true)
    setStep(0)
    setAnalysis(null)
    setError('')

    abortRef.current = new AbortController()

    const apiPromise = fetch('/api/revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ existing_text: text, object_id: objectId }),
      signal: abortRef.current.signal,
    })

    // Animate steps while waiting
    for (let i = 1; i < LOAD_STEPS.length; i++) {
      await delay(1400)
      setStep(i)
    }

    try {
      const res = await apiPromise
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Analysen misslyckades')
        setLoading(false)
        return
      }

      setAnalysis(data.analysis)
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Analysen misslyckades')
      }
    }

    setLoading(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b border-line px-8 py-6">
        <h2 className="font-display text-[36px] leading-[0.95] tracking-[-0.02em] text-ink">
          Annonsrevision.
        </h2>
        <p className="font-data text-[11px] text-mute tracking-snug mt-2">
          Klistra in en befintlig objektannons — AI identifierar vad som sänker budgivningen
        </p>
      </div>

      {/* Two-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] divide-y lg:divide-y-0 lg:divide-x divide-line min-h-[calc(100%-80px)]">

        {/* Left: input */}
        <div className="px-8 py-6 flex flex-col gap-4">
          <label className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">
            Befintlig annonstext
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            disabled={loading}
            placeholder={"Klistra in din nuvarande annonstext här...\n\nT.ex. Hemnet-annons, mäklarbeskrivning eller annat marknadsföringsmaterial."}
            className="flex-1 w-full bg-transparent border border-line rounded-lg focus:border-ink outline-none px-4 py-3 text-[14px] text-ink placeholder:text-mute-2 transition-colors resize-none leading-relaxed disabled:opacity-50"
          />

          <div className="flex items-center gap-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="bg-ink text-bg px-6 py-2.5 rounded-full text-[13px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              {loading ? 'Analyserar…' : 'Analysera'}
            </button>
            {analysis && !loading && (
              <button
                onClick={() => { setAnalysis(null); setStep(0) }}
                className="font-data text-[11px] text-mute hover:text-ink transition-colors tracking-snug"
              >
                Rensa
              </button>
            )}
          </div>

          {/* Loading steps */}
          {loading && (
            <div className="space-y-2 pt-2">
              {LOAD_STEPS.map((s, i) => {
                const done = i < step
                const active = i === step
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 transition-opacity duration-300"
                    style={{ opacity: i <= step ? 1 : 0.25 }}
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
                    <span className={`font-data text-[11px] tracking-snug ${
                      done ? 'text-mute-2' : active ? 'text-ink-2' : 'text-mute-2'
                    }`}>
                      {s}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <p className="font-data text-[11px] text-accent tracking-snug">{error}</p>
          )}
        </div>

        {/* Right: results */}
        <div className="px-6 py-6">
          {!analysis && !loading && (
            <div className="h-full flex items-center justify-center">
              <p className="font-data text-[11px] text-mute-2 tracking-snug text-center leading-relaxed max-w-[200px]">
                Analysen visas här när du klistrat in en text och tryckt Analysera
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-6 h-6 border-[1.5px] border-line border-t-accent rounded-full animate-spin mx-auto mb-3" />
                <p className="font-data text-[11px] text-mute tracking-snug">
                  {LOAD_STEPS[step]}
                </p>
              </div>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-6">

              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <ScoreBlock label="Copybetyg" score={analysis.copy_score} />
                <ScoreBlock label="Strategibetyg" score={analysis.strategy_score} />
              </div>

              {/* Verdict */}
              <div className="border-l-2 border-line pl-4">
                <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">
                  Slutsats
                </p>
                <p className="text-[13px] text-ink-2 italic leading-relaxed">
                  {analysis.verdict}
                </p>
              </div>

              {/* Estatio advantage */}
              {analysis.estatio_advantage && (
                <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-3">
                  <p className="font-data text-[10px] text-accent tracking-[0.02em] uppercase mb-1">
                    Estatio-fördel
                  </p>
                  <p className="font-data text-[11px] text-ink-2 tracking-snug leading-relaxed">
                    {analysis.estatio_advantage}
                  </p>
                </div>
              )}

              {/* Positioning */}
              <div>
                <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">
                  Positionering
                </p>
                <div className="space-y-2">
                  <PositioningRow icon="+" label="Styrka" text={analysis.positioning.strength} />
                  <PositioningRow icon="−" label="Svaghet" text={analysis.positioning.weakness} alert />
                  <PositioningRow icon="→" label="Förslag" text={analysis.positioning.suggestion} />
                </div>
              </div>

              {/* Risks */}
              {analysis.risks.length > 0 && (
                <div>
                  <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-3">
                    Riskfaktorer ({analysis.risks.length})
                  </p>
                  <div className="space-y-2">
                    {analysis.risks.map((risk, i) => (
                      <RiskCard
                        key={i}
                        risk={risk}
                        onAppend={onAppendDetail}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Score block ──────────────────────────────────────────────

function ScoreBlock({ label, score }: { label: string; score: number }) {
  const color = score >= 7 ? 'var(--ink)' : score >= 4 ? 'var(--mute)' : 'var(--accent)'
  return (
    <div className="border border-line rounded-lg px-4 py-3 bg-tint">
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="font-data text-[32px] font-medium tabular-nums leading-none" style={{ color }}>
          {score}
        </span>
        <span className="font-data text-[13px] text-mute-2">/10</span>
      </div>
    </div>
  )
}

// ─── Positioning row ──────────────────────────────────────────

function PositioningRow({
  icon, label, text, alert = false,
}: {
  icon: string; label: string; text: string; alert?: boolean
}) {
  return (
    <div className="flex gap-3 text-[12px]">
      <span className={`font-data shrink-0 w-4 ${alert ? 'text-accent' : 'text-mute'}`}>{icon}</span>
      <div>
        <span className="font-data text-[10px] text-mute uppercase tracking-[0.02em]">{label} </span>
        <span className="text-ink-2 leading-relaxed">{text}</span>
      </div>
    </div>
  )
}

// ─── Risk card ────────────────────────────────────────────────

function RiskCard({
  risk, onAppend,
}: {
  risk: Risk
  onAppend?: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [appended, setAppended] = useState(false)

  function handleAppend() {
    onAppend?.(risk.fix)
    setAppended(true)
    setTimeout(() => setAppended(false), 2000)
  }

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-tint transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`font-data text-[9px] uppercase tracking-[0.06em] px-2 py-0.5 rounded-full border shrink-0 ${SEVERITY_STYLE[risk.severity]}`}
          >
            {SEVERITY_LABEL[risk.severity]}
          </span>
          <span className="text-[13px] font-medium text-ink truncate">{risk.title}</span>
        </div>
        <span className="font-data text-[11px] text-mute-2 ml-3 shrink-0">
          {open ? '↑' : '↓'}
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4 space-y-3 bg-bg">
          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">Problem</p>
            <p className="text-[13px] text-ink-2 leading-relaxed">{risk.problem}</p>
          </div>

          <div>
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1">Psykologi</p>
            <p className="text-[13px] text-ink-2 italic leading-relaxed">{risk.psychology}</p>
          </div>

          <div className="bg-tint border border-line rounded-lg px-3 py-3">
            <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase mb-1.5">
              Förbättringsförslag
            </p>
            <p className="text-[13px] text-ink leading-relaxed">{risk.fix}</p>

            {onAppend && (
              <button
                onClick={handleAppend}
                className="mt-3 font-data text-[10px] text-accent hover:underline tracking-snug"
              >
                {appended ? '✓ Tillagd i detaljer' : 'Lägg till i objektets detaljer →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
