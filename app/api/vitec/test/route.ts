import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { vitecGetEstates } from '@/lib/vitec-client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const body = await req.json()
    const apiKey     = body.api_key?.trim()
    const customerId = body.customer_id?.trim()

    if (!apiKey || !customerId) {
      return NextResponse.json({ error: 'API-nyckel och kund-ID krävs' }, { status: 400 })
    }

    // Try fetching estates to verify connection
    const estates = await vitecGetEstates(apiKey, customerId)

    // Persist credentials to the agency
    const admin = createSupabaseAdminClient()
    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()

    if (profile?.agency_id) {
      await admin.from('agencies')
        .update({ vitec_api_key: apiKey, vitec_customer_id: customerId })
        .eq('id', profile.agency_id)
    }

    return NextResponse.json({ ok: true, estate_count: estates.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
