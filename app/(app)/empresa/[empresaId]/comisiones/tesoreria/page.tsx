import { db } from '@/lib/db'
import {
  afiliados,
  bonosUmbralCalculados,
  bonosUmbralConfig,
  cortesDispersion,
  dispersiones,
  lideresAlianza,
} from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { requireTesoreriaOrAdmin } from '@/lib/auth/helpers'
import { decryptField } from '@/lib/crypto/field-encryption'
import TesoreriaWorklist, {
  type TesoreriaCorteData,
  type TesoreriaGrupo,
} from '@/components/comisiones/tesoreria-worklist'

type Dispersion = typeof dispersiones.$inferSelect

export default async function TesoreriaPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireTesoreriaOrAdmin()
  if (!user.tenantId) throw new Error('Usuario sin tenant')
  const tenantId = user.tenantId
  await requireEmpresaAccess(user, empresaId, 'comisiones')

  const data = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)

    // Obtener todos los cortes en APROBADO
    const cortes = await tx
      .select()
      .from(cortesDispersion)
      .where(eq(cortesDispersion.estado, 'APROBADO'))

    if (cortes.length === 0) return []

    const corteIds = cortes.map((c) => c.id)

    // Dispersiones AUTORIZADA o PARCIAL
    const dispersionesPendientes = await tx
      .select({
        dispersion: dispersiones,
        lider: lideresAlianza,
      })
      .from(dispersiones)
      .leftJoin(lideresAlianza, eq(dispersiones.liderId, lideresAlianza.id))
      .where(
        and(
          inArray(dispersiones.corteId, corteIds),
          inArray(dispersiones.estado, ['AUTORIZADA', 'PARCIAL']),
        ),
      )

    // Bonos asignados a estos cortes y no pagados
    const bonosPendientes = await tx
      .select({
        bono: bonosUmbralCalculados,
        config: bonosUmbralConfig,
        destinatario: afiliados.nombre,
      })
      .from(bonosUmbralCalculados)
      .innerJoin(bonosUmbralConfig, eq(bonosUmbralCalculados.configId, bonosUmbralConfig.id))
      .leftJoin(afiliados, eq(bonosUmbralConfig.afiliadoDestinatarioId, afiliados.id))
      .where(
        and(
          eq(bonosUmbralCalculados.tenantId, tenantId),
          inArray(bonosUmbralCalculados.corteId, corteIds),
          eq(bonosUmbralCalculados.pagado, false),
        ),
      )

    // Agrupar por corte
    const results: TesoreriaCorteData[] = cortes.map((corte) => {
      const dispCorte = dispersionesPendientes.filter((d) => d.dispersion.corteId === corte.id)
      const bonosCorte = bonosPendientes.filter((b) => b.bono.corteId === corte.id)

      const grupos = new Map<string, TesoreriaGrupo>()

      let totalEfectivo = 0
      let totalDeposito = 0

      // Dispersiones normales
      for (const row of dispCorte) {
        const { dispersion, lider } = row

        let key = ''
        if (dispersion.liderId) key = `lider_id:${dispersion.liderId}`
        else if (dispersion.asesorId) key = `asesor_id:${dispersion.asesorId}`
        else key = `tipo:${dispersion.tipoBeneficiario}`

        if (!grupos.has(key)) {
          let metodoPago: string = dispersion.metodoPago || 'EFECTIVO'
          let clabe: string | null = null
          let banco: string | null = null
          let numeroCuenta: string | null = null

          if (lider) {
            metodoPago = lider.metodoPago || 'EFECTIVO'
            clabe = decryptField(lider.clabe)
            banco = lider.banco
            numeroCuenta = decryptField(lider.numeroCuenta)
          }

          grupos.set(key, {
            key,
            tipoBeneficiario: dispersion.tipoBeneficiario,
            nombre: dispersion.beneficiarioNombre,
            metodoPago,
            clabe,
            banco,
            numeroCuenta,
            totalMonto: 0,
            dispersiones: [],
          })
        }

        const g = grupos.get(key)
        if (!g) continue
        g.totalMonto += Number(dispersion.montoTotal)
        g.dispersiones.push(dispersion as Dispersion)
      }

      // Calcular totales dispersiones
      for (const g of grupos.values()) {
        if (g.metodoPago === 'EFECTIVO') totalEfectivo += g.totalMonto
        else totalDeposito += g.totalMonto
      }

      // Bonos — sumar a totales
      for (const b of bonosCorte) {
        totalEfectivo += Number(b.bono.montoTotal) // default EFECTIVO para bonos
      }

      const bonosData = bonosCorte.map((b) => ({
        id: b.bono.id,
        nombre: b.destinatario ?? b.config.nombre,
        configNombre: b.config.nombre,
        montoTotal: Number(b.bono.montoTotal),
        anio: b.bono.anio,
        mes: b.bono.mes,
      }))

      return {
        corte,
        grupos: Array.from(grupos.values()),
        bonos: bonosData,
        totalEfectivo,
        totalDeposito,
      }
    })

    return results.filter((r) => r.grupos.length > 0 || r.bonos.length > 0)
  })

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tesorería</h1>
        <p className="text-sm text-slate-500">
          Worklist de pagos agrupados por corte y beneficiario.
        </p>
      </div>

      <TesoreriaWorklist data={data} empresaId={empresaId} />
    </div>
  )
}
