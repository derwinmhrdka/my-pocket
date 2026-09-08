import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { isPdfPath } from '../lib/imageUtils'
import { useCardStore } from '../store/useCardStore'

type Preview = { src: string; alt: string; isPdf: boolean }

function ImageLightbox({
  preview,
  cardNo,
  onClose,
}: {
  preview: Preview
  cardNo: string | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [rotate, setRotate] = useState(90)

  async function copyCardNo() {
    if (!cardNo) return
    try {
      await navigator.clipboard.writeText(cardNo)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = cardNo
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const sideways = rotate % 180 !== 0
  const chromeTop = 52
  const chromeBottom = 72
  const availW = `calc(100dvw - 8px)`
  const availH = `calc(100dvh - ${chromeTop + chromeBottom}px)`

  return (
    <motion.div
      className="absolute inset-0 z-[400] bg-black/94"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-3 pt-[max(12px,env(safe-area-inset-top))]"
        style={{ height: chromeTop }}
      >
        <button
          type="button"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center text-2xl"
          style={{ color: 'var(--paper-dim)' }}
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      <div
        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        style={{
          paddingTop: chromeTop,
          paddingBottom: chromeBottom,
        }}
      >
        {preview.isPdf ? (
          <iframe
            title={preview.alt}
            src={preview.src}
            className="rounded-md bg-white shadow-2xl"
            style={{
              width: availW,
              height: availH,
              border: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <motion.img
            src={preview.src}
            alt={preview.alt}
            className="rounded-md object-contain shadow-2xl"
            style={{
              maxWidth: sideways ? availH : availW,
              maxHeight: sideways ? availW : availH,
              width: 'auto',
              height: 'auto',
            }}
            initial={{ opacity: 0, scale: 0.96, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
        style={{ height: chromeBottom }}
      >
        {preview.isPdf ? (
          <a
            href={preview.src}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto flex h-11 shrink-0 items-center justify-center rounded-xl border px-3 text-sm"
            style={{
              color: 'var(--paper)',
              borderColor: 'var(--line)',
              background: 'var(--ink-2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
        ) : (
          <button
            type="button"
            className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg"
            style={{
              color: 'var(--paper)',
              borderColor: 'var(--line)',
              background: 'var(--ink-2)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              setRotate((r) => (r + 90) % 360)
            }}
            aria-label="Rotate image"
            title="Rotate"
          >
            ↻
          </button>
        )}
        {cardNo ? (
          <button
            type="button"
            className="brand pointer-events-auto flex min-w-0 flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-semibold tracking-wide transition active:scale-[0.98]"
            style={{
              background: 'var(--ink-2)',
              borderColor: copied ? 'var(--accent-2)' : 'var(--line)',
              color: copied ? 'var(--accent-2)' : 'var(--paper)',
            }}
            onClick={(e) => {
              e.stopPropagation()
              void copyCardNo()
            }}
            aria-label="Copy ID / number"
          >
            {cardNo}
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </motion.div>
  )
}

function MediaTile({
  src,
  thumbSrc,
  alt,
  label,
  onOpen,
}: {
  src: string
  thumbSrc: string
  alt: string
  label: string
  onOpen: () => void
}) {
  const pdf = isPdfPath(src)
  return (
    <button
      type="button"
      className="mt-3 block h-[150px] w-full overflow-hidden rounded-[14px]"
      onClick={onOpen}
      aria-label={label}
    >
      {pdf ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          style={{
            background:
              'linear-gradient(160deg,#2b2730,#141217)',
          }}
        >
          <span
            className="rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide"
            style={{
              color: 'var(--accent-2)',
              borderColor: 'var(--accent-2)',
            }}
          >
            PDF
          </span>
        </div>
      ) : (
        <img src={thumbSrc || src} alt={alt} className="h-full w-full object-cover" />
      )}
    </button>
  )
}

export function DocumentModal() {
  const selectedId = useCardStore((s) => s.selectedId)
  const cards = useCardStore((s) => s.cards)
  const closeDocument = useCardStore((s) => s.closeDocument)
  const toggleFavorite = useCardStore((s) => s.toggleFavorite)
  const deleteCard = useCardStore((s) => s.deleteCard)

  const card = cards.find((c) => c.id === selectedId) ?? null
  const [starPop, setStarPop] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)

  async function onStar() {
    if (!card) return
    setStarPop(true)
    await toggleFavorite(card.id)
    setTimeout(() => setStarPop(false), 220)
  }

  async function onTrash() {
    if (!card) return
    const ok = window.confirm(`Delete “${card.name}”?`)
    if (!ok) return
    setLeaving(true)
    await new Promise((r) => setTimeout(r, 150))
    await deleteCard(card.id)
    setLeaving(false)
  }

  async function copyCardNo() {
    if (!card?.cardNo) return
    try {
      await navigator.clipboard.writeText(card.cardNo)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = card.cardNo
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <AnimatePresence>
      {card ? (
        <motion.div
          className="absolute inset-0 z-[300] flex items-center justify-center px-5"
          style={{ background: 'rgba(5,4,6,.82)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          onClick={closeDocument}
        >
          <motion.div
            layoutId={`card-${card.id}`}
            className="w-[300px] rounded-[22px] border p-[22px]"
            style={{
              background: 'var(--ink-2)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
            initial={false}
            animate={
              leaving
                ? { opacity: 0, scale: 0.9 }
                : { opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="brand text-base font-bold">{card.name}</div>
              <button
                type="button"
                className="text-lg"
                style={{ color: 'var(--muted-2)' }}
                onClick={closeDocument}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {card.cardNo ? (
              <button
                type="button"
                className="brand mt-3 flex w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-semibold tracking-wide transition active:scale-[0.98]"
                style={{
                  background: 'var(--ink)',
                  borderColor: copied ? 'var(--accent-2)' : 'var(--line)',
                  color: copied ? 'var(--accent-2)' : 'var(--paper)',
                }}
                onClick={copyCardNo}
                aria-label="Copy ID / number"
                title={copied ? 'Copied' : undefined}
              >
                {card.cardNo}
              </button>
            ) : null}

            <MediaTile
              src={card.frontImagePath}
              thumbSrc={card.frontThumbPath}
              alt={`${card.name} front`}
              label="Enlarge front"
              onOpen={() =>
                setPreview({
                  src: card.frontImagePath,
                  alt: `${card.name} front`,
                  isPdf: isPdfPath(card.frontImagePath),
                })
              }
            />

            {card.backImagePath ? (
              <MediaTile
                src={card.backImagePath}
                thumbSrc={card.backThumbPath ?? card.backImagePath}
                alt={`${card.name} back`}
                label="Enlarge back"
                onOpen={() =>
                  setPreview({
                    src: card.backImagePath!,
                    alt: `${card.name} back`,
                    isPdf: isPdfPath(card.backImagePath),
                  })
                }
              />
            ) : null}

            <div className="mt-4 flex justify-center gap-2">
              <motion.button
                type="button"
                aria-label={card.isFavorite ? 'Remove favorite' : 'Favorite'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border text-base"
                style={{
                  background: card.isFavorite
                    ? 'var(--accent-2)'
                    : 'var(--ink)',
                  color: card.isFavorite ? '#1a1418' : 'var(--paper)',
                  borderColor: card.isFavorite
                    ? 'var(--accent-2)'
                    : 'var(--line)',
                }}
                animate={{ scale: starPop ? [1, 1.3, 1] : 1 }}
                transition={{ duration: 0.22 }}
                onClick={onStar}
              >
                ★
              </motion.button>
              <button
                type="button"
                aria-label="Delete"
                className="flex h-10 w-10 items-center justify-center rounded-xl border text-base active:scale-95"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  borderColor: 'var(--line)',
                }}
                onClick={onTrash}
              >
                🗑
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {preview ? (
              <ImageLightbox
                key={preview.src}
                preview={preview}
                cardNo={card.cardNo}
                onClose={() => setPreview(null)}
              />
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
