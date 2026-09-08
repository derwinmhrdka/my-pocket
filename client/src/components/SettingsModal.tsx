import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'

const LOCK_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
  { value: 600, label: '10 min' },
  { value: 900, label: '15 min' },
  { value: 1800, label: '30 min' },
] as const

export function SettingsModal() {
  const open = useAuthStore((s) => s.settingsOpen)
  const setSettingsOpen = useAuthStore((s) => s.setSettingsOpen)
  const displayName = useAuthStore((s) => s.displayName)
  const email = useAuthStore((s) => s.email)
  const hasPin = useAuthStore((s) => s.hasPin)
  const autoLockSeconds = useAuthStore((s) => s.autoLockSeconds)
  const updateSettings = useAuthStore((s) => s.updateSettings)
  const updatePin = useAuthStore((s) => s.updatePin)
  const logout = useAuthStore((s) => s.logout)

  const [name, setName] = useState(displayName ?? '')
  const [lockSecs, setLockSecs] = useState(autoLockSeconds)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(displayName ?? '')
    setLockSecs(autoLockSeconds)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setMessage(null)
    setError(null)
    window.setTimeout(() => nameRef.current?.focus(), 50)
  }, [open, displayName, autoLockSeconds])

  async function saveProfile() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await updateSettings({
        displayName: name.trim(),
        autoLockSeconds: lockSecs,
      })
      setMessage('Settings saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  async function savePin() {
    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('PIN confirmation does not match')
      return
    }
    if (hasPin && !/^\d{4}$/.test(currentPin)) {
      setError('Enter your current PIN')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await updatePin({
        currentPin: hasPin ? currentPin : undefined,
        newPin,
      })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setMessage('PIN updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update PIN')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[350] flex items-end justify-center px-4 pb-6"
          style={{ background: 'rgba(5,4,6,.82)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSettingsOpen(false)}
        >
          <motion.div
            className="max-h-[88dvh] w-full max-w-[360px] overflow-y-auto rounded-[22px] border p-5"
            style={{
              background: 'var(--ink-2)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="brand text-[17px] font-bold">Settings</div>
              <button
                type="button"
                className="text-xl"
                style={{ color: 'var(--muted-2)' }}
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {email ? (
              <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
                Signed in as {email}
              </p>
            ) : null}

            <label
              className="mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              Display name
            </label>
            <input
              ref={nameRef}
              className="mb-3 w-full rounded-xl border px-3.5 py-3 text-sm outline-none"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
            />

            <label
              className="mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              Auto-lock after
            </label>
            <select
              className="mb-4 w-full rounded-xl border px-3.5 py-3 text-sm outline-none"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              value={lockSecs}
              onChange={(e) => setLockSecs(Number(e.target.value))}
            >
              {LOCK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={busy}
              className="brand mb-5 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(120deg, var(--accent), var(--accent-2))',
                color: '#1a1418',
              }}
              onClick={() => void saveProfile()}
            >
              Save profile
            </button>

            <div
              className="mb-3 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--muted-2)' }}
            >
              {hasPin ? 'Change PIN' : 'Set PIN (optional)'}
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
              PIN protects your pocket after auto-lock. Sign-in is always with
              Google.
            </p>

            {hasPin ? (
              <>
                <label
                  className="mb-1.5 block text-xs"
                  style={{ color: 'var(--muted-2)' }}
                >
                  Current PIN
                </label>
                <input
                  className="mb-3 w-full rounded-xl border px-3.5 py-3 text-sm outline-none tracking-[0.3em]"
                  style={{
                    background: 'var(--ink)',
                    borderColor: 'var(--line)',
                    color: 'var(--paper)',
                  }}
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) =>
                    setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="••••"
                />
              </>
            ) : null}

            <label
              className="mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              New PIN
            </label>
            <input
              className="mb-3 w-full rounded-xl border px-3.5 py-3 text-sm outline-none tracking-[0.3em]"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) =>
                setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
            />

            <label
              className="mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              Confirm PIN
            </label>
            <input
              className="mb-4 w-full rounded-xl border px-3.5 py-3 text-sm outline-none tracking-[0.3em]"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
            />

            <button
              type="button"
              disabled={busy}
              className="brand mb-4 w-full rounded-xl border py-3 text-sm font-bold disabled:opacity-60"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              onClick={() => void savePin()}
            >
              {hasPin ? 'Update PIN' : 'Set PIN'}
            </button>

            {error ? (
              <p className="mb-3 text-sm" style={{ color: 'var(--accent)' }}>
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="mb-3 text-sm" style={{ color: 'var(--accent-2)' }}>
                {message}
              </p>
            ) : null}

            <button
              type="button"
              className="w-full rounded-xl py-3 text-sm"
              style={{ color: 'var(--muted-2)' }}
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
