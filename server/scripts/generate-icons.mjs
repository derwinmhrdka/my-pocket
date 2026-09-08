import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../../client/public/icons')
mkdirSync(outDir, { recursive: true })

function svg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#C1442C"/>
      <stop offset="1" stop-color="#D8A23B"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#141217"/>
  <rect x="${size * 0.18}" y="${size * 0.22}" width="${size * 0.64}" height="${size * 0.48}" rx="${size * 0.06}" fill="url(#g)"/>
  <rect x="${size * 0.28}" y="${size * 0.72}" width="${size * 0.44}" height="${size * 0.08}" rx="${size * 0.04}" fill="#D8A23B"/>
</svg>`)
}

await Promise.all(
  [192, 512].map((size) =>
    sharp(svg(size)).png().toFile(join(outDir, `icon-${size}.png`)),
  ),
)

console.log('PWA icons generated')
