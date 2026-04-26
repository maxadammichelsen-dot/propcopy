import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { analyzeStyleDNA } from '@/lib/style-analyzer'

export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, url')
    .eq('user_id', user.id)
    .single()

  if (!agency?.url) return NextResponse.json({ error: 'Ingen URL sparad för byrån' }, { status: 400 })

  const result = await analyzeStyleDNA(agency.url, agency.id)
  if (!result) return NextResponse.json({ error: 'Kunde inte analysera sidan – kontrollera att URL:en är korrekt' }, { status: 500 })

  // Count total pattern items across all fields
  const patterns = Object.values(result)
    .flat()
    .filter(v => typeof v === 'string' && v.length > 0).length

  return NextResponse.json({ ok: true, patterns })
}
