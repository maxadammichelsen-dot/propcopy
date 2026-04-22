import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { vitecGetEstates } from '@/lib/vitec-client'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()
    if (!profile?.agency_id) return NextResponse.json({ error: 'Ingen byrå' }, { status: 400 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('vitec_api_key, vitec_customer_id')
      .eq('id', profile.agency_id)
      .single()

    if (!agency?.vitec_api_key || !agency?.vitec_customer_id) {
      return NextResponse.json({ error: 'Vitec ej konfigurerat' }, { status: 400 })
    }

    const estates = await vitecGetEstates(agency.vitec_api_key, agency.vitec_customer_id)
    return NextResponse.json({ estates })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
