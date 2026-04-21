'use client'

import { useRef, useState } from 'react'
import LocationCard from './LocationCard'

interface NewObjectFormProps {
  onCreated: (object: any) => void
  onCancel: () => void
}

const PROPERTY_TYPES = ['Lägenhet', 'Villa', 'Radhus', 'Tomt', 'Fritidshus', 'Lokal']

const CHANNELS = [
  { id: 'hemnet',   icon: '🏠', label: 'Hemnet',      desc: 'Annonstext för Hemnet och Booli' },
  { id: 'instagram',icon: '📸', label: 'Instagram',   desc: 'Bildtext och caption för sociala medier' },
  { id: 'facebook', icon: '📢', label: 'Facebook',    desc: 'Annonstext och inlägg' },
  { id: 'email',    icon: '✉️',  label: 'Nyhetsbrev', desc: 'E-post till spekulantlista' },
  { id: 'visning',  icon: '📄', label: 'Visningstext','desc': 'PDF till visning och trycksaker' },
]

const STEP_LABELS = ['Adress', 'Argument', 'Kanaler', 'Granska']

export default function NewObjectForm({ onCreated, onCancel }: NewObjectFormProps) {
  const [step, setStep]         = useState(1)
  const [form, setForm]         = useState({ address: '', area: '', type: 'Lägenhet', size: '', price: '', details: '' })
  const [channels, setChannels] = useState<string[]>(['hemnet', 'instagram'])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const detailsRef              = useRef<HTMLTextAreaElement>(null)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleChannel(id: string) {
    setChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  function appendDetail(text: string) {
    setForm(f => {
      const current = f.details.trim()
      return { ...f, details: current + (current ? '\n' : '') + text }
    })
    setTimeout(() => {
      if (detailsRef.current) detailsRef.current.scrollTop = detailsRef.current.scrollHeight
    }, 50)
  }

  function canAdvance(): boolean {
    if (step === 1) return !!form.address.trim() && !!form.area.trim() && !!form.size && !!form.price
    if (step === 2) return !!form.details.trim()
    if (step === 3) return channels.length > 0
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        size: Number(form.size),
        price: Number(form.price.replace(/\s/g, '')),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Något gick fel')
      setLoading(false)
      return
    }
    onCreated(data.object)
  }

  const progressPct = (step / 4) * 100

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>

      {/* ── Internal header (0–48px) ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderBottom: '1px solid var(--tint)',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
            letterSpacing: '-0.01em',
          }}
        >
          Nytt objekt
        </span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {STEP_LABELS.map((_, i) => (
            <span
              key={i}
              style={{
                width: '22px',
                height: '2px',
                borderRadius: '1px',
                background: i < step - 1 ? 'var(--ink)' : i === step - 1 ? 'var(--accent)' : 'var(--line-2)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Progress bar (.progress) ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '48px',
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--tint)',
          zIndex: 9,
        }}
      >
        <b
          style={{
            display: 'block',
            height: '100%',
            width: `${progressPct}%`,
            background: 'var(--ink)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* ── Task content (.task) ───────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '52px',
          left: 0,
          right: 0,
          bottom: '60px',
          padding: '24px 40px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* .task-meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--mute)',
          }}
        >
          <span>Steg {step} av 4</span>
          <span style={{ letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {STEP_LABELS[step - 1]}
          </span>
        </div>

        {/* .task-head h1 */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 600,
              letterSpacing: '-0.024em',
              lineHeight: 1.2,
              color: 'var(--ink)',
            }}
          >
            {step === 1 && 'Vilket objekt ska vi hjälpa dig med?'}
            {step === 2 && 'Vad är de starkaste säljargumenten?'}
            {step === 3 && 'Vilka kanaler ska vi skriva för?'}
            {step === 4 && 'Granska och spara objektet.'}
          </h1>
        </div>

        {/* ── Step 1: Adress (.t1) ──────────────────────────── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Hero address input */}
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
              >
                📍
              </span>
              <input
                autoFocus
                value={form.address}
                onChange={e => update('address', e.target.value)}
                placeholder="Storgatan 12, 3 tr"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  fontSize: '16px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FieldWrap label="Område">
                <input
                  value={form.area}
                  onChange={e => update('area', e.target.value)}
                  placeholder="Linnéstaden, Göteborg"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </FieldWrap>
              <FieldWrap label="Objektstyp">
                <select
                  value={form.type}
                  onChange={e => update('type', e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }}
                >
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FieldWrap>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FieldWrap label="Storlek (kvm)">
                <input
                  type="number"
                  min="1"
                  value={form.size}
                  onChange={e => update('size', e.target.value)}
                  placeholder="85"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </FieldWrap>
              <FieldWrap label="Utgångspris (kr)">
                <input
                  value={form.price}
                  onChange={e => update('price', e.target.value)}
                  placeholder="4 950 000"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </FieldWrap>
            </div>
          </div>
        )}

        {/* ── Step 2: Argument (.t2) ────────────────────────── */}
        {step === 2 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: '28px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left: location card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              <span style={sectionLabel}>Platsanalys</span>
              <LocationCard
                address={form.address}
                area={form.area}
                onInclude={appendDetail}
              />
            </div>

            {/* Right: textarea */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
              <span style={sectionLabel}>Säljargument &amp; detaljer</span>
              <textarea
                ref={detailsRef}
                value={form.details}
                onChange={e => update('details', e.target.value)}
                placeholder={"3 rok, ljus och luftig, nyrenoverat kök 2023, parkett i alla rum...\n\nKlicka på platsargumenten till vänster för att lägga till dem."}
                style={{
                  flex: 1,
                  minHeight: '200px',
                  padding: '14px 16px',
                  fontSize: '14px',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  outline: 'none',
                  resize: 'none',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10,10,9,0.04)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── Step 3: Kanaler (.t3) ─────────────────────────── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '560px' }}>
            {CHANNELS.map(ch => {
              const active = channels.includes(ch.id)
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr auto',
                    gap: '14px',
                    padding: '14px 16px',
                    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                    borderRadius: '8px',
                    alignItems: 'center',
                    background: active ? 'var(--tint)' : 'var(--bg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>{ch.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: active ? 500 : 400, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {ch.label}
                    </p>
                    <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '11px', color: 'var(--mute)', marginTop: '2px' }}>
                      {ch.desc}
                    </p>
                  </div>
                  {/* Toggle 32×18 */}
                  <span
                    style={{
                      width: '32px',
                      height: '18px',
                      borderRadius: '100px',
                      background: active ? 'var(--accent)' : 'var(--line-2)',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background 0.15s',
                      display: 'inline-block',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'transform 0.15s',
                        transform: active ? 'translateX(16px)' : 'translateX(2px)',
                      }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Step 4: Output / granska (.t4) ───────────────── */}
        {step === 4 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 220px',
              gap: '20px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left: object summary */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '20px',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                background: 'var(--tint)',
                alignSelf: 'flex-start',
              }}
            >
              <span style={sectionLabel}>Objekt</span>
              <ReviewItem label="Adress" value={form.address} />
              <ReviewItem label="Område" value={form.area} />
              <ReviewItem label="Typ"    value={form.type} />
              <ReviewItem label="Storlek" value={form.size ? `${form.size} kvm` : '—'} />
              <ReviewItem label="Pris"   value={form.price ? `${form.price} kr` : '—'} />
            </div>

            {/* Middle: details preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
              <span style={sectionLabel}>Argument</span>
              <div
                style={{
                  flex: 1,
                  minHeight: '200px',
                  padding: '16px',
                  border: '1px solid var(--line)',
                  borderRadius: '10px',
                  background: 'var(--bg)',
                  overflowY: 'auto',
                  fontSize: '13px',
                  color: 'var(--ink-2)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                {form.details || <span style={{ color: 'var(--mute-2)' }}>Inga argument angivna</span>}
              </div>
            </div>

            {/* Right: channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={sectionLabel}>Kanaler ({channels.length})</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {CHANNELS.filter(ch => channels.includes(ch.id)).map(ch => (
                  <div
                    key={ch.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: '1px solid var(--line)',
                      borderRadius: '8px',
                      background: 'var(--tint)',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{ch.icon}</span>
                    <span style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {ch.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footbar (.footbar) ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          borderTop: '1px solid var(--line)',
          background: 'var(--bg)',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--accent)',
          }}
        >
          {error}
        </span>

        {/* .btn — back/cancel */}
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => { setStep(s => s - 1); setError('') }}
          style={{
            padding: '8px 14px',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink-2)',
            background: 'var(--bg)',
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            fontFamily: 'inherit',
          }}
        >
          {step === 1 ? 'Avbryt' : '← Tillbaka'}
        </button>

        {/* .btn.accent — next/submit */}
        <button
          type="button"
          onClick={step < 4 ? () => { if (canAdvance()) setStep(s => s + 1) } : handleSubmit}
          disabled={!canAdvance() || loading}
          style={{
            padding: '8px 14px',
            border: `1px solid ${canAdvance() && !loading ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            background: canAdvance() && !loading ? 'var(--accent)' : 'var(--line)',
            color: canAdvance() && !loading ? '#fff' : 'var(--mute)',
            cursor: canAdvance() && !loading ? 'pointer' : 'default',
            transition: 'background 0.15s, border-color 0.15s',
            letterSpacing: '-0.01em',
            fontFamily: 'inherit',
          }}
        >
          {step < 4 ? 'Nästa →' : loading ? 'Sparar…' : 'Spara objekt'}
        </button>
      </div>

    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  outline: 'none',
  transition: 'border-color 0.15s',
  background: 'var(--bg)',
  color: 'var(--ink)',
  fontFamily: 'inherit',
}

const sectionLabel: React.CSSProperties = {
  fontFamily: "'Geist Mono', monospace",
  fontSize: '10px',
  color: 'var(--mute)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={sectionLabel}>{label}</label>
      {children}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: '10px', color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>
        {label}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {value || '—'}
      </p>
    </div>
  )
}
