import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { fetchAgencyTone } from '@/lib/tone-fetcher'
import { analyzeStyleDNA } from '@/lib/style-analyzer'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { url } = body
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url krävs' }, { status: 400 })
    }

    const toneProfile = await fetchAgencyTone(url, user.id, supabase)

    // Fetch agency_id to save style DNA to brain (fire-and-forget)
    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (agency?.id) {
      analyzeStyleDNA(url, agency.id).catch(err =>
        console.error('[/api/tone] style DNA:', err)
      )
    }

    return NextResponse.json({ tone_profile: toneProfile })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
