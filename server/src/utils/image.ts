import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '../uploads')

mkdirSync(UPLOADS_DIR, { recursive: true })

function isPdfBuffer(buffer: Buffer, mimeType?: string) {
  if (mimeType === 'application/pdf') return true
  return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF'
}

export function cardPaths(id: string, side: 'front' | 'back', ext: 'jpg' | 'pdf') {
  const base = `${id}-${side}`
  return {
    full: join(UPLOADS_DIR, `${base}.${ext}`),
    thumb: join(UPLOADS_DIR, `${base}-thumb.jpg`),
    fullRel: `/uploads/${base}.${ext}`,
    thumbRel: `/uploads/${base}-thumb.jpg`,
  }
}

async function writePdfThumb(thumbPath: string) {
  const svg = Buffer.from(
    `<svg width="300" height="190" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2b2730"/>
          <stop offset="100%" stop-color="#141217"/>
        </linearGradient>
      </defs>
      <rect width="300" height="190" rx="16" fill="url(#g)"/>
      <rect x="108" y="42" width="84" height="106" rx="8" fill="#1c1a20" stroke="#d8a23b" stroke-width="2"/>
      <path d="M150 42 V68 H176" fill="none" stroke="#d8a23b" stroke-width="2"/>
      <text x="150" y="118" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#f2ebe3">PDF</text>
    </svg>`,
  )
  await sharp(svg).jpeg({ quality: 85 }).toFile(thumbPath)
}

/** Persist upload as image (JPEG + thumb) or PDF (+ placeholder thumb). */
export async function saveCardUpload(
  id: string,
  side: 'front' | 'back',
  buffer: Buffer,
  mimeType?: string,
): Promise<{ fullRel: string; thumbRel: string }> {
  if (isPdfBuffer(buffer, mimeType)) {
    const paths = cardPaths(id, side, 'pdf')
    writeFileSync(paths.full, buffer)
    await writePdfThumb(paths.thumb)
    return { fullRel: paths.fullRel, thumbRel: paths.thumbRel }
  }

  const paths = cardPaths(id, side, 'jpg')

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
