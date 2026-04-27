import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

const MAX_IMAGES = 15

const SYSTEM_PROMPT = `Du är en erfaren fastighetsfotograf-observatör som hjälper en mäklare att dokumentera ett objekts visuella egenskaper inför försäljning. Ditt jobb är att lista FAKTABASERADE observationer rum för rum — material, fixturer, ljus, rymd, skick, särdrag. Du gissar aldrig — om du inte ser det säger du inget. Du skriver i mäklarspråk: konkret, materialspecifikt, utan klyschor.`

const USER_PROMPT = `Analysera bilderna och returnera ett JSON-objekt som beskriver objektet rum för rum.

INSTRUKTIONER:
1. Klassificera varje rum du ser. Om du ser flera kök, badrum eller sovrum — separera dem med room_label ('Kök 1', 'Master bedroom', 'Badrum 2').
2. För varje rum, lista FAKTISKA OBSERVATIONER, inte tolkningar:
   - Bra: 'ekparkett i fiskbensmönster', 'svart kalkstensbänk', 'Bulthaup-stomme', 'V-Zug induktionshäll', 'fönster i två väderstreck'
   - Dåligt: 'modernt intryck', 'inbjudande känsla', 'luxuös atmosfär'
3. Material ska beskrivas SPECIFIKT med både material och placering:
   - Bra: 'kalksten på köksgolv', 'ek på huvudgolv'
   - Dåligt: 'sten', 'trä'
4. Fixturer ska identifieras med varumärke när det syns:
   - Bra: 'Bulthaup-kök', 'Vola-blandare', 'Duravit-handfat'
   - Annars: beskriv funktionellt: 'integrerad ugn', 'fritt placerat badkar', 'väggmonterad WC'
5. Hitta INTE på fixturer eller varumärken som inte är synliga.
6. Skick: använd 'okänt' om du inte ser tydliga indikatorer på skick.
7. Spatial-observationer ska vara mätbara eller observerbara: takhöjd, rumsanslutning, fönsterriktning. Inte 'rymligt' eller 'luftigt'.

FÖRBJUDNA ORD i alla fält:
- 'modernt', 'klassiskt', 'elegant', 'inbjudande', 'fantastisk', 'unik', 'genuint', 'välkomnande', 'mysig', 'charmig'
- 'gott om', 'massor av', 'överraskande'
- 'känsla', 'intryck', 'atmosfär', 'stämning'

JSON-schema (returnera ENDAST detta, inga markdown-fences, ingen förklaring):
{
  "rooms": [
    {
      "room_type": "kök" | "badrum" | "sovrum" | "vardagsrum" | "matrum" | "hall" | "arbetsrum" | "allrum" | "walk-in-closet" | "tvättstuga" | "gillestuga" | "uteplats" | "balkong" | "altan" | "trädgård" | "fasad" | "entré" | "trapphus" | "förråd" | "övrigt",
      "room_label": "valfri etikett om flera av samma typ, annars utelämna",
      "materials": ["material + placering", ...],
      "fixtures": ["varumärke eller funktionell beskrivning", ...],
      "light": ["fönsterriktning, ljuskällor", ...],
      "spatial": ["takhöjd, rumsanslutning, mått", ...],
      "condition": "nyrenoverat" | "välbevarat" | "original" | "slitet" | "okänt",
      "notable_details": ["enskilda särdrag som vedeldad spis, frilagda balkar etc", ...]
    }
  ],
  "overall_style": "kort beskrivning av övergripande stil, t.ex. '1920-tal med moderniseringar', om synligt, annars utelämna",
  "overall_condition": "nyrenoverat" | "välbevarat" | "original" | "blandat",
  "architectural_period": "valfri, t.ex. '1920-tal', '2010-tal', annars utelämna"
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { images, object_id } = body as { images: string[]; object_id?: string }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images krävs' }, { status: 400 })
    }

    const limited = images.slice(0, MAX_IMAGES)

    const imageBlocks = limited.map((dataUrl: string) => {
      const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
      if (!match) return null
      const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      const data = match[2]
      return {
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mediaType, data },
      }
    }).filter(Boolean)

    if (imageBlocks.length === 0) {
      return NextResponse.json({ error: 'Inga giltiga bilder' }, { status: 400 })
    }

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks as any[],
          { type: 'text', text: USER_PROMPT },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(json)

    const analysis = {
      ...parsed,
      analyzed_at: new Date().toISOString(),
      image_count: imageBlocks.length,
    }

    if (object_id) {
      await supabase
        .from('objects')
        .update({ image_analysis: analysis })
        .eq('id', object_id)
    }

    return NextResponse.json({ image_analysis: analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
