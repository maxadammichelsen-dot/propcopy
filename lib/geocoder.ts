import type { SupabaseClient } from '@supabase/supabase-js'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE_TTL_DAYS = 90

interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

interface NominatimHit {
  lat: string
  lon: string
  display_name: string
}

export async function geocodeAddress(
  address: string,
  city?: string
): Promise<GeocodeResult | null> {
  const q = city ? `${address}, ${city}, Sverige` : `${address}, Sverige`
  console.log('[geocoder] query:', q)

  const url =
    `${NOMINATIM_URL}?q=${encodeURIComponent(q)}` +
    `&format=json&limit=1&countrycodes=se&addressdetails=1`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': process.env.OSM_USER_AGENT ?? 'Estatio/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.error('[geocoder] HTTP error:', res.status)
      return null
    }

    const hits = (await res.json()) as NominatimHit[]
    if (!hits || hits.length === 0) {
      console.log('[geocoder] result: no match for', q)
      return null
    }

    const hit = hits[0]
    const lat = parseFloat(hit.lat)
    const lng = parseFloat(hit.lon)
    console.log('[geocoder] result:', lat, lng)
    return { lat, lng, displayName: hit.display_name }
  } catch (err) {
    console.error('[geocoder] error:', err)
    return null
  }
}

export async function geocodeAndPersist(
  supabase: SupabaseClient,
  objectId: string,
  address: string,
  city?: string
): Promise<GeocodeResult | null> {
  const queriedAddress = city ? `${address}, ${city}, Sverige` : `${address}, Sverige`
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Cross-object dedup: any cached geocode for the same query string within TTL
  const { data: cached } = await supabase
    .from('object_enrichment')
    .select('data')
    .eq('source', 'nominatim')
    .gte('fetched_at', cutoff)
    .filter('data->>queriedAddress', 'eq', queriedAddress)
    .limit(1)
    .maybeSingle()

  if (cached?.data) {
    const d = cached.data as { lat?: number; lng?: number; displayName?: string }
    if (typeof d.lat === 'number' && typeof d.lng === 'number') {
      console.log('[geocoder] cache hit for:', queriedAddress)
      // Ensure this object also has the row
      await supabase.from('object_enrichment').upsert(
        { object_id: objectId, source: 'nominatim', data: { ...d, queriedAddress }, fetched_at: new Date().toISOString() },
        { onConflict: 'object_id,source' }
      )
      return { lat: d.lat, lng: d.lng, displayName: d.displayName ?? '' }
    }
  }

  const result = await geocodeAddress(address, city)
  if (!result) return null

  const payload = { lat: result.lat, lng: result.lng, displayName: result.displayName, queriedAddress }
  await supabase.from('object_enrichment').upsert(
    { object_id: objectId, source: 'nominatim', data: payload, fetched_at: new Date().toISOString() },
    { onConflict: 'object_id,source' }
  )

  return result
}
