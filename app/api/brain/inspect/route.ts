import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!agency?.id) return NextResponse.json({ error: 'Ingen byrå' }, { status: 404 })

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('agency_brain')
    .select('category, key, value, confidence, source, updated_at')
    .eq('agency_id', agency.id)
    .order('confidence', { ascending: false })

  return NextResponse.json({ entries: data ?? [], total: data?.length ?? 0 })
}
