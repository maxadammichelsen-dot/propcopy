import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getObjectCoordinates, getOrFetchOSM } from '@/lib/openstreetmap'

const EMPTY_OSM = {
  groceries: [], schools: [], parks: [], restaurants: [],
  coast: [], healthcare: [], culture: [], transport: [], service: [],
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { object_id } = await req.json()
    if (!object_id) {
      return NextResponse.json({ error: 'object_id krävs' }, { status: 400 })
    }

    const coords = await getObjectCoordinates(supabase, object_id)
    if (!coords) {
      return NextResponse.json({
        osm: EMPTY_OSM,
        cached: false,
        error: 'Inga koordinater för objektet ännu',
      })
    }

    const result = await getOrFetchOSM(supabase, object_id, coords.lat, coords.lng)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/enrich]', err)
    return NextResponse.json(
      { osm: EMPTY_OSM, cached: false, error: err instanceof Error ? err.message : 'Okänt fel' },
      { status: 200 }
    )
  }
}
