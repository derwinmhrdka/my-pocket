import { useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cardFaceColor, cardPhotoBackground, CARD_PHOTO_SCRIM } from '../lib/cardFace'
import { useAuthStore } from '../store/useAuthStore'
import { useCardStore } from '../store/useCardStore'
import type { Card } from '../types'
import { OrientedCardMedia } from './OrientedCardMedia'

const FAN = [
  { rotate: -14, x: -46, y: 6, z: 1 },
  { rotate: 0, x: 0, y: -10, z: 3 },
  { rotate: 14, x: 46, y: 6, z: 2 },
] as const

/** Susun favorit: kartu terpilih di slot tengah (index 1). */
function buildSlots(
  favorites: Card[],
  centeredId: string | null,
): Array<Card | null> {
  const list = favorites.slice(0, 3)
  if (list.length === 0) return [null, null, null]

  if (!centeredId) {
    return [list[0] ?? null, list[1] ?? null, list[2] ?? null]
  }

  const center = list.find((c) => c.id === centeredId)
  if (!center) {
    return [list[0] ?? null, list[1] ?? null, list[2] ?? null]
  }

  const rest = list.filter((c) => c.id !== centeredId)
  return [rest[0] ?? null, center, rest[1] ?? null]
}

function FanSlot({
  card,
  index,
  onSelect,
  onAssign,
}: {
  card: Card | null
  index: number
  onSelect: (id: string) => void
  onAssign: () => void
}) {
  const previewOriginal = useAuthStore((s) => s.previewOriginalCard)
  const fan = FAN[index]
  if (!card) {
    return (
      <motion.button
        type="button"
        aria-label="Choose favorite card"
        className="absolute flex h-[190px] w-[150px] items-center justify-center rounded-2xl border border-dashed"
        style={{
          zIndex: 0,
          borderColor: 'rgba(243,237,227,0.2)',
          color: 'var(--paper-dim)',
        }}
        initial={false}
        animate={{
          rotate: fan.rotate,
          x: fan.x,
          y: fan.y,
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={onAssign}
      >
        <span className="brand text-3xl font-semibold leading-none">+</span>
      </motion.button>
    )
  }

  const showPhoto = previewOriginal && Boolean(card.frontThumbPath)

  return (
    <motion.button
      type="button"
      layout
      layoutId={`fan-${card.id}`}
      className="absolute flex h-[190px] w-[150px] items-end overflow-hidden rounded-2xl border p-3.5 text-left text-[13px] font-semibold shadow-[0_12px_24px_rgba(0,0,0,.4)]"
      style={{
        zIndex: fan.z + 2,
        borderColor: 'rgba(255,255,255,0.08)',
        background: showPhoto ? undefined : cardFaceColor(card.id, index),
        boxShadow: showPhoto
          ? '0 12px 24px rgba(0,0,0,.4), inset 0 0 36px rgba(0,0,0,.4)'
          : '0 12px 24px rgba(0,0,0,.4)',
      }}
      initial={false}
      animate={{
        rotate: fan.rotate,
        x: fan.x,
        y: fan.y,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onClick={() => onSelect(card.id)}
    >
      {showPhoto ? (
        <OrientedCardMedia
          src={card.frontThumbPath}
          overlay={CARD_PHOTO_SCRIM}
        />
      ) : null}
      <span className="card-badge relative z-10">{card.name}</span>
    </motion.button>
  )
}

function FavoritePicker({
  candidates,
  busyId,
  onPick,
  onClose,
  onGoMain,
}: {
  candidates: Card[]
  busyId: string | null
  onPick: (id: string) => void
  onClose: () => void
  onGoMain: () => void
}) {
  const previewOriginal = useAuthStore((s) => s.previewOriginalCard)

  return (
    <motion.div
      className="absolute inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(5,4,6,.82)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-6 pb-3 pt-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand text-lg font-bold">Choose favorite</div>
        <button
          type="button"
          className="text-xl"
          style={{ color: 'var(--muted-2)' }}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div
        className="favorite-picker-list flex-1 overflow-y-auto px-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {candidates.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center gap-4 text-sm"
            style={{ color: 'var(--muted)' }}
          >
            <p>No cards available to choose.</p>
            <button
              type="button"
              className="brand rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{
                background:
                  'linear-gradient(120deg, var(--accent), var(--accent-2))',
                color: '#1a1418',
              }}
              onClick={onGoMain}
            >
              Open pocket
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-2">
            {candidates.map((card, i) => {
              const showPhoto =
                previewOriginal && Boolean(card.frontThumbPath)
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  disabled={busyId === card.id}
                  className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border text-left disabled:opacity-60"
                  style={{
                    aspectRatio: '1.586 / 1',
                    borderColor: 'rgba(255,255,255,0.08)',
                    backgroundImage: showPhoto
                      ? cardPhotoBackground(card.frontThumbPath)
                      : cardFaceColor(card.id, i),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: showPhoto
                      ? '0 10px 26px rgba(0,0,0,.45), inset 0 0 36px rgba(0,0,0,.38)'
                      : '0 10px 26px rgba(0,0,0,.45)',
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onPick(card.id)}
                >
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                    <div className="min-w-0">
                      <div className="card-badge">{card.name}</div>
                      {card.cardNo ? (
                        <div className="card-badge-meta">{card.cardNo}</div>
                      ) : null}
                    </div>
                    <span
                      className="text-lg"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      ★
                    </span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function WaveButton({
  children,
  onClick,
  ariaLabel,
  title,
  size,
  tone,
}: {
  children: ReactNode
  onClick: () => void
  ariaLabel: string
  title?: string
  size: number
  tone: 'accent' | 'muted'
}) {
  const [pressed, setPressed] = useState(false)
  const [bursts, setBursts] = useState<number[]>([])
  const burstId = useRef(0)

  const ring =
    tone === 'accent'
      ? 'rgba(216, 162, 59, 0.5)'
      : 'rgba(242, 235, 227, 0.32)'
  const ringSoft =
    tone === 'accent'
      ? 'rgba(196, 72, 54, 0.32)'
      : 'rgba(242, 235, 227, 0.16)'

  function spawnBurst() {
    const id = ++burstId.current
    setBursts((prev) => [...prev, id])
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b !== id))
    }, 900)
  }

  function endPress() {
    setPressed(false)
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size + 36, height: size + 36 }}
    >
      <AnimatePresence>
        {pressed
          ? [0, 1, 2].map((i) => (
              <motion.span
                key={`hold-${i}`}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  border: `1.5px solid ${i % 2 === 0 ? ring : ringSoft}`,
                }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.35,
                  ease: 'easeOut',
                  repeat: Infinity,
                  delay: i * 0.35,
                }}
              />
            ))
          : null}
      </AnimatePresence>

      <AnimatePresence>
        {bursts.map((id) => (
          <motion.span
            key={id}
            aria-hidden
            className="pointer-events-none absolute rounded-full"
            style={{
              width: size,
              height: size,
              border: `1.5px solid ${ring}`,
            }}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={ariaLabel}
        title={title}
        className="relative z-10 flex items-center justify-center rounded-full"
        style={
          tone === 'accent'
            ? {
                width: size,
                height: size,
                background:
                  'linear-gradient(145deg, var(--accent), var(--accent-2))',
                boxShadow: '0 14px 26px rgba(0,0,0,.5)',
              }
            : {
                width: size,
                height: size,
                color: 'var(--muted-2)',
                borderColor: 'var(--line)',
                borderWidth: 1,
                borderStyle: 'solid',
                background: 'var(--ink-2)',
              }
        }
        whileHover={
          tone === 'accent' ? { filter: 'brightness(1.08)' } : { scale: 1.04 }
        }
        whileTap={{ scale: 0.92 }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          setPressed(true)
          spawnBurst()
        }}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
        onClick={onClick}
      >
        {children}
      </motion.button>
    </div>
  )
}

export function ShortcutView() {
  const displayName = useAuthStore((s) => s.displayName)
  const hasPin = useAuthStore((s) => s.hasPin)
  const lockWithPin = useAuthStore((s) => s.lockWithPin)
  const setSettingsOpen = useAuthStore((s) => s.setSettingsOpen)
  const cards = useCardStore((s) => s.cards)
  const setView = useCardStore((s) => s.setView)
  const openDocument = useCardStore((s) => s.openDocument)
  const toggleFavorite = useCardStore((s) => s.toggleFavorite)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [centeredId, setCenteredId] = useState<string | null>(null)

  const favorites = useMemo(
    () => cards.filter((c) => c.isFavorite).slice(0, 3),
    [cards],
  )

  const candidates = useMemo(
    () => cards.filter((c) => !c.isFavorite),
    [cards],
  )

  const slots = useMemo(
    () => buildSlots(favorites, centeredId),
    [favorites, centeredId],
  )

  function handleSelect(id: string) {
    if (centeredId === id) {
      openDocument(id)
      return
    }
    setCenteredId(id)
  }

  async function assignFavorite(id: string) {
    setBusyId(id)
    try {
      await toggleFavorite(id)
      setCenteredId(id)
      setPickerOpen(false)
    } finally {
      setBusyId(null)
    }
  }

  function onLock() {
    if (!hasPin) {
      setSettingsOpen(true)
      return
    }
    lockWithPin()
  }

  return (
    <motion.div
      className="relative flex h-full flex-col items-center justify-center gap-6 px-6"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35 }}
    >
      <div className="text-center">
        <div className="brand text-xl font-bold tracking-[0.2px]">
          My<span style={{ color: 'var(--accent-2)' }}>Pocket</span>
        </div>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif' }}
        >
          Welcome, {displayName?.trim() || 'friend'}
        </p>
      </div>

      <div className="relative flex h-[270px] w-[270px] items-center justify-center">
        {slots.map((card, i) =>
          card ? null : (
            <FanSlot
              key={`empty-${i}`}
              card={null}
              index={i}
              onSelect={handleSelect}
              onAssign={() => setPickerOpen(true)}
            />
          ),
        )}
        {slots.map((card, i) =>
          card ? (
            <FanSlot
              key={card.id}
              card={card}
              index={i}
              onSelect={handleSelect}
              onAssign={() => setPickerOpen(true)}
            />
          ) : null,
        )}
      </div>

      <div className="flex flex-col items-center gap-5">
        <WaveButton
          ariaLabel="Open pocket"
          size={60}
          tone="accent"
          onClick={() => setView('main')}
        >
          <span className="text-[26px]" aria-hidden>
            👛
          </span>
        </WaveButton>

        <WaveButton
          ariaLabel={hasPin ? 'Lock pocket' : 'Set a PIN to lock'}
          title={hasPin ? 'Lock pocket' : 'Set a PIN to lock'}
          size={44}
          tone="muted"
          onClick={onLock}
        >
          <svg
            width="22"
            height="22"
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
        </WaveButton>
      </div>

      <AnimatePresence>
        {pickerOpen ? (
          <FavoritePicker
            candidates={candidates}
            busyId={busyId}
            onPick={assignFavorite}
            onClose={() => setPickerOpen(false)}
            onGoMain={() => {
              setPickerOpen(false)
              setView('main')
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
