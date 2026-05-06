import type { ComparableSale, ExtractionConfidence, ListingForSale, MarketIntelligence, StatisticalReliability } from '@/types'

// pdf-parse@1.1.1 has a top-level side-effect that reads a test PDF relative to
// its package directory. On Windows (and some serverless runtimes) that read fails
// at require()-time, crashing the Next.js route module before any handler runs.
// Importing the internal implementation file directly bypasses that side-effect.
async function getPdfParser(): Promise<(buffer: Buffer) => Promise<{ text: string; numpages: number }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse/lib/pdf-parse.js' as any)
  return mod.default
}

// ─── PII filter ───────────────────────────────────────────────────────────────
// Any row containing these patterns is DROPPED in full — never partially sanitised.

const PII_PATTERNS = [
  /\d{6,8}[-\s]?\d{4}/,                 // Swedish personnummer (YYMMDD-NNNN or YYYYMMDD-NNNN)
  /\b\d{3,6}[-–]\d{6,}[-–]\d{1,2}\b/, // Bank/loan number patterns
]

function containsPII(value: string): boolean {
  return PII_PATTERNS.some(p => p.test(value))
}

// ─── Exec-all helper (avoids spread-of-iterator TS target issues) ─────────────

function execAll(re: RegExp, text: string): RegExpExecArray[] {
  const results: RegExpExecArray[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    results.push(m)
    if (!re.global) break
  }
  return results
}

// ─── Number parsing helpers ───────────────────────────────────────────────────

function parseSwedishInt(raw: string): number | undefined {
  const cleaned = raw.replace(/[\s    ]/g, '').replace(/,/g, '')
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? undefined : n
}

function extractInts(text: string): number[] {
  return execAll(/([\d][\d\s ]{0,8}[\d])/g, text)
    .map(m => parseSwedishInt(m[1]))
    .filter((n): n is number => n !== undefined && n > 0)
}

function parsePercent(raw: string): number | undefined {
  const match = raw.match(/([+-]?\d+[,.]?\d*)[\s]*%/)
  if (!match) return undefined
  const n = parseFloat(match[1].replace(',', '.'))
  return isNaN(n) ? undefined : n / 100
}

function parseDate(raw: string): string | undefined {
  const m = raw.match(/(\d{4})[-/]?(\d{2})[-/]?(\d{2})/)
  if (!m) return undefined
  return `${m[1]}-${m[2]}-${m[3]}`
}

// ─── Text section splitter ────────────────────────────────────────────────────

function extractSection(text: string, startMarker: RegExp, endMarker: RegExp): string {
  const start = text.search(startMarker)
  if (start === -1) return ''
  const rest = text.slice(start + 1)
  const end = rest.search(endMarker)
  return end === -1 ? text.slice(start) : text.slice(start, start + 1 + end)
}

// ─── Scalar field extraction ──────────────────────────────────────────────────

function extractMarknadsvarde(text: string): { varde?: number; krPerKvm?: number } {
  const result: { varde?: number; krPerKvm?: number } = {}

  const mvMatch = text.match(/Bed[öo]mt\s+marknadsv[äa]rde[\s\S]{0,120}?([\d][\d\s ]{3,12})\s*kr/i)
  if (mvMatch) result.varde = parseSwedishInt(mvMatch[1])

  const kvmMatch = text.match(/([\d][\d\s ]{2,8})\s*kr\s*\/\s*kvm/i)
    ?? text.match(/kr\s*\/\s*kvm\s+([\d][\d\s ]{2,8})/i)
  if (kvmMatch) result.krPerKvm = parseSwedishInt(kvmMatch[1])

  return result
}

function extractTillforlitlighet(text: string): StatisticalReliability | undefined {
  // Real PDF text: "Det värderade objektets värde har låg tillförlitlighet, vilket innebär..."
  // Match the prose pattern "har (god|normal|låg) tillförlitlighet" anywhere in the text.
  const m = text.match(/har\s+(god|normal|l[åa]g)\s+tillf[öo]rlitlighet/i)
  if (!m) return undefined
  const raw = m[1].toLowerCase()
  if (raw === 'god') return 'god'
  if (raw === 'normal') return 'normal'
  if (raw === 'lag' || raw === 'låg') return 'lag'
  return undefined
}

function extractPrisutveckling(text: string): {
  p3m?: number; p6m?: number; p12m?: number; p24m?: number
} {
  const result: { p3m?: number; p6m?: number; p12m?: number; p24m?: number } = {}
  const section = extractSection(text, /Prisutveckling/i, /\n\n|\r\n\r\n|Annonser/)
  const haystack = section || text

  const patterns: Array<[RegExp, keyof typeof result]> = [
    [/3\s*m[åa]n[a-z]*[\s:]*([+-]?\d+[,.]?\d*)\s*%/i, 'p3m'],
    [/6\s*m[åa]n[a-z]*[\s:]*([+-]?\d+[,.]?\d*)\s*%/i, 'p6m'],
    [/12\s*m[åa]n[a-z]*[\s:]*([+-]?\d+[,.]?\d*)\s*%/i, 'p12m'],
    [/24\s*m[åa]n[a-z]*[\s:]*([+-]?\d+[,.]?\d*)\s*%/i, 'p24m'],
  ]

  for (const [re, key] of patterns) {
    const hit = haystack.match(re)
    if (hit) {
      const pct = parsePercent(hit[0])
      if (pct !== undefined) result[key] = pct
    }
  }

  return result
}

function extractAnnonseringstid(text: string): number | undefined {
  const m = text.match(/[Aa]nnonseringstid[a-z\s]*[:\s]*([\d]+)\s*dag/i)
  return m ? (parseInt(m[1], 10) || undefined) : undefined
}

// ─── Table extraction — comparables ──────────────────────────────────────────

function parseComparableLine(line: string): ComparableSale | null {
  if (containsPII(line)) return null

  const dateMatch = line.match(/(\d{4}[-/]\d{2}[-/]\d{2}|\d{8})/)
  if (!dateMatch) return null

  const date = parseDate(dateMatch[1])
  if (!date) return null

  const datePos = line.indexOf(dateMatch[1])
  const adress = line.slice(0, datePos).trim()
  if (!adress || adress.length < 3) return null
  if (containsPII(adress)) return null

  const remainder = line.slice(datePos + dateMatch[1].length)
  const nums = extractInts(remainder)
  if (nums.length < 1) return null

  const [pris_kr, pris_idag_kr, boyta, biyta, tomt_kvm, byggar, kr_per_kvm, taxvarde_kr] = nums

  const ktMatch = remainder.match(/(\d+[,.]\d{1,2})\s*$/)
  const kt_faktor = ktMatch ? parseFloat(ktMatch[1].replace(',', '.')) : undefined

  return {
    adress,
    forsaljningsdatum: date,
    pris_kr,
    pris_idag_kr,
    boyta,
    biyta,
    tomt_kvm,
    byggar,
    kr_per_kvm,
    taxvarde_kr,
    kt_faktor: kt_faktor && !isNaN(kt_faktor) ? kt_faktor : undefined,
  }
}

function extractComparableSales(text: string): ComparableSale[] {
  const section = extractSection(
    text,
    // Accept both "Sålts i området" (passive plural) and "Sålt i området" (past participle)
    /S[åa]lts?\s+i\s+omr[åa]det|J[äa]mf[öo]rbara\s+f[öo]rs[äa]ljningar/i,
    // End at the next section header or a page break; no blank-line fallback since
    // comparables and listings are always adjacent sections in Värderingsdata reports.
    /Till\s+salu|Aktiva\s+objekt|\f/
  )
  if (!section) return []

  const results: ComparableSale[] = []
  for (const line of section.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 20) continue
    const sale = parseComparableLine(trimmed)
    if (sale) results.push(sale)
  }
  return results.slice(0, 30)
}

// ─── Table extraction — listings for sale ────────────────────────────────────

function parseListingLine(line: string): ListingForSale | null {
  if (containsPII(line)) return null

  // PDF tables use 2+ spaces as column separators, so split there.
  // This preserves the full address "Skogsgapet 11" rather than splitting on
  // the house number "11" which would otherwise be confused with price digits.
  const cols = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
  if (cols.length < 2) return null

  const adress = cols[0]
  if (!adress || adress.length < 3) return null
  if (containsPII(adress)) return null

  // Parse each remaining column as a single number (handles spaces within "11 750 000")
  const nums = cols.slice(1).flatMap(col => {
    const n = parseSwedishInt(col.replace(/\s/g, ''))
    return n !== undefined && n > 0 ? [n] : []
  })
  if (nums.length < 1) return null

  const [utgangspris_kr, kr_per_kvm, boyta, antal_rum] = nums
  return { adress, utgangspris_kr, kr_per_kvm, boyta, antal_rum }
}

function extractListingsForSale(text: string): ListingForSale[] {
  const section = extractSection(
    text,
    /Till\s+salu\s+i\s+omr[åa]det|Aktiva\s+objekt/i,
    // Page break or separator are primary; "Copyright Värderingsdata" is the
    // footer line in Värderingsdata reports and terminates the listings section.
    /\f|---|Copyright\s+V[äa]rderingsdata/i
  )
  if (!section) return []

  const results: ListingForSale[] = []
  for (const line of section.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 10) continue
    const listing = parseListingLine(trimmed)
    if (listing) results.push(listing)
  }
  return results.slice(0, 30)
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

export function scoreConfidence(data: MarketIntelligence): ExtractionConfidence {
  const hasCore = data.bedomt_marknadsvarde !== undefined
  const richCount = [
    data.bedomt_marknadsvarde_kr_per_kvm,
    data.statistisk_tillforlitlighet,
    data.snitt_annonseringstid_dagar,
    data.prisutveckling_24m ?? data.prisutveckling_12m,
  ].filter(v => v !== undefined && v !== null).length
  const hasComparables = data.jamforbara_forsaljningar.length >= 3
  const hasListings = data.till_salu_i_omradet.length >= 1

  if (hasCore && richCount >= 2 && hasComparables && hasListings) return 'high'
  if (hasCore && (hasComparables || hasListings)) return 'medium'
  return 'low'
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function extractIntagsrapport(
  pdfBuffer: Buffer
): Promise<{ data: MarketIntelligence; confidence: ExtractionConfidence } | null> {
  let text: string
  try {
    const pdfParse = await getPdfParser()
    const parsed = await pdfParse(pdfBuffer)
    text = parsed.text
  } catch (err) {
    console.error('[intagsrapport] pdf-parse failed:', err instanceof Error ? err.message : err)
    return null
  }

  // DEBUG: raw text dump (remove after diagnosis)
  console.info('[intagsrapport] raw text length:', text.length)
  console.info('[intagsrapport] first 2000 chars:', text.slice(0, 2000))

  // Verify copyright marker
  if (!/V[äa]rderingsdata/i.test(text)) {
    console.info('[intagsrapport] missing Värderingsdata marker — not an Intagsrapport')
    return null
  }

  // DEBUG: section boundary probes
  const comparablesStart = text.search(/S[åa]lts?\s+i\s+omr[åa]det|J[äa]mf[öo]rbara\s+f[öo]rs[äa]ljningar/i)
  const listingsStart    = text.search(/Till\s+salu\s+i\s+omr[åa]det|Aktiva\s+objekt/i)
  const tillforlitlighetMatch = text.match(/har\s+(god|normal|l[åa]g)\s+tillf[öo]rlitlighet/i)
  console.info('[intagsrapport] section probes:', {
    comparablesStart,
    listingsStart,
    tillforlitlighetRawMatch: tillforlitlighetMatch ? tillforlitlighetMatch[0] : null,
    tillforlitlighetValue:    tillforlitlighetMatch ? tillforlitlighetMatch[1] : null,
  })

  const { varde, krPerKvm } = extractMarknadsvarde(text)
  const tillforlitlighet = extractTillforlitlighet(text)
  const { p3m, p6m, p12m, p24m } = extractPrisutveckling(text)
  const annonseringstid = extractAnnonseringstid(text)
  const comparables = extractComparableSales(text)
  const listings = extractListingsForSale(text)

  // DEBUG: extracted section slices (first 500 chars each)
  const comparablesSection = extractSection(text, /S[åa]lts?\s+i\s+omr[åa]det|J[äa]mf[öo]rbara\s+f[öo]rs[äa]ljningar/i, /Till\s+salu|Aktiva\s+objekt|\f/)
  const listingsSection    = extractSection(text, /Till\s+salu\s+i\s+omr[åa]det|Aktiva\s+objekt/i, /\f|---|Copyright\s+V[äa]rderingsdata/i)
  console.info('[intagsrapport] comparables section (first 500):', comparablesSection.slice(0, 500))
  console.info('[intagsrapport] listings section (first 500):', listingsSection.slice(0, 500))

  const data: MarketIntelligence = {
    bedomt_marknadsvarde: varde,
    bedomt_marknadsvarde_kr_per_kvm: krPerKvm,
    statistisk_tillforlitlighet: tillforlitlighet,
    prisutveckling_3m: p3m,
    prisutveckling_6m: p6m,
    prisutveckling_12m: p12m,
    prisutveckling_24m: p24m,
    snitt_annonseringstid_dagar: annonseringstid,
    jamforbara_forsaljningar: comparables,
    till_salu_i_omradet: listings,
  }

  console.info('[intagsrapport] extracted:', {
    bedomt_marknadsvarde: data.bedomt_marknadsvarde,
    kr_per_kvm: data.bedomt_marknadsvarde_kr_per_kvm,
    tillforlitlighet: data.statistisk_tillforlitlighet,
    annonseringstid: data.snitt_annonseringstid_dagar,
    comparables_count: comparables.length,
    listings_count: listings.length,
  })

  return { data, confidence: scoreConfidence(data) }
}
