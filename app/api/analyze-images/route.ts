import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

const MAX_IMAGES = 8

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { images } = body as { images: string[] }

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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks as any[],
          {
            type: 'text',
            text: `Analysera dessa bilder från en fastighet och beskriv de visuella egenskaperna noggrant för att hjälpa en mäklare skriva bättre annonstexter.

Returnera ENBART giltig JSON utan markdown:
{
  "materials": ["materialnamn1", "materialnamn2"],
  "lighting": "beskrivning av ljussättning och hur ljuset faller",
  "ceiling_height": "låg/normal/hög/mycket hög",
  "renovation_status": "nyrenoverat/gott skick/normalt slitage/renoveringsbehov",
  "special_features": ["särdrag1", "särdrag2"],
  "room_character": "övergripande känsla och atmosfär i bostaden",
  "view": "utsiktsbeskrivning eller null",
  "outdoor": "uteplats/balkong/trädgård-beskrivning eller null",
  "style": "stilbeskrivning t.ex. nordisk minimalism, klassisk, industriell",
  "key_selling_points": ["starkaste visuella säljargument 1", "starkaste visuella säljargument 2", "starkaste visuella säljargument 3"]
}`,
          },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const analysis = JSON.parse(json)

    return NextResponse.json({ image_analysis: analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
