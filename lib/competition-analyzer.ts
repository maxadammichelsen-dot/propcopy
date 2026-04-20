import { anthropic, MODEL } from './anthropic'
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
