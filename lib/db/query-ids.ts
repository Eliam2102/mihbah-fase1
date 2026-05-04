import 'dotenv/config'
import postgres from 'postgres'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
  const rows = await sql`SELECT id, name, tipo FROM empresas ORDER BY name`
  for (const r of rows) {
    console.log(`${(r.tipo as string).padEnd(15)} ${(r.name as string).padEnd(10)} ${r.id}`)
  }
  await sql.end()
}
main().catch(console.error)
