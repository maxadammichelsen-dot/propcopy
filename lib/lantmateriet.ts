import type { LantmaterietData } from '@/types'

const BASE     = 'https://api.lantmateriet.se/distribution/produkter'
const TOKEN_URL = 'https://apimanager.lantmateriet.se/token'

// Process-level token cache — reused across requests in same Node instance
let tokenCache: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string | null> {
  const clientId     = process.env.LANTMATERIET_CLIENT_ID
  const clientSecret = process.env.LANTMATERIET_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('[lantmateriet] Token request failed:', res.status, await res.text())
      return null
    }
    const json = await res.json()
    tokenCache = {
      value: json.access_token as string,
      expiresAt: Date.now() + ((json.expires_in as number) ?? 3600) * 1000,
    }
    console.log('[lantmateriet] Token acquired, expires in', json.expires_in, 's')
    return tokenCache.value
  } catch (err) {
    console.error('[lantmateriet] Token error:', err)
    return null
  }
}

async function lmGet(path: string, token: string): Promise<any | null> {
  const url = `${BASE}${path}`
  console.log('[lantmateriet] GET', url)
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error('[lantmateriet] HTTP', res.status, 'for', url)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error('[lantmateriet] Request error for', url, '—', err)
    return null
  }
}

// "Storgatan 12, 3 tr, Linnéstaden, Göteborg" → { street: "Storgatan 12", city: "Göteborg" }
function parseAddress(address: string): { street: string; city: string } {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  const street = parts[0] ?? address
  // Last part that looks like a city (no digits, length > 2)
  const city = [...parts].reverse().find(p => !/^\d/.test(p) && p.length > 2) ?? ''
  return { street, city }
}

export async function fetchLantmaterietData(address: string): Promise<LantmaterietData | null> {
  const clientId     = process.env.LANTMATERIET_CLIENT_ID
  const clientSecret = process.env.LANTMATERIET_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.log('[lantmateriet] Credentials missing — skipping')
    return null
  }

  console.log('[lantmateriet] Enriching:', address)

  const token = await getAccessToken()
  if (!token) return null

  // ── Step 1: Geocode ────────────────────────────────────────────
  const { street, city } = parseAddress(address)
  const geocodeJson = await lmGet(
    `/adress/v4.1/referens?adressomrade=${encodeURIComponent(street)}&kommun=${encodeURIComponent(city)}`,
    token
  )
  if (!geocodeJson) {
    console.error('[lantmateriet] Geocode failed')
    return null
  }

  // Response is GeoJSON FeatureCollection; coordinates are [lng, lat]
  const firstFeature = geocodeJson?.features?.[0]
  const rawCoords: number[] | undefined =
    firstFeature?.geometry?.coordinates ??
    geocodeJson?.addresses?.[0]?.coordinates

  if (!rawCoords || rawCoords.length < 2) {
    console.error('[lantmateriet] No coordinates in geocode response')
    return null
  }

  // Lantmäteriet GeoJSON uses [lng, lat]
  const [lng, lat] = rawCoords
  console.log('[lantmateriet] Coordinates:', lat, lng)

  // ── Step 2: Fastighetsuppslag på koordinat ─────────────────────
  const propertyJson = await lmGet(
    `/fastighet/v4.1/referens/punkt?lat=${lat}&lng=${lng}`,
    token
  )

  const beteckning: string | undefined =
    propertyJson?.features?.[0]?.properties?.beteckning ??
    propertyJson?.fastigheter?.[0]?.beteckning

  console.log('[lantmateriet] Fastighetsbeteckning:', beteckning ?? '(not found)')

  // ── Step 3: Byggnadsregister ───────────────────────────────────
  let building_year: number | undefined
  let total_area_m2: number | undefined
  let num_floors: number | undefined
  let property_type: string | undefined

  if (beteckning) {
    const buildingJson = await lmGet(
      `/byggnad/v4.1/?fastighetsbeteckning=${encodeURIComponent(beteckning)}`,
      token
    )

    const b =
      buildingJson?.features?.[0]?.properties ??
      buildingJson?.byggnader?.[0]

    if (b) {
      building_year = b.byggnadsar ?? b.byggar ?? b.byggår
      total_area_m2 = b.byggnadsarea ?? b.totalArea ?? b.total_area_m2
      num_floors    = b.antalVaningar ?? b.antalVåningar ?? b.num_floors
      property_type = b.hustyp ?? b.byggnadstyp ?? b.property_type
      console.log('[lantmateriet] Building data:', { building_year, total_area_m2, num_floors, property_type })
    } else {
      console.log('[lantmateriet] No building data for', beteckning)
    }
  }

  return {
    fastighetsbeteckning: beteckning,
    coordinates: { lat, lng },
    building_year,
    total_area_m2,
    num_floors,
    property_type,
  }
}
