import { db } from '@/lib/db'
import { cortesDispersion, dispersiones, lideresAlianza } from '@/lib/db/schema'
import { eq, inArray, and } from 'drizzle-orm'
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

    // Obtener dispersiones AUTORIZADA o PARCIAL para esos cortes
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

    // Agrupar por corte -> beneficiarioKey
    const results: TesoreriaCorteData[] = cortes.map((corte) => {
      const dispCorte = dispersionesPendientes.filter((d) => d.dispersion.corteId === corte.id)

      const grupos = new Map<string, TesoreriaGrupo>()

      let totalEfectivo = 0
      let totalDeposito = 0

      for (const row of dispCorte) {
        const { dispersion, lider } = row

        let key = ''
        if (dispersion.liderId) key = `lider_id:${dispersion.liderId}`
        else if (dispersion.asesorId) key = `asesor_id:${dispersion.asesorId}`
        else key = `tipo:${dispersion.tipoBeneficiario}`

        if (!grupos.has(key)) {
          // Obtener metodo pago y datos bancarios
          let metodoPago: string = dispersion.metodoPago || 'EFECTIVO'
          let clabe: string | null = null
          let banco: string | null = null
          let numeroCuenta: string | null = null

          if (lider) {
            metodoPago = lider.metodoPago || 'EFECTIVO'
            clabe = decryptField(lider.clabe)
            banco = lider.banco // No está cifrado según doc
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

      // Calcular totales
      for (const g of grupos.values()) {
        if (g.metodoPago === 'EFECTIVO') totalEfectivo += g.totalMonto
        else totalDeposito += g.totalMonto
      }

      return {
        corte,
        grupos: Array.from(grupos.values()),
        totalEfectivo,
        totalDeposito,
      }
    })

    return results.filter((r) => r.grupos.length > 0)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tesorería</h1>
        <p className="text-sm text-slate-500">
          Worklist de pagos agrupados por corte y beneficiario.
        </p>
      </div>

      <TesoreriaWorklist data={data} empresaId={empresaId} />
    </div>
  )
}
