import 'dotenv/config'
import { execSync } from 'child_process'
import { join } from 'path'

// Use psql directly — it handles multi-statement SQL files correctly
// (avoids postgres.js transaction wrapping and semicolon-splitting issues)
async function applyRls() {
  const rlsPath = join(process.cwd(), 'lib/db/rls.sql')
  const dbUrl = process.env.DATABASE_URL!

  console.log('🔒 Applying RLS policies via psql...')

  // psql exits non-zero on error
  execSync(`psql "${dbUrl}" -f "${rlsPath}"`, { stdio: 'inherit' })

  console.log('✅ RLS policies applied.')
}

applyRls().catch((err) => {
  console.error('❌ apply-rls failed:', err.message ?? err)
  process.exit(1)
})
