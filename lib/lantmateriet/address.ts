import { getLantmaterietToken } from './auth'
import type { AddressSuggestion, AddressDetails } from '@/types'

const BASE = 'https://api.lantmateriet.se/distribution/produkter/belagenhetsadress/v4.2'

export async function autocompleteAddress(query: string): Promise<AddressSuggestion[]> {
  console.log('[lantmateriet:address] autocomplete called with query:', query)

  if (query.trim().length < 2) return []

  const token = await getLantmaterietToken()
  console.log('[lantmateriet:address] token:', token ? 'OK' : 'MISSING')
  if (!token) return []

  try {
    // Lantmäteriet Belägenhetsadress v4.2 — free-text address reference search.
    // Path: /referens/fritext?adress={query}  (NOT /autocomplete?adress=).
    const url = `${BASE}/referens/fritext?adress=${encodeURIComponent(query)}`
    console.log('[lantmateriet:address] calling URL:', url)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    console.log('[lantmateriet:address] response status:', res.status)

    if (!res.ok) {
      console.error('[lantmateriet:address] error body:', await res.text())
      return []
    }
    const json = await res.json() as Record<string, unknown>
    console.log('[lantmateriet:address] raw response:', JSON.stringify(json).slice(0, 500))

    const items = ((json?.features ?? json?.adresser ?? (Array.isArray(json) ? json : [])) as unknown[])
    const suggestions = items.slice(0, 8).map((item) => {
      const it = item as Record<string, unknown>
      const props = (it?.properties ?? it) as Record<string, unknown>
      const coords = it?.geometry
        ? ((it.geometry as Record<string, unknown>)?.coordinates as number[] | undefined)
        : undefined
      return {
        text: props.adressomrade
          ? `${props.adressplats ?? ''} ${props.adressomrade ?? ''}`.trim()
          : String(props.text ?? props.adress ?? ''),
        reference_id: String(props.adressplatsId ?? props.objektidentitet ?? props.id ?? ''),
        coordinates: coords && coords.length >= 2
          ? { lat: coords[1], lng: coords[0] }
          : undefined,
      }
    }).filter(s => s.text && s.reference_id)

    console.log('[lantmateriet:address] mapped suggestions count:', suggestions.length)
    return suggestions
  } catch (err) {
    console.error('[lantmateriet:address] Autocomplete error:', err)
    return []
  }
}

export async function fetchAddressDetails(reference_id: string): Promise<AddressDetails | null> {
  const token = await getLantmaterietToken()
  if (!token) return null

  try {
    const url = `${BASE}/${encodeURIComponent(reference_id)}?includeData=basinformation`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error('[lantmateriet:address] Details HTTP', res.status)
      return null
    }
    const json = await res.json() as Record<string, unknown>
    const features = json?.features as unknown[] | undefined
    const feature = (features?.[0] ?? json) as Record<string, unknown>
    const props = (feature?.properties ?? json) as Record<string, unknown>
    const coords = feature?.geometry
      ? ((feature.geometry as Record<string, unknown>)?.coordinates as number[] | undefined)
      : undefined

    if (!coords || coords.length < 2) {
      console.error('[lantmateriet:address] No coordinates in details response')
      return null
    }

    return {
      adressomrade: String(props.adressomrade ?? ''),
      adressplats:  String(props.adressplats ?? ''),
      postnummer:   String(props.postnummer ?? ''),
      postort:      String(props.postort ?? ''),
      kommun:       String(props.kommunnamn ?? props.kommun ?? ''),
      coordinates:  { lat: coords[1], lng: coords[0] },
    }
  } catch (err) {
    console.error('[lantmateriet:address] Details error:', err)
    return null
  }
}
