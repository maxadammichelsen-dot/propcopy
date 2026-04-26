import { createSupabaseAdminClient } from './supabase-admin'

interface BrainEntry {
  category: string
  key: string
  value: string
  confidence: number
}

function formatEntries(entries: BrainEntry[], minConfidence = 0): string {
  return entries
    .filter(e => e.confidence >= minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .map(e => `• ${e.value}`)
    .join('\n')
}

export async function buildBrainContext(agency_id: string): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('agency_brain')
    .select('category, key, value, confidence')
    .eq('agency_id', agency_id)
    .gte('confidence', 0.05)
    .order('confidence', { ascending: false })

  if (error || !data || data.length === 0) return ''

  const by = (cat: string) => data.filter(e => e.category === cat)

  const tone           = by('tone')
  const winningTexts   = by('winning_text')
  const winningPhrases = by('winning_phrases')
  const editPrefs      = by('edit_preference')
  const avoidPatterns  = by('avoid_pattern')
  const areaInsights   = by('area_insight')
  const buyerProfile   = by('buyer_profile')
  const feedback       = data.filter(e => e.category === 'feedback')
  const positive       = feedback.filter(e => e.confidence >= 0.6)
  const negative       = feedback.filter(e => e.confidence < 0.4)

  const allWinning = [...winningTexts, ...winningPhrases]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8)

  const allAvoid = [...avoidPatterns, ...negative]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 6)

  const sections: string[] = []

  if (tone.length > 0) {
    sections.push(`TONALITET:\n${formatEntries(tone)}`)
  }
  if (allWinning.length > 0) {
    sections.push(`VINNANDE FORMULERINGAR (godkänd av mäklaren):\n${formatEntries(allWinning)}`)
  }
  if (editPrefs.length > 0) {
    sections.push(`MÄKLARENS REDIGERINGSPREFERENSER:\n${formatEntries(editPrefs)}`)
  }
  if (areaInsights.length > 0) {
    sections.push(`OMRÅDE-INSIKTER:\n${formatEntries(areaInsights)}`)
  }
  if (buyerProfile.length > 0) {
    sections.push(`KÖPARPROFIL:\n${formatEntries(buyerProfile)}`)
  }
  if (positive.length > 0) {
    sections.push(`ANVÄND ALLTID:\n${formatEntries(positive)}`)
  }
  if (allAvoid.length > 0) {
    sections.push(`UNDVIK ALLTID:\n${formatEntries(allAvoid)}`)
  }

  if (sections.length === 0) return ''

  return `\nBYRÅKONTEXT:\n${sections.join('\n\n')}\n\nAnvänd denna kontext för att anpassa texten specifikt till denna byrå. Generiska svar är inte acceptabla.`
}

export async function getBrainStats(agency_id: string): Promise<{
  total: number
  byCategory: Record<string, number>
  topSignals: BrainEntry[]
}> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('agency_brain')
    .select('category, key, value, confidence')
    .eq('agency_id', agency_id)
    .order('confidence', { ascending: false })

  if (!data) return { total: 0, byCategory: {}, topSignals: [] }

  const byCategory: Record<string, number> = {}
  for (const e of data) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1
  }

  return {
    total: data.length,
    byCategory,
    topSignals: data.filter(e => e.category === 'tone').slice(0, 5),
  }
}

export async function buildStyleContext(agency_id: string): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('agency_brain')
    .select('value')
    .eq('agency_id', agency_id)
    .eq('category', 'style_dna')
    .eq('key', 'analysis')
    .single()

  console.log('[style_dna] loaded:', data?.value ? 'YES' : 'NO', data?.value?.substring(0, 100))

  if (!data?.value) return ''

  try {
    const dna = JSON.parse(data.value) as {
      sentence_length?: string
      opening_patterns?: string[]
      preferred_words?: string[]
      avoided_words?: string[]
      example_sentences?: string[]
      tone_markers?: string[]
    }

    const parts: string[] = ['BYRÅNS SKRIVSTIL:']
    if (dna.sentence_length)
      parts.push(`Meningslängd: ${dna.sentence_length}`)
    if (dna.opening_patterns?.length)
      parts.push(`Öppningsmönster: ${dna.opening_patterns.slice(0, 2).join(' | ')}`)
    if (dna.preferred_words?.length)
      parts.push(`Typiska fraser: ${dna.preferred_words.slice(0, 8).join(', ')}`)
    if (dna.avoided_words?.length)
      parts.push(`Undvik alltid: ${dna.avoided_words.slice(0, 5).join(', ')}`)
    if (dna.example_sentences?.length)
      parts.push(`Skriv som detta exempel: "${dna.example_sentences[0]}"`)

    if (parts.length <= 1) return ''
    return '\n' + parts.join('\n')
  } catch {
    return ''
  }
}
