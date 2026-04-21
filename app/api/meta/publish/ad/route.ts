import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { object_id, daily_budget_sek, age_min, age_max, location, placements } = await req.json()
    if (!object_id) return NextResponse.json({ error: 'object_id krävs' }, { status: 400 })

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: agency }, { data: object }] = await Promise.all([
      supabase.from('agencies').select('*').eq('user_id', user.id).single(),
      supabase.from('objects').select('*').eq('id', object_id).single(),
    ])

    if (!agency || !object) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })
    if (!agency.meta_access_token) {
      return NextResponse.json({ error: 'Meta är inte kopplat' }, { status: 400 })
    }

    const tone = agency.social_tone_profile?.voice
      ?? agency.tone_profile?.tags?.join(', ')
      ?? 'professionell och varm'

    // Generate ad copy
    const { content } = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Skriv en Meta-annons för mäklarbyrån "${agency.name}". Ton: ${tone}.

Objekt: ${object.type}, ${object.size} kvm, ${object.address}, ${object.area}
Pris: ${new Intl.NumberFormat('sv-SE').format(object.price)} kr
Detaljer: ${object.details}

Format EXAKT:
PRIMARY TEXT: [max 125 tecken]
RUBRIK: [max 40 tecken]
CTA: [Boka visning | Läs mer | Kontakta oss]`,
      }],
    })

    const raw = content[0].type === 'text' ? content[0].text : ''
    const primaryMatch = raw.match(/PRIMARY TEXT:\s*(.+)/i)
    const rubrikMatch = raw.match(/RUBRIK:\s*(.+)/i)
    const ctaMatch = raw.match(/CTA:\s*(.+)/i)

    const adCopy = {
      primary_text: primaryMatch?.[1]?.trim() ?? '',
      headline: rubrikMatch?.[1]?.trim() ?? object.address,
      cta: ctaMatch?.[1]?.trim() ?? 'Boka visning',
    }

    // Build targeting spec for Ads Manager
    const targetingSpec = {
      age_min: age_min ?? 25,
      age_max: age_max ?? 65,
      geo_locations: { cities: [{ key: location ?? object.area }] },
      interests: [{ id: '6003020834693', name: 'Real estate' }],
    }

    const placementsList: string[] = placements ?? ['feed', 'story']

    return NextResponse.json({
      ad_copy: adCopy,
      targeting: targetingSpec,
      placements: placementsList,
      daily_budget_sek: daily_budget_sek ?? 100,
      ads_manager_url: `https://www.facebook.com/adsmanager/creation`,
      note: 'Öppna Ads Manager och skapa en kampanj med ovanstående data. Full API-skapning kräver ad_account_id.',
    })
  } catch (err) {
    console.error('[/api/meta/publish/ad]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
