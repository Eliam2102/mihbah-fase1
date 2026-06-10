import { requirePortalUser } from '@/lib/auth/portal-helpers'
import {
  getComisionesPortalAsesor,
  getVentasPortalLider,
  getAsesoresPortalLider,
  getComisionesSocio,
} from '@/lib/services/comisiones/portal.service'
import { DashboardAsesor } from '@/components/portal/dashboard-asesor'
import { DashboardLider } from '@/components/portal/dashboard-lider'
import { DashboardAdministrativo } from '@/components/portal/dashboard-administrativo'
import { SocioComisionesSection } from '@/components/portal/socio-comisiones'

export const metadata = { title: 'Mi dashboard · Portal' }

export default async function PortalDashboard() {
  const { user, perfil } = await requirePortalUser()
  const userName = user.name

  const comisionesSocio = perfil.socioTipo ? await getComisionesSocio(user.id) : []
  const socioSection = perfil.socioTipo ? (
    <SocioComisionesSection ventas={comisionesSocio} socioTipo={perfil.socioTipo} />
  ) : null

  if (perfil.rolPortal === 'ASESOR') {
    const dispersiones = await getComisionesPortalAsesor(user.id)
    return (
      <div className="space-y-8">
        <DashboardAsesor perfil={perfil} dispersiones={dispersiones} userName={userName} />
        {socioSection}
      </div>
    )
  }

  const [ventas, asesores] = await Promise.all([
    getVentasPortalLider(user.id),
    getAsesoresPortalLider(user.id),
  ])

  if (perfil.rolPortal === 'ADMINISTRATIVO') {
    return (
      <div className="space-y-8">
        <DashboardAdministrativo
          perfil={perfil}
          ventas={ventas}
          asesores={asesores}
          userName={userName}
        />
        {socioSection}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardLider perfil={perfil} ventas={ventas} asesores={asesores} userName={userName} />
      {socioSection}
    </div>
  )
}
