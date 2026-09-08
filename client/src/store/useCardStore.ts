import { create } from 'zustand'
import { api } from '../lib/api'
import type { AppView, Card } from '../types'

type CardState = {
  cards: Card[]
  loading: boolean
  view: AppView
  liftedId: string | null
  selectedId: string | null
  registerOpen: boolean
  error: string | null
  setView: (view: AppView) => void
  setLiftedId: (id: string | null) => void
  openDocument: (id: string) => void
  closeDocument: () => void
  setRegisterOpen: (open: boolean) => void
  fetchCards: () => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  createCard: (form: FormData) => Promise<void>
}

export const useCardStore = create<CardState>((set, get) => ({
  cards: [],
  loading: false,
  view: 'shortcut',
  liftedId: null,
  selectedId: null,
  registerOpen: false,
  error: null,

  setView(view) {
    set({ view, liftedId: null })
  },

  setLiftedId(id) {
    set({ liftedId: id })
  },

  openDocument(id) {
    set({ selectedId: id, liftedId: null })
  },

  closeDocument() {
    set({ selectedId: null, liftedId: null })
  },

  setRegisterOpen(open) {
    set({ registerOpen: open })
  },

  async fetchCards() {
    set({ loading: true, error: null })
    try {
      const { cards } = await api.listCards()
      set({ cards, loading: false })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load cards',
      })
    }
  },

  async reorder(orderedIds) {
    const prev = get().cards
    const byId = new Map(prev.map((c) => [c.id, c]))
    const optimistic = orderedIds
      .map((id, i) => {
        const card = byId.get(id)
        return card ? { ...card, sortOrder: i } : null
      })
      .filter(Boolean) as Card[]
    set({ cards: optimistic })
    try {
      const { cards } = await api.reorderCards(orderedIds)
      set({ cards })
    } catch (err) {
      set({
        cards: prev,
        error: err instanceof Error ? err.message : 'Failed to reorder cards',
      })
    }
  },

  async toggleFavorite(id) {
    const { card } = await api.toggleFavorite(id)
    set({
      cards: get().cards.map((c) => (c.id === id ? card : c)),
    })
  },

  async deleteCard(id) {
    await api.deleteCard(id)
    set({
      cards: get().cards.filter((c) => c.id !== id),
      selectedId: null,
      liftedId: null,
    })
  },

  async createCard(form) {
    const { card } = await api.createCard(form)
    set({
      cards: [...get().cards, card],
      registerOpen: false,
    })
  },
}))
