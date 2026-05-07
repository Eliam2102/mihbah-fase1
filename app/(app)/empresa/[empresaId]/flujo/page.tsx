import { requireUser } from '@/lib/auth/helpers'
import { getEmpresaById } from '@/lib/services/empresas'
import { FlujoBmcorpView } from '@/components/flujo/flujo-bmcorp-view'
import { FlujoMensualView } from '@/components/flujo/flujo-mensual-view'
import { FlujoTrimestralView } from '@/components/flujo/flujo-trimestral-view'
import { FlujoAnualView } from '@/components/flujo/flujo-anual-view'
import { MovimientosMesPanel } from '@/components/flujo/movimientos-mes-panel'
import { FlujoFiltros } from '@/components/flujo/flujo-filtros'
import { notFound } from 'next/navigation'

type Vista = 'mensual' | 'trimestral' | 'anual'

export default async function FlujoPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{ anio?: string; vista?: string; mes?: string }>
}) {
  const { empresaId } = await params
  const { anio: anioStr, vista: vistaStr, mes: mesStr } = await searchParams

  const user = await requireUser()
  const tenantId = user.tenantId
  if (!tenantId) throw new Error('Tenant ID is required')

  const empresa = await getEmpresaById(empresaId, tenantId)
  if (!empresa) notFound()

  // BM CORP: vista semanal, sin filtros adicionales
  if (empresa.tipo === 'COMERCIAL') {
    return (
      <section className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            BM CORP · Histórico semanal (Monday.com)
          </p>
        </div>
        <FlujoBmcorpView empresaId={empresaId} tenantId={tenantId} />
      </section>
    )
  }

  const anio = Number(anioStr) || new Date().getFullYear()
  const vista: Vista = ['mensual', 'trimestral', 'anual'].includes(vistaStr ?? '')
    ? (vistaStr as Vista)
    : 'mensual'
  const mes = mesStr ? Number(mesStr) : null

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Header + Filtros */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {empresa.name} · {vista === 'anual' ? 'Histórico' : `Año ${anio}`}
          </p>
        </div>
        <FlujoFiltros showVista={true} />
      </div>

      {/* Vista principal */}
      {vista === 'mensual' && (
        <FlujoMensualView empresaId={empresaId} tenantId={tenantId} anio={anio} mesSel={mes} />
      )}
      {vista === 'trimestral' && (
        <FlujoTrimestralView empresaId={empresaId} tenantId={tenantId} anio={anio} />
      )}
      {vista === 'anual' && <FlujoAnualView empresaId={empresaId} tenantId={tenantId} />}

      {/* Drill-down panel (solo en vista mensual) */}
      {mes && vista === 'mensual' && (
        <MovimientosMesPanel
          empresaId={empresaId}
          tenantId={tenantId}
          anio={anio}
          mes={mes}
          vistaActual={vista}
        />
      )}
    </section>
  )
}
