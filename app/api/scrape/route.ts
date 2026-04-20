import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { scrapeAgency } from '@/lib/agency-scraper'

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('id, url')
      .eq('user_id', user.id)
      .single()

    if (!agency?.url) {
      return NextResponse.json({ error: 'Ingen hemsida registrerad' }, { status: 400 })
    }

    const scraped = await scrapeAgency(agency.url)

    const admin = createSupabaseAdminClient()
    const { error } = await admin
      .from('agencies')
      .update({
        logo_url: scraped.logo_url,
        brand_colors: scraped.brand_colors,
        scraped_data: scraped.scraped_data,
      })
      .eq('id', agency.id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, data: scraped })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
