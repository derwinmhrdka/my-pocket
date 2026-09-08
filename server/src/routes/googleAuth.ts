import { Router } from 'express'
import { pool } from '../db/pool.js'
import {
  COOKIE_NAME,
  cookieOptions,
  signSessionToken,
} from '../middleware/auth.js'
import {
  createOAuthState,
  exchangeGoogleCode,
  getGoogleAuthUrl,
  verifyOAuthState,
} from '../utils/googleOAuth.js'

const router = Router()

router.get('/google', (_req, res) => {
  try {
    if (
      !process.env.GOOGLE_OAUTH_CLIENT_ID ||
      !process.env.GOOGLE_OAUTH_CLIENT_SECRET
    ) {
      res.status(503).json({ error: 'Google sign-in is not configured' })
      return
    }

    const state = createOAuthState()
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

    if (!code || !state || !verifyOAuthState(state)) {
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
