import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { geocodeAndPersist } from '@/lib/geocoder'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    // Get agency for this user
    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!agency) {
      return NextResponse.json({ objects: [] })
    }

    const { data: objects, error } = await supabase
      .from('objects')
      .select('*')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return NextResponse.json({ objects: objects ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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
    } = body

    if (!address || !area || !type || !size || !price) {
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 })
    }

    // Get agency, or create one automatically if missing
    let agencyId: string
    const { data: existingAgency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingAgency) {
      agencyId = existingAgency.id
    } else {
      const admin = createSupabaseAdminClient()
      const { data: newAgency, error: createErr } = await admin
        .from('agencies')
        .insert({ user_id: user.id, name: 'Min byrå', url: '' })
        .select('id')
        .single()
      if (createErr || !newAgency) {
        return NextResponse.json({ error: 'Kunde inte skapa byrå' }, { status: 500 })
      }
      agencyId = newAgency.id
    }

    const { data: object, error } = await supabase
      .from('objects')
      .insert({
        agency_id: agencyId,
        address,
        area,
        type,
        size: Number(size),
        price: Number(price),
        details: details ?? '',
        story: story ?? null,
        status: 'draft',
        brands: brands && Object.keys(brands).length > 0 ? brands : {},
        tenure: tenure || null,
        plot_area: plot_area ? Number(plot_area) : null,
        construction_year: construction_year ? Number(construction_year) : null,
        monthly_fee: monthly_fee ? Number(monthly_fee) : null,
        operating_cost_yearly: operating_cost_yearly ? Number(operating_cost_yearly) : null,
        energy_class: energy_class || null,
        bedrooms: bedrooms || null,
        standard_class: standard_class || null,
        heating: heating || null,
        ventilation: ventilation || null,
        parking: parking || null,
        renovations: renovations && Object.keys(renovations).length > 0 ? renovations : null,
        ...(image_analysis ? { image_analysis } : {}),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Fire-and-forget: geocode in background so coords are ready before the first generate call
    if (object) {
      geocodeAndPersist(supabase, object.id, address, area ?? undefined)
        .catch((err) => console.error('[objects POST] geocode error:', err))
    }

    return NextResponse.json({ object }, { status: 201 })
  } catch (err) {
    console.error('[/api/objects POST]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
