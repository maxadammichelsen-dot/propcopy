import { NextRequest, NextResponse } from 'next/server'
import { fetchAddressDetails } from '@/lib/lantmateriet/address'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const details = await fetchAddressDetails(id)
  if (!details) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(details)
}
