import { anthropic, MODEL } from './anthropic'
import { supabase } from './supabase'
import { ToneProfile } from '@/types'

export async function fetchAgencyTone(url: string, userId: string): Promise<ToneProfile> {
  const html = await fetchHtml(url)
  const toneProfile = await extractToneWithClaude(html, url)
  await upsertAgency(url, userId, toneProfile)
  return toneProfile
}

async function fetchHtml(url: string): Promise<string> {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const res = await fetch(normalized, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PropCopy/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Kunde inte hämta ${url}: ${res.status}`)
  const html = await res.text()
  // Strip scripts/styles and truncate to keep prompt lean
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000)
}

async function extractToneWithClaude(text: string, url: string): Promise<ToneProfile> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Du är en varumärkes- och copywriting-expert. Analysera texten nedan från mäklarbyråns hemsida (${url}).

Returnera ENBART ett JSON-objekt med exakt detta format – inga kommentarer, inget annat:
{
  "agency_name": "<byråns officiella namn>",
  "tags": ["<ton1>", "<ton2>", "<ton3>", "<ton4>", "<ton5>", "<ton6>"]
}

Tonalitetsord ska vara svenska adjektiv som beskriver kommunikationsstilen (t.ex. "exklusiv", "personlig", "diskret", "professionell", "varm", "sofistikerad").

Hemsidetext:
${text}`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returnerade inget giltigt JSON')

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.agency_name || !Array.isArray(parsed.tags)) {
    throw new Error('Oväntat JSON-format från Claude')
  }

  return {
    agency_name: parsed.agency_name,
    tags: parsed.tags.slice(0, 6),
  }
}

async function upsertAgency(url: string, userId: string, toneProfile: ToneProfile) {
  const { error } = await supabase
    .from('agencies')
    .upsert(
      {
        user_id: userId,
        name: toneProfile.agency_name,
        url,
        tone_profile: toneProfile,
      },
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(`Supabase-fel: ${error.message}`)
}
