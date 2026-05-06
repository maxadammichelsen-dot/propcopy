import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { extractIntagsrapport } from '@/lib/pdf-extraction/intagsrapport'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json() as {
      pdf_type: string
      file_base64: string
      object_id?: string
    }

    if (!body.file_base64) {
      return NextResponse.json({ error: 'file_base64 krävs' }, { status: 400 })
    }

    if (body.pdf_type !== 'intagsrapport') {
      return NextResponse.json({ error: `Okänd pdf_type: ${body.pdf_type}` }, { status: 400 })
    }

    const buffer = Buffer.from(body.file_base64, 'base64')
    const result = await extractIntagsrapport(buffer)

    if (!result) {
      return NextResponse.json(
        { error: 'PDF kunde inte tolkas som Intagsrapport — saknar Värderingsdata-märkning' },
        { status: 422 }
      )
    }

    return NextResponse.json({ extracted: result.data, confidence: result.confidence })
  } catch (err) {
    console.error('[/api/extract-pdf]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
