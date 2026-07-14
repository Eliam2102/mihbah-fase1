import 'dotenv/config'
import postgres from 'postgres'
import {
  getRepartosSplit,
  getRepartosKpi,
  getRemanentesPorAfiliado,
  getComisionamientoConciliado,
  getFlujoSemanal,
} from '@/lib/services/dashboard-bmcorp.service'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function main() {
  const [t] = await sql`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
  const tenantId = t!.id as string
  const [e] =
    await sql`SELECT id, name FROM empresas WHERE tenant_id = ${tenantId} AND name = 'BM CORP' LIMIT 1`
  const empresaId = e!.id as string
  console.log(`Empresa: ${e!.name} (${empresaId})`)

  const split = await getRepartosSplit(empresaId, tenantId)
  console.log('\n[getRepartosSplit]')
  console.log('  realizado:', split.realizado)
  console.log('  parcial:', split.parcial)
  console.log('  pendiente:', split.pendiente)
  console.log('  totalMonto:', split.totalMonto)
  console.log('  sinDatos:', split.sinDatos)

  const kpi = await getRepartosKpi(empresaId, tenantId)
  console.log('\n[getRepartosKpi]')
  console.log('  totalRealizado:', kpi.totalRealizado)
  console.log('  cantidadRealizados:', kpi.cantidadRealizados)

  const rem = await getRemanentesPorAfiliado(empresaId, tenantId, 5)
  console.log('\n[getRemanentesPorAfiliado] top 5')
  rem.forEach((r) =>
    console.log(
      `  ${r.nombre}: vendido=${r.vendido}, repartos=${r.repartos}, remanente=${r.remanente}`,
    ),
  )

  const com = await getComisionamientoConciliado(empresaId, tenantId)
  console.log('\n[getComisionamientoConciliado]')
  console.log('  totalGenerado:', com.totalGenerado)
  console.log('  pagado:', com.pagado)
  console.log('  parcial:', com.parcial)
  console.log('  pendiente:', com.pendiente)
  console.log('  % conciliado:', com.porcentajeConciliado)

  const flujo = await getFlujoSemanal(empresaId, tenantId, 12)
  console.log('\n[getFlujoSemanal]', flujo.length, 'semanas')
  flujo
    .slice(-3)
    .forEach((f) =>
      console.log(
        `  ${f.semana}: ing=${f.ingresos}, proy=${f.ingresosProyectados}, egr=${f.egresos}, neto=${f.neto}`,
      ),
    )

  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
