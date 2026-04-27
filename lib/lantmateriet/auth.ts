const TOKEN_URL = 'https://apimanager.lantmateriet.se/oauth2/token'

let tokenCache: { value: string; expiresAt: number } | null = null

export async function getLantmaterietToken(): Promise<string | null> {
  const clientId     = process.env.LANTMATERIET_CLIENT_ID
  const clientSecret = process.env.LANTMATERIET_CLIENT_SECRET
  const scope        = process.env.LANTMATERIET_SCOPE

  console.log('[lantmateriet:auth] env check:', {
    hasClientId: !!clientId,
    hasSecret:   !!clientSecret,
    hasScope:    !!scope,
  })

  if (!clientId || !clientSecret) {
    console.log('[lantmateriet:auth] Credentials missing, skipping')
    return null
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const body = scope
      ? `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`
      : 'grant_type=client_credentials'

    console.log('[lantmateriet:auth] requesting new token from', TOKEN_URL, scope ? `(scope=${scope})` : '(no scope)')

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(8000),
    })

    console.log('[lantmateriet:auth] token response status:', res.status)

    if (!res.ok) {
      console.error('[lantmateriet:auth] token error body:', await res.text())
      return null
    }

    const json = await res.json()
    const expiresIn = (json.expires_in as number) ?? 3600
    tokenCache = {
      value:     json.access_token as string,
      expiresAt: Date.now() + expiresIn * 1000,
    }
    console.log('[lantmateriet:auth] token cached, expires in', expiresIn, 's')
    return tokenCache.value
  } catch (err) {
    console.error('[lantmateriet:auth] Token error:', err)
    return null
  }
}
