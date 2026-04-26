'use client'

import { useState } from 'react'
import { Channel, GenerateResult } from '@/types'
import ChannelBadge, { CHANNEL_CONFIG } from './ChannelBadge'

interface ContentCardProps {
  channel: Channel
  result: GenerateResult | null
  isActive: boolean
  onToggle: () => void
  objectId?: string
  agencyId?: string
}

const CHANNEL_META: Record<Channel, { maxChars: number; description: string }> = {
  hemnet:         { maxChars: 1875, description: 'Hemnet + alla portaler via Vitec' },
  meta:           { maxChars: 430,  description: 'Hook + primary text + CTA' },
  email:          { maxChars: 900,  description: 'Ämnesrad + brödtext' },
  social_organic: { maxChars: 2200, description: 'Organiskt Instagram/Facebook-inlägg' },
}

export default function ContentCard({ channel, result, isActive, onToggle, objectId, agencyId }: ContentCardProps) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState<'approved' | 'rejected' | 'edited' | null>(null)
  const [sending, setSending] = useState(false)

  const meta = CHANNEL_META[channel]
  const cfg = CHANNEL_CONFIG[channel]
  const charCount = result?.char_count ?? 0
  const wordCount = result?.content
    ? result.content.trim().split(/\s+/).filter(Boolean).length
    : 0
  const overLimit = charCount > meta.maxChars
  const tooShort = !!result && charCount < meta.maxChars * 0.4
  const fillPct = Math.min((charCount / meta.maxChars) * 100, 100)

  async function handleCopy() {
    if (!result?.content) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendFeedback(action: 'approved' | 'rejected' | 'edited', editedVersion?: string) {
    if (!result?.content || !objectId || !agencyId || sending) return
    setSending(true)
    try {
      await fetch('/api/brain/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agencyId,
          object_id: objectId,
          channel,
          generated_text: result.content,
          action,
          edited_version: editedVersion ?? null,
        }),
      })
      setFeedbackSent(action)
      setEditing(false)
    } finally {
      setSending(false)
    }
  }

  function startEdit() {
    setEditedText(result?.content ?? '')
    setEditing(true)
  }

  // Treat first non-empty line as headline if there are subsequent lines
  const lines = result?.content?.split('\n') ?? []
  const firstLine = lines[0]?.trim() ?? ''
  const rest = lines.slice(1).join('\n').trim()
  const hasStructure = firstLine && rest

  const showFeedback = !!result && isActive && !!objectId && !!agencyId && !feedbackSent

  return (
    <div className={`border-b border-line transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--tint-2)',
        }}
      >
        <div className="flex items-center gap-3">

          {/* Toggle */}
          <button
            onClick={onToggle}
            aria-label={isActive ? 'Inaktivera kanal' : 'Aktivera kanal'}
            className="w-8 h-[18px] rounded-full transition-colors relative shrink-0"
            style={{ background: isActive ? cfg.color : 'var(--line-2)' }}
          >
            <span
              className={`absolute top-[3px] w-3 h-3 rounded-full bg-bg transition-transform ${
                isActive ? 'translate-x-[17px]' : 'translate-x-[3px]'
              }`}
            />
          </button>

          <ChannelBadge channel={channel} size={22} />

          <div>
            <p className="text-[13px] font-medium text-ink">{cfg.label}</p>
            <p className="font-data text-[10px] text-mute tracking-snug">{meta.description}</p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-4 shrink-0">
            {/* Char fill bar */}
            <div className="text-right hidden sm:block">
              <p className={`font-data text-[11px] tabular-nums ${overLimit ? 'text-accent' : 'text-mute'}`}>
                {charCount} / {meta.maxChars}
              </p>
              <div className="w-20 bg-line rounded-full mt-1 overflow-hidden" style={{ height: '3px' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fillPct}%`,
                    background: overLimit ? 'var(--accent)' : cfg.color,
                  }}
                />
              </div>
            </div>

            {/* Copy */}
            <button
              onClick={handleCopy}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '11.5px',
                padding: '5px 10px',
                background: copied ? 'var(--ok)' : 'var(--ink)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
            >
              {copied ? '✓ Kopierad' : 'Kopiera'}
            </button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px] divide-y lg:divide-y-0 lg:divide-x divide-line border-t border-line">

          {/* Editorial text */}
          <div className="px-6 py-5">
            {result ? (
              <div className="space-y-3">
                {editing ? (
                  /* Edit mode */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      value={editedText}
                      onChange={e => setEditedText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        fontSize: '13.5px',
                        lineHeight: 1.65,
                        color: 'var(--ink)',
                        letterSpacing: '-0.003em',
                        padding: '10px 12px',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        background: 'var(--bg)',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = 'var(--ink)'
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)'
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = 'var(--line)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => sendFeedback('edited', editedText)}
                        disabled={sending}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--ink)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          cursor: sending ? 'default' : 'pointer',
                          fontFamily: 'inherit',
                          letterSpacing: '-0.005em',
                          opacity: sending ? 0.5 : 1,
                        }}
                      >
                        {sending ? 'Sparar…' : 'Spara redigering'}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        style={{
                          padding: '6px 12px',
                          background: 'none',
                          color: 'var(--ink-2)',
                          border: '1px solid var(--line)',
                          borderRadius: '5px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        Avbryt
                      </button>
                    </div>
                  </div>
                ) : hasStructure ? (
                  <>
                    <h2
                      style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        letterSpacing: '-0.022em',
                        lineHeight: 1.3,
                        color: 'var(--ink)',
                      }}
                    >
                      {firstLine}
                    </h2>
                    <p
                      style={{
                        fontSize: '13.5px',
                        lineHeight: 1.65,
                        color: 'var(--ink-2)',
                        letterSpacing: '-0.003em',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {rest}
                    </p>
                  </>
                ) : (
                  <p
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.65,
                      color: 'var(--ink-2)',
                      letterSpacing: '-0.003em',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {result.content}
                  </p>
                )}

                {/* Feedback row */}
                {showFeedback && !editing && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: 'var(--mute)',
                        marginRight: '4px',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Feedback
                    </span>
                    <FeedbackBtn
                      label="✓ Godkänn"
                      title="Godkänn texten"
                      onClick={() => sendFeedback('approved')}
                      disabled={sending}
                      variant="positive"
                    />
                    <FeedbackBtn
                      label="✗ Avvisa"
                      title="Avvisa texten"
                      onClick={() => sendFeedback('rejected')}
                      disabled={sending}
                      variant="negative"
                    />
                    <FeedbackBtn
                      label="✎ Redigera"
                      title="Redigera och spara"
                      onClick={startEdit}
                      disabled={sending}
                      variant="neutral"
                    />
                  </div>
                )}

                {/* Feedback confirmation */}
                {feedbackSent && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '10px',
                        color: feedbackSent === 'rejected' ? 'var(--accent)' : 'var(--ok)',
                      }}
                    >
                      {feedbackSent === 'approved' && '✓ Godkänd — hjärnan lär sig'}
                      {feedbackSent === 'rejected' && '✗ Avvisad — hjärnan noterar'}
                      {feedbackSent === 'edited' && '✎ Redigering sparad — hjärnan analyserar'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-data text-[11px] text-mute-2 tracking-snug">
                Aktivera kanalen och generera texter för att se innehåll här
              </p>
            )}
          </div>

          {/* Metrics rail */}
          {result && (
            <div className="px-5 py-5 space-y-5">
              <MetricItem
                label="Tecken"
                value={charCount}
                note={`/ ${meta.maxChars}`}
                alert={overLimit}
              />
              <MetricItem label="Ord" value={wordCount} />

              {overLimit && (
                <p className="font-data text-[10px] text-accent tracking-snug leading-relaxed">
                  {charCount - meta.maxChars} tecken över gränsen
                </p>
              )}
              {tooShort && (
                <p className="font-data text-[10px] text-mute-2 tracking-snug leading-relaxed">
                  Texten kan vara kort för kanalen
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FeedbackBtn({
  label, title, onClick, disabled, variant,
}: {
  label: string
  title: string
  onClick: () => void
  disabled: boolean
  variant: 'positive' | 'negative' | 'neutral'
}) {
  const colors = {
    positive: { bg: 'rgba(34,197,94,0.08)', color: 'var(--ok)', border: 'rgba(34,197,94,0.2)' },
    negative: { bg: 'rgba(239,68,68,0.07)', color: 'var(--accent)', border: 'rgba(239,68,68,0.18)' },
    neutral:  { bg: 'var(--tint)', color: 'var(--ink-2)', border: 'var(--line)' },
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize: '10.5px',
        padding: '4px 9px',
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        letterSpacing: '-0.005em',
        transition: 'opacity 0.1s',
      }}
    >
      {label}
    </button>
  )
}

function MetricItem({
  label, value, note = '', alert = false,
}: {
  label: string; value: number; note?: string; alert?: boolean
}) {
  return (
    <div>
      <p className="font-data text-[10px] text-mute tracking-[0.02em] uppercase">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span
          className="font-data text-[20px] font-medium tabular-nums leading-none"
          style={{ color: alert ? 'var(--accent)' : 'var(--ink)' }}
        >
          {value}
        </span>
        {note && (
          <span className="font-data text-[10px] text-mute-2">{note}</span>
        )}
      </div>
    </div>
  )
}
