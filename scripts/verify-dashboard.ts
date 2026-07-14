import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env', override: true })
loadEnv({ path: '.env.local', override: false })

async function main() {
  const { db } = await import('@/lib/db')
  const { sql } = await import('drizzle-orm')
  const { getResumenGeneral, getCuentasConsolidado, getMihbahEstimadoVsAvance } =
    await import('@/lib/services/dashboard-general.service')

  const r = await db.execute(sql`SELECT id FROM tenants LIMIT 1`)
  const tenantId = (r[0] as { id: string }).id
  console.log('Tenant:', tenantId)

  const anio = 2026
  console.log(`\n=== RESUMEN GENERAL ${anio} ===`)
  const resumen = await getResumenGeneral(tenantId, { anio })
  for (const e of resumen.empresas) {
    console.log(
      `  ${e.nombre.padEnd(8)} (${e.tipo.padEnd(12)}) ` +
        `INGRESOS=${e.ingresos.toLocaleString().padStart(15)} ` +
        `EGRESOS=${e.egresos.toLocaleString().padStart(15)} ` +
        `NETO=${e.neto.toLocaleString().padStart(15)} ` +
        `CXC=${e.cxc.toLocaleString().padStart(10)} CXP=${e.cxp.toLocaleString().padStart(10)}` +
        (e.parcial ? ' [PARCIAL]' : ''),
    )
  }
  console.log(
    `  ${'TOTAL'.padEnd(23)} INGRESOS=${resumen.totalIngresos.toLocaleString().padStart(15)} EGRESOS=${resumen.totalEgresos.toLocaleString().padStart(15)} NETO=${resumen.totalNeto.toLocaleString().padStart(15)}`,
  )

  console.log('\n=== CUENTAS CONSOLIDADO ===')
  const cuentas = await getCuentasConsolidado(tenantId)
  console.log('  CXC por empresa:', cuentas.cxcPorEmpresa)
  console.log('  CXP por empresa:', cuentas.cxpPorEmpresa)
  console.log('  Total CXC:', cuentas.totalCxc.toLocaleString())
  console.log('  Total CXP:', cuentas.totalCxp.toLocaleString())

  console.log('\n=== MIHBAH ESTIMADO VS AVANCE (mes 5) ===')
  const m = await getMihbahEstimadoVsAvance(tenantId, anio, 5)
  console.log('  ', m)

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
