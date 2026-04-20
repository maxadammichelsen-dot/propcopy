import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { scrapeAgency } from '@/lib/agency-scraper'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { action, email, password, agency_name, agency_url, user_id } = await req.json()

  if (action === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ user: data.user })
  }

  // Called after client-side signUp. Uses admin client (bypasses RLS) so it
  // works whether or not Supabase email confirmation is enabled.
  if (action === 'setup_agency') {
    if (!user_id) return NextResponse.json({ error: 'user_id krävs' }, { status: 400 })
    const admin = createSupabaseAdminClient()

    // 1. Create / update agency row
    const { data: agency, error: upsertError } = await admin
      .from('agencies')
      .upsert(
        { user_id, name: agency_name || 'Min byrå', url: agency_url ?? '' },
        { onConflict: 'user_id' }
      )
      .select('id, url')
      .single()

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

    // 2. Auto-scrape branding from the agency website (non-fatal if it fails)
    if (agency?.url) {
      try {
        const scraped = await scrapeAgency(agency.url)
        await admin
          .from('agencies')
          .update({
            logo_url: scraped.logo_url,
            brand_colors: scraped.brand_colors,
            scraped_data: scraped.scraped_data,
          })
          .eq('id', agency.id)
      } catch {
        // Branding failure must never block registration
      }
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'logout') {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Okänd action' }, { status: 400 })
}
