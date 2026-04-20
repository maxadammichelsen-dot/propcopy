import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'
import { fetchAgencyTone } from '@/lib/tone-fetcher'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { url } = body
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url krävs' }, { status: 400 })
    }

    const toneProfile = await fetchAgencyTone(url, user.id)
    return NextResponse.json({ tone_profile: toneProfile })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
