import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard?meta=error`)
  }

  try {
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login`)

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    if (!appId || !appSecret) throw new Error('META_APP_ID / META_APP_SECRET saknas')

    const redirectUri = `${origin}/api/meta/connect`

    // Exchange code → short-lived user token
    const shortRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    )
    const shortData = await shortRes.json()
    if (!shortData.access_token) throw new Error('Ingen access_token från Meta')

    // Exchange short-lived → long-lived (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortData.access_token}`
    )
    const longData = await longRes.json()
    const userToken = longData.access_token || shortData.access_token

    // Get managed pages (includes page-level tokens)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    )
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]
    const pageId: string | null = page?.id ?? null
    const pageToken: string | null = page?.access_token ?? userToken

    // Get Instagram Business Account linked to the page
    let instagramAccountId: string | null = null
    if (pageId && pageToken) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}` +
        `?fields=instagram_business_account&access_token=${pageToken}`
      )
      const igData = await igRes.json()
      instagramAccountId = igData.instagram_business_account?.id ?? null
    }

    await supabase
      .from('agencies')
      .update({
        meta_access_token: pageToken,
        meta_page_id: pageId,
        instagram_account_id: instagramAccountId,
      })
      .eq('user_id', user.id)

    return NextResponse.redirect(`${origin}/dashboard?meta=connected`)
  } catch (err) {
    console.error('[/api/meta/connect]', err)
    return NextResponse.redirect(`${origin}/dashboard?meta=error`)
  }
}
