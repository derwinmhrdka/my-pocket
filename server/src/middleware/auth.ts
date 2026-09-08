import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

export type AuthPayload = { sub: string }

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

const COOKIE_NAME = 'mypocket_session'
/** Long-lived Google login; short-term protection is optional PIN auto-lock. */
const SESSION_DAYS = 365
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return secret
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AuthPayload, getJwtSecret(), {
    expiresIn: `${SESSION_DAYS}d`,
  })
}

export function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MS,
  }
}

export { COOKIE_NAME }

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthPayload
    if (!payload.sub || payload.sub === 'owner') {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
