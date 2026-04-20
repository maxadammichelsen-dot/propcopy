import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!agency) {
      return NextResponse.json({
        prospects: [],
        stats: { total: 0, hot: 0, warm: 0, cold: 0 },
      })
    }

    const { data: prospects } = await supabase
      .from('prospects')
      .select('id, email, name, engagement_score, status, created_at')
      .eq('agency_id', agency.id)
      .order('engagement_score', { ascending: false })
      .limit(50)

    const list = prospects ?? []
    return NextResponse.json({
      prospects: list,
      stats: {
        total: list.length,
        hot: list.filter(p => p.status === 'hot').length,
        warm: list.filter(p => p.status === 'warm').length,
        cold: list.filter(p => p.status === 'cold').length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
