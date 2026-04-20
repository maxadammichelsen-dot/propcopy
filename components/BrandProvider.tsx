'use client'

import { useEffect } from 'react'
import { Agency } from '@/types'

// Lightens a hex color towards white by the given ratio (0–1)
function lighten(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * ratio)
  const lg = Math.round(g + (255 - g) * ratio)
  const lb = Math.round(b + (255 - b) * ratio)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

// Adds alpha to a hex color
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}

interface BrandProviderProps {
  agency: Agency | null
  children: React.ReactNode
}

export default function BrandProvider({ agency, children }: BrandProviderProps) {
  useEffect(() => {
    const root = document.documentElement
    const primary = agency?.brand_colors?.primary
    const secondary = agency?.brand_colors?.secondary
    const accent = agency?.brand_colors?.accent ?? primary

    if (primary && /^#[0-9a-fA-F]{6}$/.test(primary)) {
      root.style.setProperty('--brand-primary', primary)
      root.style.setProperty('--brand-primary-light', lighten(primary, 0.15))
      root.style.setProperty('--brand-primary-dim', withAlpha(primary, 0.2))
    } else {
      // Fallback gold
      root.style.setProperty('--brand-primary', '#b8965a')
      root.style.setProperty('--brand-primary-light', '#d4b07a')
      root.style.setProperty('--brand-primary-dim', '#b8965a33')
    }

    if (secondary && /^#[0-9a-fA-F]{6}$/.test(secondary)) {
      root.style.setProperty('--brand-secondary', secondary)
    }

    if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
      root.style.setProperty('--brand-accent', accent)
    } else {
      root.style.setProperty('--brand-accent', '#b8965a')
    }
  }, [agency])

  return <>{children}</>
}
