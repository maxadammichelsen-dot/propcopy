import { anthropic, MODEL } from './anthropic'
import { Agency, Channel, GenerateResult, ImageAnalysis, ImageObservation, KeyInsights, LocationArgument, PropertyObject } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildBrainContext, buildStyleContext, getStyleDNA } from './brain-context'
import { buildCompetitionContext } from './competition-analyzer'
import { getChannelOptimization } from './channel-optimization'
import { CATEGORY_LABELS } from './brand-registry'
import {
  buildLocationContext,
  buildOSMContextString,
  filterOSMByEnabled,
  getLocationAddress,
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

GEOGRAFISK REGEL – INGA PÅHITTADE PLATSNAMN:
Skriv ALDRIG om geografiska begrepp (halvöar, stadsdelar, vattendrag, naturreservat) som inte uttryckligen nämns i OBJEKTETS GEOGRAFISKA POSITION-blocket eller FAKTISK NÄRSERVICE-blocket eller i mäklarens area-fält.
Felaktig hallucination: 'Näset-halvöns västra sida' (om "halvön" inte nämns i datan)
Felaktig hallucination: 'söder om älven', 'vid havet' (om inte verifierat)
Korrekt: 'i Näset', 'i Långedrag' — men BARA om de finns i verifierad data eller i mäklarens area-fält.
Om geografisk data saknas — referera till adress och område, inget mer.

HARD CONSTRAINT — OMRÅDESNAMN:

Det är ABSOLUT FÖRBJUDET att skriva annat områdesnamn än det som finns i
mäklarens registrerade area-fält (visas som del av "Adress: ..., <area>" i prompten).
Mäklaren har själv registrerat detta fält och det är den enda auktoritativa
källan för var bostaden säljs.

- Använd EXAKT mäklarens area-värde i texten ("Näset" om det står "Näset")
- Skriv ALDRIG ett annat områdesnamn baserat på koordinater, adress eller
  egen kunskap om geografi
- Om geografisk fakta i andra delar av prompten (t.ex. stadsdelsinformation)
  refererar till ett annat namn — IGNORERA det för områdesnamnet. Mäklarens fält vinner alltid.
- Om mäklaren registrerat objektet i Näset trots att adressen geografiskt
  ligger i Åkered, är det ett medvetet positioneringsbeslut. Respektera det.

Detta gäller alla kanaler — Hemnet, Meta Ads, e-post, social.

BILDOBSERVATIONS-REGEL:
- Om VISUELLA OBSERVATIONER-blocket finns: använd ENDAST de material, fixturer och särdrag som står där när du beskriver rummen.
- Om ett specifikt rum inte är observerat — skriv inte detaljerat om det. Skriv generellt eller utelämna.
- Hitta aldrig på varumärken (Bulthaup, V-Zug, Duravit, Vola etc.) som inte uttryckligen finns i observationerna.
- Om ett varumärke står i observationerna — använd det med rätt stavning.
- Om VISUELLA OBSERVATIONER-blocket saknas helt — håll texten generell om interiören. Skriv 'modernt kök' inte 'kök i ek med Bulthaup'.

BYGGNADSREGEL — INGEN UPPDIKTAD BYGGNADSDATA:
Du får ALDRIG nämna följande i den genererade texten om motsvarande fält är NULL eller saknas i PROPERTY_FACTS:
- Våningsplan ('plan X av Y', 'tredje våningen', etc.)
- Byggår eller byggnadens ålder
- Antal rum, antal badrum, antal WC
- Balkong och balkong-orientering
- Öppen spis
- Hiss
- Parkering
- Månadsavgift, driftkostnad
- Tomt-area, tomt-form
- Byggnadsmaterial, uppvärmning

Om datan saknas — utelämna fakten helt. En kortare text utan uppdiktad fakta är alltid bättre än en längre text med felaktig fakta.

HARD CONSTRAINT — BEKRÄFTADE BILDOBSERVATIONER:

Det är ABSOLUT FÖRBJUDET att skriva om material, ytmaterial, fasta inredningsdetaljer
eller utmärkande visuella egenskaper som inte finns i CONFIRMED_OBSERVATIONS i PROPERTY_FACTS.

KONKRETA REGLER:
- Skriv ALDRIG specifika material som "ek-parkett", "marmor", "kalksten",
  "rökt ek", "italiensk klinker", "kashmir-granit" om det inte är konfirmerat.
- Skriv ALDRIG ursprungsbeteckningar ("italiensk", "skandinavisk", "dansk design")
  oavsett confidence — det kräver dokumentation, inte bildanalys.
- Om CONFIRMED_OBSERVATIONS är tom: skriv INGENTING om material eller
  inredningsdetaljer alls. Generella rumsbeskrivningar tillåts utan material
  ("ljust vardagsrum", "rymligt kök").
- Använd EXAKT den term som finns i CONFIRMED_OBSERVATIONS — gör den inte mer
  specifik (om "trägolv" är konfirmerat, skriv inte "ek-parkett").
- Om mäklaren har skrivit material i story-input/keywords räknas det som
  konfirmerat — det är mäklarens ord, inte AI:ns.

Detta är en härdad regel mot hallucination. Bryts den, bryts hela produkten.

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
2. SÄLJTEXT – strukturerad med korta stycken per rum/plan

HÅRDA TECKENMÅL FÖR SÄLJTEXT — bryts inte:
- Total längd: 800–1100 tecken
- De första 250 tecknen: det starkaste säljargumentet direkt — storlek, läge, eller unik egenskap. Ingen poetisk inledning som leder fram till poängen. Hemnet visar bara 250 tecken i listvyn; köparen bestämmer om de klickar på de orden.
- Om du når 1100 tecken: korta från slutet, aldrig från säljargumentet.
- Räkna tecknen i din text innan du svarar. Om texten är utanför 800–1100 — skriv om.

Returnera ENBART giltig JSON, inget annat:
{"rubrik": "rubrik här", "saljtext": "säljtext här"}`,

  meta: (obj, tone) => `
Du skriver en Meta-annons (Facebook/Instagram) på svenska. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. HOOK (max 90 tecken) – scroll-stopper i flödet
2. PRIMARY TEXT – EN säljpunkt + tydlig CTA
3. HEADLINE – kort rubrik under bild (max 40 tecken)

HÅRDA TECKENMÅL — bryts inte:
- PRIMARY TEXT: 130–180 tecken. En säljpunkt, ett budskap. Inget mer.
- Räkna tecknen i primary_text innan du svarar.

Returnera ENBART giltig JSON, inget annat:
{"hook": "hook här", "primary_text": "brödtext här", "headline": "rubrik här"}`,

  email: (obj, tone) => `
Du skriver ett e-postutskick på svenska till potentiella köpare. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv:
1. ÄMNESRAD – nyfiken och personlig (max 60 tecken)
2. BRÖDTEXT – direkt, personlig, konkret

HÅRDA TECKENMÅL FÖR BRÖDTEXT — bryts inte:
- Total längd: 350–500 tecken
- Första meningen: hook — en konkret egenskap eller observation, inte en generisk hälsning
- Skriv INTE "jag tänkte på dig när det här objektet kom in" utan konkret anledning
- Avsluta med ett enkelt handlingsval (boka visning eller fråga)
- Räkna tecknen i body innan du svarar.

Returnera ENBART giltig JSON, inget annat:
{"subject": "ämnesrad här", "body": "brödtext här"}`,

  social_organic: (obj, tone) => `
Du skriver ett organiskt Instagram/Facebook-inlägg om denna fastighet på svenska. Tonen ska vara personlig, äkta och ge en behind-the-scenes känsla. Byrån har tonalitet: ${tone}.

Objekt: ${obj.type}, ${obj.size} kvm, ${obj.address}, ${obj.area}, ${formatPrice(obj.price)} kr
Detaljer: ${obj.details}

Skriv ett organiskt inlägg – personlig ton, behind-the-scenes känsla, berätta varför du personligen tycker om objektet, avsluta med hashtags.

HÅRDA TECKENMÅL — bryts inte:
- Total längd: 800–1100 tecken
- De första två raderna avgör om läsaren stannar — gör dem skarpa, konkreta och specifika för just detta objekt
- Korta från slutet om du når 1100 tecken
- Räkna tecknen i post innan du svarar.

Returnera ENBART giltig JSON, inget annat:
{"post": "hela inlägget med hashtags här"}`,
}

function formatImageContext(analysis: ImageAnalysis): string {
  if (!analysis.rooms || analysis.rooms.length === 0) {
    return formatLegacyImageContext(analysis)
  }

  const parts: string[] = ['VISUELLA OBSERVATIONER FRÅN BILDERNA (rum för rum):']

  for (const room of analysis.rooms) {
    const label = room.room_label ? `${room.room_type} (${room.room_label})` : room.room_type
    const lines: string[] = [`\n${label.toUpperCase()}:`]
    if (room.materials?.length)        lines.push(`  Material: ${room.materials.join(', ')}`)
    if (room.fixtures?.length)         lines.push(`  Fixturer: ${room.fixtures.join(', ')}`)
    if (room.light?.length)            lines.push(`  Ljus: ${room.light.join(', ')}`)
    if (room.spatial?.length)          lines.push(`  Rymd: ${room.spatial.join(', ')}`)
    if (room.notable_details?.length)  lines.push(`  Särdrag: ${room.notable_details.join(', ')}`)
    if (room.condition && room.condition !== 'okänt') lines.push(`  Skick: ${room.condition}`)
    parts.push(lines.join('\n'))
  }

  if (analysis.overall_style)         parts.push(`\nÖVERGRIPANDE STIL: ${analysis.overall_style}`)
  if (analysis.architectural_period)  parts.push(`PERIOD: ${analysis.architectural_period}`)

  parts.push(
    '\nVIKTIGT: Använd ENDAST dessa observationer när du beskriver rummen och materialen. ' +
    'Hitta inte på material, varumärken eller särdrag som inte står här. ' +
    'Om ett rum inte är observerat — skriv inte detaljerat om det.'
  )

  return '\n\n' + parts.join('\n')
}

function formatLegacyImageContext(analysis: ImageAnalysis): string {
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
  if (parts.length === 1) return ''
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

  const [styleContext, brainContext, competitionContext, styleDNA, osmContext, geoContext, confirmedObsContext] = await Promise.all([
    buildStyleContext(agency.id),
    buildBrainContext(agency.id),
    buildCompetitionContext(object.area, object.price, agency.id),
    getStyleDNA(agency.id),
    buildOSMBlock(object, supabase),
    buildGeoBlock(object.id, supabase),
    buildConfirmedObservationsBlock(object.id, supabase),
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
      competitionContext, osmContext, geoContext, confirmedObsContext,
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
      '\n\nTRANSPORT-REGEL (datakällsbaserad):\n' +
      '- NÄRSERVICE-blocket innehåller alla transport-poster vi har data för.\n' +
      "- Om en transport-post i blocket NÄMNER trafikslag (t.ex. 'expressbuss 760', 'spårvagn 11', 'pendeltåg') — då får och bör texten använda det konkreta trafikslaget. Det är konkret information som säljer.\n" +
      "- Om en transport-post i blocket INTE nämner trafikslag (bara 'hållplats', 'station', 'brygga') — använd 'hållplats', 'närmaste hållplats', 'kollektivtrafik' eller liknande neutrala benämningar. Hitta INTE på trafikslag som inte står i datan.\n" +
      '- Felaktig fakta är värre än oprecis fakta. Om du är osäker — skriv neutralt.\n' +
      '- Använd promenadtid (X minuter) som primär enhet för avstånd till hållplats.'
    )
  } catch (err) {
    console.error('[content-generator] OSM block error:', err)
    return ''
  }
}

const ROOM_LABELS: Record<string, string> = {
  vardagsrum: 'Vardagsrum', kok: 'Kök', badrum: 'Badrum', sovrum: 'Sovrum',
  hall: 'Hall', matplats: 'Matplats', uteplats: 'Uteplats', okand: 'Övrigt',
}

export async function buildConfirmedObservationsBlock(
  objectId: string,
  supabase: SupabaseClient
): Promise<string> {
  try {
    const { data: confirmed, error } = await supabase
      .from('image_observations')
      .select('room_type, observation_type, value, confidence')
      .eq('object_id', objectId)
      .eq('status', 'confirmed')
      .order('room_type')

    if (error) {
      console.error('[content-generator] confirmed obs query error:', error.message)
      return '\n\nCONFIRMED_OBSERVATIONS: (inga bekräftade bildobservationer — skriv inget om material eller inredningsdetaljer)'
    }

    if (!confirmed || confirmed.length === 0) {
      return '\n\nCONFIRMED_OBSERVATIONS: (inga bekräftade bildobservationer — skriv inget om material eller inredningsdetaljer)'
    }

    type Row = Pick<ImageObservation, 'room_type' | 'observation_type' | 'value' | 'confidence'>
    const byRoom: Record<string, Row[]> = {}
    for (const obs of confirmed as Row[]) {
      const room = obs.room_type ?? 'okand'
      if (!byRoom[room]) byRoom[room] = []
      byRoom[room].push(obs)
    }

    const formatted = Object.entries(byRoom)
      .map(([room, obs]) => {
        const items = obs.map(o => `${o.value} (${o.observation_type})`).join(', ')
        return `${ROOM_LABELS[room] ?? 'Övrigt'}: ${items}`
      })
      .join('\n')

    return (
      '\n\nCONFIRMED_OBSERVATIONS (mäklaren har sett bilderna och bekräftat dessa observationer):\n' +
      formatted +
      '\n\nVIKTIGT: Använd ENBART termerna ovan för material och inredningsdetaljer. ' +
      'Gör dem INTE mer specifika. Hitta INTE på kompletterande material.'
    )
  } catch (err) {
    console.error('[content-generator] confirmed obs block error:', err)
    return '\n\nCONFIRMED_OBSERVATIONS: (inga bekräftade bildobservationer — skriv inget om material eller inredningsdetaljer)'
  }
}

async function buildGeoBlock(objectId: string, supabase: SupabaseClient): Promise<string> {
  try {
    const addr = await getLocationAddress(supabase, objectId)
    if (!addr) return ''
    return buildLocationContext(addr)
  } catch (err) {
    console.error('[content-generator] geo block error:', err)
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
  osmContext = '',
  geoContext = '',
  confirmedObsContext = ''
): Promise<GenerateResult> {
  const priceRange = getPriceRange(object.price)
  const refs = await fetchReferenceTexts(channel, object.type, priceRange, supabase)

  // Prompt order: 3. channelOptimization → 3b. brands → 4. facts → 4c. confirmedObs → 4d. geo → 4e. OSM → 5. objektdata → 6. story → 7. bild → 8. konkurrens
  const channelOpt = getChannelOptimization(channel)
  const brandsContext = buildBrandsContext(object.brands, channel)
  const factsContext = buildFactsContext(object)
  let prompt = channelOpt + brandsContext + (factsContext ? '\n\n' + factsContext : '') + confirmedObsContext + geoContext + osmContext + '\n\n' + CHANNEL_PROMPTS[channel](object, tone)
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
  console.info(`[content-generator] ${channel} length: ${charCount}`)
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
