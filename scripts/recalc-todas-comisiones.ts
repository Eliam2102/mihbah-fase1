/**
 * Recalcula TODAS las comisiones existentes con el motor actual.
 * Útil cuando se cambia la lógica de detección de tipo, o se actualizan matrices.
 *
 * Uso: tsx scripts/recalc-todas-comisiones.ts
 */
import 'dotenv/config'
import postgres from 'postgres'
import { calcularYPersistirComision } from '@/lib/services/comisiones/comisiones.service'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  if (!t) throw new Error('Tenant no encontrado')
  const tenantId = t.id as string

  const ventas = await sql`
    SELECT id, cliente FROM ventas_bmcorp WHERE tenant_id = ${tenantId}
  `
  console.log(`Recalculando ${ventas.length} ventas...`)

  let ok = 0
  let err = 0
  for (const v of ventas) {
    try {
      await calcularYPersistirComision(tenantId, v.id as string)
      ok++
    } catch (e) {
      err++
      console.error(`  ✗ ${v.cliente}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log(`\n✓ ${ok} recalculadas, ✗ ${err} con error`)

  // Verificar distribución por tipo
  const dist = await sql`
    SELECT tipo_producto, COUNT(*) AS n
    FROM comisiones_calculadas WHERE tenant_id = ${tenantId}
    GROUP BY tipo_producto ORDER BY n DESC
  `
  console.log('\nDistribución final:')
  for (const x of dist as unknown as { tipo_producto: string; n: number }[]) {
    console.log(`  ${x.tipo_producto} = ${x.n}`)
  }

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
