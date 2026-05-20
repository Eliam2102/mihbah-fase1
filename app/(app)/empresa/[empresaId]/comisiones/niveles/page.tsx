import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getLideres, getAfiliados } from '@/lib/services/comisiones/alianzas.service'
import { db } from '@/lib/db'
import { ventasBmcorp } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq, gte, sql } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { NivelesView } from '@/components/comisiones/niveles-view'

export const metadata = { title: 'Niveles membresía · Comisiones' }

export default async function NivelesPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const [lideres, afiliados] = await Promise.all([
    getLideres(tenantId, false),
    getAfiliados(tenantId, false),
  ])

  // Promedio mensual de ventas últimos 3 meses por alianza
  const hoy = new Date()
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1).toISOString().slice(0, 10)
  const ventasPorAfiliado = await db.transaction(async (tx) => {
    await setTenant(tx, tenantId)
    return tx
      .select({
        afiliadoId: ventasBmcorp.afiliadoId,
        promedioMensual: sql<string>`COALESCE(SUM(${ventasBmcorp.monto}) / 3, 0)::text`,
        ventas: sql<number>`COUNT(*)::int`,
      })
      .from(ventasBmcorp)
      .where(
        and(
          eq(ventasBmcorp.tenantId, tenantId),
          eq(ventasBmcorp.empresaId, empresaId),
          gte(ventasBmcorp.fecha, desde),
        ),
      )
      .groupBy(ventasBmcorp.afiliadoId)
  })

  const afiliadoMap = new Map(afiliados.map((a) => [a.id, a.nombre]))
  const promedioMap = new Map(
    ventasPorAfiliado.map((v) => [v.afiliadoId, Number(v.promedioMensual)]),
  )

  const data = lideres.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    alianzaNombre: afiliadoMap.get(l.afiliadoId) ?? 'Sin alianza',
    nivelActual: l.nivel,
    promedioMensual: promedioMap.get(l.afiliadoId) ?? 0,
    presupuestoPautasMensual: Number(l.presupuestoPautasMensual ?? 0),
  }))

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <Link
        href={`/empresa/${empresaId}/comisiones/alianzas`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        <ArrowLeft className="h-3 w-3" /> Volver a Alianzas
      </Link>

      <div>
        <h1 className="text-foreground text-2xl font-bold">Niveles de membresía</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Gestión de niveles Jade / Turquesa / Ónix Negro por líder de alianza. El nivel define el
          bono adicional al alcanzar la meta mensual. El sistema calcula el promedio últimos 3 meses
          para sugerir un nivel; tú confirmas o sobrescribes manualmente.
        </p>
      </div>

      {/* Umbrales del doc YESYUCAN v5 */}
      <div className="bg-muted/30 rounded-lg border p-4">
        <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-semibold uppercase">
          <Info className="h-3 w-3" /> Umbrales según doc YESYUCAN v5
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-foreground text-sm font-semibold">Terrenos (Aliados del Universo)</p>
            <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
              <li>
                <span className="text-foreground font-medium">Jade</span> · ≥ $5 MDP/mes · bono +3%
              </li>
              <li>
                <span className="text-foreground font-medium">Turquesa</span> · $3.5–$4.9 MDP/mes ·
                bono +2%
              </li>
              <li>
                <span className="text-foreground font-medium">Ónix Negro</span> · $2–$3.5 MDP/mes ·
                bono +1%
              </li>
            </ul>
          </div>
          <div>
            <p className="text-foreground text-sm font-semibold">YCD (Partners Yucandoit)</p>
            <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
              <li>
                <span className="text-foreground font-medium">Jade</span> · ≥ $3 MDP/mes · bono
                +1.5%
              </li>
              <li>
                <span className="text-foreground font-medium">Turquesa</span> · $2–$3 MDP/mes · bono
                +1%
              </li>
              <li>
                <span className="text-foreground font-medium">Ónix Negro</span> · $1–$2 MDP/mes ·
                bono +0.5%
              </li>
            </ul>
          </div>
        </div>
      </div>

      <NivelesView empresaId={empresaId} lideres={data} />
    </section>
  )
}
