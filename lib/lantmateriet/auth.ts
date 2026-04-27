const TOKEN_URL = 'https://apimanager.lantmateriet.se/token'

let tokenCache: { value: string; expiresAt: number } | null = null

export async function getLantmaterietToken(): Promise<string | null> {
  const clientId     = process.env.LANTMATERIET_CLIENT_ID
  const clientSecret = process.env.LANTMATERIET_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('[lantmateriet:auth] Credentials missing, skipping')
    return null
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.value
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[lantmateriet:auth] Token request failed:', res.status, await res.text())
      return null
    }

    const json = await res.json()
    tokenCache = {
      value:     json.access_token as string,
      expiresAt: Date.now() + ((json.expires_in as number) ?? 3600) * 1000,
    }
    console.log('[lantmateriet:auth] Token acquired, expires in', json.expires_in, 's')
    return tokenCache.value
  } catch (err) {
    console.error('[lantmateriet:auth] Token error:', err)
    return null
  }
}
