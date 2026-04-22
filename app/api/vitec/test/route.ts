import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { vitecGetEstates, vitecTestConnection } from '@/lib/vitec-client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

    const body = await req.json()
    const username   = body.username?.trim()
    const password   = body.password?.trim()
    const customerId = body.customer_id?.trim()

    if (!username || !password || !customerId) {
      return NextResponse.json({ error: 'Användarnamn, lösenord och kund-ID krävs' }, { status: 400 })
    }

    // Verify credentials
    const authOk = await vitecTestConnection(username, password)
    if (!authOk) {
      return NextResponse.json({ error: 'Felaktiga inloggningsuppgifter' }, { status: 401 })
    }

    // Fetch estate list to verify customerId
    const estates = await vitecGetEstates(username, password, customerId)

    // Persist to agency
    const { data: profile } = await supabase
      .from('users').select('agency_id').eq('id', user.id).single()

    if (profile?.agency_id) {
      const admin = createSupabaseAdminClient()
      await admin.from('agencies')
        .update({
          vitec_username:    username,
          vitec_password:    password,
          vitec_customer_id: customerId,
        })
        .eq('id', profile.agency_id)
    }

    return NextResponse.json({ ok: true, estate_count: estates.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
