import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getBrainStats } from '@/lib/brain-context'

export async function GET() {
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
      return NextResponse.json({ total: 0, byCategory: {}, topSignals: [], recentFeedback: [] })
    }

    const stats = await getBrainStats(profile.agency_id)

    // Fetch recent feedback
    const { data: recent } = await supabase
      .from('generation_feedback')
      .select('id, channel, action, created_at')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ ...stats, recentFeedback: recent ?? [] })
  } catch (err) {
    console.error('[/api/brain/stats]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
