import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useCardStore } from '../store/useCardStore'
import type { Card } from '../types'

const FAN = [
  { rotate: -14, x: -46, y: 6, z: 1 },
  { rotate: 0, x: 0, y: -10, z: 3 },
  { rotate: 14, x: 46, y: 6, z: 2 },
] as const

const PLACEHOLDER_BG = [
  'linear-gradient(160deg,#2b2730,#141217)',
  'linear-gradient(160deg,var(--accent),#7c2718)',
  'linear-gradient(160deg,var(--accent-2),#8a611c)',
]

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

  return (
    <motion.button
      type="button"
      layout
      layoutId={`fan-${card.id}`}
      className="absolute flex h-[190px] w-[150px] items-end overflow-hidden rounded-2xl border p-3.5 text-left text-[13px] font-semibold shadow-[0_12px_24px_rgba(0,0,0,.4)]"
      style={{
        zIndex: fan.z + 2,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundImage: card.frontThumbPath
          ? `linear-gradient(180deg,transparent 40%,rgba(0,0,0,.75)), url(${card.frontThumbPath})`
          : PLACEHOLDER_BG[index],
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
      <span className="card-name relative z-10 text-[13px]">{card.name}</span>
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
            {candidates.map((card, i) => (
              <motion.button
                key={card.id}
                type="button"
                disabled={busyId === card.id}
                className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border text-left disabled:opacity-60"
                style={{
                  aspectRatio: '1.586 / 1',
                  borderColor: 'rgba(255,255,255,0.08)',
                  backgroundImage: card.frontThumbPath
                    ? `linear-gradient(180deg,transparent 35%,rgba(0,0,0,.78)), url(${card.frontThumbPath})`
                    : PLACEHOLDER_BG[i % PLACEHOLDER_BG.length],
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 10px 26px rgba(0,0,0,.45)',
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onPick(card.id)}
              >
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                  <div className="min-w-0">
                    <div className="card-name truncate">{card.name}</div>
                    {card.cardNo ? (
                      <div
                        className="card-meta mt-0.5 truncate"
                        style={{ color: 'rgba(243,237,227,.7)' }}
                      >
                        {card.cardNo}
                      </div>
                    ) : null}
                  </div>
                  <span className="text-lg" style={{ color: 'var(--accent-2)' }}>
                    ★
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function ShortcutView() {
  const displayName = useAuthStore((s) => s.displayName)
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

      <motion.button
        type="button"
        aria-label="Open pocket"
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-[26px] shadow-[0_14px_26px_rgba(0,0,0,.5)]"
        style={{
          background: 'linear-gradient(145deg, var(--accent), var(--accent-2))',
        }}
        whileHover={{ filter: 'brightness(1.08)' }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setView('main')}
      >
        👛
      </motion.button>

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
