import { requirePortalUser } from '@/lib/auth/portal-helpers'
import {
  getComisionesPortalAsesor,
  getComisionesPortalLider,
  getAsesoresPortalLider,
} from '@/lib/services/comisiones/portal.service'
import { getPautaMesActualLider } from '@/lib/services/comisiones/pautas.service'
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

  const [dispersiones, asesores, pauta] = await Promise.all([
    getComisionesPortalLider(user.id),
    getAsesoresPortalLider(user.id),
    perfil.liderId ? getPautaMesActualLider(perfil.liderId) : Promise.resolve(null),
  ])
  return (
    <DashboardLider
      perfil={perfil}
      dispersiones={dispersiones}
      asesores={asesores}
      userName={userName}
      pauta={pauta}
    />
  )
}
