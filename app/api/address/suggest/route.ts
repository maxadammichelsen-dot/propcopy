import { NextRequest, NextResponse } from 'next/server'
import { autocompleteAddress } from '@/lib/lantmateriet/address'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  console.log('[/api/address/suggest] hit, q=', q)
  if (q.trim().length < 2) return NextResponse.json([])
  const suggestions = await autocompleteAddress(q)
  console.log('[/api/address/suggest] returning', suggestions.length, 'results')
  return NextResponse.json(suggestions)
}
