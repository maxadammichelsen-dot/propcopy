import { anthropic, MODEL } from './anthropic'
import { Agency, Channel, GenerateResult, ImageAnalysis, KeyInsights, LocationArgument, PropertyObject } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildBrainContext, buildStyleContext, getStyleDNA } from './brain-context'
import { buildCompetitionContext } from './competition-analyzer'
import { getChannelOptimization } from './channel-optimization'
import { CATEGORY_LABELS } from './brand-registry'
import {
  buildOSMContextString,
  filterOSMByEnabled,
  getObjectCoordinates,
  getOrFetchOSM,
} from './openstreetmap'

const MASTER_SYSTEM = `Du är Sveriges bästa copywriter för fastighetsmäklare.
Du har skrivit texter som lett till budgivningar 15-30% över utgångspris för premiumobjekt.

GRUNDPRINCIPER – BRYTS ALDRIG:

1. ÖPPNA MED DET KONKRET UNIKA
Aldrig: Välkommen till, Här bor du, Perfekt för
Alltid: Det som faktiskt är ovanligt för detta specifika objekt i detta prissegment.

2. SPECIFICITET SKAPAR BEGÄR
Dåligt: fint kök med modern inredning
Bra: kök från Kungsäter med Silestone-bänk och Quooker

Dåligt: nära till service
Bra: 400 meter till ICA, 8 minuter med spårvagn till Kungsportsplatsen

3. HANTERA RISKER PROAKTIVT
Hög driftkostnad – förklara varför
Långt på marknaden – adressera det
Föreningens skulder – sätt i kontext
Låt aldrig köparen dra egna negativa slutsatser.

4. KÖPAREN SKA SE SIG SJÄLV DÄR
Beskriv hur livet ser ut i bostaden.
Inte funktioner – upplevelser.
Inte material – känslan materialet skapar.

5. VARJE STYCKE HAR ETT TYDLIGT SYFTE
Inga utfyllnadsmeningar.
Om en mening kan tas bort utan att texten försämras – ta bort den.

FÖRBJUDNA ORD OCH FRASER (skriv aldrig dessa):
välkommen till
här bor du
här hittar du
perfekt för
fantastisk
underbar
unik (utan konkret bevis)
lugnt och barnvänligt
social planlösning
genomtänkt planlösning
ljust och luftigt
inte minst
inte att förglömma
möjligheter finns
charmig (utan att förklara varför)

SKRIVSTIL – LUGN MÄKLARRÖST, INTE LITTERÄR KOLUMNIST

Du skriver som en erfaren, observerande mäklare som beskriver vad som finns. Inte som en författare som försöker imponera.

FÖRBJUDNA LITTERÄRA FORMULERINGAR:
- 'biter sig fast i minnet'
- 'stannar kvar i minnet'
- 'blickfång' / 'arkitektoniskt blickfång'
- 'hela sin storhet'
- 'i sin fulla prakt'
- 'sätter tonen' / 'sätter ribban'
- 'tar plats' (om rum eller utsikt)
- 'den typen av X som Y' (reflekterande konstruktion)
- 'det slår mig' / 'det slår en'
- 'det märks att...'
- 'man förstår direkt varför...'
- alla reflekterande mäklarkommentarer i jag-form utöver enstaka observationer
- adjektivkedjor av tre eller fler ('storslaget, generöst och inbjudande')
- metaforer som jämför hemmet med något annat ('som ett galleri', 'som ett lyxhotell', 'som en oas')

REGEL: Om en mening kan tas bort utan att information försvinner – ta bort den. Lyriska reflektioner är information-noll och ska bort.

REGEL: Beskriv konkret vad som finns. 'Köket har köksö med induktionshäll och integrerade vitvaror' – inte 'Köket är hjärtat i hemmet där middagar tar form'.

REGEL: Skriv inte mer än EN observerande/reflekterande mening per text. Resten ska vara konkreta sakuppgifter.

UNDANTAG: Om style_dna.preferred_words eller style_dna.tone_markers innehåller en formulering, är den TILLÅTEN även om den finns i listan ovan.

KVALITETSKONTROLL INNAN DU SVARAR:
Granska din text mot denna checklista:
✓ Öppnar med konkret unik detalj (inte generisk fras)
✓ Innehåller minst 4 specifika namngivna detaljer
✓ Inga förbjudna fraser
✓ Matchar byråns ton (style_dna)
✓ Inom teckengräns för kanalen
✓ Köparen ser sig själv i bostaden
✓ Sista meningen är stark nog att stå ensam

Om texten inte klarar något kriterium – skriv om.
Visa aldrig en text som inte klarar alla kriterier.`

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

Returnera ENBART giltig JSON, inget annat:
{"rubrik": "rubrik här", "saljtext": "säljtext här"}`,

  meta: (obj, tone) => `
Du skriver en Meta-annons (Facebook/Instagram) på svenska. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. HOOK (max 90 tecken) – stopper i flödet
2. PRIMARY TEXT (max 250 tecken) – engagerande brödtext
3. HEADLINE – kort rubrik under bild (max 40 tecken)

Returnera ENBART giltig JSON, inget annat:
{"hook": "hook här", "primary_text": "brödtext här", "headline": "rubrik här"}`,

  email: (obj, tone) => `
Du skriver ett e-postutskick på svenska till potentiella köpare. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. ÄMNESRAD – nyfiken och personlig (max 60 tecken)
2. BRÖDTEXT (max 150 ord) – personlig hälsning, presentera objektet, avsluta med visningsinbjudan

Returnera ENBART giltig JSON, inget annat:
{"subject": "ämnesrad här", "body": "brödtext här"}`,

  social_organic: (obj, tone) => `
Du skriver ett organiskt Instagram/Facebook-inlägg om denna fastighet på svenska. Tonen ska vara personlig, äkta och ge en behind-the-scenes känsla. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv ett organiskt inlägg (max 2200 tecken) – personlig ton, behind-the-scenes känsla, berätta varför du personligen tycker om objektet, avsluta med hashtags.

Returnera ENBART giltig JSON, inget annat:
{"post": "hela inlägget med hashtags här"}`,
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

  const [styleContext, brainContext, competitionContext, styleDNA, osmContext] = await Promise.all([
    buildStyleContext(agency.id),
    buildBrainContext(agency.id),
    buildCompetitionContext(object.area, object.price, agency.id),
    getStyleDNA(agency.id),
    buildOSMBlock(object, supabase),
  ])
  // System: MASTER_SYSTEM + style_dna + brain_context (positions 1-2, 4)
  const systemContext = styleContext + brainContext
  const imageContext = object.image_analysis ? formatImageContext(object.image_analysis) : ''
  const storyContext = object.story
    ? `\n\nMÄKLARENS BERÄTTELSE OCH UNIKA DETALJER:\n${object.story}\nVäv in dessa detaljer naturligt i texten. Detta är guld – använd det.`
    : ''

  // Hemnet subheading instruction — injected only when style_dna signals it and object is large enough
  let hemnetSubheadingInstruction = ''
  if (
    styleDNA?.uses_structural_subheadings &&
    object.size > (styleDNA.subheading_threshold_sqm ?? 9999)
  ) {
    const examples = styleDNA.subheading_examples?.join(', ') ?? ''
    hemnetSubheadingInstruction =
      `\n\nOBLIGATORISKT FÖR DETTA OBJEKT (${object.size} kvm överstiger byråns tröskel på ${styleDNA.subheading_threshold_sqm} kvm):` +
      `\nByrån kräver strukturerade underrubriker för objekt av denna storlek. Dela upp SÄLJTEXT i sektioner med dessa rubriker: ${examples}` +
      `\nVarje rubrik följs av detaljerad beskrivning av just den sektionen. Skriv INTE löptext för detta objekt.`
  }

  // Hemnet rubrik-regel — applied unless byrån's style_dna explicitly uses närservice in headlines.
  // Default (okänt eller saknat): behandla som "brödtext" och förhindra närservice som rubrikkrok.
  const proximityHandling = styleDNA?.proximity_handling ?? 'okänt'
  const hemnetRubrikInstruction = proximityHandling === 'rubrik' ? '' :
    '\n\nRUBRIK-REGEL: Rubriken ska handla om objektets karaktär — material, plats-känsla, ' +
    'arkitektur, sällsynthet, eller en enskild stark egenskap. Närservice (avstånd till ' +
    'hållplatser, butiker, skolor) får ALDRIG vara huvudargument i rubriken. Närservice ' +
    'nämns som detalj i brödtexten där det är relevant, inte som rubrikkrok.\n\n' +
    "Bra rubriker: 'Arkitektritad villa i Hovås – 165 kvm med Bulthaup och golvhöga fönster', " +
    "'Friköpt sjötomt med utsikt över Askimsfjorden', 'Lägenhet i Hovås – 85 kvm friköpt med ägarrätt'.\n\n" +
    "Dåliga rubriker (gör INTE detta): 'Friköpt 85 kvm i Hovås – 330 m till spårvagn', " +
    "'Villa nära ICA Maxi och spårvagn', 'Lägenhet 700m från havet'."

  const results = await Promise.all(
    channels.map((channel) => generateChannel(
      channel, object, toneString, supabase, systemContext, imageContext,
      channel === 'hemnet' ? storyContext + hemnetSubheadingInstruction + hemnetRubrikInstruction : storyContext,
      competitionContext, osmContext,
    ))
  )

  await saveToSupabase(object.id, results, supabase)
  return results
}

function buildBrandsContext(brands: Record<string, string[]> | null | undefined, channel: Channel): string {
  if (!brands) return ''
  const lines: string[] = []
  for (const [key, values] of Object.entries(brands)) {
    if (!values || values.length === 0) continue
    const label = CATEGORY_LABELS[key] ?? key
    lines.push(`- ${label}: ${values.join(', ')}`)
  }
  if (lines.length === 0) return ''

  const channelInstruction =
    channel === 'hemnet'
      ? 'För Hemnet: använd alla relevanta varumärken där det passar naturligt.'
      : channel === 'meta'
      ? 'För Meta-annons: nämn max 1–2 varumärken – välj det mest imponerande.'
      : channel === 'email'
      ? 'För e-post: nämn max 1–2 varumärken – välj det mest relevanta.'
      : 'För socialt organiskt: använd INGA varumärken alls i texten.'

  return (
    '\n\nVARUMÄRKEN OCH SPECIFIKATION FÖR DETTA OBJEKT:\n' +
    lines.join('\n') +
    '\n\nINSTRUKTION: Använd dessa EXAKT som de står där det är naturligt. Hitta inte på andra varumärken. Hitta inte på modellnamn. Om en kategori saknas – nämn inte den alls. ' +
    channelInstruction
  )
}

function buildFactsContext(object: any): string {
  const facts: string[] = []

  if (object.tenure) facts.push(`Upplåtelseform: ${object.tenure}`)
  if (object.size) facts.push(`Boarea: ${object.size} m²`)
  if (object.plot_area) facts.push(`Tomtarea: ${object.plot_area} m²`)
  if (object.rooms) {
    const rooms = object.bedrooms
      ? `${object.rooms} varav ${object.bedrooms} sovrum`
      : `${object.rooms}`
    facts.push(`Antal rum: ${rooms}`)
  }
  if (object.construction_year) facts.push(`Byggår: ${object.construction_year}`)
  if (object.operating_cost_yearly) facts.push(`Driftkostnad: ${object.operating_cost_yearly} kr/år`)
  if (object.energy_class) facts.push(`Energiklass: ${object.energy_class}`)
  if (object.monthly_fee) facts.push(`Månadsavgift: ${object.monthly_fee} kr/mån`)
  if (object.heating) facts.push(`Uppvärmning: ${object.heating}`)
  if (object.ventilation) facts.push(`Ventilation: ${object.ventilation}`)
  if (object.parking) facts.push(`Parkering: ${object.parking}`)
  if (object.standard_class) facts.push(`Standard: ${object.standard_class}`)

  if (object.renovations) {
    const renoLines: string[] = []
    const r = object.renovations
    if (r.kitchen?.year) renoLines.push(`Kök ${r.kitchen.year}${r.kitchen.note ? ' – ' + r.kitchen.note : ''}`)
    if (r.bathroom?.year) renoLines.push(`Bad ${r.bathroom.year}${r.bathroom.note ? ' – ' + r.bathroom.note : ''}`)
    if (r.facade?.year) renoLines.push(`Fasad ${r.facade.year}${r.facade.note ? ' – ' + r.facade.note : ''}`)
    if (renoLines.length > 0) facts.push(`Renoveringar: ${renoLines.join(', ')}`)
  }

  if (facts.length === 0) return ''

  return `
FAKTA OM OBJEKTET (måste vara med i Hemnet-texten där naturligt):
${facts.map(f => '- ' + f).join('\n')}

Använd dessa exakt. Hitta inte på andra siffror eller årtal.
Om ett fält inte är listat – nämn inte den uppgiften alls.`.trim()
}

async function buildOSMBlock(
  object: PropertyObject,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const coords = await getObjectCoordinates(supabase, object.id)
    if (!coords) return ''
    const { osm } = await getOrFetchOSM(supabase, object.id, coords.lat, coords.lng)
    const filtered = filterOSMByEnabled(osm, object.enabled_enrichment_facts)
    const block = buildOSMContextString(filtered, object.area)
    if (!block) return ''
    return (
      '\n\nFAKTISK NÄRSERVICE — använd dessa namn och avstånd om relevant:\n' +
      block +
      '\n\nVIKTIGT: När du nämner närservice, kommunikationer eller läge — använd ENBART de platser och avstånd som listas i NÄRSERVICE-blocket. Hitta inte på namn på skolor, butiker eller hållplatser.' +
      '\n\nVIKTIGT om trafikslag:\n' +
      '- Använd ENDAST det trafikslag som anges för varje transport-post.\n' +
      "- Om det står 'busshållplats' — skriv 'buss' eller 'busshållplats', ALDRIG 'spårvagn' eller 'tunnelbana'.\n" +
      "- Om det står 'spårvagnshållplats' — skriv 'spårvagn'.\n" +
      "- Om det står 'tågstation' — skriv 'tåg' eller 'tågstation'.\n" +
      "- Om det står 'tunnelbana' — skriv 'tunnelbana'.\n" +
      "- Om det står 'färjeläge' — skriv 'färja'.\n" +
      '- Hitta aldrig på trafikslag som inte står i listan.'
    )
  } catch (err) {
    console.error('[content-generator] OSM block error:', err)
    return ''
  }
}

async function generateChannel(
  channel: Channel,
  object: PropertyObject,
  tone: string,
  supabase: SupabaseClient,
  systemContext = '',
  imageContext = '',
  storyContext = '',
  competitionContext = '',
  osmContext = ''
): Promise<GenerateResult> {
  const priceRange = getPriceRange(object.price)
  const refs = await fetchReferenceTexts(channel, object.type, priceRange, supabase)

  // Prompt order: 3. channelOptimization → 3b. brands → 4. facts → 4b. OSM → 5. objektdata → 6. story → 7. bild → 8. konkurrens
  const channelOpt = getChannelOptimization(channel)
  const brandsContext = buildBrandsContext(object.brands, channel)
  const factsContext = buildFactsContext(object)
  let prompt = channelOpt + brandsContext + (factsContext ? '\n\n' + factsContext : '') + osmContext + '\n\n' + CHANNEL_PROMPTS[channel](object, tone)
  if (storyContext) prompt += storyContext
  if (imageContext) prompt += imageContext
  if (competitionContext) prompt += competitionContext

  if (refs.length > 0) {
    prompt +=
      '\n\nHär är exempel på texter som resulterat i stark budgivning för liknande objekt. ' +
      'Matcha denna kvalitetsnivå men skriv originellt:\n\n' +
      refs.map((r, i) => `--- Exempel ${i + 1} ---\n${r}`).join('\n\n')
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    // System order: 1. MASTER_SYSTEM → 2. style_dna → 4. brain_context
    system: MASTER_SYSTEM + systemContext,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
  const match = raw.match(/\{[\s\S]*\}/)
  const content = match ? match[0] : raw
  let charCount = content.length
  if (match) {
    try {
      charCount = Object.values(JSON.parse(match[0]) as Record<string, string>).join('').length
    } catch {}
  }
  return { channel, content, char_count: charCount }
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
