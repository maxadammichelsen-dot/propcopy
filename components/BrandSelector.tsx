'use client'

import { useState } from 'react'
import { BRAND_REGISTRY } from '@/lib/brand-registry'

interface BrandSelectorProps {
  value: Record<string, string[]>
  onChange: (brands: Record<string, string[]>) => void
}

export default function BrandSelector({ value, onChange }: BrandSelectorProps) {
  const [open, setOpen] = useState(false)
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const totalSelected = Object.values(value).reduce((sum, arr) => sum + arr.length, 0)

  function toggle(category: string, option: string) {
    const current = value[category] ?? []
    const next = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option]
    onChange({ ...value, [category]: next })
  }

  function removeCustom(category: string, item: string) {
    const next = (value[category] ?? []).filter(v => v !== item)
    onChange({ ...value, [category]: next })
  }

  function commitInput(category: string) {
    const raw = (inputs[category] ?? '').trim()
    if (!raw) return
    const current = value[category] ?? []
    if (!current.includes(raw)) {
      onChange({ ...value, [category]: [...current, raw] })
    }
    setInputs(prev => ({ ...prev, [category]: '' }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px',
          border: '1px solid var(--line)',
          borderRadius: open ? '8px 8px 0 0' : '8px',
          background: 'var(--bg)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--tint)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
      >
        <div>
          <span style={{
            fontSize: '13px', fontWeight: 500, color: 'var(--ink)',
            letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}>
            Varumärken &amp; specifikation
            {totalSelected > 0 && (
              <span style={{
                marginLeft: '8px', fontSize: '11px', fontWeight: 400,
                fontFamily: "'Geist Mono', monospace", color: '#16a34a',
              }}>
                {totalSelected} valda
              </span>
            )}
          </span>
          <p style={{
            fontSize: '11px', color: 'var(--mute)', marginTop: '2px',
            fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
          }}>
            Frivilligt · Mer specificering = mer trovärdig text
          </p>
        </div>
        <span style={{
          fontSize: '12px', color: 'var(--mute)', fontFamily: "'Geist Mono', monospace",
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
          display: 'inline-block',
        }}>
          ▾
        </span>
      </button>

      {/* Accordion body */}
      {open && (
        <div style={{
          border: '1px solid var(--line)', borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '20px',
          background: 'var(--bg)',
        }}>
          {Object.entries(BRAND_REGISTRY).map(([categoryKey, category]) => {
            const selected = value[categoryKey] ?? []
            const presetSelected = selected.filter(v => category.options.includes(v))
            const customSelected = selected.filter(v => !category.options.includes(v))

            return (
              <div key={categoryKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{
                  fontFamily: "'Geist Mono', monospace", fontSize: '10px',
                  color: 'var(--mute)', letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {category.label}
                </span>

                {/* Preset chips */}
                {category.options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {category.options.map(option => {
                      const active = presetSelected.includes(option)
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggle(categoryKey, option)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontFamily: "'Geist Mono', monospace",
                            letterSpacing: '-0.01em',
                            border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                            background: active ? 'var(--ink)' : 'var(--bg)',
                            color: active ? '#fff' : 'var(--ink)',
                            cursor: 'pointer',
                            transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Custom chips (freetext additions) */}
                {customSelected.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {customSelected.map(item => (
                      <span
                        key={item}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '4px 8px 4px 10px',
                          borderRadius: '100px', fontSize: '12px',
                          fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
                          border: '1px solid var(--ink)', background: 'var(--ink)', color: '#fff',
                          fontWeight: 500,
                        }}
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removeCustom(categoryKey, item)}
                          style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
                            cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '13px',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Freetext input */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    value={inputs[categoryKey] ?? ''}
                    onChange={e => setInputs(prev => ({ ...prev, [categoryKey]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitInput(categoryKey) } }}
                    placeholder={category.options.length > 0 ? 'Lägg till annat...' : 'Skriv här...'}
                    style={{
                      flex: 1, padding: '6px 10px', fontSize: '12px',
                      border: '1px solid var(--line)', borderRadius: '6px', outline: 'none',
                      background: 'var(--bg)', color: 'var(--ink)',
                      fontFamily: "'Geist Mono', monospace", letterSpacing: '-0.01em',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--ink)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--line)'; commitInput(categoryKey) }}
                  />
                  {(inputs[categoryKey] ?? '').trim() && (
                    <button
                      type="button"
                      onClick={() => commitInput(categoryKey)}
                      style={{
                        padding: '6px 10px', fontSize: '12px',
                        border: '1px solid var(--ink)', borderRadius: '6px',
                        background: 'var(--ink)', color: '#fff',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
