import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { getJwtSecret } from '../middleware/auth.js'

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

/** Signed OAuth state — no cookie needed (Safari Private drops cookies on redirect). */
export function createOAuthState(): string {
  const nonce = randomBytes(16).toString('hex')
  const ts = Math.floor(Date.now() / 1000).toString(36)
  const payload = `${nonce}.${ts}`
  const sig = createHmac('sha256', getJwtSecret())
    .update(payload)
    .digest('base64url')
  return `${payload}.${sig}`
}

export function verifyOAuthState(state: string): boolean {
  const parts = state.split('.')
  if (parts.length !== 3) return false
  const [nonce, ts, sig] = parts
  if (!nonce || !ts || !sig) return false

  const payload = `${nonce}.${ts}`
  const expected = createHmac('sha256', getJwtSecret())
    .update(payload)
    .digest('base64url')

  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false
  } catch {
    return false
  }

  const issued = Number.parseInt(ts, 36)
  if (!Number.isFinite(issued)) return false
  // 10 minutes
  if (Math.abs(Math.floor(Date.now() / 1000) - issued) > 600) return false
  return true
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
