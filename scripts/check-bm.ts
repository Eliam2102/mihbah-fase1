import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env', override: true })
loadEnv({ path: '.env.local', override: false })

async function main() {
  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')
  // Bypass RLS — see all tenants
  const r = await db.execute(sql`SELECT count(*)::int AS c FROM ventas_bmcorp`)
  console.log('ventas_bmcorp ALL TENANTS:', r)
  process.exit(0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
