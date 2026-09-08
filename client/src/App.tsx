import { useEffect } from 'react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { DocumentModal } from './components/DocumentModal'
import { LockScreen } from './components/LockScreen'
import { PocketView } from './components/PocketView'
import { RegisterForm } from './components/RegisterForm'
import { SettingsModal } from './components/SettingsModal'
import { ShortcutView } from './components/ShortcutView'
import { useAutoLock } from './hooks/useAutoLock'
import { useAuthStore } from './store/useAuthStore'
import { useCardStore } from './store/useCardStore'

export default function App() {
  const status = useAuthStore((s) => s.status)
  const pinLocked = useAuthStore((s) => s.pinLocked)
  const checkSession = useAuthStore((s) => s.checkSession)
  const view = useCardStore((s) => s.view)
  const fetchCards = useCardStore((s) => s.fetchCards)

  useAutoLock()

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('authError')
    if (params.has('auth') || authError) {
      window.history.replaceState({}, '', window.location.pathname)
      if (authError === 'invalid_state') {
        useAuthStore
          .getState()
          .setError('Sign-in was interrupted. Please try again.')
      } else if (authError === 'google_failed') {
        useAuthStore
          .getState()
          .setError('Google sign-in failed. Please try again.')
      } else if (authError) {
        useAuthStore.getState().setError('Sign-in failed. Please try again.')
      }
      void checkSession()
    }
  }, [checkSession])

  useEffect(() => {
    if (status === 'authenticated' && !pinLocked) {
      void fetchCards()
    }
  }, [status, pinLocked, fetchCards])

  const showApp = status === 'authenticated' && !pinLocked
  const showLock = status === 'locked' || pinLocked

  return (
    <LayoutGroup>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden">
        <div
          className="relative mx-auto flex h-dvh max-h-dvh w-full max-w-[430px] flex-col overflow-hidden"
          style={{
            background: 'var(--ink)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <AnimatePresence mode="wait">
            {status === 'unknown' ? (
              <div
                key="boot"
                className="flex h-full items-center justify-center text-sm"
                style={{ color: 'var(--muted)' }}
              >
                Loading…
              </div>
            ) : showLock ? (
              <LockScreen key="lock" />
            ) : showApp && view === 'shortcut' ? (
              <ShortcutView key="shortcut" />
            ) : showApp ? (
              <PocketView key="main" />
            ) : null}
          </AnimatePresence>

          {showApp ? (
            <>
              <RegisterForm />
              <DocumentModal />
              <SettingsModal />
            </>
          ) : null}
        </div>
      </div>
    </LayoutGroup>
  )
}
