import { anthropic, MODEL } from './anthropic'
import { Agency, Channel, GenerateResult, ImageAnalysis, KeyInsights, LocationArgument, PropertyObject } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildBrainContext, buildStyleContext } from './brain-context'
import { buildCompetitionContext } from './competition-analyzer'

const MASTER_SYSTEM = `Du är Sveriges bästa copywriter för fastighetsmäklare. Du har skrivit texter som resulterat i budgivningar 15-30% över utgångspris.

GRUNDPRINCIPER – BRYTS ALDRIG:

1. ÖPPNA MED DET KONKRET UNIKA
   Aldrig: "Välkommen till", "Här bor du", "Perfekt för familjen"
   Alltid: Börja med det som faktiskt är ovanligt för denna specifika bostad i detta prissegment.
   Exempel på bra öppningar:
   - "Tre sovrum mot tyst innergård och havet synligt från köket."
   - "Byggår 1903. Originalstuck. Ingen har rivit ut det."
   - "184 kvm på ett plan. Det är ovanligare än man tror i Hovås."

2. SPECIFICITET SKAPAR BEGÄR
   Dåligt: "fint kök med modern inredning"
   Bra: "kök från Kungsäter med bänkskiva i Silestone och Quooker"

   Dåligt: "nära till service"
   Bra: "400 meter till ICA, 8 minuter med spårvagn till Kungsportsplatsen"

3. HANTERA RISKER PROAKTIVT
   Om driftkostnad är hög – förklara varför
   Om objektet stått länge – adressera det
   Om föreningen har skulder – sätt i kontext
   Låt aldrig köparen dra egna slutsatser

4. KÖPAREN SKA SE SIG SJÄLV DÄR
   Beskriv hur livet faktiskt ser ut i bostaden
   Inte funktioner – upplevelser
   Inte material – känslan materialet skapar

5. FÖRBJUDNA ORD OCH FRASER:
   - välkommen till
   - här bor du
   - perfekt för
   - fantastisk/underbar/unik (utan bevis)
   - lugnt och barnvänligt område
   - social planlösning
   - genomtänkt planlösning
   - ljust och luftigt
   - inte minst
   - inte att förglömma
   - möjligheter finns

KANALSPECIFIKA REGLER:

HEMNET (1500-1875 tecken):
- Löptext, inga rubriker eller bullets
- Stycke 1: Den starkaste konkreta USP:en (2-3 meningar)
- Stycke 2: Planlösning med materialspecificitet
- Stycke 3: Utemiljö och läge med exakta avstånd
- Stycke 4: Området som livsstilsval
- Avslut: En mening som stannar kvar

META ADS:
HOOK (max 125 tecken):
  - Ska stoppa scrollet på 0.3 sekunder
  - Väck nyfikenhet, inte informera
  - Ställ en fråga eller gör ett oväntat påstående
PRIMARY TEXT (max 438 tecken):
  - Expandera hooken
  - En konkret detalj som skapar begär
  - Tydlig CTA i sista meningen
CTA: "Se hela villan →" eller "Boka visning →"

E-POST:
- Ämnesrad som öppnas (personlig, specifik)
- Skriv som ett tips från en vän, inte en annons
- Max 3 stycken
- Tydlig uppmaning i slutet

SOCIALT ORGANISKT (max 2200 tecken):
- Personlig, äkta ton – behind-the-scenes känsla
- Berätta varför du personligen tycker om objektet
- Avsluta med relevanta hashtags

KVALITETSKONTROLL – innan du svarar, kontrollera att texten:
✓ Öppnar med något konkret och unikt
✓ Innehåller minst 3 specifika detaljer
✓ Inte innehåller förbjudna fraser
✓ Matchar byråns tonalitet
✓ Håller sig inom teckengränsen
✓ Gör att köparen ser sig själv i bostaden`

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

  email: (obj, tone) => `
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

  social_organic: (obj, tone) => `
Du skriver ett organiskt Instagram/Facebook-inlägg om denna fastighet på svenska. Tonen ska vara personlig, äkta och ge en behind-the-scenes känsla. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv ett organiskt inlägg (max 2200 tecken) – personlig ton, behind-the-scenes känsla, berätta varför du personligen tycker om objektet, avsluta med hashtags.

Format:
INLÄGG:
[text]`,
}

function formatImageContext(analysis: ImageAnalysis): string {
  const parts: string[] = ['VISUELLA DETALJER FRÅN BILDERNA:']
  if (analysis.materials?.length)
    parts.push(`Material: ${analysis.materials.join(', ')}`)
  if (analysis.lighting?.length)
    parts.push(`Ljus: ${analysis.lighting.join(', ')}`)
  if (analysis.ceiling_height)
    parts.push(`Takhöjd: ${analysis.ceiling_height}`)
  if (analysis.renovation_status)
    parts.push(`Skick: ${analysis.renovation_status}`)
  if (analysis.special_features?.length)
    parts.push(`Särdrag: ${analysis.special_features.join(', ')}`)
  if (analysis.key_selling_points?.length)
    parts.push(`Säljande detaljer: ${analysis.key_selling_points.join(' · ')}`)
  return '\n\n' + parts.join('\n')
}

function getPriceRange(price: number): string {
  if (price < 2_000_000)  return '0-2M'
  if (price < 4_000_000)  return '2-4M'
  if (price < 7_000_000)  return '4-7M'
  if (price < 12_000_000) return '7-12M'
  return '12M+'
}

async function fetchReferenceTexts(
  channel: Channel,
  objectType: string,
  priceRange: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data } = await supabase
    .from('best_texts')
    .select('text')
    .eq('channel', channel)
    .or(`object_type.eq.${objectType},object_type.is.null`)
    .order('performance_score', { ascending: false })
    .limit(3)

  return (data ?? []).map((r: { text: string }) => r.text)
}

export async function generateAllChannels(
  object: PropertyObject,
  agency: Agency,
  supabase: SupabaseClient
): Promise<GenerateResult[]> {
  const toneString = agency.tone_profile?.tags?.join(', ') ?? 'professionell, varm'
  const channels: Channel[] = ['hemnet', 'meta', 'email', 'social_organic']

  const [styleContext, brainContext, competitionContext] = await Promise.all([
    buildStyleContext(agency.id),
    buildBrainContext(agency.id),
    buildCompetitionContext(object.area, object.price, agency.id),
  ])
  const agencyContext = styleContext + brainContext + competitionContext
  const imageContext = object.image_analysis ? formatImageContext(object.image_analysis) : ''
  const storyContext = object.story
    ? `\n\nMÄKLARENS BERÄTTELSE OCH UNIKA DETALJER:\n${object.story}\nVäv in dessa detaljer naturligt i texten. Detta är guld – använd det.`
    : ''

  const results = await Promise.all(
    channels.map((channel) => generateChannel(channel, object, toneString, supabase, agencyContext, imageContext, storyContext))
  )

  await saveToSupabase(object.id, results, supabase)
  return results
}

async function generateChannel(
  channel: Channel,
  object: PropertyObject,
  tone: string,
  supabase: SupabaseClient,
  brainContext = '',
  imageContext = '',
  storyContext = ''
): Promise<GenerateResult> {
  const priceRange = getPriceRange(object.price)
  const refs = await fetchReferenceTexts(channel, object.type, priceRange, supabase)

  let prompt = CHANNEL_PROMPTS[channel](object, tone)
  if (storyContext) prompt += storyContext
  if (imageContext) prompt += imageContext

  if (refs.length > 0) {
    prompt +=
      '\n\nHär är exempel på texter som resulterat i stark budgivning för liknande objekt. ' +
      'Matcha denna kvalitetsnivå men skriv originellt:\n\n' +
      refs.map((r, i) => `--- Exempel ${i + 1} ---\n${r}`).join('\n\n')
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: MASTER_SYSTEM + brainContext,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  return { channel, content, char_count: content.length }
}

async function saveToSupabase(objectId: string, results: GenerateResult[], supabase: SupabaseClient) {
  const rows = results.map((r) => ({
    object_id: objectId,
    channel: r.channel,
    content: r.content,
    char_count: r.char_count,
  }))

  const { error } = await supabase.from('generated_content').insert(rows)
  if (error) throw new Error(`Supabase-fel vid sparande: ${error.message}`)
}

export async function generateKeyInsights(
  object: PropertyObject,
  locationArgs: LocationArgument[] = [],
  agency_id?: string
): Promise<KeyInsights> {
  const brainContext = agency_id ? await buildBrainContext(agency_id) : ''
  const locationContext = locationArgs.length > 0
    ? `\nPlatsargument: ${locationArgs.map(a => a.text).join(', ')}`
    : ''

  const prompt = `Analysera detta objekt och identifiera de 5 starkaste säljargumenten baserat på:
- Vad som är genuint ovanligt för prisnivån
- Vad köpare i detta segment värderar mest
- Vad som riskerar att missförstås och behöver hanteras proaktivt

Objekt:
- Adress: ${object.address}, ${object.area}
- Typ: ${object.type}
- Storlek: ${object.size} kvm
- Pris: ${formatPrice(object.price)} kr
- Detaljer: ${object.details}${locationContext}

Returnera ENBART giltig JSON utan markdown eller förklaringar:
{
  "strengths": [{ "argument": "string", "why": "string" }],
  "risks": [{ "issue": "string", "how_to_handle": "string" }],
  "positioning": "string"
}`

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: MASTER_SYSTEM + brainContext,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in generateKeyInsights response')
  return JSON.parse(match[0]) as KeyInsights
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE').format(price)
}
