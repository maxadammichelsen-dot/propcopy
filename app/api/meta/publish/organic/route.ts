import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const { object_id, platform, scheduled_for } = await req.json()
    if (!object_id || !platform) {
      return NextResponse.json({ error: 'object_id och platform krävs' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: agency }, { data: object }] = await Promise.all([
      supabase.from('agencies').select('*').eq('user_id', user.id).single(),
      supabase.from('objects').select('*').eq('id', object_id).single(),
    ])

    if (!agency || !object) return NextResponse.json({ error: 'Hittades inte' }, { status: 404 })
    if (!agency.meta_access_token) {
      return NextResponse.json({ error: 'Meta är inte kopplat' }, { status: 400 })
    }

    // Build caption using social tone profile if available
    const socialTone = agency.social_tone_profile?.voice
      ?? agency.tone_profile?.tags?.join(', ')
      ?? 'professionell och varm'

    const { content } = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Skriv ett organiskt inlägg för ${platform === 'instagram' ? 'Instagram' : 'Facebook'} för mäklarbyrån "${agency.name}".

Byråns sociala ton: ${socialTone}
${agency.social_tone_profile?.hashtags?.length ? `Typiska hashtags: ${agency.social_tone_profile.hashtags.slice(0, 5).join(' ')}` : ''}

Objekt:
- Adress: ${object.address}, ${object.area}
- Typ: ${object.type}, ${object.size} kvm
- Pris: ${new Intl.NumberFormat('sv-SE').format(object.price)} kr
- Detaljer: ${object.details}

Skriv en caption på svenska (max 300 tecken för Instagram, 500 för Facebook). Inkludera 3-5 relevanta hashtags i slutet.

CAPTION:
[caption]`,
      }],
    })

    const raw = content[0].type === 'text' ? content[0].text : ''
    const captionMatch = raw.match(/CAPTION:\s*([\s\S]+)/i)
    const caption = captionMatch?.[1]?.trim() ?? raw.trim()

    if (scheduled_for) {
      // Save as scheduled post
      await supabase.from('scheduled_posts').insert({
        agency_id: agency.id,
        object_id,
        platform,
        content: caption,
        scheduled_for,
        status: 'scheduled',
      })
      return NextResponse.json({ scheduled: true, caption })
    }

    // Publish immediately
    let metaPostId: string | null = null
    let publishError: string | null = null

    if (platform === 'facebook' || platform === 'both') {
      if (agency.meta_page_id) {
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${agency.meta_page_id}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: caption, access_token: agency.meta_access_token }),
          }
        )
        const fbData = await fbRes.json()
        metaPostId = fbData.id ?? null
        if (!fbRes.ok) publishError = fbData.error?.message ?? 'Facebook-publicering misslyckades'
      }
    }

    if ((platform === 'instagram' || platform === 'both') && agency.instagram_account_id) {
      // IG requires a 2-step container → publish flow
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${agency.instagram_account_id}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption, access_token: agency.meta_access_token }),
        }
      )
      const containerData = await containerRes.json()
      if (containerData.id) {
        const publishRes = await fetch(
          `https://graph.facebook.com/v19.0/${agency.instagram_account_id}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: containerData.id, access_token: agency.meta_access_token }),
          }
        )
        const publishData = await publishRes.json()
        if (!publishRes.ok) publishError = publishData.error?.message ?? 'Instagram-publicering misslyckades'
      }
    }

    if (publishError) return NextResponse.json({ error: publishError }, { status: 500 })

    // Record in scheduled_posts as published
    await supabase.from('scheduled_posts').insert({
      agency_id: agency.id,
      object_id,
      platform,
      content: caption,
      published_at: new Date().toISOString(),
      meta_post_id: metaPostId,
      status: 'published',
    })

    return NextResponse.json({ published: true, meta_post_id: metaPostId, caption })
  } catch (err) {
    console.error('[/api/meta/publish/organic]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
