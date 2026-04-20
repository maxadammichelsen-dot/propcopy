import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const CORS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const SCORE: Record<string, number> = {
  pageview: 1,
  scroll_depth: 2,
  time_on_page: 3,
  form_submit: 10,
  email_captured: 20,
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      agency_id, object_id, session_id, fingerprint_id,
      event, email, metadata,
    } = body

    if (!agency_id || !event) {
      return NextResponse.json({ error: 'agency_id and event required' }, { status: 400, headers: CORS })
    }

    const admin = createSupabaseAdminClient()

    // Validate agency exists (prevents spurious data from bad IDs)
    const { data: agency } = await admin
      .from('agencies')
      .select('id')
      .eq('id', agency_id)
      .maybeSingle()

    if (!agency) {
      return NextResponse.json({ error: 'Unknown agency' }, { status: 404, headers: CORS })
    }

    // Record event
    await admin.from('prospect_events').insert({
      agency_id,
      object_id: object_id || null,
      session_id: session_id || null,
      fingerprint_id: fingerprint_id || null,
      email: email || null,
      event,
      metadata: metadata || {},
    })

    // Update prospect if we have a fingerprint to track by
    if (fingerprint_id) {
      const increment = SCORE[event] ?? 0

      const { data: existing } = await admin
        .from('prospects')
        .select('id, engagement_score')
        .eq('agency_id', agency_id)
        .eq('fingerprint_id', fingerprint_id)
        .maybeSingle()

      if (existing) {
        const newScore = (existing.engagement_score || 0) + increment
        const status = newScore >= 15 ? 'hot' : newScore >= 5 ? 'warm' : 'cold'
        const updates: Record<string, unknown> = {
          engagement_score: newScore,
          status,
          session_id: session_id || null,
        }
        if (email) updates.email = email
        await admin.from('prospects').update(updates).eq('id', existing.id)
      } else {
        const status = increment >= 15 ? 'hot' : increment >= 5 ? 'warm' : 'cold'
        await admin.from('prospects').insert({
          agency_id,
          fingerprint_id,
          session_id: session_id || null,
          email: email || null,
          engagement_score: increment,
          status,
        })
      }
    }

    return NextResponse.json({ ok: true }, { headers: CORS })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500, headers: CORS })
  }
}
