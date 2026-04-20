import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

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
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { address, area, type, size, price, details } = body

    if (!address || !area || !type || !size || !price) {
      return NextResponse.json({ error: 'Obligatoriska fält saknas' }, { status: 400 })
    }

    // Get agency
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (agencyError || !agency) {
      return NextResponse.json({ error: 'Byrå saknas – skapa byrå först' }, { status: 400 })
    }

    const { data: object, error } = await supabase
      .from('objects')
      .insert({
        agency_id: agency.id,
        address,
        area,
        type,
        size: Number(size),
        price: Number(price),
        details: details ?? '',
        status: 'draft',
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
