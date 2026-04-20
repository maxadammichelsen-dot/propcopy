import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateAllChannels } from '@/lib/content-generator'
import { Agency, PropertyObject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { object_id } = await req.json()
    if (!object_id) {
      return NextResponse.json({ error: 'object_id krävs' }, { status: 400 })
    }

    // Fetch object (RLS ensures ownership)
    const { data: object, error: objError } = await supabase
      .from('objects')
      .select('*')
      .eq('id', object_id)
      .single()

    if (objError || !object) {
      return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })
    }

    // Fetch agency for this user
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (agencyError || !agency) {
      return NextResponse.json({ error: 'Byrå hittades inte' }, { status: 404 })
    }

    const results = await generateAllChannels(object as PropertyObject, agency as Agency)
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
