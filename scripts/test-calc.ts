import 'dotenv/config'
import { calcularYPersistirComision } from '@/lib/services/comisiones/comisiones.service'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)

;(async () => {
  const t = await sql`SELECT id FROM tenants WHERE slug='universo-jade' LIMIT 1`
  const tenantId = t[0]!.id as string
  const ventas =
    await sql`SELECT id, cliente, monto FROM ventas_bmcorp WHERE afiliado_id IS NOT NULL LIMIT 3`
  for (const v of ventas) {
    try {
      const r = await calcularYPersistirComision(tenantId, v.id as string)
      if (r) {
        console.log(
          `✓ ${v.cliente} ($${v.monto}): bruta=${r.resultado.comisionBrutaTotal}, liberable=${r.resultado.montoLiberable}, dispersiones=${r.dispersiones.length}`,
        )
        if (r.resultado.advertencias.length) console.log('  adv:', r.resultado.advertencias)
      }
    } catch (e) {
      console.error(`✗ ${v.cliente}: ${(e as Error).message}`)
    }
  }
  await sql.end()
  process.exit(0)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
