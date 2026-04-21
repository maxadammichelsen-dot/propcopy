import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

async function getAuthedAgency(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, agency: null }

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { user, agency }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { user, agency } = await getAuthedAgency(supabase)

    if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    if (!agency) return NextResponse.json({ error: 'Ingen byrå hittad' }, { status: 404 })

    return NextResponse.json({ agency, user_email: user.email })
  } catch (err) {
    console.error('[/api/settings GET]', err)
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { user, agency } = await getAuthedAgency(supabase)

    if (!user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    if (!agency) return NextResponse.json({ error: 'Ingen byrå hittad' }, { status: 404 })

    const body = await req.json()
    const allowed = ['name', 'url', 'phone', 'email', 'address'] as const
    const updates: Partial<Record<typeof allowed[number], string>> = {}

    for (const key of allowed) {
      if (key in body && typeof body[key] === 'string') {
        updates[key] = body[key].trim()
      }
    }

    const { data, error } = await supabase
      .from('agencies')
      .update(updates)
      .eq('id', agency.id)
      .select('*')
      .single()

    if (error) {
      console.error('[/api/settings PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agency: data })
  } catch (err) {
    console.error('[/api/settings PATCH]', err)
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 })
  }
}
