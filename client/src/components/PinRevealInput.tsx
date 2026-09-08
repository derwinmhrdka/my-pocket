import { useEffect, useRef, useState, type CSSProperties } from 'react'

export const PIN_LENGTH = 6
export const PIN_REGEX = new RegExp(`^\\d{${PIN_LENGTH}}$`)
/** Unlock accepts legacy 4-digit PINs and new 6-digit PINs. */
export const PIN_UNLOCK_REGEX = /^\d{4}$|^\d{6}$/

type PinRevealInputProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  style?: CSSProperties
  placeholder?: string
  autoFocus?: boolean
}

/** Shows the last typed digit briefly, then masks as bullets. Centered. */
export function PinRevealInput({
  value,
  onChange,
  className,
  style,
  placeholder = '••••••',
  autoFocus,
}: PinRevealInputProps) {
  const [revealLast, setRevealLast] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(raw: string) {
    const next = raw.replace(/\D/g, '').slice(0, PIN_LENGTH)
    const grew = next.length > value.length
    onChange(next)
    if (grew && next.length > 0) {
      setRevealLast(true)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setRevealLast(false), 450)
    } else {
      setRevealLast(false)
    }
  }

  const display = value
    .split('')
    .map((digit, i) =>
      revealLast && i === value.length - 1 ? digit : '•',
    )
    .join('')

  return (
    <div className={`relative ${className ?? ''}`} style={style}>
      <div
        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-sm tracking-[0.4em]"
        style={{ color: 'var(--paper)' }}
        aria-hidden
      >
        {display ? (
          <span className="pl-[0.4em]">{display}</span>
        ) : (
          <span
            className="pl-[0.4em]"
            style={{ color: 'var(--muted-2)', opacity: 0.4 }}
          >
            {placeholder}
          </span>
        )}
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={PIN_LENGTH}
        autoFocus={autoFocus}
        className="relative z-[2] w-full rounded-[inherit] border-0 bg-transparent px-3.5 py-3 text-center text-sm outline-none tracking-[0.4em]"
        style={{
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          caretColor: 'transparent',
          userSelect: 'none',
        }}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onSelect={(e) => {
          const el = e.currentTarget
          const end = el.value.length
          el.setSelectionRange(end, end)
        }}
        aria-label="PIN"
      />
    </div>
  )
}
