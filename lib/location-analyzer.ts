import { anthropic, MODEL } from './anthropic'
import { LocationArgument, LocationCategory } from '@/types'

const CATEGORY_ICONS: Record<LocationCategory, string> = {
  transport: '🚇',
  nature: '🌊',
  education: '🏫',
  shopping: '🛍️',
  view: '🌅',
  recreation: '🌳',
  other: '📍',
}

export async function analyzeLocation(
  address: string,
  area: string
): Promise<LocationArgument[]> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 768,
    messages: [
      {
        role: 'user',
        content: `Du är en svensk fastighetsmäklare med djup lokal kännedom om ${area}, Sverige.

Skapa 6–8 konkreta säljargument för en bostad på adressen: ${address}, ${area}.

Fokusera på:
- Kollektivtrafik (spårvagn, buss, tunnelbana, tåg) med linjenummer om möjligt
- Naturläge (hav, sjö, park, grönområde) med konkreta namn
- Skolor och förskolor i närheten
- Service och handel i området
- Utsikt eller solläge
- Rekreation och friluftsliv

Var specifik – namnge platser, linjer, ungefärliga avstånd. Det är OK att vara ungefärlig.

Returnera ENBART en JSON-array – inga kommentarer:
[
  {
    "icon": "🚇",
    "text": "<konkret säljargument>",
    "category": "<transport|nature|education|shopping|view|recreation|other>",
    "source": "AI-baserat på lokal kännedom"
  }
]`,
      },
    ],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('Claude returnerade ingen giltig array')

  const parsed: Array<{ icon: string; text: string; category: string; source: string }> =
    JSON.parse(jsonMatch[0])

  return parsed.slice(0, 8).map((item, i) => ({
    id: `loc-${i}`,
    icon: CATEGORY_ICONS[item.category as LocationCategory] ?? item.icon ?? '📍',
    text: item.text,
    category: (item.category as LocationCategory) ?? 'other',
    source: item.source ?? 'AI-baserat',
  }))
}
