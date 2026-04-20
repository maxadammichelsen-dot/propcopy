import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { action, email, password, agency_name, agency_url, user_id } = await req.json()

  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ user: data.user })
  }

  // setup_agency: called after client-side signUp to create agency via admin
  // (bypasses RLS – works regardless of email confirmation status)
  if (action === 'setup_agency') {
    if (!user_id) return NextResponse.json({ error: 'user_id krävs' }, { status: 400 })
    const admin = createSupabaseAdminClient()

    // Upsert so re-registrations / retries are safe
    const { error } = await admin.from('agencies').upsert(
      {
        user_id,
        name: agency_name || 'Min byrå',
        url: agency_url ?? '',
        tone_profile: null,
        brand_colors: null,
      },
      { onConflict: 'user_id' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'logout') {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Okänd action' }, { status: 400 })
}
