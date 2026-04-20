import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

type ProspectRow = {
  id: string
  email: string | null
  fingerprint_id: string | null
  engagement_score: number
  status: string
  created_at: string
}

type EventRow = {
  fingerprint_id: string | null
  object_id: string | null
  created_at: string
}

type ObjectRow = {
  id: string
  address: string
  area: string
  type: string
  price: number
  status: string
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!agency) {
      return NextResponse.json({ queue: [], stats: { total: 0, has_email: 0, off_market_count: 0 } })
    }

    const { data: prospectsRaw } = await supabase
      .from('prospects')
      .select('id, email, fingerprint_id, engagement_score, status, created_at')
      .eq('agency_id', agency.id)
      .in('status', ['hot', 'warm'])
      .order('engagement_score', { ascending: false })
      .limit(20)

    const prospects = (prospectsRaw ?? []) as ProspectRow[]

    if (prospects.length === 0) {
      return NextResponse.json({ queue: [], stats: { total: 0, has_email: 0, off_market_count: 0 } })
    }

    const fingerprints = prospects.map(p => p.fingerprint_id).filter(Boolean) as string[]

    // Events and objects fetched in parallel
    let events: EventRow[] = []
    let allObjects: ObjectRow[] = []

    if (fingerprints.length > 0) {
      const [evRes, objRes] = await Promise.all([
        supabase
          .from('prospect_events')
          .select('fingerprint_id, object_id, created_at')
          .eq('agency_id', agency.id)
          .in('fingerprint_id', fingerprints)
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('objects')
          .select('id, address, area, type, price, status')
          .eq('agency_id', agency.id),
      ])
      events = ((evRes.data ?? []) as EventRow[]).filter(e => e.object_id !== null)
      allObjects = (objRes.data ?? []) as ObjectRow[]
    } else {
      const { data } = await supabase
        .from('objects')
        .select('id, address, area, type, price, status')
        .eq('agency_id', agency.id)
      allObjects = (data ?? []) as ObjectRow[]
    }

    const objectsMap = new Map<string, ObjectRow>()
    for (const obj of allObjects) objectsMap.set(obj.id, obj)

    const draftObjects = allObjects.filter(o => o.status === 'draft')

    // Aggregate per-fingerprint
    const viewedByFP = new Map<string, string[]>()
    const countByFP = new Map<string, number>()
    const lastSeenByFP = new Map<string, string>()

    for (const ev of events) {
      const fp = ev.fingerprint_id
      if (!fp) continue
      countByFP.set(fp, (countByFP.get(fp) ?? 0) + 1)
      if (!lastSeenByFP.has(fp)) lastSeenByFP.set(fp, ev.created_at)
      if (ev.object_id) {
        const arr = viewedByFP.get(fp) ?? []
        if (!arr.includes(ev.object_id)) arr.push(ev.object_id)
        viewedByFP.set(fp, arr)
      }
    }

    let offMarketCount = 0

    const queue = prospects.map(p => {
      const fp = p.fingerprint_id ?? ''
      const viewedIds = viewedByFP.get(fp) ?? []
      const viewedObjects = viewedIds
        .map(id => objectsMap.get(id))
        .filter(Boolean) as ObjectRow[]

      const areas = Array.from(new Set(viewedObjects.map(o => o.area)))
      const types = Array.from(new Set(viewedObjects.map(o => o.type)))

      const offMarketMatches = draftObjects
        .filter(d => areas.includes(d.area) || types.includes(d.type))
        .slice(0, 2)
        .map(d => ({ id: d.id, address: d.address, area: d.area, type: d.type }))

      if (offMarketMatches.length > 0) offMarketCount++

      return {
        id: p.id,
        email: p.email,
        status: p.status as 'hot' | 'warm',
        engagement_score: p.engagement_score,
        events_count: countByFP.get(fp) ?? 0,
        last_event_at: lastSeenByFP.get(fp) ?? null,
        viewed_objects: viewedObjects.slice(0, 3).map(o => ({
          id: o.id,
          address: o.address,
          area: o.area,
          type: o.type,
          price: o.price,
        })),
        off_market_matches: offMarketMatches,
      }
    })

    return NextResponse.json({
      queue,
      stats: {
        total: queue.length,
        has_email: queue.filter(p => !!p.email).length,
        off_market_count: offMarketCount,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
