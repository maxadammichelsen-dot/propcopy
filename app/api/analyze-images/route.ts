import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { anthropic, MODEL } from '@/lib/anthropic'
import type { ImageObservation, ImageObservationCandidate, ObservationType, RoomType } from '@/types'

const MAX_IMAGES = 15
const MIN_CONFIDENCE = 0.65

// Exact system prompt as specified — drives confidence-based observation extraction.
const SYSTEM_PROMPT = `Du analyserar bilder från en bostadsannons. Din uppgift är att identifiera \
KONKRETA material och inredningsdetaljer som syns i bilden — INTE att skriva beskrivande text.

REGLER:
1. Returnera ENDAST observationer du är säker på. Hellre tom array än gissning.
2. För varje observation, ange confidence mellan 0.0 och 1.0 ärligt:
   - 0.90+ = Säker. Tydligt synligt, omöjligt att förväxla.
   - 0.75-0.89 = Trolig. Synligt men kan vara likvärdigt material.
   - 0.65-0.74 = Möjlig. Indikerat men osäkert.
   - <0.65 = Lämna bort. Returnera INTE observationen alls.
3. Använd ALLMÄNNA termer när du är osäker: "trägolv" istället för "ek-parkett",
   "stengolv" istället för "kalksten". Specifika termer kräver hög confidence.
4. ALDRIG specifika ursprungsbeteckningar utan visuell bevis ("italienskt",
   "skandinaviskt", "tysk design") — sätt confidence 0.0 och hoppa över.
5. Identifiera rumstyp om möjligt.

OBSERVATION_TYPES att leta efter:
- material_floor: golv (parkett, klinker, sten, betong, kork)
- material_counter: bänkskivor i kök/badrum (marmor, granit, komposit, laminat)
- material_wall: väggmaterial (kakel, klinker, trä, tapet, betong)
- fixture: fasta inredningsdetaljer (öppen spis, inbyggd garderob, kassettdörr)
- feature: utmärkande egenskaper (takhöjd, takbjälkar, fönsterparti, balkong)

Returnera JSON i formatet:
{
  "room_type": "vardagsrum" | "kok" | "badrum" | "sovrum" | "hall" | "matplats" | "uteplats" | "okand",
  "observations": [
    {
      "observation_type": "material_floor",
      "value": "ek-parkett",
      "confidence": 0.87
    }
  ]
}

Om bilden är otydlig, en planlösning, ett dokument, eller ej en bostadsbild:
returnera {"room_type": "okand", "observations": []}.`

interface PerImageRaw {
  room_type: string
  observations: Array<{ observation_type: string; value: string; confidence: number }>
}

interface CandidateWithRef extends ImageObservationCandidate {
  imageRef: string
}

async function analyzeOneImage(dataUrl: string, imageRef: string): Promise<CandidateWithRef[]> {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
  if (!match) return []
  const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  const data = match[2]

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: 'Analysera denna bild och returnera JSON.' },
        ],
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(json) as PerImageRaw

    return (parsed.observations ?? []).map(obs => ({
      room_type: (parsed.room_type as RoomType) ?? null,
      observation_type: obs.observation_type as ObservationType,
      value: obs.value,
      confidence: obs.confidence,
      imageRef,
    }))
  } catch (err) {
    console.error(`[image-analyzer] error on ${imageRef}:`, err)
    return []
  }
}

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

    // Analyze each image in parallel — one Claude call per image
    const perImageCandidates = await Promise.all(
      limited.map((dataUrl, i) => analyzeOneImage(dataUrl, `image-${i + 1}`))
    )
    const allCandidates = perImageCandidates.flat()

    // Double-safety filter: confidence < MIN_CONFIDENCE should already be excluded
    // by Claude per prompt, but we enforce it server-side too
    const accepted: CandidateWithRef[] = []
    const filtered: CandidateWithRef[] = []
    for (const c of allCandidates) {
      if (c.confidence >= MIN_CONFIDENCE) {
        accepted.push(c)
      } else {
        filtered.push(c)
      }
    }

    if (filtered.length > 0) {
      console.info('[image-analyzer] filtered low-confidence:', filtered)
    }

    // Persist pending observations via service-role (bypasses RLS — same pattern as openstreetmap.ts)
    let persistedRows: ImageObservation[] = []
    if (object_id && accepted.length > 0) {
      const admin = createSupabaseAdminClient()

      // Clear stale pending observations from any previous analysis run for this object
      await admin
        .from('image_observations')
        .delete()
        .eq('object_id', object_id)
        .eq('status', 'pending')

      const rows = accepted.map(c => ({
        object_id,
        image_url: c.imageRef,
        room_type: c.room_type,
        observation_type: c.observation_type,
        value: c.value,
        confidence: c.confidence,
        status: 'pending' as const,
      }))

      const { data, error } = await admin
        .from('image_observations')
        .insert(rows)
        .select()

      if (error) {
        console.error('[image-analyzer] persist error:', error.message)
      } else {
        persistedRows = (data ?? []) as ImageObservation[]
        console.info(`[image-analyzer] persisted ${persistedRows.length} pending observations for object ${object_id}`)
      }
    }

    return NextResponse.json({
      object_id: object_id ?? null,
      total_images: limited.length,
      observations: persistedRows.length > 0 ? persistedRows : accepted,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[/api/analyze-images]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
