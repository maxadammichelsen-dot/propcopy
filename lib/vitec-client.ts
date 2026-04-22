import { VitecEstate } from '@/types'

const VITEC_BASE = 'https://connect.maklare.vitec.net'

export function vitecHeaders(apiKey: string) {
  return {
    'X-ApiKey': apiKey,
    'Accept':   'application/json',
  }
}

function mapObjectType(vitecType: string): string {
  const t = (vitecType ?? '').toLowerCase()
  if (t.includes('villa') || t.includes('hus'))   return 'Villa'
  if (t.includes('bostadsrätt') || t.includes('lägenhet')) return 'Bostadsrätt'
  if (t.includes('tomt'))   return 'Tomt'
  if (t.includes('gård'))   return 'Gård'
  if (t.includes('fritid')) return 'Fritidshus'
  return vitecType ?? 'Övrigt'
}

// Maps a Vitec estate object to our VitecEstate shape.
// Vitec Connect returns varying field names — handle common variants.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVitecEstate(raw: any): VitecEstate {
  const streetName   = raw.streetAddress?.streetName   ?? raw.address?.street    ?? ''
  const streetNumber = raw.streetAddress?.streetNumber ?? raw.address?.number    ?? ''
  const address = [streetName, streetNumber].filter(Boolean).join(' ')

  const city  = raw.streetAddress?.city   ?? raw.municipality ?? raw.city ?? ''
  const area  = raw.streetAddress?.county ?? raw.area         ?? city

  const livingArea = raw.livingArea ?? raw.area_m2 ?? raw.boarea ?? 0
  const rooms      = raw.numberOfRooms ?? raw.rooms ?? null
  const price      = raw.startingPrice ?? raw.price ?? raw.utgangspris ?? 0

  const desc = raw.description?.text
    ?? raw.marketingDescription
    ?? raw.descriptionText
    ?? ''

  const images: string[] = (raw.images ?? raw.photos ?? [])
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((img: any) => img.url ?? img.imageUrl ?? img)
    .filter((u: unknown) => typeof u === 'string')

  return {
    vitecId:     String(raw.id ?? raw.estateId ?? raw.objectId ?? ''),
    address:     address || 'Okänd adress',
    area:        area || city || 'Okänd ort',
    type:        mapObjectType(raw.objectType ?? raw.estateType ?? raw.type ?? ''),
    size:        Number(livingArea) || 0,
    rooms:       rooms != null ? Number(rooms) : null,
    price:       Number(price) || 0,
    description: desc,
    images,
  }
}

export async function vitecGetEstates(
  apiKey: string,
  customerId: string
): Promise<VitecEstate[]> {
  const url = `${VITEC_BASE}/v2/customer/${customerId}/estate`
  const res = await fetch(url, { headers: vitecHeaders(apiKey) })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Vitec ${res.status}: ${text}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
  const list = Array.isArray(data) ? data : (data.estates ?? data.items ?? data.data ?? [])
  return list.map(mapVitecEstate)
}

export async function vitecGetEstate(
  apiKey: string,
  customerId: string,
  estateId: string
): Promise<VitecEstate> {
  const url = `${VITEC_BASE}/v2/customer/${customerId}/estate/${estateId}`
  const res = await fetch(url, { headers: vitecHeaders(apiKey) })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Vitec ${res.status}: ${text}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json()
  return mapVitecEstate(raw)
}
