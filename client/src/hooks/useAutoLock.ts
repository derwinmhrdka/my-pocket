import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'

/** Locks the UI after idle / background based on autoLockSeconds. */
export function useAutoLock() {
  const status = useAuthStore((s) => s.status)
  const pinLocked = useAuthStore((s) => s.pinLocked)
  const hasPin = useAuthStore((s) => s.hasPin)
  const autoLockSeconds = useAuthStore((s) => s.autoLockSeconds)
  const lockWithPin = useAuthStore((s) => s.lockWithPin)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      status !== 'authenticated' ||
      pinLocked ||
      !hasPin ||
      autoLockSeconds <= 0
    ) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const clear = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const arm = () => {
      clear()
      timerRef.current = window.setTimeout(() => {
        lockWithPin()
      }, autoLockSeconds * 1000)
    }

    const onActivity = () => {
      if (document.visibilityState === 'visible') arm()
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        arm()
      } else {
        arm()
      }
    }

    arm()
    const opts = { passive: true } as const
    window.addEventListener('pointerdown', onActivity, opts)
    window.addEventListener('keydown', onActivity, opts)
    window.addEventListener('touchstart', onActivity, opts)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clear()
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('touchstart', onActivity)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, pinLocked, hasPin, autoLockSeconds, lockWithPin])
}
