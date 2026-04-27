import type { OSMData, OSMPlace } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { geocodeAndPersist } from './geocoder'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const OVERPASS_TIMEOUT_S = 25
const HTTP_TIMEOUT_MS = 30_000
const CACHE_TTL_DAYS = 30
const CACHE_BBOX_DEG = 0.0005 // ≈ 50m

const EMPTY_OSM: OSMData = {
  groceries: [], schools: [], parks: [], restaurants: [],
  coast: [], healthcare: [], culture: [], transport: [], service: [],
}

type Category = keyof OSMData

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements?: OverpassElement[]
}

interface CachedEnvelope {
  osm: OSMData
  meta: { lat: number; lng: number; fetchedAt: string }
}

function userAgent(): string {
  return process.env.OSM_USER_AGENT ?? 'Estatio/1.0 (contact@estatio.se)'
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function categorize(tags: Record<string, string>): Category | null {
  const a = tags.amenity
  const s = tags.shop
  const l = tags.leisure
  const n = tags.natural
  const t = tags.tourism
  const h = tags.highway
  const r = tags.railway
  const p = tags.public_transport

  if (a === 'school' || a === 'kindergarten' || a === 'college') return 'schools'
  if (s === 'supermarket' || s === 'convenience' || s === 'greengrocer' || s === 'bakery') return 'groceries'
  if (a === 'restaurant' || a === 'cafe' || a === 'bar' || a === 'pub') return 'restaurants'
  if (a === 'pharmacy' || a === 'hospital' || a === 'clinic' || a === 'doctors' || a === 'dentist') return 'healthcare'
  if (n === 'beach') return 'coast'
  if (l === 'park' || l === 'playground' || l === 'sports_centre' || l === 'fitness_centre' || l === 'swimming_pool') return 'parks'
  if (a === 'library' || a === 'cinema' || a === 'theatre' || t === 'museum') return 'culture'
  if (
    h === 'bus_stop' ||
    r === 'tram_stop' || r === 'station' || r === 'halt' || r === 'subway_entrance' ||
    p === 'stop_position' ||
    a === 'ferry_terminal'
  ) return 'transport'
  if (a === 'bank' || a === 'post_office' || a === 'atm') return 'service'
  return null
}

function classifyTransport(
  tags: Record<string, string>
): { vehicle_type: NonNullable<OSMPlace['vehicle_type']>; display_label: string } | null {
  const a = tags.amenity
  const r = tags.railway
  const h = tags.highway
  const p = tags.public_transport

  // Specific railway types first
  if (r === 'tram_stop') return { vehicle_type: 'spårvagn', display_label: 'spårvagnshållplats' }
  if (r === 'subway_entrance') return { vehicle_type: 'tunnelbana', display_label: 'tunnelbana' }
  if (r === 'station' || r === 'halt') return { vehicle_type: 'tåg', display_label: 'tågstation' }

  // public_transport=stop_position has mode-specific sub-tags
  if (p === 'stop_position') {
    if (tags.subway === 'yes') return { vehicle_type: 'tunnelbana', display_label: 'tunnelbana' }
    if (tags.tram === 'yes') return { vehicle_type: 'spårvagn', display_label: 'spårvagnshållplats' }
    if (tags.train === 'yes') return { vehicle_type: 'tåg', display_label: 'tågstation' }
    if (tags.ferry === 'yes') return { vehicle_type: 'färja', display_label: 'färjeläge' }
    if (tags.bus === 'yes' || tags.trolleybus === 'yes') return { vehicle_type: 'buss', display_label: 'busshållplats' }
    return { vehicle_type: 'buss', display_label: 'busshållplats' }
  }

  if (h === 'bus_stop') return { vehicle_type: 'buss', display_label: 'busshållplats' }
  if (a === 'ferry_terminal') return { vehicle_type: 'färja', display_label: 'färjeläge' }

  return null
}

function placeTypeLabel(tags: Record<string, string>): string {
  return (
    tags.amenity ?? tags.shop ?? tags.leisure ?? tags.natural ??
    tags.tourism ?? tags.railway ?? tags.public_transport ?? tags.highway ?? 'unknown'
  )
}

function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  const around = `(around:${radiusMeters},${lat},${lng})`
  // Single combined query — Overpass returns one element list we sort by category.
  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  nwr["amenity"~"^(school|kindergarten|college|restaurant|cafe|bar|pub|pharmacy|hospital|clinic|doctors|dentist|library|cinema|theatre|bank|post_office|atm|ferry_terminal)$"]${around};
  nwr["shop"~"^(supermarket|convenience|greengrocer|bakery)$"]${around};
  nwr["leisure"~"^(park|playground|sports_centre|fitness_centre|swimming_pool)$"]${around};
  nwr["natural"="beach"]${around};
  nwr["tourism"="museum"]${around};
  nwr["highway"="bus_stop"]${around};
  nwr["railway"~"^(tram_stop|station|halt|subway_entrance)$"]${around};
  nwr["public_transport"="stop_position"]${around};
);
out center tags;`
}

async function postOverpass(query: string): Promise<OverpassResponse | null> {
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent(),
        Accept: 'application/json',
      },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })
    console.log('[osm] Overpass response status:', res.status)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[osm] Overpass error body:', body.slice(0, 300))
      return null
    }
    return (await res.json()) as OverpassResponse
  } catch (err) {
    console.error('[osm] Overpass request error:', err)
    return null
  }
}

async function postOverpassWithRetry(query: string): Promise<OverpassResponse | null> {
  const first = await postOverpass(query)
  if (first) return first
  console.log('[osm] retrying after 2s')
  await new Promise((r) => setTimeout(r, 2000))
  return postOverpass(query)
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<OSMData> {
  console.log('[osm] fetchNearbyPlaces', { lat, lng, radiusMeters })

  const query = buildOverpassQuery(lat, lng, radiusMeters)
  const json = await postOverpassWithRetry(query)
  if (!json?.elements) {
    console.error('[osm] empty or failed response, returning empty OSMData')
    return { ...EMPTY_OSM }
  }

  const buckets: Record<Category, OSMPlace[]> = {
    groceries: [], schools: [], parks: [], restaurants: [],
    coast: [], healthcare: [], culture: [], transport: [], service: [],
  }

  for (const el of json.elements) {
    const tags = el.tags ?? {}
    const name = tags.name
    if (!name) continue
    const cat = categorize(tags)
    if (!cat) continue

    const elLat = el.lat ?? el.center?.lat
    const elLng = el.lon ?? el.center?.lon
    if (typeof elLat !== 'number' || typeof elLng !== 'number') continue

    const distance = Math.round(haversineMeters(lat, lng, elLat, elLng))
    const place: OSMPlace = { name, distance, type: placeTypeLabel(tags) }
    if (cat === 'transport') {
      const tr = classifyTransport(tags)
      if (tr) {
        place.vehicle_type  = tr.vehicle_type
        place.display_label = tr.display_label
      }
    }
    buckets[cat].push(place)
  }

  for (const cat of Object.keys(buckets) as Category[]) {
    buckets[cat].sort((a, b) => a.distance - b.distance)
    // dedupe by name (keep nearest)
    const seen = new Set<string>()
    buckets[cat] = buckets[cat].filter((p) => {
      const key = p.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 5)
  }

  console.log('[osm] mapped counts:', Object.fromEntries(
    (Object.keys(buckets) as Category[]).map((k) => [k, buckets[k].length])
  ))

  return buckets as OSMData
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10}m`
  return `${(m / 1000).toFixed(1).replace('.', ',')}km`
}

const CATEGORY_LABELS: Record<Category, string> = {
  schools:     'Skolor',
  groceries:   'Livsmedel',
  restaurants: 'Restauranger',
  parks:       'Rekreation',
  healthcare:  'Hälsa',
  coast:       'Hav och strand',
  culture:     'Kultur',
  transport:   'Transport',
  service:     'Service',
}

export function buildOSMContextString(osm: OSMData, agencyArea?: string): string {
  const order: Category[] = [
    'schools', 'groceries', 'restaurants', 'parks',
    'healthcare', 'transport', 'culture', 'service', 'coast',
  ]

  const lines: string[] = []
  for (const cat of order) {
    const items = osm[cat] ?? []
    if (items.length === 0) continue
    const formatted = items
      .slice(0, 4)
      .map((p) => {
        if (cat === 'transport') {
          // Minimalistisk format ("hållplats"/"station"/"brygga" + promenadtid) eftersom OSM-data
          // inte tillförlitligt anger trafikslag — railway=tram_stop kan vara felklassad busshållplats.
          // När Trafiklab GTFS är integrerat utökas formatet med linjenamn och konkret trafikslag,
          // t.ex. "Hovås Nedre hållplats — expressbuss 760 mot Centralen (4 min promenad)".
          const suffix = p.vehicle_type === 'tåg' ? 'station' : p.vehicle_type === 'färja' ? 'brygga' : 'hållplats'
          const lower = p.name.toLowerCase()
          const hasKeyword = lower.includes('station') || lower.includes('hållplats') || lower.includes('brygga')
          const label = hasKeyword ? p.name : `${p.name} ${suffix}`
          const mins = Math.round(p.distance / 80)
          return `${label} (${mins} min promenad)`
        }
        return `${p.name} (${formatDistance(p.distance)})`
      })
      .join(', ')
    lines.push(`${CATEGORY_LABELS[cat]}: ${formatted}`)
  }

  if (lines.length === 0) return ''

  const header = agencyArea
    ? `NÄRSERVICE I ${agencyArea.toUpperCase()} (från kartdata):`
    : 'NÄRSERVICE (från kartdata):'

  return `${header}\n${lines.join('\n')}`
}

interface CacheLookup {
  envelope: CachedEnvelope
  rowId: string | null
}

async function findCachedNearby(
  supabase: SupabaseClient,
  lat: number,
  lng: number
): Promise<CacheLookup | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('object_enrichment')
    .select('id, data, fetched_at')
    .eq('source', 'openstreetmap')
    .gte('fetched_at', cutoff)
    .limit(200)

  if (error || !data) return null

  for (const row of data) {
    const env = row.data as CachedEnvelope | null
    const c = env?.meta
    if (!c) continue
    if (
      Math.abs(c.lat - lat) <= CACHE_BBOX_DEG &&
      Math.abs(c.lng - lng) <= CACHE_BBOX_DEG
    ) {
      return { envelope: env!, rowId: row.id as string }
    }
  }
  return null
}

async function persistEnrichment(
  supabase: SupabaseClient,
  objectId: string,
  envelope: CachedEnvelope
): Promise<void> {
  const { error } = await supabase
    .from('object_enrichment')
    .upsert(
      {
        object_id: objectId,
        source: 'openstreetmap',
        data: envelope,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'object_id,source' }
    )
  if (error) console.error('[osm] persist error:', error.message)
}

export async function getOrFetchOSM(
  supabase: SupabaseClient,
  objectId: string,
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<{ osm: OSMData; cached: boolean }> {
  // 1. Check cache (any object) within bbox + TTL
  const hit = await findCachedNearby(supabase, lat, lng)
  if (hit) {
    console.log('[osm] cache hit')
    // Also persist for THIS object so later calls are direct
    await persistEnrichment(supabase, objectId, hit.envelope)
    return { osm: hit.envelope.osm, cached: true }
  }

  // 2. Fresh fetch
  const osm = await fetchNearbyPlaces(lat, lng, radiusMeters)
  const envelope: CachedEnvelope = {
    osm,
    meta: { lat, lng, fetchedAt: new Date().toISOString() },
  }
  await persistEnrichment(supabase, objectId, envelope)
  return { osm, cached: false }
}

export async function getObjectCoordinates(
  supabase: SupabaseClient,
  objectId: string
): Promise<{ lat: number; lng: number } | null> {
  // 1. Lantmäteriet — fastighetens exakta koordinat (primär)
  const { data: lm } = await supabase
    .from('object_enrichment')
    .select('data')
    .eq('object_id', objectId)
    .eq('source', 'lantmateriet')
    .maybeSingle()

  const lmCoords = (lm?.data as { coordinates?: { lat: number; lng: number } } | null)?.coordinates
  if (lmCoords && typeof lmCoords.lat === 'number' && typeof lmCoords.lng === 'number') {
    console.log('[osm:coords] source: lantmateriet')
    return lmCoords
  }

  // 2. Nominatim cache för detta objekt (sekundär)
  const { data: nom } = await supabase
    .from('object_enrichment')
    .select('data')
    .eq('object_id', objectId)
    .eq('source', 'nominatim')
    .maybeSingle()

  const nomData = nom?.data as { lat?: number; lng?: number } | null
  if (nomData && typeof nomData.lat === 'number' && typeof nomData.lng === 'number') {
    console.log('[osm:coords] source: nominatim')
    return { lat: nomData.lat, lng: nomData.lng }
  }

  // 3. Live geocoding via Nominatim — hämta adress från objects-tabellen
  const { data: obj } = await supabase
    .from('objects')
    .select('address, area')
    .eq('id', objectId)
    .maybeSingle()

  if (!obj) {
    console.log('[osm:coords] source: failed — object not found')
    return null
  }

  const geocoded = await geocodeAndPersist(supabase, objectId, obj.address, obj.area ?? undefined)
  if (geocoded) {
    console.log('[osm:coords] source: nominatim (fresh geocode)')
    return { lat: geocoded.lat, lng: geocoded.lng }
  }

  console.log('[osm:coords] source: failed')
  return null
}

export function filterOSMByEnabled(osm: OSMData, enabled?: string[] | null): OSMData {
  if (!enabled || enabled.length === 0) return osm
  const allow = new Set(enabled)
  const out: OSMData = { ...EMPTY_OSM }
  for (const cat of Object.keys(osm) as Category[]) {
    out[cat] = osm[cat].filter((p) => allow.has(`osm:${cat}:${p.name}`))
  }
  return out
}

export function osmFactId(category: keyof OSMData, name: string): string {
  return `osm:${category}:${name}`
}
