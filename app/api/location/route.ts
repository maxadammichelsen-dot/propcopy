import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { analyzeLocation } from '@/lib/location-analyzer'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { address, area } = await req.json()
    if (!address || !area) {
      return NextResponse.json({ error: 'address och area krävs' }, { status: 400 })
    }

    const arguments_ = await analyzeLocation(address, area)
    return NextResponse.json({ arguments: arguments_ })
  } catch (err) {
    console.error('[/api/location]', err)
    // Return empty list instead of 500 — location analysis is non-blocking;
    // a timeout or API error must not prevent the object from being created.
    return NextResponse.json({ arguments: [] })
  }
}
