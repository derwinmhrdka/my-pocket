import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db/init.js'
import authRoutes from './routes/auth.js'
import cardRoutes from './routes/cards.js'
import googleAuthRoutes from './routes/googleAuth.js'
import { UPLOADS_DIR } from './utils/image.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
const port = Number(process.env.PORT ?? 13001)
const isProd = process.env.NODE_ENV === 'production'
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:13002'
const clientDist =
  process.env.CLIENT_DIST ?? join(__dirname, '../../client/dist')

if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
  console.log('[server] Google OAuth: configured')
} else {
  console.log('[server] Google OAuth: not configured (missing CLIENT_ID/SECRET)')
}

app.set('trust proxy', 1)

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(UPLOADS_DIR))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/auth', googleAuthRoutes)
app.use('/api/cards', cardRoutes)

if (isProd && existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/auth')
    ) {
      next()
      return
    }
    res.sendFile(join(clientDist, 'index.html'))
  })
}

async function main() {
  await initDb()
  app.listen(port, '0.0.0.0', () => {
    console.log(`[server] MyPocket on http://0.0.0.0:${port}`)
  })
}

main().catch((err) => {
  console.error('[server] Failed to start', err)
  process.exit(1)
})
