import { readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { fileURLToPath } from 'url'
import { pool } from './pool.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function initDb() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schema)
  console.log('[db] Schema ready (multi-user Google accounts)')
}

async function main() {
  await initDb()
  await pool.end()
  console.log('[db] init complete')
}

const isDirectRun =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isDirectRun) {
  main().catch((err) => {
    console.error('[db] init failed', err)
    process.exit(1)
  })
}
