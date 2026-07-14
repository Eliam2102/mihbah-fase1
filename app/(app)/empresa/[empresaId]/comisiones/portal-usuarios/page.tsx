import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getLideres, getAsesores } from '@/lib/services/comisiones/alianzas.service'
import { getUsuariosPortal } from '@/lib/services/comisiones/usuarios-portal.service'
import { PortalUsuariosView } from '@/components/comisiones/portal-usuarios-view'
import { getAfiliados } from '@/lib/services/comisiones/alianzas.service'

export const metadata = { title: 'Usuarios del portal · BM CORP' }

export default async function PortalUsuariosPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'comisiones')
  const tenantId = user.tenantId!

  const [usuarios, lideres, asesores, afiliados] = await Promise.all([
    getUsuariosPortal(tenantId),
    getLideres(tenantId),
    getAsesores(tenantId),
    getAfiliados(tenantId),
  ])
  // Mapa afiliadoId → nombre alianza para mostrar contexto en dropdowns
  const afiliadoMap = new Map(afiliados.map((a) => [a.id, a.nombre]))
  const lideresConAlianza = lideres.map((l) => ({
    ...l,
    alianzaNombre: afiliadoMap.get(l.afiliadoId) ?? 'Sin alianza',
  }))
  const asesoresConAlianza = asesores.map((a) => ({
    ...a,
    alianzaNombre: afiliadoMap.get(a.afiliadoId) ?? 'Sin alianza',
  }))

  return (
    <section className="3xl:p-12 w-full space-y-6 p-4 sm:p-6 xl:p-10">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Usuarios del portal</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Crea cuentas de acceso al portal externo para líderes de alianza y asesores. Comparten
          Better Auth con los usuarios internos, pero usan rol `lider_alianza` o `asesor` con acceso
          restringido a /portal/*.
        </p>
      </div>
      <PortalUsuariosView
        empresaId={empresaId}
        usuarios={usuarios}
        lideres={lideresConAlianza}
        asesores={asesoresConAlianza}
      />
    </section>
  )
}
