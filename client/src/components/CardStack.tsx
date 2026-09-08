import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useCardStore } from '../store/useCardStore'
import { CardItem, CARD_STACK } from './CardItem'
import type { Card } from '../types'

const PLACEHOLDER_BG = [
  'linear-gradient(160deg,var(--accent),#7c2718)',
  'linear-gradient(160deg,#2b2730,#141217)',
  'linear-gradient(160deg,var(--accent-2),#8a611c)',
  'linear-gradient(160deg,#3a5a7c,#1c2c3c)',
  'linear-gradient(160deg,#5a3a7c,#2c1c3c)',
]

const PICK_BTN_H = 40
const PICK_GAP = 12

function QuickOpenPicker({
  cards,
  onPick,
  onClose,
}: {
  cards: Card[]
  onPick: (id: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[400] flex flex-col"
      style={{ background: 'rgba(5,4,6,.82)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="flex shrink-0 justify-end px-5 pb-2 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
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
        {cards.length === 0 ? (
          <div
            className="flex h-full items-center justify-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            No cards yet
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-1">
            {cards.map((card, i) => (
              <motion.button
                key={card.id}
                type="button"
                className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border text-left"
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
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="card-name truncate text-[var(--paper)]">
                    {card.name}
                  </div>
                  {card.cardNo ? (
                    <div className="card-meta mt-0.5 truncate text-[var(--paper)]">
                      {card.cardNo}
                    </div>
                  ) : null}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function CardStack() {
  const cards = useCardStore((s) => s.cards)
  const liftedId = useCardStore((s) => s.liftedId)
  const setLiftedId = useCardStore((s) => s.setLiftedId)
  const openDocument = useCardStore((s) => s.openDocument)
  const setRegisterOpen = useCardStore((s) => s.setRegisterOpen)
  const reorder = useCardStore((s) => s.reorder)

  const wrapRef = useRef<HTMLDivElement>(null)
  const [gap, setGap] = useState(CARD_STACK.STACK_GAP)
  const [pickerOpen, setPickerOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  )

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const fit = () => {
      const available = el.clientHeight
      if (available <= 0) return
      const n = cards.length
      const spacing = n > 0 ? 14 : 0
      // cards stack + add slot + pick button
      const reserved =
        (n > 0
          ? CARD_STACK.CARD_H + spacing + CARD_STACK.CARD_H
          : CARD_STACK.CARD_H) +
        PICK_GAP +
        PICK_BTN_H
      const gapCount = Math.max(n - 1, 0)
      if (gapCount === 0) {
        setGap(CARD_STACK.STACK_GAP)
        return
      }
      const next = Math.floor((available - reserved) / gapCount)
      setGap(
        Math.max(
          CARD_STACK.STACK_GAP_MIN,
          Math.min(CARD_STACK.STACK_GAP, next),
        ),
      )
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cards.length])

  function handleTap(id: string) {
    if (liftedId === id) {
      openDocument(id)
    } else {
      setLiftedId(id)
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cards.findIndex((c) => c.id === active.id)
    const newIndex = cards.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(cards, oldIndex, newIndex)
    await reorder(next.map((c) => c.id))
  }

  const n = cards.length
  const addTop =
    n === 0 ? 0 : (n - 1) * gap + CARD_STACK.CARD_H + 14
  const pickTop = addTop + CARD_STACK.CARD_H + PICK_GAP
  const stackHeight = pickTop + PICK_BTN_H

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className="relative mx-auto w-full max-w-[320px]"
            style={{ height: stackHeight }}
          >
            {cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                index={index}
                stackGap={gap}
                lifted={liftedId === card.id}
                onTap={() => handleTap(card.id)}
              />
            ))}

            <button
              type="button"
              className="absolute left-1/2 flex h-[170px] w-[280px] -translate-x-1/2 flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed transition-[border-color,color] duration-150"
              style={{
                top: addTop,
                zIndex: 0,
                borderColor: 'var(--paper-dim)',
                color: 'var(--paper-dim)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-2)'
                e.currentTarget.style.color = 'var(--accent-2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--paper-dim)'
                e.currentTarget.style.color = 'var(--paper-dim)'
              }}
              onClick={() => setRegisterOpen(true)}
              aria-label="Add card"
            >
              <span className="plus">+</span>
            </button>

            <button
              type="button"
              className="absolute left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border transition"
              style={{
                top: pickTop,
                zIndex: 1,
                borderColor: 'var(--line)',
                background: 'var(--ink-2)',
                color: 'var(--paper-dim)',
              }}
              onClick={() => setPickerOpen(true)}
              aria-label="Select card"
            >
              ▤
            </button>
          </div>
        </SortableContext>
      </DndContext>

      <AnimatePresence>
        {pickerOpen ? (
          <QuickOpenPicker
            cards={cards}
            onClose={() => setPickerOpen(false)}
            onPick={(id) => {
              setPickerOpen(false)
              openDocument(id)
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
