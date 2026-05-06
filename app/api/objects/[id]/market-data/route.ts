import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import type { MarketIntelligence } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    // Verify ownership via RLS before any admin writes
    const { data: obj, error: objError } = await supabase
      .from('objects')
      .select('id')
      .eq('id', params.id)
      .single()

    if (objError || !obj) {
      return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })
    }

    const body = await req.json() as { marketIntelligence: MarketIntelligence }
    const d = body.marketIntelligence

    if (!d) {
      return NextResponse.json({ error: 'marketIntelligence krävs' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    // Update scalar fields on the object
    const { error: updateErr } = await admin
      .from('objects')
      .update({
        bedomt_marknadsvarde: d.bedomt_marknadsvarde ?? null,
        bedomt_marknadsvarde_kr_per_kvm: d.bedomt_marknadsvarde_kr_per_kvm ?? null,
        statistisk_tillforlitlighet: d.statistisk_tillforlitlighet ?? null,
        prisutveckling_3m: d.prisutveckling_3m ?? null,
        prisutveckling_6m: d.prisutveckling_6m ?? null,
        prisutveckling_12m: d.prisutveckling_12m ?? null,
        prisutveckling_24m: d.prisutveckling_24m ?? null,
        snitt_annonseringstid_dagar: d.snitt_annonseringstid_dagar ?? null,
        marknadsdata_kalla: 'varderingsdata',
        marknadsdata_extraherad_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateErr) throw new Error(`Update failed: ${updateErr.message}`)

    // Replace comparable_sales for this object
    await admin.from('comparable_sales').delete().eq('object_id', params.id)

    if (d.jamforbara_forsaljningar.length > 0) {
      const rows = d.jamforbara_forsaljningar.map(s => ({
        object_id: params.id,
        adress: s.adress,
        forsaljningsdatum: s.forsaljningsdatum,
        pris_kr: s.pris_kr,
        pris_idag_kr: s.pris_idag_kr ?? null,
        boyta: s.boyta ?? null,
        biyta: s.biyta ?? null,
        tomt_kvm: s.tomt_kvm ?? null,
        byggar: s.byggar ?? null,
        kr_per_kvm: s.kr_per_kvm ?? null,
        taxvarde_kr: s.taxvarde_kr ?? null,
        kt_faktor: s.kt_faktor ?? null,
      }))
      const { error: salesErr } = await admin.from('comparable_sales').insert(rows)
      if (salesErr) console.error('[market-data] comparable_sales insert error:', salesErr.message)
    }

    // Replace listings_for_sale_in_area for this object
    await admin.from('listings_for_sale_in_area').delete().eq('object_id', params.id)

    if (d.till_salu_i_omradet.length > 0) {
      const rows = d.till_salu_i_omradet.map(l => ({
        object_id: params.id,
        adress: l.adress,
        utgangspris_kr: l.utgangspris_kr,
        kr_per_kvm: l.kr_per_kvm ?? null,
        boyta: l.boyta ?? null,
        antal_rum: l.antal_rum ?? null,
      }))
      const { error: listErr } = await admin.from('listings_for_sale_in_area').insert(rows)
      if (listErr) console.error('[market-data] listings insert error:', listErr.message)
    }

    console.info('[market-data] persisted for object', params.id, {
      comparables: d.jamforbara_forsaljningar.length,
      listings: d.till_salu_i_omradet.length,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/objects/[id]/market-data]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Clear all market data for an object (mäklaren chose "Hoppa över")
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    // Ownership check via user client (RLS)
    const { data: obj, error: objError } = await supabase
      .from('objects')
      .select('id')
      .eq('id', params.id)
      .single()

    if (objError || !obj) {
      return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })
    }

    const admin = createSupabaseAdminClient()
    await Promise.all([
      admin.from('objects').update({
        bedomt_marknadsvarde: null, bedomt_marknadsvarde_kr_per_kvm: null,
        statistisk_tillforlitlighet: null, prisutveckling_3m: null,
        prisutveckling_6m: null, prisutveckling_12m: null, prisutveckling_24m: null,
        snitt_annonseringstid_dagar: null, marknadsdata_kalla: null,
        marknadsdata_extraherad_at: null,
      }).eq('id', params.id),
      admin.from('comparable_sales').delete().eq('object_id', params.id),
      admin.from('listings_for_sale_in_area').delete().eq('object_id', params.id),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/objects/[id]/market-data DELETE]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
