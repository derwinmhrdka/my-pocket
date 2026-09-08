import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useCardStore } from '../store/useCardStore'
import { CardStack } from './CardStack'

export function PocketView() {
  const cards = useCardStore((s) => s.cards)
  const setView = useCardStore((s) => s.setView)
  const setSettingsOpen = useAuthStore((s) => s.setSettingsOpen)
  const displayName = useAuthStore((s) => s.displayName)
  const hasPin = useAuthStore((s) => s.hasPin)
  const lockWithPin = useAuthStore((s) => s.lockWithPin)

  const firstName = firstNameFromDisplay(displayName)

  function onLock() {
    if (!hasPin) {
      setSettingsOpen(true)
      return
    }
    lockWithPin()
  }

  return (
    <motion.div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1.1] }}
    >
      <header className="flex shrink-0 items-baseline justify-between px-6 pb-3 pt-7">
        <div>
          <div className="brand text-[20px]">
            My<span style={{ color: 'var(--accent-2)' }}>Pocket</span>
          </div>
          <div
            className="text-[12px]"
            style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif' }}
          >
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95"
            style={{ color: 'var(--muted-2)' }}
            onClick={onLock}
            aria-label={hasPin ? 'Lock pocket' : 'Set a PIN to lock'}
            title={hasPin ? 'Lock pocket' : 'Set a PIN to lock'}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="4.5" y="10.5" width="15" height="11" rx="2" />
              <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95"
            style={{ color: 'var(--muted-2)' }}
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 13.1a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H10a1.7 1.7 0 0 0 1-1.5V5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V10c.3.6.9 1 1.5 1H19a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1Z" />
            </svg>
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95"
            style={{ color: 'var(--muted-2)' }}
            onClick={() => setView('shortcut')}
            aria-label="Home"
            title="Home"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3.5 10.5 12 3.5l8.5 7V20a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20v-9.5Z" />
              <path d="M9.5 21.5v-7h5v7" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center px-6 pb-6 pt-2">
        <div
          className="relative flex min-h-0 w-full max-w-[328px] flex-1 flex-col items-center rounded-[28px] border px-[6px] pb-[10px] pt-[38px]"
          style={{
            background: 'linear-gradient(180deg,#19171c 0%,#0c0b0f 100%)',
            borderColor: 'rgba(255,255,255,0.07)',
            boxShadow:
              '0 24px 44px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.03)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-[9px] rounded-[21px] border-[1.5px] border-dashed"
            style={{ borderColor: 'rgba(243,237,227,0.14)' }}
          />
          <div
            className="pocket-initials absolute left-5 top-3.5 z-20 max-w-[70%] truncate text-[15px] leading-none"
            style={{ color: 'var(--accent-2)' }}
            title={displayName ?? undefined}
          >
            {firstName}
          </div>
          <div className="relative z-10 min-h-0 w-full flex-1 overflow-hidden">
            <CardStack />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function firstNameFromDisplay(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/).filter(Boolean)[0]
  return first || 'Pocket'
}
