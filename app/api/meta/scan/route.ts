import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: agency } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!agency) return NextResponse.json({ error: 'Byrå hittades inte' }, { status: 404 })
    if (!agency.meta_access_token) {
      return NextResponse.json({ error: 'Meta är inte kopplat' }, { status: 400 })
    }

    const posts: string[] = []

    // Fetch Facebook page posts
    if (agency.meta_page_id) {
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${agency.meta_page_id}/posts` +
        `?fields=message,created_time&limit=20` +
        `&access_token=${agency.meta_access_token}`
      )
      const fbData = await fbRes.json()
      for (const post of fbData.data ?? []) {
        if (post.message?.trim()) posts.push(`[Facebook]\n${post.message.trim()}`)
      }
    }

    // Fetch Instagram media captions
    if (agency.instagram_account_id) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${agency.instagram_account_id}/media` +
        `?fields=caption,timestamp,media_type&limit=20` +
        `&access_token=${agency.meta_access_token}`
      )
      const igData = await igRes.json()
      for (const post of igData.data ?? []) {
        if (post.caption?.trim()) posts.push(`[Instagram]\n${post.caption.trim()}`)
      }
    }

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Inga inlägg hittades' }, { status: 404 })
    }

    const postsText = posts.slice(0, 20).join('\n\n---\n\n')

    const { content } = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Analysera dessa inlägg från en mäklarbyrå och identifiera deras ton och stil på sociala medier.

Inlägg:
${postsText}

Returnera EXAKT detta JSON-format utan förklaring:
{
  "tone_tags": ["max 5 adjektiv som beskriver tonen, t.ex. professionell, varm, lekfull"],
  "voice": "1-2 meningar som beskriver rösten och personligheten",
  "hashtags": ["de vanligast förekommande hashtaggarna"],
  "keywords": ["återkommande nyckelord och fraser"],
  "formats": ["vanliga format t.ex. frågor, storytelling, statistik, CTA"],
  "style_notes": "1-2 meningar om bildbeskrivningar och berättarteknik"
}`,
      }],
    })

    const raw = content[0].type === 'text' ? content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]+\}/)
    if (!jsonMatch) throw new Error('Claude returnerade inget giltigt JSON')

    const socialToneProfile = JSON.parse(jsonMatch[0])

    await supabase
      .from('agencies')
      .update({ social_tone_profile: socialToneProfile })
      .eq('user_id', user.id)

    return NextResponse.json({ social_tone_profile: socialToneProfile })
  } catch (err) {
    console.error('[/api/meta/scan]', err)
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
