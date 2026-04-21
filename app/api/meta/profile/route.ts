import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('meta_page_id, instagram_account_id, social_tone_profile')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      connected: !!agency?.meta_page_id,
      page_id: agency?.meta_page_id ?? null,
      instagram_id: agency?.instagram_account_id ?? null,
      social_tone_profile: agency?.social_tone_profile ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
