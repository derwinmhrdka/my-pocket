import { useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { isPdfPath } from '../lib/imageUtils'
import { useCardStore } from '../store/useCardStore'

type Preview = {
  src: string
  alt: string
  isPdf: boolean
  fileName: string
}

function sanitizeFileName(name: string) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'card'
}

function extFromPath(path: string) {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)
  return m?.[1] ?? (isPdfPath(path) ? 'pdf' : 'jpg')
}

async function fetchBlob(src: string) {
  const res = await fetch(src, { credentials: 'include' })
  if (!res.ok) throw new Error('Could not load file')
  return res.blob()
}

async function blobToPng(blob: Blob) {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas unavailable')
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG convert failed'))),
      'image/png',
    )
  })
  return png
}

async function copyFileToClipboard(src: string, isPdf: boolean) {
  const blob = await fetchBlob(src)
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Copy not supported')
  }

  if (isPdf) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'application/pdf': Promise.resolve(blob),
        }),
      ])
      return
    } catch {
      throw new Error('PDF copy not supported here — use download')
    }
  }

  const type = blob.type || 'image/jpeg'
  try {
    await navigator.clipboard.write([
      new ClipboardItem({ [type]: Promise.resolve(blob) }),
    ])
  } catch {
    const png = await blobToPng(blob)
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': Promise.resolve(png) }),
    ])
  }
}

async function downloadFile(src: string, fileName: string) {
  const blob = await fetchBlob(src)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function chromeBtnClass() {
  return 'pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-95'
}

function chromeBtnStyle(active = false) {
  return {
    color: active ? 'var(--accent-2)' : 'var(--paper)',
    borderColor: active ? 'var(--accent-2)' : 'var(--line)',
    background: 'var(--ink-2)',
  } as const
}

function ImageLightbox({
  preview,
  cardNo,
  onClose,
}: {
  preview: Preview
  cardNo: string | null
  onClose: () => void
}) {
  const [copiedNo, setCopiedNo] = useState(false)
  const [copiedFile, setCopiedFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'copy' | 'download' | null>(null)
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
    setCopiedNo(true)
    window.setTimeout(() => setCopiedNo(false), 1500)
  }

  async function onCopyFile(e: MouseEvent) {
    e.stopPropagation()
    if (busy) return
    setBusy('copy')
    setFileError(null)
    try {
      await copyFileToClipboard(preview.src, preview.isPdf)
      setCopiedFile(true)
      window.setTimeout(() => setCopiedFile(false), 1500)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Copy failed')
      window.setTimeout(() => setFileError(null), 2500)
    } finally {
      setBusy(null)
    }
  }

  async function onDownloadFile(e: MouseEvent) {
    e.stopPropagation()
    if (busy) return
    setBusy('download')
    setFileError(null)
    try {
      await downloadFile(preview.src, preview.fileName)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Download failed')
      window.setTimeout(() => setFileError(null), 2500)
    } finally {
      setBusy(null)
    }
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
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end gap-1 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2"
        style={{ minHeight: chromeBottom }}
      >
        {fileError ? (
          <p
            className="pointer-events-none text-center text-xs"
            style={{ color: 'var(--accent)' }}
          >
            {fileError}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          {preview.isPdf ? null : (
            <button
              type="button"
              className={chromeBtnClass()}
              style={chromeBtnStyle()}
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
          <button
            type="button"
            className={chromeBtnClass()}
            style={chromeBtnStyle(copiedFile)}
            disabled={busy === 'copy'}
            onClick={onCopyFile}
            aria-label="Copy file"
            title={copiedFile ? 'Copied' : 'Copy file'}
          >
            <IconCopy />
          </button>
          <button
            type="button"
            className={chromeBtnClass()}
            style={chromeBtnStyle()}
            disabled={busy === 'download'}
            onClick={onDownloadFile}
            aria-label="Download file"
            title="Download file"
          >
            <IconDownload />
          </button>
          {cardNo ? (
            <button
              type="button"
              className="brand pointer-events-auto flex min-w-0 flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-semibold tracking-wide transition active:scale-[0.98]"
              style={{
                background: 'var(--ink-2)',
                borderColor: copiedNo ? 'var(--accent-2)' : 'var(--line)',
                color: copiedNo ? 'var(--accent-2)' : 'var(--paper)',
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
      </div>
    </motion.div>
  )
}

function IconCopy() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v11" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </svg>
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
            background: 'linear-gradient(160deg,#2b2730,#141217)',
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
        <img
          src={thumbSrc || src}
          alt={alt}
          className="h-full w-full object-cover"
        />
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

  function previewFor(
    path: string,
    side: 'front' | 'back',
  ): Preview {
    const base = sanitizeFileName(card?.name ?? 'card')
    const ext = extFromPath(path)
    return {
      src: path,
      alt: `${card?.name ?? 'card'} ${side}`,
      isPdf: isPdfPath(path),
      fileName: `${base}-${side}.${ext}`,
    }
  }

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
            layoutId={`doc-${card.id}`}
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
              onOpen={() => setPreview(previewFor(card.frontImagePath, 'front'))}
            />

            {card.backImagePath ? (
              <MediaTile
                src={card.backImagePath}
                thumbSrc={card.backThumbPath ?? card.backImagePath}
                alt={`${card.name} back`}
                label="Enlarge back"
                onOpen={() =>
                  setPreview(previewFor(card.backImagePath!, 'back'))
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
