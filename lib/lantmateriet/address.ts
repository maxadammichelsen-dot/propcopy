import { getLantmaterietToken } from './auth'
import type { AddressSuggestion, AddressDetails } from '@/types'

const BASE = 'https://api.lantmateriet.se/distribution/produkter/belagenhetsadress/v4.2'

export async function autocompleteAddress(query: string): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return []

  const token = await getLantmaterietToken()
  if (!token) return []

  try {
    const url = `${BASE}/autocomplete?adress=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error('[lantmateriet:address] Autocomplete HTTP', res.status)
      return []
    }
    const json = await res.json()
    const items: any[] = json?.features ?? json?.adresser ?? []
    return items.slice(0, 8).map((item: any) => {
      const props = item?.properties ?? item
      const coords: number[] | undefined = item?.geometry?.coordinates
      return {
        text: props.adressomrade
          ? `${props.adressplats ?? ''} ${props.adressomrade ?? ''}`.trim()
          : props.text ?? props.adress ?? '',
        reference_id: props.adressplatsId ?? props.id ?? '',
        coordinates: coords && coords.length >= 2
          ? { lat: coords[1], lng: coords[0] }
          : undefined,
      }
    }).filter(s => s.text && s.reference_id)
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
    const json = await res.json()
    const feature = json?.features?.[0] ?? json
    const props = feature?.properties ?? json
    const coords: number[] | undefined = feature?.geometry?.coordinates

    if (!coords || coords.length < 2) {
      console.error('[lantmateriet:address] No coordinates in details response')
      return null
    }

    return {
      adressomrade: props.adressomrade ?? '',
      adressplats:  props.adressplats ?? '',
      postnummer:   props.postnummer ?? '',
      postort:      props.postort ?? '',
      kommun:       props.kommunnamn ?? props.kommun ?? '',
      coordinates:  { lat: coords[1], lng: coords[0] },
    }
  } catch (err) {
    console.error('[lantmateriet:address] Details error:', err)
    return null
  }
}
