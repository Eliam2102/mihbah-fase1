import { redirect } from 'next/navigation'
import { requireUser, isAdminOrAbove } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { incidencias, users } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { IncidenciasView } from './incidencias-view'

export const metadata = { title: 'Incidencias · Configuración' }

const ESTADO_LABEL: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
}

export default async function IncidenciasPage() {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }
  if (!isAdminOrAbove(user.role)) redirect('/dashboard')
  if (!user.tenantId) redirect('/dashboard')

  const rows = await db.transaction(async (tx) => {
    await setTenant(tx, user.tenantId!)
    return tx
      .select({
        inc: incidencias,
        creadoPorNombre: users.name,
        asignadoNombre: users.name,
      })
      .from(incidencias)
      .leftJoin(users, eq(incidencias.creadoPor, users.id))
      .where(eq(incidencias.tenantId, user.tenantId!))
      .orderBy(desc(incidencias.createdAt))
      .limit(100)
  })

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href="/configuracion"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Administración
        </Link>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h1 className="text-foreground text-2xl font-bold">Incidencias y aclaraciones</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Tickets abiertos por usuarios del sistema. Solo super_admin puede resolver.
        </p>
      </div>

      <IncidenciasView
        incidencias={rows.map((r) => ({
          ...r.inc,
          creadoPorNombre: r.creadoPorNombre ?? r.inc.creadoPorNombre,
        }))}
        canManage={user.role === 'super_admin' || user.role === 'super_admin_dev'}
        estadoLabel={ESTADO_LABEL}
      />
    </section>
  )
}
