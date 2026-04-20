import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { generateMarketAnalysis } from '@/lib/competition-analyzer'
import type { PropertyObject } from '@/types'

// Market stats and insight are encoded as JSON in the address field of _summary rows
// (avoids requiring a schema migration for market_count + insight columns)

type DbRow = {
  id: string
  area: string
  address: string | null
  price: number | null
  days_on_market: number | null
  object_type: string | null
  competitor_agency: string | null
  scraped_at: string
}

type OurObj = {
  id: string
  address: string
  area: string
  price: number
  size: number
  type: string
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!agency) return NextResponse.json({ areas: [], has_data: false })

    const [compRes, objRes] = await Promise.all([
      supabase
        .from('competition_data')
        .select('*')
        .eq('agency_id', agency.id)
        .order('scraped_at', { ascending: false }),
      supabase
        .from('objects')
        .select('id, address, area, price, size, type')
        .eq('agency_id', agency.id)
        .eq('status', 'active'),
    ])

    const rows = (compRes.data ?? []) as DbRow[]
    const ourObjects = (objRes.data ?? []) as OurObj[]

    if (rows.length === 0) return NextResponse.json({ areas: [], has_data: false })

    const areas = buildAreas(rows, ourObjects)
    return NextResponse.json({ areas, has_data: areas.length > 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!agency) return NextResponse.json({ error: 'No agency' }, { status: 404 })

    const { data: objectsRaw } = await supabase
      .from('objects')
      .select('*')
      .eq('agency_id', agency.id)
      .eq('status', 'active')

    const objects = (objectsRaw ?? []) as PropertyObject[]
    const uniqueAreas = Array.from(new Set(objects.map(o => o.area))).slice(0, 3)

    if (uniqueAreas.length === 0) {
      return NextResponse.json({ message: 'Inga aktiva objekt', areas: [], has_data: false })
    }

    // Generate market analyses (throws on total failure – preserves old data)
    const analyses = await Promise.all(
      uniqueAreas.map(area =>
        generateMarketAnalysis(area, objects.filter(o => o.area === area))
      )
    )

    const admin = createSupabaseAdminClient()
    await admin.from('competition_data').delete().eq('agency_id', agency.id)

    const now = new Date().toISOString()
    const insertRows: Record<string, unknown>[] = []

    for (const analysis of analyses) {
      // Summary row: encode market stats + insight as JSON in the address field
      insertRows.push({
        agency_id: agency.id,
        area: analysis.area,
        address: JSON.stringify({
          count: analysis.market_count,
          trend: analysis.price_trend,
          insight: analysis.insight,
        }),
        price: analysis.avg_price,
        days_on_market: analysis.avg_days_on_market,
        competitor_agency: null,
        object_type: '_summary',
        scraped_at: now,
      })

      for (const l of analysis.listings) {
        insertRows.push({
          agency_id: agency.id,
          area: analysis.area,
          address: l.address,
          price: l.price,
          days_on_market: l.days_on_market,
          competitor_agency: l.competitor_agency,
          object_type: l.object_type,
          scraped_at: now,
        })
      }
    }

    await admin.from('competition_data').insert(insertRows)

    const areas = analyses.map(analysis => {
      const ourInArea = (objects as OurObj[]).filter(o => o.area === analysis.area)
      const ourAvg = ourInArea.length
        ? Math.round(ourInArea.reduce((s, o) => s + o.price, 0) / ourInArea.length)
        : null
      const priceDiffPct = ourAvg && analysis.avg_price
        ? Math.round(((ourAvg - analysis.avg_price) / analysis.avg_price) * 100)
        : null

      return {
        area: analysis.area,
        refreshed_at: now,
        market_count: analysis.market_count,
        avg_price: analysis.avg_price,
        avg_days_on_market: analysis.avg_days_on_market,
        price_trend: analysis.price_trend,
        our_objects: ourInArea.map(o => ({ id: o.id, address: o.address, price: o.price, size: o.size, type: o.type })),
        price_diff_pct: priceDiffPct,
        listings: analysis.listings,
        insight: analysis.insight,
      }
    })

    return NextResponse.json({ areas, has_data: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildAreas(rows: DbRow[], ourObjects: OurObj[]) {
  const areaMap = new Map<string, { summary: DbRow | null; listings: DbRow[] }>()

  for (const row of rows) {
    if (!areaMap.has(row.area)) areaMap.set(row.area, { summary: null, listings: [] })
    const entry = areaMap.get(row.area)!
    if (row.object_type === '_summary') {
      entry.summary = row
    } else {
      entry.listings.push(row)
    }
  }

  return Array.from(areaMap.entries()).map(([area, { summary, listings }]) => {
    const meta = (() => {
      try { return JSON.parse(summary?.address ?? '{}') } catch { return {} }
    })()

    const avgCompPrice = summary?.price
      ?? (listings.length > 0
        ? Math.round(listings.reduce((s: number, l: DbRow) => s + (l.price ?? 0), 0) / listings.length)
        : 0)

    const avgDays = summary?.days_on_market
      ?? (listings.length > 0
        ? Math.round(listings.reduce((s: number, l: DbRow) => s + (l.days_on_market ?? 0), 0) / listings.length)
        : 0)

    const ourInArea = ourObjects.filter(o => o.area?.toLowerCase() === area.toLowerCase())
    const ourAvg = ourInArea.length
      ? Math.round(ourInArea.reduce((s, o) => s + o.price, 0) / ourInArea.length)
      : null
    const priceDiffPct = ourAvg && avgCompPrice
      ? Math.round(((ourAvg - avgCompPrice) / avgCompPrice) * 100)
      : null

    return {
      area,
      refreshed_at: summary?.scraped_at ?? rows[0]?.scraped_at,
      market_count: Number(meta.count) || listings.length,
      avg_price: avgCompPrice,
      avg_days_on_market: avgDays,
      price_trend: (meta.trend as 'rising' | 'stable' | 'falling') ?? 'stable',
      our_objects: ourInArea.map(o => ({ id: o.id, address: o.address, price: o.price, size: o.size, type: o.type })),
      price_diff_pct: priceDiffPct,
      listings: listings.slice(0, 6).map((l: DbRow) => ({
        address: l.address ?? '',
        object_type: l.object_type ?? '',
        price: l.price ?? 0,
        days_on_market: l.days_on_market ?? 0,
        competitor_agency: l.competitor_agency ?? '',
      })),
      insight: String(meta.insight ?? ''),
    }
  })
}
