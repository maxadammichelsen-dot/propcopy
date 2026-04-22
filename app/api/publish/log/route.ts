import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const objectId = req.nextUrl.searchParams.get('object_id')
    if (!objectId) return NextResponse.json({ error: 'object_id krävs' }, { status: 400 })

    const { data, error } = await supabase
      .from('publication_log')
      .select('id, channel, status, note, external_id, published_at')
      .eq('object_id', objectId)
      .order('published_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)
    return NextResponse.json({ log: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()
    if (!profile?.agency_id) return NextResponse.json({ error: 'Ingen byrå' }, { status: 400 })

    const { object_id, channel, status = 'success', note, external_id } = await req.json()
    if (!object_id || !channel) return NextResponse.json({ error: 'object_id och channel krävs' }, { status: 400 })

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.from('publication_log').insert({
      object_id,
      agency_id:   profile.agency_id,
      channel,
      status,
      note:        note ?? null,
      external_id: external_id ?? null,
    }).select().single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ entry: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
