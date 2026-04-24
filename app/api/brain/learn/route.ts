import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 })
    }

    const body = await req.json()
    const { agency_id, object_id, channel, generated_text, action, edited_version } = body

    if (!agency_id || !channel || !generated_text || !action) {
      return NextResponse.json({ error: 'Saknade fält' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    await admin.from('generation_feedback').insert({
      agency_id,
      object_id: object_id ?? null,
      channel,
      generated_text,
      action,
      edited_version: edited_version ?? null,
    })

    if (action === 'approved') {
      await handleApproved(admin, agency_id, channel, generated_text)
    } else if (action === 'edited' && edited_version) {
      await handleEdited(admin, agency_id, channel, generated_text, edited_version)
    } else if (action === 'rejected') {
      await handleRejected(admin, agency_id, channel, generated_text)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/brain/learn]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Approved ────────────────────────────────────────────────

async function handleApproved(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  agency_id: string,
  channel: string,
  generated_text: string
) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Analysera denna godkända fastighetstexter och extrahera de tre starkaste meningarna.

Text (${channel}):
${generated_text}

Returnera ENBART giltig JSON utan markdown:
{
  "winning_phrases": ["starkaste mening 1", "starkaste mening 2", "starkaste mening 3"]
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  let phrases: string[] = []
  try {
    const parsed = JSON.parse(json)
    phrases = (parsed.winning_phrases ?? []).slice(0, 3)
  } catch { /* ignore */ }

  // Save winning phrases
  if (phrases.length > 0) {
    await admin.from('agency_brain').insert(
      phrases.map((p, i) => ({
        agency_id,
        category: 'winning_phrases',
        key: `${channel}_${Date.now()}_${i}`,
        value: p,
        confidence: 0.7,
        source: 'feedback',
      }))
    )
  }

  // Bump confidence +0.1 (max 0.95) on existing winning_text + tone entries
  const { data: existing } = await admin
    .from('agency_brain')
    .select('id, confidence')
    .eq('agency_id', agency_id)
    .in('category', ['winning_text', 'tone', 'winning_phrases'])
    .order('updated_at', { ascending: false })
    .limit(10)

  if (existing && existing.length > 0) {
    const updates = existing.map((e: { id: string; confidence: number }) => ({
      id: e.id,
      confidence: Math.min(+(e.confidence + 0.1).toFixed(2), 0.95),
    }))
    await Promise.all(
      updates.map((u: { id: string; confidence: number }) =>
        admin.from('agency_brain').update({ confidence: u.confidence }).eq('id', u.id)
      )
    )
  }
}

// ─── Edited ──────────────────────────────────────────────────

async function handleEdited(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  agency_id: string,
  channel: string,
  generated_text: string,
  edited_version: string
) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Mäklaren redigerade denna fastighetstext. Analysera exakt vad som ändrades och varför.

Original (${channel}):
${generated_text}

Redigerad version:
${edited_version}

Returnera ENBART giltig JSON utan markdown:
{
  "removed": ["borttagen fras 1", "borttagen fras 2"],
  "added": ["tillagd fras 1", "tillagd fras 2"],
  "pattern": "konkret mening: vad mäklaren föredrar baserat på denna redigering"
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  let diff: { removed?: string[]; added?: string[]; pattern?: string } = {}
  try { diff = JSON.parse(json) } catch { /* ignore */ }

  const rows: Record<string, unknown>[] = []

  // Pattern → edit_preference
  if (diff.pattern) {
    rows.push({
      agency_id,
      category: 'edit_preference',
      key: `${channel}_${Date.now()}`,
      value: diff.pattern,
      confidence: 0.75,
      source: 'feedback',
    })
  }

  // Added phrases → winning_phrases
  for (const phrase of (diff.added ?? []).slice(0, 3)) {
    rows.push({
      agency_id,
      category: 'winning_phrases',
      key: `${channel}_added_${Date.now()}`,
      value: phrase,
      confidence: 0.65,
      source: 'feedback',
    })
  }

  // Removed phrases → avoid_pattern with low confidence
  for (const phrase of (diff.removed ?? []).slice(0, 3)) {
    rows.push({
      agency_id,
      category: 'avoid_pattern',
      key: `${channel}_removed_${Date.now()}`,
      value: phrase,
      confidence: 0.15,
      source: 'feedback',
    })
  }

  if (rows.length > 0) {
    await admin.from('agency_brain').insert(rows)
  }
}

// ─── Rejected ────────────────────────────────────────────────

async function handleRejected(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  agency_id: string,
  channel: string,
  generated_text: string
) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Mäklaren avvisade denna fastighetstext. Analysera specifikt vad som gick fel.

Text (${channel}):
${generated_text}

Returnera ENBART giltig JSON utan markdown:
{
  "avoid_patterns": ["konkret mönster att undvika 1", "konkret mönster att undvika 2"]
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  let result: { avoid_patterns?: string[] } = {}
  try { result = JSON.parse(json) } catch { /* ignore */ }

  // Save avoid_patterns
  const patterns = (result.avoid_patterns ?? []).slice(0, 4)
  if (patterns.length > 0) {
    await admin.from('agency_brain').insert(
      patterns.map((p, i) => ({
        agency_id,
        category: 'avoid_pattern',
        key: `${channel}_reject_${Date.now()}_${i}`,
        value: p,
        confidence: 0.1,
        source: 'feedback',
      }))
    )
  }

  // Decrease confidence -0.15 (min 0.1) on recent winning entries
  const { data: existing } = await admin
    .from('agency_brain')
    .select('id, confidence')
    .eq('agency_id', agency_id)
    .in('category', ['winning_text', 'tone', 'winning_phrases'])
    .order('updated_at', { ascending: false })
    .limit(8)

  if (existing && existing.length > 0) {
    const updates = existing.map((e: { id: string; confidence: number }) => ({
      id: e.id,
      confidence: Math.max(+(e.confidence - 0.15).toFixed(2), 0.1),
    }))
    await Promise.all(
      updates.map((u: { id: string; confidence: number }) =>
        admin.from('agency_brain').update({ confidence: u.confidence }).eq('id', u.id)
      )
    )
  }
}
