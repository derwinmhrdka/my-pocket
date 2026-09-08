export type GoogleProfile = {
  sub: string
  email?: string
  name?: string
  picture?: string
}

export function getGoogleCallbackUrl(): string {
  if (process.env.GOOGLE_OAUTH_CALLBACK_URL) {
    return process.env.GOOGLE_OAUTH_CALLBACK_URL
  }
  const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:13002'
  return `${origin.replace(/\/$/, '')}/auth/google/callback`
}

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured')
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('[google/token]', tokenRes.status, body)
    throw new Error('Failed to exchange Google auth code')
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  if (!tokenData.access_token) {
    throw new Error('Google token response missing access_token')
  }

  const profileRes = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  )

  if (!profileRes.ok) {
    const body = await profileRes.text()
    console.error('[google/userinfo]', profileRes.status, body)
    throw new Error('Failed to fetch Google profile')
  }

  const profile = (await profileRes.json()) as GoogleProfile
  if (!profile.sub) {
    throw new Error('Google profile missing sub')
  }
  return profile
}
