import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')

  const ssl = url.includes('render.com') || url.includes('sslmode=require') ? 'require' : false
  const sql = postgres(url, { max: 1, ssl })

  const rlsSql = readFileSync(join(process.cwd(), 'lib/db/rls.sql'), 'utf-8')

  // Strip comment lines, split on semicolons, execute each statement
  const statements = rlsSql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    await sql.unsafe(stmt)
  }

  await sql.end()
  console.log('RLS policies applied.')
}

main().catch((err) => {
  console.error('apply-rls-prod failed:', err.message ?? err)
  process.exit(1)
})
