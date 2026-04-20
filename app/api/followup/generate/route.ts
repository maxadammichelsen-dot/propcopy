import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { prospect_id } = await req.json()
    if (!prospect_id) {
      return NextResponse.json({ error: 'prospect_id required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [agencyRes, prospectRes] = await Promise.all([
      supabase.from('agencies').select('*').eq('user_id', user.id).single(),
      supabase.from('prospects').select('*').eq('id', prospect_id).single(),
    ])

    const agency = agencyRes.data
    const prospect = prospectRes.data

    if (!agency || !prospect) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (prospect.agency_id !== agency.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch viewed objects (via fingerprint_id)
    let viewedObjects: { address: string; type: string; size: number; price: number; area: string }[] = []

    if (prospect.fingerprint_id) {
      const { data: evs } = await supabase
        .from('prospect_events')
        .select('object_id')
        .eq('agency_id', agency.id)
        .eq('fingerprint_id', prospect.fingerprint_id)
        .limit(20)

      const seenIds: string[] = []
      for (const ev of evs ?? []) {
        if (ev.object_id && !seenIds.includes(ev.object_id)) {
          seenIds.push(ev.object_id)
        }
      }

      if (seenIds.length > 0) {
        const { data: objs } = await supabase
          .from('objects')
          .select('address, type, size, price, area')
          .in('id', seenIds)
        viewedObjects = objs ?? []
      }
    }

    const tone = agency.tone_profile?.tags?.slice(0, 4).join(', ') || 'professionell och varm'
    const viewedSummary = viewedObjects.length > 0
      ? viewedObjects
          .map(o => `• ${o.address} (${o.type}, ${o.size} kvm, ${new Intl.NumberFormat('sv-SE').format(o.price)} kr)`)
          .join('\n')
      : 'Inga specifika objekt spårade – generell uppföljning'

    const statusLabel = prospect.status === 'hot' ? 'het lead (hög aktivitet)' : 'varm lead'
    const greeting = prospect.email ? '' : 'Mottagare saknar e-post – skriv till "Bäste intressent"'

    const { content } = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Skriv ett personligt uppföljningsmejl för mäklarbyrån "${agency.name}".

Byråns tonprofil: ${tone}
${greeting}

Spekulant:
- E-post: ${prospect.email ?? 'Okänd'}
- Status: ${statusLabel}
- Engagemang: ${prospect.engagement_score} poäng
- Besökta objekt:
${viewedSummary}

Formatera svaret EXAKT så här (inget annat):
ÄMNE: <ämnesrad>
MEJL:
<brödtext>

Riktlinjer:
- Referera till specifika objekt de tittat på
- Erbjud personlig visning eller off-market alternativ
- Ton: ${tone}
- Max 160 ord i brödtexten
- Avsluta med "Med vänliga hälsningar,\\n${agency.name}"`,
        },
      ],
    })

    const raw = content[0].type === 'text' ? content[0].text : ''
    const subjectMatch = raw.match(/ÄMNE:\s*(.+)/i)
    const bodyMatch = raw.match(/MEJL:\s*([\s\S]+)/i)

    return NextResponse.json({
      subject: subjectMatch?.[1]?.trim() ?? `Uppföljning från ${agency.name}`,
      body: bodyMatch?.[1]?.trim() ?? raw.trim(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
