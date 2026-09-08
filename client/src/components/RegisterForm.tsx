import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fileFromCompressed } from '../lib/imageUtils'
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

  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  function reset() {
    setName('')
    setCardNo('')
    setFront(null)
    setBack(null)
    setFrontPreview(null)
    setBackPreview(null)
    setError(null)
    setBusy(false)
  }

  function close() {
    setRegisterOpen(false)
    reset()
  }

  async function onPick(
    file: File | undefined,
    side: 'front' | 'back',
  ) {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (side === 'front') {
      setFront(file)
      setFrontPreview(url)
    } else {
      setBack(file)
      setBackPreview(url)
    }
  }

  async function onSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!front) {
      setError('Front photo is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      if (cardNo.trim()) form.append('cardNo', cardNo.trim())
      form.append(
        'front',
        await fileFromCompressed(front, 'front.jpg'),
      )
      if (back) {
        form.append('back', await fileFromCompressed(back, 'back.jpg'))
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
            className="relative w-full rounded-t-[28px] px-6 pb-8 pt-6"
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

            <label className="mt-3.5 mb-1.5 block text-xs" style={{ color: 'var(--muted-2)' }}>
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

            <label className="mt-3.5 mb-1.5 block text-xs" style={{ color: 'var(--muted-2)' }}>
              Card No <span className="opacity-50">(optional)</span>
            </label>
            <input
              className="w-full rounded-xl border px-3.5 py-3 text-sm outline-none tracking-wide"
              style={{
                background: 'var(--ink)',
                borderColor: 'var(--line)',
                color: 'var(--paper)',
              }}
              placeholder="e.g. 1234 5678 9012"
              inputMode="numeric"
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
            />

            <label className="mt-3.5 mb-1.5 block text-xs" style={{ color: 'var(--muted-2)' }}>
              Front Photo
            </label>
            <button
              type="button"
              className="w-full rounded-[14px] border border-dashed px-4 py-5 text-center text-[13px]"
              style={{ borderColor: 'var(--line)', color: 'var(--muted-2)' }}
              onClick={() => frontRef.current?.click()}
            >
              {frontPreview ? (
                <img
                  src={frontPreview}
                  alt="Front preview"
                  className="mx-auto max-h-28 rounded-lg object-cover"
                />
              ) : (
                '📷 Front photo'
              )}
            </button>
            <input
              ref={frontRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0], 'front')}
            />

            <label className="mt-3.5 mb-1.5 block text-xs" style={{ color: 'var(--muted-2)' }}>
              Back Photo <span className="opacity-50">(optional)</span>
            </label>
            <button
              type="button"
              className="w-full rounded-[14px] border border-dashed px-4 py-5 text-center text-[13px]"
              style={{ borderColor: 'var(--line)', color: 'var(--muted-2)' }}
              onClick={() => backRef.current?.click()}
            >
              {backPreview ? (
                <img
                  src={backPreview}
                  alt="Back preview"
                  className="mx-auto max-h-28 rounded-lg object-cover"
                />
              ) : (
                '📷 Back photo'
              )}
            </button>
            <input
              ref={backRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0], 'back')}
            />

            {error ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--accent)' }}>
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              className="brand mt-[22px] w-full rounded-[14px] py-3.5 text-sm font-bold disabled:opacity-60"
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
