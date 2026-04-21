import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('meta_page_id, instagram_account_id, meta_access_token')
      .eq('user_id', user.id)
      .single()

    if (!agency?.meta_access_token || !agency.meta_page_id) {
      return NextResponse.json({ error: 'Meta är inte kopplat' }, { status: 400 })
    }

    const [fbRes, scheduledRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v19.0/${agency.meta_page_id}/insights` +
        `?metric=page_impressions,page_reach,page_engaged_users` +
        `&period=week&access_token=${agency.meta_access_token}`
      ),
      supabase
        .from('scheduled_posts')
        .select('id, platform, status, scheduled_for, published_at, content')
        .eq('agency_id', (await supabase.from('agencies').select('id').eq('user_id', user.id).single()).data?.id ?? '')
        .order('scheduled_for', { ascending: true })
        .limit(20),
    ])

    const fbData = await fbRes.json()
    const insights = fbData.data ?? []

    return NextResponse.json({
      page_insights: insights.map((m: { name: string; values: { value: number }[] }) => ({
        metric: m.name,
        value: m.values?.[0]?.value ?? 0,
      })),
      scheduled_posts: scheduledRes.data ?? [],
    })
  } catch (err) {
    console.error('[/api/meta/insights]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
