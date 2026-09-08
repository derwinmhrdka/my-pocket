import { Router } from 'express'
import { unlink } from 'fs/promises'
import multer from 'multer'
import { join } from 'path'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { saveCardUpload, UPLOADS_DIR } from '../utils/image.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
})

type CardRow = {
  id: string
  name: string
  card_no: string | null
  front_image_path: string
  back_image_path: string | null
  front_thumb_path: string | null
  back_thumb_path: string | null
  is_favorite: boolean
  sort_order: number
  created_at: Date
}

function mapCard(row: CardRow) {
  return {
    id: row.id,
    name: row.name,
    cardNo: row.card_no,
    frontImagePath: row.front_image_path,
    backImagePath: row.back_image_path,
    frontThumbPath: row.front_thumb_path ?? row.front_image_path,
    backThumbPath: row.back_thumb_path,
    isFavorite: row.is_favorite,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

async function removeFileIfExists(relPath: string | null | undefined) {
  if (!relPath) return
  const filename = relPath.replace(/^\/uploads\//, '')
  try {
    await unlink(join(UPLOADS_DIR, filename))
  } catch {
    // ignore missing files
  }
}

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query<CardRow>(
      `SELECT * FROM cards
       WHERE user_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [req.userId],
    )
    res.json({ cards: rows.map(mapCard) })
  } catch (err) {
    console.error('[cards/list]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post(
  '/',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]),
  async (req, res) => {
    const name = String(req.body?.name ?? '').trim()
    const cardNo = String(req.body?.cardNo ?? '').trim() || null
    const files = req.files as {
      front?: Express.Multer.File[]
      back?: Express.Multer.File[]
    }
    const front = files?.front?.[0]
    const back = files?.back?.[0]

    if (!name) {
      res.status(400).json({ error: 'Name is required' })
      return
    }
    if (!front) {
      res.status(400).json({ error: 'Front photo or PDF is required' })
      return
    }

    const allowed = (f: Express.Multer.File) =>
      f.mimetype.startsWith('image/') ||
      f.mimetype === 'application/pdf' ||
      f.originalname.toLowerCase().endsWith('.pdf')

    if (!allowed(front) || (back && !allowed(back))) {
      res.status(400).json({ error: 'Only images or PDF are allowed' })
      return
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: maxRows } = await client.query<{ max: number | null }>(
        'SELECT MAX(sort_order) AS max FROM cards WHERE user_id = $1',
        [req.userId],
      )
      const nextOrder = (maxRows[0]?.max ?? -1) + 1

      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO cards (user_id, name, card_no, front_image_path, sort_order)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING id`,
        [req.userId, name, cardNo, nextOrder],
      )
      const id = rows[0].id

      const frontSaved = await saveCardUpload(
        id,
        'front',
        front.buffer,
        front.mimetype,
      )
      let backSaved: { fullRel: string; thumbRel: string } | null = null
      if (back) {
        backSaved = await saveCardUpload(id, 'back', back.buffer, back.mimetype)
      }

      const { rows: updated } = await client.query<CardRow>(
        `UPDATE cards SET
           front_image_path = $2,
           front_thumb_path = $3,
           back_image_path = $4,
           back_thumb_path = $5
         WHERE id = $1 AND user_id = $6
         RETURNING *`,
        [
          id,
          frontSaved.fullRel,
          frontSaved.thumbRel,
          backSaved?.fullRel ?? null,
          backSaved?.thumbRel ?? null,
          req.userId,
        ],
      )

      await client.query('COMMIT')
      res.status(201).json({ card: mapCard(updated[0]) })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('[cards/create]', err)
      res.status(500).json({ error: 'Server error' })
    } finally {
      client.release()
    }
  },
)

router.patch('/reorder', async (req, res) => {
  const orderedIds = req.body?.orderedIds as string[] | undefined
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: 'orderedIds required' })
    return
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE cards SET sort_order = $2 WHERE id = $1 AND user_id = $3',
        [orderedIds[i], i, req.userId],
      )
    }
    await client.query('COMMIT')
    const { rows } = await pool.query<CardRow>(
      `SELECT * FROM cards
       WHERE user_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [req.userId],
    )
    res.json({ cards: rows.map(mapCard) })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[cards/reorder]', err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

router.patch('/:id/favorite', async (req, res) => {
  const { id } = req.params
  try {
    const { rows } = await pool.query<CardRow>(
      `UPDATE cards
       SET is_favorite = NOT is_favorite
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.userId],
    )
    if (!rows[0]) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    res.json({ card: mapCard(rows[0]) })
  } catch (err) {
    console.error('[cards/favorite]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const { rows } = await pool.query<CardRow>(
      'DELETE FROM cards WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId],
    )
    if (!rows[0]) {
      res.status(404).json({ error: 'Card not found' })
      return
    }
    const card = rows[0]
    await Promise.all([
      removeFileIfExists(card.front_image_path),
      removeFileIfExists(card.back_image_path),
      removeFileIfExists(card.front_thumb_path),
      removeFileIfExists(card.back_thumb_path),
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error('[cards/delete]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
