import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const { action, email, password, agency_name, agency_url } = await req.json()

  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ user: data.user })
  }

  if (action === 'register') {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (data.user && agency_name) {
      await supabase.from('agencies').insert({
        user_id: data.user.id,
        name: agency_name,
        url: agency_url ?? '',
        tone_profile: null,
        brand_colors: null,
      })
    }
    return NextResponse.json({ user: data.user }, { status: 201 })
  }

  if (action === 'logout') {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Okänd action' }, { status: 400 })
}
