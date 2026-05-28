import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

async function run() {
  const lider = await sql`
    SELECT a.nombre as alianza, u.nombre as lider
    FROM afiliados a
    LEFT JOIN users u ON a.lider_id = u.id
    WHERE a.nombre ILIKE '%LGI%'
  `
  console.log(lider)
  await sql.end()
}
run()
