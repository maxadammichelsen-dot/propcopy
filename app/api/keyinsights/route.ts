import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateKeyInsights } from '@/lib/content-generator'
import { PropertyObject } from '@/types'

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

    const { data: object, error: objError } = await supabase
      .from('objects')
      .select('*')
      .eq('id', object_id)
      .single()

    if (objError || !object) {
      return NextResponse.json({ error: 'Objekt hittades inte' }, { status: 404 })
    }

    const insights = await generateKeyInsights(object as PropertyObject)
    return NextResponse.json({ insights })
  } catch (err) {
    console.error('[/api/keyinsights]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
