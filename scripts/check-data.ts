import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env', override: true })
loadEnv({ path: '.env.local', override: false })

async function main() {
  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')

  const empresas = await db.execute(sql`SELECT id, name, tipo FROM empresas`)
  console.log('\n=== EMPRESAS ===')
  console.log(empresas)

  const tenants = await db.execute(sql`SELECT id, name FROM tenants`)
  const tenantId = (tenants[0] as { id: string }).id
  console.log('\n=== TENANT ===', tenantId)

  await db.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`)

  const movs = await db.execute(sql`
    SELECT e.name, m.tipo, COUNT(*)::int AS count, COALESCE(SUM(m.monto),0)::text AS total
    FROM movimientos m JOIN empresas e ON e.id = m.empresa_id
    GROUP BY e.name, m.tipo ORDER BY e.name, m.tipo
  `)
  console.log('\n=== MOVIMIENTOS ===')
  console.log(movs)

  const cuentas = await db.execute(sql`
    SELECT e.name, c.tipo, c.estado, COUNT(*)::int AS count, COALESCE(SUM(c.monto),0)::text AS total
    FROM cuentas_pendientes c JOIN empresas e ON e.id = c.empresa_id
    GROUP BY e.name, c.tipo, c.estado ORDER BY e.name
  `)
  console.log('\n=== CUENTAS PENDIENTES ===')
  console.log(cuentas)

  const ventas = await db.execute(sql`
    SELECT estado_venta, COUNT(*)::int AS count,
           COALESCE(SUM(monto),0)::text AS monto,
           COALESCE(SUM(comision_bmcorp),0)::text AS comision
    FROM ventas_bmcorp GROUP BY estado_venta
  `)
  console.log('\n=== VENTAS BM CORP ===')
  console.log(ventas)

  const acuerdos = await db.execute(sql`
    SELECT COUNT(*)::int AS count, COALESCE(SUM(monto_total),0)::text AS total
    FROM acuerdos_aportacion
  `)
  console.log('\n=== ACUERDOS YCDI ===')
  console.log(acuerdos)

  const pagos = await db.execute(sql`
    SELECT COUNT(*)::int AS count,
           COALESCE(SUM(monto_pagado),0)::text AS pagado,
           COALESCE(SUM(monto_esperado),0)::text AS esperado
    FROM pagos_aportacion
  `)
  console.log('\n=== PAGOS APORTACION ===')
  console.log(pagos)

  const repartos = await db.execute(sql`SELECT COUNT(*)::int AS count FROM repartos_bmcorp`)
  console.log('\n=== REPARTOS BM ===')
  console.log(repartos)

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
