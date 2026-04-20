import { anthropic, MODEL } from './anthropic'
import { BrandColors } from '@/types'

export interface ScrapedAgencyData {
  logo_url: string | null
  brand_colors: BrandColors
  scraped_data: {
    phone: string | null
    og_description: string | null
    agents: string[]
    scraped_at: string
  }
}

export async function scrapeAgency(url: string): Promise<ScrapedAgencyData> {
  const normalized = url.startsWith('http') ? url : `https://${url}`

  let html = ''
  try {
    const res = await fetch(normalized, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PropCopy/1.0)' },
      signal: AbortSignal.timeout(12000),
    })
    if (res.ok) html = await res.text()
  } catch {
    // Non-fatal: proceed with empty HTML, Claude will handle gracefully
  }

  const [logo_url, brand_colors] = await Promise.all([
    extractLogo(html, normalized),
    extractBrandColors(html),
  ])

  return {
    logo_url,
    brand_colors,
    scraped_data: {
      phone: extractPhone(html),
      og_description: extractMeta(html, 'og:description') ?? extractMeta(html, 'description'),
      agents: extractAgentNames(html),
      scraped_at: new Date().toISOString(),
    },
  }
}

// ─── Logo extraction ───────────────────────────────────────────────────────

function extractLogo(html: string, baseUrl: string): string | null {
  if (!html) return null

  // Priority order: og:image (highest quality) → apple-touch-icon → png icon
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["']/i,
    /<link[^>]+rel=["']icon["'][^>]+type=["']image\/png["'][^>]+href=["']([^"']+)["']/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return makeAbsoluteUrl(match[1].trim(), baseUrl)
  }
  return null
}

// ─── Brand color extraction via Claude ────────────────────────────────────

async function extractBrandColors(html: string): Promise<BrandColors> {
  // Fast path: meta theme-color
  const themeColor =
    html.match(/<meta[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-fA-F]{3,8})["']/i)?.[1] ||
    html.match(/<meta[^>]*content=["'](#[0-9a-fA-F]{3,8})["'][^>]*name=["']theme-color["']/i)?.[1]

  if (!html) return { primary: themeColor ?? undefined, secondary: undefined, accent: undefined }

  // Send first 5000 chars (usually contains <head> with styles)
  const snippet = html.slice(0, 5000)

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Analysera HTML från en mäklarbyrås hemsida. Hitta de primära varumärkesfärgerna.
${themeColor ? `Meta theme-color hittad: ${themeColor}` : ''}
Leta i: CSS custom properties (--primary, --brand, --color-*), inline bakgrundsfärger på header/nav/knappar, meta-taggar.

Returnera ENBART JSON:
{"primary":"#hex","secondary":"#hex","accent":"#hex"}

Använd null om färg ej hittas. Returnera inget annat.

HTML:
${snippet}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        primary: parsed.primary !== 'null' ? parsed.primary : (themeColor ?? undefined),
        secondary: parsed.secondary !== 'null' ? parsed.secondary : undefined,
        accent: parsed.accent !== 'null' ? parsed.accent : undefined,
      }
    }
  } catch {
    // Non-fatal
  }

  return { primary: themeColor ?? undefined, secondary: undefined, accent: undefined }
}

// ─── Metadata helpers ─────────────────────────────────────────────────────

function extractMeta(html: string, name: string): string | null {
  const byProperty = html.match(
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']{1,400})["']`, 'i')
  )?.[1]
  if (byProperty) return byProperty

  const byName = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{1,400})["']`, 'i')
  )?.[1]
  return byName ?? null
}

function extractPhone(html: string): string | null {
  // tel: links first (most reliable)
  const telLink = html.match(/href=["']tel:([+0-9\s\-().]{7,20})["']/i)?.[1]
  if (telLink) return telLink.trim()

  // Swedish mobile + landline patterns
  const swPhone = html.match(/(?<![0-9])((07[0-9][\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2})|(0[1-9]\d[\s\-.]?\d{2,3}[\s\-.]?\d{2,3}[\s\-.]?\d{2,3}))(?![0-9])/)?.[0]
  return swPhone?.trim() ?? null
}

function extractAgentNames(html: string): string[] {
  const names: string[] = []
  const pattern = /"name"\s*:\s*"([A-ZÅÄÖ][a-zåäö]+ [A-ZÅÄÖ][a-zåäö]+)"/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    if (!names.includes(match[1])) names.push(match[1])
    if (names.length >= 5) break
  }
  return names
}

function makeAbsoluteUrl(url: string, base: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}
