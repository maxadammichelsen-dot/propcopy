import { VitecEstate } from '@/types'

const VITEC_BASE = 'https://connect.maklare.vitec.net'

// Vitec uses HTTP Basic Auth on every request
function vitecHeaders(username: string, password: string): HeadersInit {
  const cred = Buffer.from(`${username}:${password}`).toString('base64')
  return {
    Authorization: `Basic ${cred}`,
    Accept:         'application/json',
    'Content-Type': 'application/json',
  }
}

// Vitec estateBaseType → our property type label
function mapObjectType(baseType: string): string {
  const t = (baseType ?? '').toLowerCase()
  if (t.includes('house'))          return 'Villa'
  if (t.includes('cooperative'))    return 'Bostadsrätt'
  if (t.includes('condominium'))    return 'Ägarlägenhet'
  if (t.includes('cottage'))        return 'Fritidshus'
  if (t.includes('plot'))           return 'Tomt'
  if (t.includes('project'))        return 'Nyproduktion'
  return baseType ?? 'Övrigt'
}

// Vitec Get{Type} endpoint name from estateBaseType
function getEndpointForType(baseType: string): string {
  const t = (baseType ?? '').toLowerCase()
  if (t.includes('cooperative'))  return 'GetHousingCooperative'
  if (t.includes('condominium'))  return 'GetCondominium'
  if (t.includes('cottage'))      return 'GetCottage'
  if (t.includes('plot'))         return 'GetPlot'
  if (t.includes('project'))      return 'GetProject'
  return 'GetHouse'
}

// Map a list-level estate (from GetEstateList) to VitecEstate
// List items use 'streetAdress' (one d) and different nested structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListItem(raw: any): VitecEstate {
  return {
    vitecId:     String(raw.estateId ?? ''),
    baseType:    raw.estateBaseType ?? 'House',
    address:     raw.streetAdress  ?? raw.streetAddress ?? 'Okänd adress',
    area:        raw.primaryArea   ?? raw.city ?? '',
    type:        mapObjectType(raw.estateBaseType ?? ''),
    size:        0,
    rooms:       null,
    price:       Number(raw.salesPriceEstimate ?? 0),
    description: '',
    images:      [],
  }
}

// Map a full estate detail response to VitecEstate
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDetailEstate(raw: any, baseType: string): VitecEstate {
  const addr = raw.objectAddress ?? raw.Address ?? {}

  const streetParts = [
    addr.streetAddress ?? addr.StreetAddress ?? '',
  ].filter(Boolean)
  const address = streetParts.join(' ') || 'Okänd adress'

  const area  = addr.area ?? addr.AreaName ?? addr.municipality ?? addr.city ?? addr.City ?? ''
  const size  = Number(raw.baseInformation?.livingSpace ?? 0)
  const rooms = raw.interior?.numberOfRooms != null ? Number(raw.interior.numberOfRooms) : null
  const price = Number(raw.price?.startingPrice ?? 0)

  // Description: join all room text sections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomTexts: string[] = (raw.rooms ?? []).map((r: any) => [r.heading, r.text].filter(Boolean).join('\n')).filter(Boolean)
  const areaText  = raw.surrounding?.generalAboutArea ?? ''
  const description = [...roomTexts, areaText].filter(Boolean).join('\n\n')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images: string[] = (raw.images ?? []).map((img: any) => img.url ?? img.imageUrl).filter((u: unknown) => typeof u === 'string').slice(0, 10)

  return {
    vitecId:  String(raw.estateId ?? raw.id ?? ''),
    baseType,
    address,
    area:     area || (addr.city ?? addr.City ?? ''),
    type:     mapObjectType(baseType),
    size,
    rooms,
    price,
    description,
    images,
  }
}

export async function vitecGetEstates(
  username: string,
  password: string,
  customerId: string
): Promise<VitecEstate[]> {
  const headers = vitecHeaders(username, password)
  const url = `${VITEC_BASE}/Estate/GetEstateList`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerId,
      statuses: [{ id: '3', name: 'Till salu' }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Vitec ${res.status}: ${text}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()
  const list = Array.isArray(data) ? data : (data.estates ?? data.items ?? data.data ?? [])
  return list.map(mapListItem)
}

export async function vitecGetEstate(
  username: string,
  password: string,
  customerId: string,
  estateId: string,
  baseType = 'House'
): Promise<VitecEstate> {
  const headers = vitecHeaders(username, password)
  const endpoint = getEndpointForType(baseType)
  const url = `${VITEC_BASE}/Estate/${endpoint}?estateId=${encodeURIComponent(estateId)}&customerId=${encodeURIComponent(customerId)}`

  const res = await fetch(url, { headers })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Vitec ${res.status}: ${text}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await res.json()
  return mapDetailEstate(raw, baseType)
}

export async function vitecTestConnection(
  username: string,
  password: string
): Promise<boolean> {
  const headers = vitecHeaders(username, password)
  const res = await fetch(`${VITEC_BASE}/User/AuthenticateUser`, { headers })
  return res.ok
}
