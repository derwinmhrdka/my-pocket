import type { CSSProperties } from 'react'
import { cardFaceColor, cardPhotoBackground } from '../lib/cardFace'
import { useAuthStore } from '../store/useAuthStore'
import type { Card } from '../types'

const CARD_W = 280
const CARD_H = 170
const STACK_GAP = 34
const STACK_GAP_MIN = 24
const LIFT = 22

type Props = {
  card: Card
  index: number
  stackGap?: number
  lifted: boolean
  onTap: () => void
}

export function CardItem({
  card,
  index,
  stackGap = STACK_GAP,
  lifted,
  onTap,
}: Props) {
  const previewOriginal = useAuthStore((s) => s.previewOriginalCard)
  const showPhoto = previewOriginal && Boolean(card.frontThumbPath)

  const rot = index % 2 === 0 ? -2 : 2
  const top = index * stackGap

  const style: CSSProperties = {
    top,
    zIndex: index + 1,
    left: '50%',
    marginLeft: -CARD_W / 2,
    width: CARD_W,
    height: CARD_H,
    transform: lifted
      ? `translate3d(0, -${LIFT}px, 0) rotate(${rot}deg) scale(1.03)`
      : `translate3d(0, 0, 0) rotate(${rot}deg) scale(1)`,
    animationDelay: `${index * 0.05}s`,
    boxShadow: lifted
      ? '0 28px 44px rgba(0,0,0,.65), inset 0 0 40px rgba(0,0,0,.4)'
      : showPhoto
        ? '0 10px 26px rgba(0,0,0,.5), inset 0 0 36px rgba(0,0,0,.38)'
        : '0 10px 26px rgba(0,0,0,.5)',
    backgroundImage: showPhoto
      ? cardPhotoBackground(card.frontThumbPath)
      : cardFaceColor(card.id, index),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderColor: lifted
      ? 'rgba(255,255,255,0.18)'
      : 'rgba(255,255,255,0.08)',
    color: 'var(--paper)',
    cursor: 'pointer',
  }

  return (
    <div
      className="pocket-card pocket-card-enter absolute flex flex-col justify-between overflow-hidden rounded-[18px] border p-[18px]"
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
    >
      <div className="card-badge">{card.name}</div>
      {card.cardNo ? (
        <div className="card-badge-meta">{card.cardNo}</div>
      ) : (
        <div />
      )}
    </div>
  )
}

export const CARD_STACK = { CARD_W, CARD_H, STACK_GAP, STACK_GAP_MIN, LIFT }
