import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function DELETE() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!profile?.agency_id) {
      return NextResponse.json({ error: 'Ingen byrå' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    await admin.from('agency_brain').delete().eq('agency_id', profile.agency_id)
    await admin.from('generation_feedback').delete().eq('agency_id', profile.agency_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/brain/reset]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
