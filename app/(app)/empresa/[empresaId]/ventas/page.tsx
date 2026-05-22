import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import {
  listarVentas,
  getAlianzasOptionsParaFiltro,
  getDesarrollosOptionsParaFiltro,
  getAniosVentasDisponibles,
  type GrupoEstado,
} from '@/lib/services/ventas/ventas-listing.service'
import { VentasListingView } from '@/components/ventas/ventas-listing-view'

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
  await requireEmpresaAccess(user, empresaId, 'ventas')
  const tenantId = user.tenantId!

  const grupo: GrupoEstado = GRUPOS_VALIDOS.includes(sp.grupo as GrupoEstado)
    ? (sp.grupo as GrupoEstado)
    : 'todas'

  const anioNum = sp.anio ? Number(sp.anio) : NaN
  const mesNum = sp.mes ? Number(sp.mes) : NaN
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1

  // Cargar años disponibles primero — usamos para validar el ?anio= recibido.
  // Si viene un año (típicamente del topbar global) que NO existe en ventas,
  // lo ignoramos para evitar resultado vacío sin razón obvia para el usuario.
  const [alianzas, desarrollos, anios] = await Promise.all([
    getAlianzasOptionsParaFiltro(tenantId, empresaId),
    getDesarrollosOptionsParaFiltro(tenantId, empresaId),
    getAniosVentasDisponibles(tenantId, empresaId),
  ])

  const anioValido = Number.isFinite(anioNum) && anios.includes(anioNum)
  const mesValido = Number.isFinite(mesNum) && mesNum >= 1 && mesNum <= 12

  const filterForService: Parameters<typeof listarVentas>[2] = { grupo, page, pageSize: 50 }
  if (anioValido) filterForService.anio = anioNum
  if (anioValido && mesValido) filterForService.mes = mesNum
  if (sp.alianza) filterForService.afiliadoId = sp.alianza
  if (sp.desarrollo) filterForService.desarrolloId = sp.desarrollo
  if (sp.q) filterForService.query = sp.q

  const result = await listarVentas(tenantId, empresaId, filterForService)

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
  if (anioValido) currentFilter.anio = anioNum
  if (anioValido && mesValido) currentFilter.mes = mesNum
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
