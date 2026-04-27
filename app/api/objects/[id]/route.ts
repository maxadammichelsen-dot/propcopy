import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
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
