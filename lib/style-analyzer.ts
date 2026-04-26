import { anthropic, MODEL } from './anthropic'
import { createSupabaseAdminClient } from './supabase-admin'

interface StyleDNA {
  sentence_length: 'kort' | 'medel' | 'lång'
  paragraph_structure: string
  preferred_words: string[]
  avoided_words: string[]
  price_handling: string
  location_handling: string
  opening_patterns: string[]
  closing_patterns: string[]
  tone_markers: string[]
  example_sentences: string[]
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Estatio/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return ''
    return res.text()
  } catch {
    return ''
  }
}

function extractListingLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl)
  const seen = new Set<string>()
  const links: string[] = []
  const regex = /href=["']([^"'#?]+)["']/gi
  let m: RegExpExecArray | null
  while ((m = regex.exec(html)) !== null) {
    const href = m[1]
    if (
      /\/(objekt|bostad|bostader|fastighet|till-salu|forsaljning|villaer|lagenhet|villa|property|estate|listing|hem)\//i.test(href) ||
      /\/\d{4,}[/-]/i.test(href)
    ) {
      try {
        const abs = new URL(href, base).toString()
        if (abs.startsWith(base.origin) && !seen.has(abs)) {
          seen.add(abs)
          links.push(abs)
        }
      } catch { /* skip malformed */ }
    }
  }
  return links.slice(0, 60)
}

function extractParagraphs(html: string): string[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 80 && /[a-zåäöA-ZÅÄÖ]{4,}/.test(s))
    .slice(0, 6)
}

export async function analyzeStyleDNA(
  url: string,
  agency_id: string
): Promise<StyleDNA | null> {
  console.log('[style-analyzer] Starting analysis')
  console.log('[style-analyzer] URL:', url)
  console.log('[style-analyzer] agency_id:', agency_id)

  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`

    // 1. Fetch homepage and find listing links
    const homeHtml = await fetchPage(normalized)
    if (!homeHtml) {
      console.log('[style-analyzer] Failed to fetch homepage')
      return null
    }

    const links = extractListingLinks(homeHtml, normalized)
    console.log('[style-analyzer] Found listing links:', links.length)

    // 2. Fetch up to 30 listing pages in parallel batches to collect 20-50 texts
    const batchSize = 5
    const paragraphs: string[] = []

    for (let i = 0; i < Math.min(links.length, 30) && paragraphs.length < 60; i += batchSize) {
      const batch = links.slice(i, i + batchSize)
      const pages = await Promise.all(batch.map(fetchPage))
      for (const html of pages) {
        if (html) paragraphs.push(...extractParagraphs(html))
      }
    }

    console.log('[style-analyzer] Paragraphs collected:', paragraphs.length)

    if (paragraphs.length < 3) {
      console.log('[style-analyzer] Too few paragraphs, aborting')
      return null
    }

    const sample = paragraphs
      .slice(0, 50)
      .map((p, i) => `[${i + 1}] ${p}`)
      .join('\n\n')

    // 3. Send to Claude for deep style analysis
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analysera dessa fastighetstexter från en svensk mäklarbyrå och identifiera byråns unika skrivstil.

Texter:
${sample}

Returnera ENBART giltig JSON utan markdown:
{
  "sentence_length": "kort" | "medel" | "lång",
  "paragraph_structure": "kort beskrivning av hur stycken byggs upp",
  "preferred_words": ["ord1", "ord2", "ord3", "ord4", "ord5"],
  "avoided_words": ["ord1", "ord2", "ord3"],
  "price_handling": "hur priset och ekonomin beskrivs",
  "location_handling": "hur läge och område beskrivs",
  "opening_patterns": ["typisk öppningsmening 1", "typisk öppningsmening 2"],
  "closing_patterns": ["typisk avslutning 1"],
  "tone_markers": ["markör1", "markör2", "markör3"],
  "example_sentences": ["bästa exempelmening 1", "bästa exempelmening 2"]
}`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    console.log('[style-analyzer] Raw response length:', raw.length)
    console.log('[style-analyzer] First 200 chars:', raw.substring(0, 200))

    const match = raw.match(/\{[\s\S]*\}/)
    console.log('[style-analyzer] JSON match found:', match ? 'YES' : 'NO')

    if (!match) {
      console.error('[style-analyzer] No JSON found in response')
      return null
    }

    const styleDNA = JSON.parse(match[0]) as StyleDNA
    console.log('[style-analyzer] Parsed keys:', Object.keys(styleDNA).length)

    // 4. Save to agency_brain — delete existing then insert fresh
    const admin = createSupabaseAdminClient()
    console.log('[style-analyzer] About to save to agency_brain')

    const { error: deleteError } = await admin
      .from('agency_brain')
      .delete()
      .eq('agency_id', agency_id)
      .eq('category', 'style_dna')

    if (deleteError) {
      console.error('[style-analyzer] Delete failed:', deleteError.message)
    }

    const { error: insertError } = await admin
      .from('agency_brain')
      .insert({
        agency_id,
        category:   'style_dna',
        key:        'voice_profile',
        value:      JSON.stringify(styleDNA),
        confidence: 0.9,
        source:     'scraped',
      })

    if (insertError) {
      console.error('[style-analyzer] Insert FAILED:', insertError.message, insertError.code)
    } else {
      console.log('[style-analyzer] Insert SUCCESS — style_dna saved for', agency_id)
    }

    return styleDNA
  } catch (err) {
    console.error('[style-analyzer] Caught error:', err)
    return null
  }
}
