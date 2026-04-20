import type { PropertyObject } from '@/types'

export interface HealthResult {
  score: number
  issues: string[]
}

export function computeHealthScore(obj: PropertyObject, contentCount: number): HealthResult {
  let score = 100
  const issues: string[] = []

  const detailLen = (obj.details ?? '').trim().length
  if (detailLen === 0) {
    score -= 25
    issues.push('Beskrivning saknas')
  } else if (detailLen < 100) {
    score -= 15
    issues.push('Beskrivning för kort')
  } else if (detailLen < 200) {
    score -= 8
    issues.push('Beskrivning kan bli längre')
  }

  if (!obj.price || obj.price <= 0) {
    score -= 10
    issues.push('Pris saknas')
  }

  if (contentCount === 0) {
    score -= 20
    issues.push('Inga texter genererade')
  }

  if (obj.status === 'draft') {
    score -= 10
    issues.push('Ej publicerad')
  }

  const days = daysSince(obj.created_at)
  if (obj.status === 'active') {
    if (days > 90) {
      score -= 25
      issues.push(`${days} dagar – lång tid`)
    } else if (days > 60) {
      score -= 15
      issues.push(`${days} dagar på marknaden`)
    } else if (days > 30) {
      score -= 8
      issues.push(`${days} dagar på marknaden`)
    }
  }

  return { score: Math.max(0, score), issues }
}

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}
