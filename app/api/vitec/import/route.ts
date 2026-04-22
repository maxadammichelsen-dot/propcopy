import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { vitecGetEstate } from '@/lib/vitec-client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()
    if (!profile?.agency_id) return NextResponse.json({ error: 'Ingen byrå' }, { status: 400 })

    const { vitec_id, base_type } = await req.json()
    if (!vitec_id) return NextResponse.json({ error: 'vitec_id krävs' }, { status: 400 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('vitec_username, vitec_password, vitec_customer_id')
      .eq('id', profile.agency_id)
      .single()

    if (!agency?.vitec_username || !agency?.vitec_password || !agency?.vitec_customer_id) {
      return NextResponse.json({ error: 'Vitec ej konfigurerat' }, { status: 400 })
    }

    const estate = await vitecGetEstate(
      agency.vitec_username,
      agency.vitec_password,
      agency.vitec_customer_id,
      vitec_id,
      base_type ?? 'House'
    )

    // Check if already imported
    const { data: existing } = await supabase
      .from('objects')
      .select('id')
      .eq('agency_id', profile.agency_id)
      .eq('vitec_id', vitec_id)
      .maybeSingle()

    const row = {
      agency_id:   profile.agency_id,
      address:     estate.address,
      area:        estate.area,
      type:        estate.type,
      size:        estate.size,
      price:       estate.price,
      details:     estate.description || `${estate.size} kvm${estate.rooms != null ? `, ${estate.rooms} rum` : ''}`,
      status:      'draft' as const,
      vitec_id:    estate.vitecId,
      source:      'vitec',
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from('objects').update(row).eq('id', existing.id).select().single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ object: updated, updated: true })
    }

    const { data: created, error } = await supabase
      .from('objects').insert(row).select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ object: created, updated: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
