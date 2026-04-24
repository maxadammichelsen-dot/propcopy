import { anthropic, MODEL } from './anthropic'
import { createSupabaseAdminClient } from './supabase-admin'
import type { PropertyObject } from '@/types'

export interface CompetitorListing {
  address: string
  object_type: string
  price: number
  days_on_market: number
  competitor_agency: string
}

export interface MarketAnalysis {
  area: string
  market_count: number
  avg_price: number
  avg_days_on_market: number
  price_trend: 'rising' | 'stable' | 'falling'
  listings: CompetitorListing[]
  insight: string
}

export async function generateMarketAnalysis(
  area: string,
  ourObjects: PropertyObject[]
): Promise<MarketAnalysis> {
  const summaries = ourObjects
    .map(o => `• ${o.address}: ${o.type}, ${o.size} kvm, ${new Intl.NumberFormat('sv-SE').format(o.price)} kr`)
    .join('\n') || 'Inga egna objekt i detta område'

  try {
    const { content } = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: `Du är expert på svenska fastighetspriser. Generera realistisk marknadsdata för bostadsmarknaden i ${area} per april 2025.

Vår byrås aktiva objekt i området:
${summaries}

Returnera EXAKT detta JSON utan omgivande text:
{
  "market_count": <totalt aktiva liknande objekt i ${area} på Hemnet>,
  "avg_price": <genomsnittspris SEK heltal>,
  "avg_days_on_market": <genomsnitt dagar heltal>,
  "price_trend": "stable",
  "listings": [
    {"address": "<gatuadress i ${area}>", "object_type": "Bostadsrätt", "price": 0, "days_on_market": 0, "competitor_agency": "<mäklarfirma>"}
  ],
  "insight": "<2 meningar: konkret marknadsanalys + råd för vår byrå>"
}

price_trend: "rising", "stable" eller "falling" baserat på aktuellt marknadsläge.
Inkludera 5–6 konkurrerande objekt med realistiska värden för ${area}.
Mäklarfirmor att välja bland: Fastighetsbyrån, Skandia Mäklarna, Notar, Erik Olsson, Bjurfors, Länsförsäkringar Fastighetsförmedling, HusmanHagberg.`,
        },
      ],
    })

    const raw = content[0].type === 'text' ? content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]+\}/)
    if (!jsonMatch) throw new Error('No JSON in Claude response')

    const data = JSON.parse(jsonMatch[0])
    return {
      area,
      market_count: Number(data.market_count) || 0,
      avg_price: Number(data.avg_price) || 0,
      avg_days_on_market: Number(data.avg_days_on_market) || 0,
      price_trend: ['rising', 'stable', 'falling'].includes(data.price_trend)
        ? (data.price_trend as 'rising' | 'stable' | 'falling')
        : 'stable',
      listings: Array.isArray(data.listings)
        ? data.listings.map((l: Record<string, unknown>) => ({
            address: String(l.address ?? ''),
            object_type: String(l.object_type ?? 'Bostadsrätt'),
            price: Number(l.price) || 0,
            days_on_market: Number(l.days_on_market) || 0,
            competitor_agency: String(l.competitor_agency ?? ''),
          }))
        : [],
      insight: String(data.insight ?? ''),
    }
  } catch {
    return {
      area,
      market_count: 0,
      avg_price: 0,
      avg_days_on_market: 0,
      price_trend: 'stable',
      listings: [],
      insight: 'Marknadsdata kunde inte hämtas just nu.',
    }
  }
}

type CompRow = {
  address: string | null
  price: number | null
  days_on_market: number | null
  object_type: string | null
  competitor_agency: string | null
}

export async function buildCompetitionContext(
  area: string,
  objectPrice: number,
  agency_id: string
): Promise<string> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data } = await supabase
      .from('competition_data')
      .select('address, price, days_on_market, object_type, competitor_agency')
      .eq('agency_id', agency_id)
      .ilike('area', `%${area}%`)
      .order('scraped_at', { ascending: false })
      .limit(20)

    if (!data || data.length === 0) return ''

    const rows = data as CompRow[]
    const summary = rows.find(r => r.object_type === '_summary')
    const listings = rows.filter(r => r.object_type !== '_summary')

    let meta: { count?: number; trend?: string; insight?: string } = {}
    try { meta = JSON.parse(summary?.address ?? '{}') } catch { /* empty */ }

    const marketCount = Number(meta.count) || listings.length
    const avgPrice    = summary?.price ?? 0
    const avgDays     = summary?.days_on_market ?? 0

    if (marketCount === 0 && avgPrice === 0) return ''

    const priceDiff = avgPrice > 0
      ? Math.round(((objectPrice - avgPrice) / avgPrice) * 100)
      : null

    const priceLabel = priceDiff === null
      ? 'i nivå med snittet'
      : priceDiff > 5
        ? `${priceDiff}% över snittet`
        : priceDiff < -5
          ? `${Math.abs(priceDiff)}% under snittet`
          : 'i nivå med snittet'

    const fmt = (n: number) => new Intl.NumberFormat('sv-SE').format(n)

    const topListings = listings.slice(0, 4)
    const competitorLines = topListings.map(l =>
      `• ${l.address} – ${fmt(l.price ?? 0)} kr (${l.days_on_market ?? 0} dagar)`
    )

    const parts: string[] = [
      'KONKURRENSSITUATION:',
      `Liknande objekt på marknaden: ${marketCount}`,
      `Prisläge: ${priceLabel}`,
      `Snitt dagar på marknaden: ${avgDays}`,
    ]

    if (competitorLines.length > 0) {
      parts.push(`Närmaste konkurrenter:\n${competitorLines.join('\n')}`)
    }

    if (meta.insight) {
      parts.push(`Marknadsanalys: ${meta.insight}`)
    }

    parts.push(
      `Differentiera genom att lyfta: Det som är genuint unikt för detta objekt jämfört med de ${marketCount} liknande alternativen på marknaden.`
    )

    return '\n\n' + parts.join('\n')
  } catch {
    return ''
  }
}
