import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/** SHA-256 + salt per spec §5. Stored as `salt:hash`. */
export function hashPin(pin: string, salt = randomBytes(16).toString('hex')): string {
  const hash = createHash('sha256').update(`${salt}:${pin}`).digest('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, expected] = stored.split(':')
  if (!salt || !expected) return false
  const actual = createHash('sha256').update(`${salt}:${pin}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(actual, 'utf8'), Buffer.from(expected, 'utf8'))
  } catch {
    return false
  }
}

/** Emergency path when auth row is missing/corrupt: compare against PIN_FALLBACK. */
export function matchesFallbackPin(pin: string, fallbackPin: string | undefined): boolean {
  if (!fallbackPin) return false
  const a = Buffer.from(pin)
  const b = Buffer.from(fallbackPin)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
