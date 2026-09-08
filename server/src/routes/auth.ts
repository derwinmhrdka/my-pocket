import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { pool } from '../db/pool.js'
import {
  COOKIE_NAME,
  cookieOptions,
  requireAuth,
  signSessionToken,
} from '../middleware/auth.js'
import { hashPin, verifyPin } from '../utils/pin.js'

const router = Router()

function isDevSkipEnabled() {
  return process.env.NODE_ENV !== 'production'
}

type UserRow = {
  id: string
  pin_hash: string | null
  display_name: string | null
  email: string | null
  google_sub: string
  auto_lock_seconds: number
}

async function getUser(userId: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT id, pin_hash, display_name, email, google_sub, auto_lock_seconds
     FROM users WHERE id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

function profileFromUser(row: UserRow) {
  return {
    ok: true as const,
    displayName: row.display_name?.trim() || null,
    email: row.email ?? null,
    hasPin: Boolean(row.pin_hash),
    hasGoogle: true,
    autoLockSeconds: row.auto_lock_seconds ?? 300,
    googleConfigured: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
    devSkipEnabled: isDevSkipEnabled(),
  }
}

const pinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again shortly.' },
})

router.get('/config', (_req, res) => {
  res.json({
    googleConfigured: Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    ),
    devSkipEnabled: isDevSkipEnabled(),
  })
})

/** Local/dev only — skip Google and sign in as a fixed test user. */
router.post('/dev-skip', async (_req, res) => {
  if (!isDevSkipEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (google_sub, email, display_name, updated_at)
       VALUES ('dev-local-skip', 'dev@localhost', 'Dev User', now())
       ON CONFLICT (google_sub) DO UPDATE SET
         updated_at = now()
       RETURNING id, pin_hash, display_name, email, google_sub, auto_lock_seconds`,
    )
    const user = rows[0]
    const token = signSessionToken(user.id)
    res.cookie(COOKIE_NAME, token, cookieOptions())
    res.json(profileFromUser(user))
  } catch (err) {
    console.error('[auth/dev-skip]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

/** Unlock after auto-lock — requires existing Google session cookie. */
router.post('/unlock', requireAuth, pinLimiter, async (req, res) => {
  const pin = String(req.body?.pin ?? '')
  if (!/^\d{4}$/.test(pin)) {
    res.status(400).json({ error: 'PIN must be 4 digits' })
    return
  }

  try {
    const user = await getUser(req.userId!)
    if (!user?.pin_hash) {
      res.status(400).json({ error: 'PIN is not set' })
      return
    }
    if (!verifyPin(pin, user.pin_hash)) {
      res.status(401).json({ error: 'Wrong PIN' })
      return
    }
    res.json(profileFromUser(user))
  } catch (err) {
    console.error('[auth/unlock]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.userId!)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    res.json(profileFromUser(user))
  } catch (err) {
    console.error('[auth/me]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/settings', requireAuth, async (req, res) => {
  try {
    const displayName =
      req.body?.displayName !== undefined
        ? String(req.body.displayName).trim()
        : undefined
    const autoLockSecondsRaw = req.body?.autoLockSeconds
    const autoLockSeconds =
      autoLockSecondsRaw !== undefined
        ? Number(autoLockSecondsRaw)
        : undefined

    if (displayName !== undefined && displayName.length > 80) {
      res.status(400).json({ error: 'Name is too long' })
      return
    }

    const allowedLocks = new Set([0, 60, 120, 300, 600, 900, 1800])
    if (
      autoLockSeconds !== undefined &&
      (!Number.isFinite(autoLockSeconds) || !allowedLocks.has(autoLockSeconds))
    ) {
      res.status(400).json({ error: 'Invalid auto-lock duration' })
      return
    }

    const sets: string[] = []
    const values: unknown[] = []
    let i = 1

    if (displayName !== undefined) {
      sets.push(`display_name = $${i++}`)
      values.push(displayName || null)
    }
    if (autoLockSeconds !== undefined) {
      sets.push(`auto_lock_seconds = $${i++}`)
      values.push(autoLockSeconds)
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'No settings to update' })
      return
    }

    sets.push('updated_at = now()')
    values.push(req.userId)
    await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`,
      values,
    )

    const user = await getUser(req.userId!)
    res.json(profileFromUser(user!))
  } catch (err) {
    console.error('[auth/settings]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/pin', requireAuth, pinLimiter, async (req, res) => {
  try {
    const currentPin = String(req.body?.currentPin ?? '')
    const newPin = String(req.body?.newPin ?? '')

    if (!/^\d{4}$/.test(newPin)) {
      res.status(400).json({ error: 'New PIN must be 4 digits' })
      return
    }

    const user = await getUser(req.userId!)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (user.pin_hash) {
      if (!/^\d{4}$/.test(currentPin) || !verifyPin(currentPin, user.pin_hash)) {
        res.status(401).json({ error: 'Current PIN is wrong' })
        return
      }
    }

    await pool.query(
      `UPDATE users SET pin_hash = $1, updated_at = now() WHERE id = $2`,
      [hashPin(newPin), req.userId],
    )

    const fresh = await getUser(req.userId!)
    res.json(profileFromUser(fresh!))
  } catch (err) {
    console.error('[auth/pin]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

export default router
