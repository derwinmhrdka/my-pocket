export type Card = {
  id: string
  name: string
  cardNo: string | null
  frontImagePath: string
  backImagePath: string | null
  frontThumbPath: string
  backThumbPath: string | null
  isFavorite: boolean
  sortOrder: number
  createdAt: string
}

export type AppView = 'shortcut' | 'main'
