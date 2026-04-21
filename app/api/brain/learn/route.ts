import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { anthropic, MODEL } from '@/lib/anthropic'

interface BrainLearning {
  category: string
  key: string
  value: string
  confidence: number
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { agency_id, object_id, channel, generated_text, action, edited_version } = body

    if (!agency_id || !channel || !generated_text || !action) {
      return NextResponse.json({ error: 'Saknade fält' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    // Save raw feedback
    await admin.from('generation_feedback').insert({
      agency_id,
      object_id: object_id ?? null,
      channel,
      generated_text,
      action,
      edited_version: edited_version ?? null,
    })

    // Ask Claude to extract learnings
    const prompt = `Analysera denna feedback och extrahera vad byrån föredrar.

Original text (${channel}):
${generated_text}

Handling: ${action}
${edited_version ? `\nRedigerad version:\n${edited_version}` : ''}

Identifiera:
1. Vad fungerade (om approved eller edited)
2. Vad fungerade inte (om rejected eller edited)
3. Specifika fraser eller mönster att använda/undvika
4. Strukturella och stilmässiga preferenser

Returnera ENBART giltig JSON utan markdown:
{
  "learn": [{ "category": "tone|winning_text|area_insight|buyer_profile|feedback", "key": "kort_nyckelord", "value": "konkret insikt att spara", "confidence": 0.5 }],
  "avoid": [{ "category": "feedback", "key": "kort_nyckelord", "value": "mönster att undvika" }]
}`

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(json) as {
      learn: BrainLearning[]
      avoid: BrainLearning[]
    }

    // Upsert learnings into agency_brain
    const rows: {
      agency_id: string
      category: string
      key: string
      value: string
      confidence: number
      source: string
    }[] = []

    for (const item of result.learn ?? []) {
      rows.push({
        agency_id,
        category: item.category ?? 'feedback',
        key: item.key,
        value: item.value,
        confidence: item.confidence ?? 0.6,
        source: 'feedback',
      })
    }

    for (const item of result.avoid ?? []) {
      rows.push({
        agency_id,
        category: 'feedback',
        key: item.key,
        value: item.value,
        confidence: 0.2, // low confidence = "avoid" signal
        source: 'feedback',
      })
    }

    if (rows.length > 0) {
      await admin.from('agency_brain').insert(rows)
    }

    return NextResponse.json({ ok: true, learned: rows.length })
  } catch (err) {
    console.error('[/api/brain/learn]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
