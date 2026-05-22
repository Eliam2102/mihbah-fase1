import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import {
  listarVentas,
  getAlianzasOptionsParaFiltro,
  getDesarrollosOptionsParaFiltro,
  getAniosVentasDisponibles,
  type GrupoEstado,
} from '@/lib/services/comisiones/ventas-listing.service'
import { VentasListingView } from '@/components/comisiones/ventas-listing-view'

export const metadata = { title: 'Ventas BM CORP' }

const GRUPOS_VALIDOS: GrupoEstado[] = [
  'todas',
  'por_cerrar',
  'cerradas',
  'en_proceso',
  'canceladas',
]

export default async function VentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ empresaId: string }>
  searchParams: Promise<{
    grupo?: string
    anio?: string
    mes?: string
    alianza?: string
    desarrollo?: string
    q?: string
    page?: string
  }>
}) {
  const { empresaId } = await params
  const sp = await searchParams

  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const grupo: GrupoEstado = GRUPOS_VALIDOS.includes(sp.grupo as GrupoEstado)
    ? (sp.grupo as GrupoEstado)
    : 'por_cerrar'

  const anioNum = sp.anio ? Number(sp.anio) : NaN
  const mesNum = sp.mes ? Number(sp.mes) : NaN
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1

  const filterForService: Parameters<typeof listarVentas>[2] = { grupo, page, pageSize: 50 }
  if (Number.isFinite(anioNum)) filterForService.anio = anioNum
  if (Number.isFinite(mesNum)) filterForService.mes = mesNum
  if (sp.alianza) filterForService.afiliadoId = sp.alianza
  if (sp.desarrollo) filterForService.desarrolloId = sp.desarrollo
  if (sp.q) filterForService.query = sp.q

  const [result, alianzas, desarrollos, anios] = await Promise.all([
    listarVentas(tenantId, empresaId, filterForService),
    getAlianzasOptionsParaFiltro(tenantId, empresaId),
    getDesarrollosOptionsParaFiltro(tenantId, empresaId),
    getAniosVentasDisponibles(tenantId, empresaId),
  ])

  // Construir currentFilter sin claves undefined (exactOptionalPropertyTypes)
  const currentFilter: {
    grupo: GrupoEstado
    page: number
    anio?: number
    mes?: number
    afiliadoId?: string
    desarrolloId?: string
    query?: string
  } = { grupo, page }
  if (Number.isFinite(anioNum)) currentFilter.anio = anioNum
  if (Number.isFinite(mesNum)) currentFilter.mes = mesNum
  if (sp.alianza) currentFilter.afiliadoId = sp.alianza
  if (sp.desarrollo) currentFilter.desarrolloId = sp.desarrollo
  if (sp.q) currentFilter.query = sp.q

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <VentasListingView
        empresaId={empresaId}
        result={result}
        alianzas={alianzas}
        desarrollos={desarrollos}
        anios={anios}
        currentFilter={currentFilter}
      />
    </section>
  )
}
