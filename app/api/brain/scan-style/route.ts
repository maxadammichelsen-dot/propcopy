import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
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

  const agencyId = agency?.id
  const url      = agency?.url

  console.log('[scan-style] Starting for agency:', agencyId)
  console.log('[scan-style] URL:', url)

  if (!url) return NextResponse.json({ error: 'Ingen URL sparad för byrån' }, { status: 400 })
  if (!agencyId) return NextResponse.json({ error: 'Ingen byrå hittad' }, { status: 400 })

  const result = await analyzeStyleDNA(url, agencyId)

  console.log('[scan-style] analyzeStyleDNA returned:', result ? 'non-null' : 'NULL')
  console.log('[scan-style] Result sample:', result ? JSON.stringify(result).substring(0, 500) : 'null')

  if (!result) return NextResponse.json({ error: 'Kunde inte analysera sidan – kontrollera att URL:en är korrekt' }, { status: 500 })

  // Verify the row is actually in the DB
  const admin = createSupabaseAdminClient()
  const { data: dbRow, error: dbError } = await admin
    .from('agency_brain')
    .select('id, category, key')
    .eq('agency_id', agencyId)
    .eq('category', 'style_dna')
    .single()

  console.log('[scan-style] DB verify — row found:', dbRow ? 'YES' : 'NO')
  if (dbError) console.log('[scan-style] DB verify error:', dbError.message)

  // Count total pattern items across all fields
  const patterns = Object.values(result)
    .flat()
    .filter(v => typeof v === 'string' && v.length > 0).length

  console.log('[scan-style] Patterns count:', patterns)

  return NextResponse.json({ ok: true, patterns })
}
