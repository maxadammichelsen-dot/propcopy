import { NextRequest, NextResponse } from 'next/server'
import { autocompleteAddress } from '@/lib/lantmateriet/address'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.trim().length < 3) return NextResponse.json([])
  const suggestions = await autocompleteAddress(q)
  return NextResponse.json(suggestions)
}
