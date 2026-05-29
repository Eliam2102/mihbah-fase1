import { requirePortalUser } from '@/lib/auth/portal-helpers'
import {
  getComisionesPortalAsesor,
  getVentasPortalLider,
  getAsesoresPortalLider,
} from '@/lib/services/comisiones/portal.service'
import { DashboardAsesor } from '@/components/portal/dashboard-asesor'
import { DashboardLider } from '@/components/portal/dashboard-lider'

export const metadata = { title: 'Mi dashboard · Portal' }

export default async function PortalDashboard() {
  const { user, perfil } = await requirePortalUser()
  const userName = user.name

  if (perfil.rolPortal === 'ASESOR') {
    const dispersiones = await getComisionesPortalAsesor(user.id)
    return <DashboardAsesor perfil={perfil} dispersiones={dispersiones} userName={userName} />
  }

  const [ventas, asesores] = await Promise.all([
    getVentasPortalLider(user.id),
    getAsesoresPortalLider(user.id),
  ])
  return <DashboardLider perfil={perfil} ventas={ventas} asesores={asesores} userName={userName} />
}
