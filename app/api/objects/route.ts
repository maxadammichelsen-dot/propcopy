import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

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
    const { address, area, type, size, price, details, story, image_analysis, brands } = body

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
        ...(image_analysis ? { image_analysis } : {}),
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ object }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
