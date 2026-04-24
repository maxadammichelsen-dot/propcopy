import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateKeyInsights } from '@/lib/content-generator'
import { KeyInsights, PropertyObject } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const { object_id, force } = await req.json()
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

    // Serve from cache unless caller explicitly requests a refresh
    if (object.key_insights && !force) {
      return NextResponse.json({ insights: object.key_insights as KeyInsights, cached: true })
    }

    const insights = await generateKeyInsights(object as PropertyObject)

    // Persist so we don't regenerate on every open
    await supabase
      .from('objects')
      .update({ key_insights: insights })
      .eq('id', object_id)

    return NextResponse.json({ insights, cached: false })
  } catch (err) {
    console.error('[/api/keyinsights]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
