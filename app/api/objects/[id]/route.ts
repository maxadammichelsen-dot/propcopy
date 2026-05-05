import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { geocodeAndPersist } from '@/lib/geocoder'
import { Channel } from '@/types'

function getPriceRange(price: number): string {
  if (price < 2_000_000)  return '0-2M'
  if (price < 4_000_000)  return '2-4M'
  if (price < 7_000_000)  return '4-7M'
  if (price < 12_000_000) return '7-12M'
  return '12M+'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { status, sold_price, enabled_enrichment_facts } = body as {
      status?: string
      sold_price?: number
      enabled_enrichment_facts?: string[]
    }

    // Fetch object — RLS guarantees ownership
    const { data: object, error: objError } = await supabase
      .from('objects')
      .select('id, agency_id, type, area, price, status')
      .eq('id', params.id)
      .single()

    if (objError || !object) {
      return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })
    }

    // Build update payload
    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (Array.isArray(enabled_enrichment_facts)) {
      update.enabled_enrichment_facts = enabled_enrichment_facts
    }

    let bidPremiumPct: number | null = null
    if (status === 'sold' && sold_price) {
      bidPremiumPct = ((sold_price - object.price) / object.price) * 100
      update.sold_price      = sold_price
      update.bid_premium_pct = bidPremiumPct
    }

    const { data: updated, error: updateError } = await supabase
      .from('objects')
      .update(update)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    // ── Promote texts to best_texts if bid premium > 10 % ───
    if (bidPremiumPct !== null && bidPremiumPct > 10) {
      const { data: content } = await supabase
        .from('generated_content')
        .select('channel, content')
        .eq('object_id', params.id)
        .order('created_at', { ascending: false })

      if (content && content.length > 0) {
        // Deduplicate: keep only the most recent text per channel
        const seen = new Set<string>()
        const rows = content
          .filter(r => { if (seen.has(r.channel)) return false; seen.add(r.channel); return true })
          .map(r => ({
            agency_id:         object.agency_id,
            channel:           r.channel as Channel,
            text:              r.content,
            object_type:       object.type,
            area:              object.area,
            price_range:       getPriceRange(object.price),
            performance_score: bidPremiumPct,
          }))

        await supabase.from('best_texts').insert(rows)
        // Non-fatal: we don't block the response if this fails
      }
    }

    return NextResponse.json({ object: updated, bid_premium_pct: bidPremiumPct })
  } catch (err) {
    console.error('[/api/objects/[id]]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const {
      address, area, type, size, price, details, story, image_analysis, brands,
      tenure, plot_area, construction_year, monthly_fee, operating_cost_yearly,
      energy_class, bedrooms, standard_class, heating, ventilation, parking, renovations,
      status,
    } = body

    if (!address || !area || !type || !size || !price) {
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 })
    }

    const { data: object, error: updateError } = await supabase
      .from('objects')
      .update({
        address,
        area,
        type,
        size: Number(size),
        price: Number(price),
        details: details ?? '',
        story: story ?? null,
        status: status ?? 'active',
        brands: brands && Object.keys(brands).length > 0 ? brands : {},
        tenure: tenure || null,
        plot_area: plot_area ?? null,
        construction_year: construction_year ?? null,
        monthly_fee: monthly_fee ?? null,
        operating_cost_yearly: operating_cost_yearly ?? null,
        energy_class: energy_class || null,
        bedrooms: bedrooms || null,
        standard_class: standard_class || null,
        heating: heating || null,
        ventilation: ventilation || null,
        parking: parking || null,
        renovations: renovations && Object.keys(renovations).length > 0 ? renovations : null,
        ...(image_analysis ? { image_analysis } : {}),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    if (!object) return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })

    // Re-geocode if address changed
    geocodeAndPersist(supabase, object.id, address, area ?? undefined)
      .catch((err) => console.error('[objects PUT] geocode error:', err))

    return NextResponse.json({ object })
  } catch (err) {
    console.error('[/api/objects/[id] PUT]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
