import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { computeHealthScore, daysSince } from '@/lib/health-score'
import type { PropertyObject } from '@/types'

interface ObjectHealthRow {
  id: string
  address: string
  area: string
  status: string
  health_score: number
  days_on_market: number
  issues: string[]
}

interface ContentRow {
  id: string
  object_id: string
  created_at: string
}

type ActionPriority = 'high' | 'medium' | 'low'

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
      return NextResponse.json({
        stats: { active_objects: 0, avg_days_on_market: 0, needs_action: 0, texts_this_month: 0 },
        object_health: [],
        action_items: [{
          id: 'create-first',
          priority: 'high' as ActionPriority,
          icon: '🏠',
          title: 'Skapa ditt första objekt',
          description: 'Kom igång med PropCopy och generera dina första texter',
        }],
        performance: buildPerformanceData([]),
      })
    }

    const { data: objectsRaw } = await supabase
      .from('objects')
      .select('*')
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false })

    const objects = (objectsRaw ?? []) as PropertyObject[]
    const objectIds = objects.map(o => o.id)

    let allContent: ContentRow[] = []
    if (objectIds.length > 0) {
      const { data } = await supabase
        .from('generated_content')
        .select('id, object_id, created_at')
        .in('object_id', objectIds)
      allContent = (data ?? []) as ContentRow[]
    }

    const active = objects.filter(o => o.status === 'active')
    const avgDays = active.length
      ? Math.round(active.reduce((s, o) => s + daysSince(o.created_at), 0) / active.length)
      : 0

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const textsThisMonth = allContent.filter(c => c.created_at >= monthStart).length

    const countByObject = new Map<string, number>()
    for (const c of allContent) {
      countByObject.set(c.object_id, (countByObject.get(c.object_id) ?? 0) + 1)
    }

    const objectHealth: ObjectHealthRow[] = objects
      .filter(o => o.status !== 'sold')
      .map(obj => {
        const { score, issues } = computeHealthScore(obj, countByObject.get(obj.id) ?? 0)
        return {
          id: obj.id,
          address: obj.address,
          area: obj.area,
          status: obj.status,
          health_score: score,
          days_on_market: daysSince(obj.created_at),
          issues,
        }
      })
      .sort((a, b) => a.health_score - b.health_score)

    const needsAction = objectHealth.filter(o => o.health_score < 60).length

    return NextResponse.json({
      stats: {
        active_objects: active.length,
        avg_days_on_market: avgDays,
        needs_action: needsAction,
        texts_this_month: textsThisMonth,
      },
      object_health: objectHealth.slice(0, 10),
      action_items: buildActionItems(objectHealth, objects.length),
      performance: buildPerformanceData(allContent),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildActionItems(health: ObjectHealthRow[], totalObjects: number) {
  type Item = {
    id: string
    priority: ActionPriority
    icon: string
    title: string
    description: string
    object_id?: string
  }

  if (totalObjects === 0) {
    return [{
      id: 'create-first',
      priority: 'high' as ActionPriority,
      icon: '🏠',
      title: 'Skapa ditt första objekt',
      description: 'Kom igång med PropCopy och generera dina första texter',
    }]
  }

  const items: Item[] = []
  const addedIds = new Set<string>()

  const noContent = health.filter(h => h.issues.includes('Inga texter genererade'))
  if (noContent.length > 0) {
    const h = noContent[0]
    addedIds.add(h.id)
    items.push({
      id: `no-content-${h.id}`,
      priority: 'high',
      icon: '✍️',
      title: `Generera texter – ${h.address}`,
      description: 'Inga marknadsföringstexter skapade ännu',
      object_id: h.id,
    })
  }

  const critical = health.filter(h => h.health_score < 40 && !addedIds.has(h.id))
  if (critical.length > 0 && items.length < 3) {
    const h = critical[0]
    addedIds.add(h.id)
    items.push({
      id: `critical-${h.id}`,
      priority: 'high',
      icon: '⚠️',
      title: `Förbättra – ${h.address}`,
      description: h.issues[0] ?? 'Låg hälsopoäng',
      object_id: h.id,
    })
  }

  const stale = health.filter(
    h => h.days_on_market > 45 && h.status === 'active' && !addedIds.has(h.id)
  )
  if (stale.length > 0 && items.length < 3) {
    const h = stale[0]
    items.push({
      id: `stale-${h.id}`,
      priority: 'medium',
      icon: '🔄',
      title: `Fräscha upp – ${h.address}`,
      description: `${h.days_on_market} dagar på marknaden – prova ny annonsvinkel`,
      object_id: h.id,
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'all-good',
      priority: 'low',
      icon: '✅',
      title: 'Allt ser bra ut!',
      description: 'Inga omedelbara åtgärder krävs just nu',
    })
  }

  return items.slice(0, 3)
}

function buildPerformanceData(content: { created_at: string }[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthStr = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('sv-SE', { month: 'short' })
    const count = content.filter(c => c.created_at.startsWith(monthStr)).length
    return { month: label, texts_generated: count }
  })
}
