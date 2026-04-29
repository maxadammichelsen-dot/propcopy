import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getImporter } from '@/lib/importers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    const sourceField = form.get('source')
    const source = typeof sourceField === 'string' && sourceField ? sourceField : 'pdf'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file krävs (multipart/form-data)' }, { status: 400 })
    }

    const importer = getImporter(source)
    const result = await importer.extract(file)

    return NextResponse.json({
      success: true,
      fields: result.fields,
      confidence: result.confidence,
      source: result.source,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel vid import'
    console.error('[/api/import]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
