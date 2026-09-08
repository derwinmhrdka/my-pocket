import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCardStore } from '../store/useCardStore'
import { useAuthStore } from '../store/useAuthStore'
import { cardFaceColor, cardPhotoBackground } from '../lib/cardFace'
import { CardItem, CARD_STACK } from './CardItem'
import type { Card } from '../types'

const PICK_BTN_H = 40
const PICK_GAP = 12

function SortableListCard({
  card,
  index,
  onOpen,
}: {
  card: Card
  index: number
  onOpen: (id: string) => void
}) {
  const previewOriginal = useAuthStore((s) => s.previewOriginalCard)
  const showPhoto = previewOriginal && Boolean(card.frontThumbPath)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="relative w-full max-w-[320px] overflow-hidden rounded-[18px] border text-left"
      style={{
        aspectRatio: '1.586 / 1',
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundImage: showPhoto
          ? cardPhotoBackground(card.frontThumbPath)
          : cardFaceColor(card.id, index),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: isDragging
          ? '0 18px 36px rgba(0,0,0,.55), inset 0 0 36px rgba(0,0,0,.38)'
          : showPhoto
            ? '0 10px 26px rgba(0,0,0,.45), inset 0 0 36px rgba(0,0,0,.38)'
            : '0 10px 26px rgba(0,0,0,.45)',
        transform: CSS.Transform.toString(
          transform
            ? {
                ...transform,
                scaleX: isDragging ? 1.03 : 1,
                scaleY: isDragging ? 1.03 : 1,
              }
            : null,
        ),
        transition,
        opacity: isDragging ? 0.92 : 1,
        zIndex: isDragging ? 20 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (isDragging) return
        onOpen(card.id)
      }}
    >
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
        <div className="min-w-0">
          <div className="card-badge">{card.name}</div>
          {card.cardNo ? (
            <div className="card-badge-meta">{card.cardNo}</div>
          ) : null}
        </div>
        <span
          className="text-xs tracking-wide"
          style={{ color: 'var(--paper-dim)' }}
          aria-hidden
        >
          ⋮⋮
        </span>
      </div>
    </button>
  )
}

function QuickOpenPicker({
  cards,
  onPick,
  onClose,
  onReorder,
}: {
  cards: Card[]
  onPick: (id: string) => void
  onClose: () => void
  onReorder: (orderedIds: string[]) => Promise<void>
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  )

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cards.findIndex((c) => c.id === active.id)
    const newIndex = cards.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(cards, oldIndex, newIndex)
    await onReorder(next.map((c) => c.id))
  }

  return (
    <motion.div
      className="fixed inset-0 z-[500] flex flex-col"
      style={{ background: 'rgba(5,4,6,.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-between px-5 pb-2 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brand text-base font-bold">Cards</div>
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
      <p
        className="shrink-0 px-6 pb-3 text-xs"
        style={{ color: 'var(--muted)' }}
        onClick={(e) => e.stopPropagation()}
      >
        Drag to reorder · tap to open
      </p>

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col items-center gap-4 pt-1">
                {cards.map((card, i) => (
                  <SortableListCard
                    key={card.id}
                    card={card}
                    index={i}
                    onOpen={onPick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const fit = () => {
      const available = el.clientHeight
      if (available <= 0) return
      const n = cards.length
      const spacing = n > 0 ? 14 : 0
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

  const n = cards.length
  const addTop = n === 0 ? 0 : (n - 1) * gap + CARD_STACK.CARD_H + 14
  const pickTop = addTop + CARD_STACK.CARD_H + PICK_GAP
  const stackHeight = pickTop + PICK_BTN_H

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
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
          onClick={() => {
            setLiftedId(null)
            setPickerOpen(true)
          }}
          aria-label="Select and reorder cards"
          title="List & reorder"
        >
          ▤
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {pickerOpen ? (
            <QuickOpenPicker
              key="card-list"
              cards={cards}
              onClose={() => setPickerOpen(false)}
              onReorder={reorder}
              onPick={(id) => {
                setPickerOpen(false)
                openDocument(id)
              }}
            />
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
