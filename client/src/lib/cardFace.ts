export const CARD_FACE_COLORS = [
  'linear-gradient(160deg,var(--accent),#7c2718)',
  'linear-gradient(160deg,#2b2730,#141217)',
  'linear-gradient(160deg,var(--accent-2),#8a611c)',
  'linear-gradient(160deg,#3a5a7c,#1c2c3c)',
  'linear-gradient(160deg,#5a3a7c,#2c1c3c)',
  'linear-gradient(160deg,#1f4d3a,#0f241c)',
  'linear-gradient(160deg,#6b3a2e,#2a1612)',
  'linear-gradient(160deg,#2e4a6b,#121c2a)',
] as const

/** Darken + bottom shadow so original photos aren’t too readable on card faces. */
export const CARD_PHOTO_SCRIM =
  'linear-gradient(rgba(12,10,14,.42), rgba(12,10,14,.42)), linear-gradient(180deg, transparent 28%, rgba(8,6,10,.88))'

export function cardPhotoBackground(thumbPath: string) {
  return `${CARD_PHOTO_SCRIM}, url(${thumbPath})`
}

function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return h
}

/** Stable “random” plain face color from card id. */
export function cardFaceColor(cardId: string, fallbackIndex = 0) {
  const idx =
    cardId.length > 0
      ? hashId(cardId) % CARD_FACE_COLORS.length
      : fallbackIndex % CARD_FACE_COLORS.length
  return CARD_FACE_COLORS[idx]
}
