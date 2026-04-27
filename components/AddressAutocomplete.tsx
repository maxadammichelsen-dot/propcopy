'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AddressSuggestion } from '@/types'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (suggestion: AddressSuggestion) => void
  placeholder?: string
  className?: string
  inputStyle?: React.CSSProperties
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Gatuadress',
  className = '',
  inputStyle,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/address/suggest?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('suggest failed')
      const data: AddressSuggestion[] = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
      setActiveIndex(-1)
    } catch {
      setSuggestions([])
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function pick(s: AddressSuggestion) {
    onChange(s.text)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
    onSelect?.(s)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        style={inputStyle}
      />
      {loading && (
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          width: 12, height: 12,
          border: '1.5px solid var(--line)',
          borderTopColor: 'var(--ink)',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.6s linear infinite',
          pointerEvents: 'none',
        }} />
      )}
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          margin: 0,
          padding: '4px 0',
          listStyle: 'none',
          maxHeight: 260,
          overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <li
              key={s.reference_id}
              onMouseDown={() => pick(s)}
              style={{
                padding: '8px 12px',
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                letterSpacing: '-0.01em',
                color: activeIndex === i ? 'var(--ink)' : 'var(--ink-2)',
                background: activeIndex === i ? 'var(--tint)' : 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
