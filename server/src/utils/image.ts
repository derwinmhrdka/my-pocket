import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '../uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

export function cardPaths(id: string, side: 'front' | 'back') {
  const base = `${id}-${side}`
  return {
    full: join(UPLOADS_DIR, `${base}.jpg`),
    thumb: join(UPLOADS_DIR, `${base}-thumb.jpg`),
    fullRel: `/uploads/${base}.jpg`,
    thumbRel: `/uploads/${base}-thumb.jpg`,
  }
}

/** Persist full image + ~300px thumbnail. Returns relative URL paths. */
export async function saveCardImage(
  id: string,
  side: 'front' | 'back',
  buffer: Buffer,
): Promise<{ fullRel: string; thumbRel: string }> {
  const paths = cardPaths(id, side)

  await sharp(buffer)
    .rotate()
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(paths.full)

  await sharp(buffer)
    .rotate()
    .resize({ width: 300, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(paths.thumb)

  return { fullRel: paths.fullRel, thumbRel: paths.thumbRel }
}
