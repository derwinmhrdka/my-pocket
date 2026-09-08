import { useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  fileForUpload,
  isAllowedUpload,
  isPdfFile,
} from '../lib/imageUtils'
import { useCardStore } from '../store/useCardStore'

export function RegisterForm() {
  const open = useCardStore((s) => s.registerOpen)
  const setRegisterOpen = useCardStore((s) => s.setRegisterOpen)
  const createCard = useCardStore((s) => s.createCard)

  const [name, setName] = useState('')
  const [cardNo, setCardNo] = useState('')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pasteSide, setPasteSide] = useState<'front' | 'back'>('front')

  const frontGalleryRef = useRef<HTMLInputElement>(null)
  const frontCameraRef = useRef<HTMLInputElement>(null)
  const backGalleryRef = useRef<HTMLInputElement>(null)
  const backCameraRef = useRef<HTMLInputElement>(null)

  function reset() {
    setName('')
    setCardNo('')
    setFront(null)
    setBack(null)
    setFrontPreview(null)
    setBackPreview(null)
    setError(null)
    setBusy(false)
    setPasteSide('front')
  }

  function close() {
    setRegisterOpen(false)
    reset()
  }

  function onPick(file: File | undefined | null, side: 'front' | 'back') {
    if (!file || !isAllowedUpload(file)) return
    const url = isPdfFile(file) ? file.name : URL.createObjectURL(file)
    if (side === 'front') {
      setFront(file)
      setFrontPreview(url)
    } else {
      setBack(file)
      setBackPreview(url)
    }
    setError(null)
  }

  function fileFromClipboardItems(items: DataTransferItemList | undefined) {
    if (!items) return null
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        return item.getAsFile()
      }
    }
    return null
  }

  function onPasteEvent(e: ClipboardEvent, side: 'front' | 'back') {
    const file = fileFromClipboardItems(e.clipboardData?.items)
    if (!file) return
    e.preventDefault()
    onPick(file, side)
  }

  async function pasteFromClipboard(side: 'front' | 'back') {
    setPasteSide(side)
    try {
      if (!navigator.clipboard?.read) {
        setError('Paste is not supported on this browser')
        return
      }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        onPick(new File([blob], 'pasted.jpg', { type: blob.type }), side)
        return
      }
      setError('No image found in clipboard')
    } catch {
      setError('Could not paste. Copy an image first, then try again.')
    }
  }

  useEffect(() => {
    if (!open) return

    function onWindowPaste(e: globalThis.ClipboardEvent) {
      const file = fileFromClipboardItems(e.clipboardData?.items)
      if (!file) return
      e.preventDefault()
      onPick(file, pasteSide)
    }

    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [open, pasteSide])

  async function onSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!front) {
      setError('Front photo or PDF is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      if (cardNo.trim()) form.append('cardNo', cardNo.trim())
      form.append('front', await fileForUpload(front, 'front.jpg'))
      if (back) {
        form.append('back', await fileForUpload(back, 'back.jpg'))
      }
      await createCard(form)
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-[200] flex items-end"
          style={{ background: 'rgba(5,4,6,.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="hide-scrollbar relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] px-6 pb-8 pt-6"
            style={{ background: 'var(--ink-2)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-5 top-5 text-xl"
              style={{ color: 'var(--muted-2)' }}
              onClick={close}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="brand text-[17px] font-bold">Add Card</div>

            <label
              className="mt-3.5 mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              Document Name
            </label>
            <input
              className="w-full rounded-xl border px-3.5 py-3 text-sm outline-none"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              placeholder="e.g. BCA Debit Card"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label
              className="mt-3.5 mb-1.5 block text-xs"
              style={{ color: 'var(--muted-2)' }}
            >
              ID / Number <span className="opacity-50">(optional)</span>
            </label>
            <input
              className="w-full rounded-xl border px-3.5 py-3 text-sm outline-none tracking-wide"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              placeholder="e.g. passport, card no…"
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
            />

            <PhotoField
              label="Front"
              preview={frontPreview}
              isPdf={Boolean(front && isPdfFile(front))}
              activePaste={pasteSide === 'front'}
              onFocusPaste={() => setPasteSide('front')}
              onPaste={(e) => onPasteEvent(e, 'front')}
              onCamera={() => frontCameraRef.current?.click()}
              onUpload={() => frontGalleryRef.current?.click()}
              onPasteClick={() => void pasteFromClipboard('front')}
              onClear={() => {
                setFront(null)
                setFrontPreview(null)
              }}
            />
            <input
              ref={frontGalleryRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0], 'front')
                e.target.value = ''
              }}
            />
            <input
              ref={frontCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0], 'front')
                e.target.value = ''
              }}
            />

            <PhotoField
              label="Back"
              optional
              preview={backPreview}
              isPdf={Boolean(back && isPdfFile(back))}
              activePaste={pasteSide === 'back'}
              onFocusPaste={() => setPasteSide('back')}
              onPaste={(e) => onPasteEvent(e, 'back')}
              onCamera={() => backCameraRef.current?.click()}
              onUpload={() => backGalleryRef.current?.click()}
              onPasteClick={() => void pasteFromClipboard('back')}
              onClear={() => {
                setBack(null)
                setBackPreview(null)
              }}
            />
            <input
              ref={backGalleryRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0], 'back')
                e.target.value = ''
              }}
            />
            <input
              ref={backCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0], 'back')
                e.target.value = ''
              }}
            />

            {error ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--accent)' }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              className="brand mt-[18px] w-full rounded-[14px] py-3.5 text-sm font-bold disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(120deg, var(--accent), var(--accent-2))',
                color: '#1a1418',
              }}
              onClick={onSave}
            >
              {busy ? 'Saving…' : 'Save Card'}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function PhotoField({
  label,
  optional,
  preview,
  isPdf,
  activePaste,
  onFocusPaste,
  onPaste,
  onCamera,
  onUpload,
  onPasteClick,
  onClear,
}: {
  label: string
  optional?: boolean
  preview: string | null
  isPdf?: boolean
  activePaste: boolean
  onFocusPaste: () => void
  onPaste: (e: ClipboardEvent) => void
  onCamera: () => void
  onUpload: () => void
  onPasteClick: () => void
  onClear: () => void
}) {
  const btnClass =
    'flex h-11 flex-1 items-center justify-center rounded-xl border transition active:scale-95'
  const btnStyle = {
    borderColor: 'var(--line)',
    background: 'var(--ink)',
    color: 'var(--paper)',
  } as const

  return (
    <div className="mt-3.5">
      <label className="mb-1.5 block text-xs" style={{ color: 'var(--muted-2)' }}>
        {label}{' '}
        {optional ? <span className="opacity-50">(optional)</span> : null}
      </label>

      <div
        tabIndex={0}
        role="group"
        aria-label={label}
        className="rounded-[14px] border border-dashed px-3 py-3 outline-none"
        style={{
          borderColor: activePaste ? 'var(--accent-2)' : 'var(--line)',
          background: activePaste ? 'rgba(216,162,59,0.06)' : 'transparent',
        }}
        onClick={onFocusPaste}
        onFocus={onFocusPaste}
        onPaste={onPaste}
      >
        {preview ? (
          <div className="mb-3 flex justify-center">
            {isPdf ? (
              <div
                className="flex max-w-full flex-col items-center gap-1.5 rounded-lg px-4 py-4"
                style={{ background: 'var(--ink)' }}
              >
                <IconPdf />
                <span
                  className="max-w-[220px] truncate text-xs"
                  style={{ color: 'var(--paper-dim)' }}
                  title={preview}
                >
                  {preview}
                </span>
              </div>
            ) : (
              <img
                src={preview}
                alt={`${label} preview`}
                className="max-h-28 rounded-lg object-cover"
              />
            )}
          </div>
        ) : (
          <div
            className="mb-3 flex h-20 items-center justify-center rounded-lg"
            style={{ background: 'var(--ink)' }}
            aria-hidden
          >
            <IconImage />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className={btnClass}
            style={btnStyle}
            aria-label="Camera"
            title="Camera"
            onClick={(e) => {
              e.stopPropagation()
              onFocusPaste()
              onCamera()
            }}
          >
            <IconCamera />
          </button>
          <button
            type="button"
            className={btnClass}
            style={btnStyle}
            aria-label="Upload"
            title="Upload"
            onClick={(e) => {
              e.stopPropagation()
              onFocusPaste()
              onUpload()
            }}
          >
            <IconUpload />
          </button>
          <button
            type="button"
            className={btnClass}
            style={btnStyle}
            aria-label="Paste"
            title="Paste"
            onClick={(e) => {
              e.stopPropagation()
              onPasteClick()
            }}
          >
            <IconPaste />
          </button>
          {preview ? (
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-95"
              style={{
                borderColor: 'var(--line)',
                color: 'var(--muted-2)',
              }}
              aria-label="Clear"
              title="Clear"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
            >
              <IconClear />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.8A1.5 1.5 0 0 1 10.9 3.5h2.2a1.5 1.5 0 0 1 1.2.7L15.5 6h2A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
    </svg>
  )
}

function IconPaste() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5h6a2 2 0 0 1 2 2v1h1.5A1.5 1.5 0 0 1 20 9.5v9A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-9A1.5 1.5 0 0 1 5.5 8H7V7a2 2 0 0 1 2-2Z" />
      <path d="M9 5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7H9V5.5Z" />
    </svg>
  )
}

function IconClear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted-2)', opacity: 0.7 }} aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m7 16 3.5-3.5L14 16l2-2 3 3" />
    </svg>
  )
}

function IconPdf() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-2)' }} aria-hidden>
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 13.5h7M8.5 17h5" />
    </svg>
  )
}
