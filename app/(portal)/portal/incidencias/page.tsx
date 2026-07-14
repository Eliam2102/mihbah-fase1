import { requirePortalUser } from '@/lib/auth/portal-helpers'
import { db } from '@/lib/db'
import { incidencias } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq } from 'drizzle-orm'
import { IncidenciasPortalView } from './incidencias-portal-view'

export const metadata = { title: 'Mis incidencias · Portal' }

export default async function IncidenciasPortalPage() {
  const { user, perfil } = await requirePortalUser()

  const mis = await db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    return tx
      .select()
      .from(incidencias)
      .where(and(eq(incidencias.tenantId, perfil.tenantId), eq(incidencias.creadoPor, user.id)))
      .orderBy(desc(incidencias.createdAt))
      .limit(50)
  })

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Mis incidencias</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Registra aclaraciones o problemas. El equipo de administración los resolverá.
        </p>
      </div>
      <IncidenciasPortalView incidencias={mis} />
    </section>
  )
}
