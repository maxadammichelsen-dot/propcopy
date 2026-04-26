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

interface FieldDef {
  key: string
  label: string
  maxChars?: number
}

const CHANNEL_FIELDS: Record<Channel, FieldDef[]> = {
  hemnet: [
    { key: 'rubrik',   label: 'RUBRIK' },
    { key: 'saljtext', label: 'SÄLJTEXT', maxChars: 1875 },
  ],
  meta: [
    { key: 'hook',         label: 'HOOK / PRIMÄR TEXT' },
    { key: 'primary_text', label: 'BRÖDTEXT', maxChars: 250 },
    { key: 'headline',     label: 'RUBRIK (under bild)' },
  ],
  email: [
    { key: 'subject', label: 'ÄMNESRAD' },
    { key: 'body',    label: 'BRÖDTEXT', maxChars: 900 },
  ],
  social_organic: [
    { key: 'post', label: 'INLÄGG', maxChars: 2200 },
  ],
}

const CHANNEL_PATH: Record<Channel, string> = {
  hemnet:         '→ Vitec · Objektet · Marknadsföring · Hemnet',
  meta:           '→ Publicera direkt eller Meta Ads Manager',
  email:          '→ Vitec · Kommunikation · Utskick',
  social_organic: '→ Klistra in i Instagram/Facebook',
}

function parseFields(channel: Channel, content: string): Record<string, string> {
  try {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed && typeof parsed === 'object') return parsed as Record<string, string>
    }
  } catch {}
  // Fallback for legacy plain-text content
  const lines = content.split('\n')
  const first = lines[0]?.trim() ?? ''
  const rest  = lines.slice(1).join('\n').trim()
  switch (channel) {
    case 'hemnet':         return { rubrik: first, saljtext: rest || first }
    case 'meta':           return { hook: first, primary_text: rest, headline: '' }
    case 'email':          return { subject: first, body: rest || first }
    case 'social_organic': return { post: content }
  }
}

export default function ContentCard({ channel, result, isActive, onToggle, objectId, agencyId }: ContentCardProps) {
  const [editing, setEditing]           = useState(false)
  const [editedText, setEditedText]     = useState('')
  const [feedbackSent, setFeedbackSent] = useState<'approved' | 'rejected' | 'edited' | null>(null)
  const [sending, setSending]           = useState(false)

  const cfg    = CHANNEL_CONFIG[channel]
  const fields = CHANNEL_FIELDS[channel]
  const parsed = result ? parseFields(channel, result.content) : {}
  const fullText = Object.values(parsed).filter(Boolean).join('\n\n')

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
          generated_text: fullText,
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
    setEditedText(fullText)
    setEditing(true)
  }

  const showFeedback = !!result && isActive && !!objectId && !!agencyId && !feedbackSent

  return (
    <div className={`border-b border-line transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--tint-2)',
        }}
      >
        <button
          onClick={onToggle}
          aria-label={isActive ? 'Inaktivera kanal' : 'Aktivera kanal'}
          className="w-8 h-[18px] rounded-full transition-colors relative shrink-0"
          style={{ background: isActive ? cfg.color : 'var(--line-2)', marginRight: '12px' }}
        >
          <span
            className={`absolute top-[3px] w-3 h-3 rounded-full bg-bg transition-transform ${
              isActive ? 'translate-x-[17px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
        <ChannelBadge channel={channel} size={22} />
        <p className="text-[13px] font-medium text-ink" style={{ marginLeft: '10px' }}>{cfg.label}</p>
      </div>

      {/* Expanded content */}
      {isActive && (
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result ? (
            editing ? (
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
            ) : (
              <>
                {fields.map(field => (
                  <CopyField
                    key={field.key}
                    label={field.label}
                    value={parsed[field.key] ?? ''}
                    maxChars={field.maxChars}
                  />
                ))}

                {/* Channel path */}
                <p
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: '10px',
                    color: 'var(--mute-2)',
                    letterSpacing: '0.01em',
                    paddingTop: '2px',
                  }}
                >
                  {CHANNEL_PATH[channel]}
                </p>

                {/* Feedback row */}
                {showFeedback && (
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
                    <FeedbackBtn label="✓ Godkänn" title="Godkänn texten" onClick={() => sendFeedback('approved')} disabled={sending} variant="positive" />
                    <FeedbackBtn label="✗ Avvisa" title="Avvisa texten" onClick={() => sendFeedback('rejected')} disabled={sending} variant="negative" />
                    <FeedbackBtn label="✎ Redigera" title="Redigera och spara" onClick={startEdit} disabled={sending} variant="neutral" />
                  </div>
                )}

                {/* Feedback confirmation */}
                {feedbackSent && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
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
                      {feedbackSent === 'edited'   && '✎ Redigering sparad — hjärnan analyserar'}
                    </span>
                  </div>
                )}
              </>
            )
          ) : (
            <p className="font-data text-[11px] text-mute-2 tracking-snug">
              Aktivera kanalen och generera texter för att se innehåll här
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CopyField({ label, value, maxChars }: { label: string; value: string; maxChars?: number }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const count = value.length
  const over  = !!maxChars && count > maxChars

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: '8px',
        background: 'var(--tint)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 12px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: '10px',
              color: 'var(--mute)',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
          {maxChars && value && (
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '10px',
                color: over ? 'var(--accent)' : 'var(--mute-2)',
              }}
            >
              {count}/{maxChars}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          disabled={!value}
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '10.5px',
            padding: '3px 8px',
            background: copied ? 'var(--ok)' : 'var(--ink)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: value ? 'pointer' : 'default',
            opacity: value ? 1 : 0.3,
            letterSpacing: '-0.01em',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Kopierat' : 'Kopiera'}
        </button>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <p
          style={{
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: value ? 'var(--ink-2)' : 'var(--mute-2)',
            letterSpacing: '-0.003em',
            whiteSpace: 'pre-wrap',
            margin: 0,
            fontStyle: value ? 'normal' : 'italic',
          }}
        >
          {value || 'Ingen text genererad'}
        </p>
      </div>
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
