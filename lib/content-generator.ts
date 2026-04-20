import { anthropic, MODEL } from './anthropic'
import { supabase } from './supabase'
import { Agency, Channel, GenerateResult, PropertyObject } from '@/types'

const CHANNEL_PROMPTS: Record<Channel, (obj: PropertyObject, tone: string) => string> = {
  hemnet: (obj, tone) => `
Du skriver en Hemnet-annons på svenska för en mäklarbyrå med följande tonalitet: ${tone}.

Objekt:
- Adress: ${obj.address}, ${obj.area}
- Typ: ${obj.type}
- Storlek: ${obj.size} kvm
- Pris: ${formatPrice(obj.price)} kr
- Detaljer: ${obj.details}

Skriv:
1. RUBRIK (max 75 tecken) – säljande och specifik
2. SÄLJTEXT (max 1800 tecken) – strukturerad med korta stycken per plan/rum. Börja med en poetisk ingress, beskriv sedan bostaden rum för rum, avsluta med läge och livsstil.

Format:
RUBRIK: [rubrik]

SÄLJTEXT:
[text]`,

  hemnet_raket: (obj, tone) => `
Du skriver en Hemnet Raket-annons på svenska. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. HOOK (max 50 tecken) – den starkaste möjliga inledningen
2. TEXT (max 400 tecken) – komprimerad, emotionell, handlingsdrivande

Format:
HOOK: [hook]

TEXT:
[text]`,

  meta: (obj, tone) => `
Du skriver en Meta-annons (Facebook/Instagram) på svenska. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. HOOK (max 90 tecken) – stopper i flödet
2. PRIMARY TEXT (max 250 tecken) – engagerande brödtext
3. CTA – en kort uppmaning (t.ex. "Boka visning →")

Format:
HOOK: [hook]

PRIMARY TEXT:
[text]

CTA: [cta]`,

  mail: (obj, tone) => `
Du skriver ett e-postutskick på svenska till potentiella köpare. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. ÄMNESRAD – nyfiken och personlig (max 60 tecken)
2. BRÖDTEXT (max 150 ord) – personlig hälsning, presentera objektet, avsluta med visningsinbjudan

Format:
ÄMNESRAD: [ämnesrad]

BRÖDTEXT:
[text]`,

  website: (obj, tone) => `
Du skriver en poetisk objektbeskrivning för mäklarbyråns hemsida på svenska. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv en längre, flytande och atmosfärisk beskrivning (300–500 ord) som målar upp en bild av boendet och livsstilen. Använd berättarteknik, konkreta sinnesintryck och poetiskt språk. Inga bullet points.

TEXT:
[text]`,
}

export async function generateAllChannels(
  object: PropertyObject,
  agency: Agency
): Promise<GenerateResult[]> {
  const toneString = agency.tone_profile?.tags?.join(', ') ?? 'professionell, varm'
  const channels: Channel[] = ['hemnet', 'hemnet_raket', 'meta', 'mail', 'website']

  const results = await Promise.all(
    channels.map((channel) => generateChannel(channel, object, toneString))
  )

  await saveToSupabase(object.id, results)
  return results
}

async function generateChannel(
  channel: Channel,
  object: PropertyObject,
  tone: string
): Promise<GenerateResult> {
  const prompt = CHANNEL_PROMPTS[channel](object, tone)

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: channel === 'website' ? 1024 : 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return { channel, content, char_count: content.length }
}

async function saveToSupabase(objectId: string, results: GenerateResult[]) {
  const rows = results.map((r) => ({
    object_id: objectId,
    channel: r.channel,
    content: r.content,
    char_count: r.char_count,
  }))

  const { error } = await supabase.from('generated_content').insert(rows)
  if (error) throw new Error(`Supabase-fel vid sparande: ${error.message}`)
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE').format(price)
}
