import { Router } from 'express'
import { randomBytes } from 'crypto'
import { pool } from '../db/pool.js'
import {
  COOKIE_NAME,
  cookieOptions,
  signSessionToken,
} from '../middleware/auth.js'
import {
  exchangeGoogleCode,
  getGoogleAuthUrl,
} from '../utils/googleOAuth.js'

const router = Router()
const OAUTH_STATE_COOKIE = 'mypocket_oauth_state'

router.get('/google', (_req, res) => {
  try {
    if (
      !process.env.GOOGLE_OAUTH_CLIENT_ID ||
      !process.env.GOOGLE_OAUTH_CLIENT_SECRET
    ) {
      res.status(503).json({ error: 'Google sign-in is not configured' })
      return
    }

    const state = randomBytes(16).toString('hex')
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    })
    res.redirect(getGoogleAuthUrl(state))
  } catch (err) {
    console.error('[auth/google]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/google/callback', async (req, res) => {
  const clientOrigin = (
    process.env.CLIENT_ORIGIN ?? 'http://localhost:13002'
  ).replace(/\/$/, '')

  try {
    const code = String(req.query.code ?? '')
    const state = String(req.query.state ?? '')
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })

    if (!code || !state || !storedState || state !== storedState) {
      res.redirect(`${clientOrigin}/?authError=invalid_state`)
      return
    }

    const profile = await exchangeGoogleCode(code)
    const displayName =
      profile.name?.trim() ||
      profile.email?.split('@')[0] ||
      'User'

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (google_sub, email, display_name, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (google_sub) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(NULLIF(users.display_name, ''), EXCLUDED.display_name),
         updated_at = now()
       RETURNING id`,
      [profile.sub, profile.email ?? null, displayName],
    )
    const userId = rows[0].id

    // One-time: attach orphan cards (pre-multi-user) to the first Google user
    await pool.query(
      `UPDATE cards SET user_id = $1
       WHERE user_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM cards WHERE user_id IS NOT NULL LIMIT 1)`,
      [userId],
    )

    const token = signSessionToken(userId)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    res.redirect(`${clientOrigin}/?auth=google`)
  } catch (err) {
    console.error('[auth/google/callback]', err)
    res.redirect(`${clientOrigin}/?authError=google_failed`)
  }
})

export default router
