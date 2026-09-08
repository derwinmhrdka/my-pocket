import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { Card } from '../types'

const CARD_W = 280
const CARD_H = 170
const STACK_GAP = 34
const STACK_GAP_MIN = 24
const LIFT = 22

const FALLBACK_BG = [
  'linear-gradient(160deg,var(--accent),#7c2718)',
  'linear-gradient(160deg,#2b2730,#141217)',
  'linear-gradient(160deg,var(--accent-2),#8a611c)',
  'linear-gradient(160deg,#3a5a7c,#1c2c3c)',
  'linear-gradient(160deg,#5a3a7c,#2c1c3c)',
]

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const rot = index % 2 === 0 ? -2 : 2
  const top = index * stackGap - (lifted && !isDragging ? LIFT : 0)

  const style: CSSProperties = {
    transform: CSS.Transform.toString(
      transform
        ? {
            ...transform,
            scaleX: isDragging ? 1.05 : 1,
            scaleY: isDragging ? 1.05 : 1,
          }
        : null,
    ),
    transition: isDragging ? transition : undefined,
    top,
    zIndex: isDragging ? 99 : lifted ? 50 : index + 1,
    left: '50%',
    marginLeft: -CARD_W / 2,
    width: CARD_W,
    height: CARD_H,
    rotate: `${rot}deg`,
    animationDelay: `${index * 0.05}s`,
    boxShadow: isDragging
      ? '0 30px 50px rgba(0,0,0,.65)'
      : lifted
        ? '0 26px 40px rgba(0,0,0,.6)'
        : '0 10px 26px rgba(0,0,0,.5)',
    backgroundImage: card.frontThumbPath
      ? `linear-gradient(180deg, transparent 42%, rgba(20,18,23,.75)), url(${card.frontThumbPath})`
      : FALLBACK_BG[index % FALLBACK_BG.length],
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderColor: 'rgba(255,255,255,0.08)',
    color: 'var(--paper)',
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <motion.div
      ref={setNodeRef}
      layoutId={`card-${card.id}`}
      className="pocket-card pocket-card-enter absolute flex flex-col justify-between overflow-hidden rounded-[18px] border p-[18px]"
      style={style}
      initial={false}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return
        e.stopPropagation()
        onTap()
      }}
    >
      <div className="card-badge">{card.name}</div>
      {card.cardNo ? (
        <div className="card-badge-meta">{card.cardNo}</div>
      ) : (
        <div />
      )}
    </motion.div>
  )
}

export const CARD_STACK = { CARD_W, CARD_H, STACK_GAP, STACK_GAP_MIN, LIFT }
