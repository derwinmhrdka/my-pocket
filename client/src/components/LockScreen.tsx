import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const

const easeOut = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.07, duration: 0.55, ease: easeOut },
  }),
}

export function LockScreen() {
  const unlockWithPin = useAuthStore((s) => s.unlockWithPin)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const pinLocked = useAuthStore((s) => s.pinLocked)
  const googleConfigured = useAuthStore((s) => s.googleConfigured)
  const devSkipEnabled = useAuthStore((s) => s.devSkipEnabled)
  const displayName = useAuthStore((s) => s.displayName)
  const logout = useAuthStore((s) => s.logout)
  const skipDevLogin = useAuthStore((s) => s.skipDevLogin)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const verifyingRef = useRef(false)

  useEffect(() => {
    if (!pinLocked) {
      setPin('')
      clearError()
    }
  }, [pinLocked, clearError])

  useEffect(() => {
    if (!pinLocked || pin.length !== 4 || verifyingRef.current) return

    verifyingRef.current = true
    setBusy(true)

    void (async () => {
      const ok = await unlockWithPin(pin)
      verifyingRef.current = false
      setBusy(false)

      if (!ok) {
        setPin('')
        setShake(true)
        window.setTimeout(() => setShake(false), 480)
      }
    })()
  }, [pin, pinLocked, unlockWithPin])

  function onKey(key: string) {
    if (busy) return
    clearError()
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (key && pin.length < 4) {
      setPin((p) => p + key)
    }
  }

  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.4 }}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          className="absolute -left-16 top-[12%] h-56 w-56 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(216,162,59,0.18), transparent 70%)' }}
          animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.08, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 bottom-[18%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(193,68,44,0.16), transparent 70%)' }}
          animate={{ opacity: [0.35, 0.65, 0.35], scale: [1.05, 1, 1.05] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="relative z-10 flex w-full max-w-[320px] flex-col items-center">
        <motion.div
          className="relative mb-7 flex h-[76px] w-[76px] items-center justify-center"
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <motion.div
            className="absolute inset-0 rounded-[22px]"
            style={{
              background:
                'linear-gradient(145deg, var(--accent), var(--accent-2))',
              boxShadow:
                '0 18px 40px rgba(193,68,44,0.28), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
            animate={
              busy
                ? { scale: [1, 0.96, 1], rotate: [0, -2, 2, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={
              busy
                ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                : { type: 'spring', stiffness: 260, damping: 20 }
            }
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={pinLocked ? 'lock' : 'pocket'}
              className="relative text-[30px] leading-none"
              initial={{ opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -6 }}
              transition={{ duration: 0.28, ease: easeOut }}
              aria-hidden
            >
              {pinLocked ? '🔒' : '👛'}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="mb-8 text-center"
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <div className="brand text-[26px] font-bold tracking-[0.3px]">
            My<span style={{ color: 'var(--accent-2)' }}>Pocket</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={pinLocked ? `pin-${displayName}` : 'login'}
              className="mt-2.5 text-[13px] leading-relaxed"
              style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {pinLocked
                ? `Welcome back${displayName ? `, ${displayName}` : ''}`
                : 'Your cards, locked with care'}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence mode="wait">
          {pinLocked ? (
            <motion.div
              key="pin"
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.38, ease: easeOut }}
            >
              <motion.p
                className="mb-5 text-[11px] font-medium uppercase tracking-[0.22em]"
                style={{ color: 'var(--muted-2)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Enter PIN
              </motion.p>

              <motion.div
                className="mb-3 flex gap-4"
                aria-label="PIN dots"
                animate={
                  shake
                    ? { x: [0, -12, 12, -9, 9, -4, 4, 0] }
                    : busy
                      ? { scale: [1, 1.04, 1] }
                      : { x: 0, scale: 1 }
                }
                transition={
                  shake
                    ? { duration: 0.48 }
                    : busy
                      ? { duration: 0.9, repeat: Infinity }
                      : { type: 'spring', stiffness: 400, damping: 28 }
                }
              >
                {Array.from({ length: 4 }).map((_, i) => {
                  const filled = i < pin.length
                  return (
                    <motion.div
                      key={i}
                      className="relative flex h-3.5 w-3.5 items-center justify-center"
                      initial={false}
                      animate={{
                        scale: filled ? 1 : 0.92,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          border: `1.5px solid ${filled ? 'var(--accent-2)' : 'var(--paper-dim)'}`,
                          background: filled ? 'var(--accent-2)' : 'transparent',
                          boxShadow: filled
                            ? '0 0 14px rgba(216,162,59,0.45)'
                            : 'none',
                        }}
                        animate={
                          filled
                            ? { scale: [0.55, 1.15, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 0.28, ease: easeOut }}
                      />
                    </motion.div>
                  )
                })}
              </motion.div>

              <div className="mb-5 h-5">
                <AnimatePresence>
                  {error ? (
                    <motion.p
                      className="text-center text-[12px]"
                      style={{ color: 'var(--accent)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                {KEYS.map((key, idx) =>
                  !key ? (
                    <div key={`empty-${idx}`} className="h-[64px] w-[64px]" />
                  ) : (
                    <motion.button
                      key={key}
                      type="button"
                      className="brand relative flex h-[64px] w-[64px] items-center justify-center rounded-full border text-[22px] outline-none"
                      style={{
                        background:
                          pressedKey === key
                            ? 'linear-gradient(145deg, var(--accent), #9a3420)'
                            : 'var(--ink-2)',
                        borderColor:
                          pressedKey === key
                            ? 'transparent'
                            : 'rgba(255,255,255,0.08)',
                        color: 'var(--paper)',
                        boxShadow:
                          pressedKey === key
                            ? '0 8px 22px rgba(193,68,44,0.35)'
                            : '0 4px 14px rgba(0,0,0,0.25)',
                      }}
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 0.12 + idx * 0.025,
                        type: 'spring',
                        stiffness: 380,
                        damping: 22,
                      }}
                      whileTap={{ scale: 0.9 }}
                      onPointerDown={() => setPressedKey(key)}
                      onPointerUp={() => setPressedKey(null)}
                      onPointerLeave={() => setPressedKey(null)}
                      onClick={() => onKey(key)}
                    >
                      {key}
                    </motion.button>
                  ),
                )}
              </div>

              <motion.button
                type="button"
                className="mt-7 text-[13px] tracking-wide"
                style={{ color: 'var(--muted-2)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                whileHover={{ color: 'var(--paper-dim)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => void logout()}
              >
                Sign out
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              className="flex w-full flex-col items-center gap-4"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.38, ease: easeOut }}
            >
              {googleConfigured ? (
                <motion.a
                  href="/auth/google"
                  className="brand group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border px-5 py-4 text-[14px] font-semibold"
                  style={{
                    background:
                      'linear-gradient(165deg, rgba(30,27,34,0.95), rgba(20,18,23,0.98))',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'var(--paper)',
                    boxShadow: '0 14px 36px rgba(0,0,0,0.35)',
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: easeOut }}
                  whileHover={{
                    y: -2,
                    boxShadow: '0 18px 40px rgba(0,0,0,0.42)',
                    borderColor: 'rgba(216,162,59,0.35)',
                  }}
                  whileTap={{ scale: 0.985 }}
                >
                  <motion.span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        'linear-gradient(110deg, transparent 20%, rgba(216,162,59,0.08) 45%, transparent 70%)',
                    }}
                    aria-hidden
                  />
                  <motion.span
                    className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/95"
                    whileHover={{ rotate: -8 }}
                  >
                    <GoogleIcon />
                  </motion.span>
                  <span className="relative">Continue with Google</span>
                </motion.a>
              ) : (
                <motion.p
                  className="text-center text-sm"
                  style={{ color: 'var(--muted)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  Google sign-in is not configured yet.
                </motion.p>
              )}

              {devSkipEnabled ? (
                <motion.button
                  type="button"
                  disabled={busy}
                  className="text-[11px] tracking-wide underline-offset-4 hover:underline disabled:opacity-50"
                  style={{ color: 'var(--muted-2)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => {
                    setBusy(true)
                    void skipDevLogin().finally(() => setBusy(false))
                  }}
                >
                  Skip login (dev)
                </motion.button>
              ) : null}

              <div className="h-5">
                <AnimatePresence>
                  {error ? (
                    <motion.p
                      className="text-center text-[12px]"
                      style={{ color: 'var(--accent)' }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C37.3 38.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  )
}
