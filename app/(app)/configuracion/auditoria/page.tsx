import { redirect } from 'next/navigation'
import { requireUser, isSuperAdminOrAbove } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, desc, eq, gte, ilike, or } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = { title: 'Auditoría · Configuración' }

const ACCION_LABEL: Record<string, string> = {
  COMISION_CALCULADA: 'Comisión calculada',
  AJUSTE_CORTE: 'Ajuste en corte',
  CREATE: 'Creación',
  ENVIAR_A_REVISION: 'Envío a revisión',
  APROBAR: 'Aprobación',
  RECHAZAR: 'Rechazo',
  DISPERSION_PAGADA_GRUPO: 'Pago dispersión',
  DATOS_PAGO_ACTUALIZADOS: 'Datos pago actualizados',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
}

const TIPO_LABEL: Record<string, string> = {
  comisiones_calculadas: 'Comisión',
  dispersion: 'Dispersión',
  venta_bmcorp: 'Venta',
  corte_dispersion: 'Corte',
  lider_alianza: 'Líder',
  usuario: 'Usuario',
}

const ACCION_COLOR: Record<string, string> = {
  COMISION_CALCULADA: 'bg-blue-100 text-blue-700',
  APROBAR: 'bg-emerald-100 text-emerald-700',
  RECHAZAR: 'bg-rose-100 text-rose-700',
  CREATE: 'bg-slate-100 text-slate-700',
  DELETE: 'bg-rose-100 text-rose-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  AJUSTE_CORTE: 'bg-amber-100 text-amber-700',
  DISPERSION_PAGADA_GRUPO: 'bg-emerald-100 text-emerald-700',
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; dias?: string }>
}) {
  let user
  try {
    user = await requireUser()
  } catch {
    redirect('/login')
  }
  if (!isSuperAdminOrAbove(user.role)) redirect('/configuracion')
  if (!user.tenantId) redirect('/login')

  const sp = await searchParams
  const busqueda = sp.q?.trim() ?? ''
  const tipoFiltro = sp.tipo?.trim() ?? ''
  const dias = Number(sp.dias ?? 30)
  const desde = new Date()
  desde.setDate(desde.getDate() - dias)

  const logs = await db.transaction(async (tx) => {
    await setTenant(tx, user.tenantId!)
    const filtros = [eq(auditLogs.tenantId, user.tenantId!), gte(auditLogs.createdAt, desde)]
    if (tipoFiltro) filtros.push(eq(auditLogs.recursoTipo, tipoFiltro))
    if (busqueda) {
      filtros.push(
        or(
          ilike(auditLogs.accion, `%${busqueda}%`),
          ilike(auditLogs.recursoTipo, `%${busqueda}%`),
          ilike(auditLogs.recursoId, `%${busqueda}%`),
        )!,
      )
    }
    return tx
      .select({
        log: auditLogs,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...filtros))
      .orderBy(desc(auditLogs.createdAt))
      .limit(200)
  })

  const tiposDisponibles = [...new Set(logs.map((l) => l.log.recursoTipo))]

  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div>
        <Link
          href="/configuracion"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Administración
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="text-primary h-5 w-5" />
          <h1 className="text-foreground text-2xl font-bold">Bitácora de auditoría</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Registro de todas las acciones realizadas en el sistema. Solo super_admin puede ver esto.
        </p>
      </div>

      {/* Filtros */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar acción, tipo o ID..."
          className="bg-background border-border rounded-lg border px-3 py-2 text-sm sm:w-64"
        />
        <select
          name="tipo"
          defaultValue={tipoFiltro}
          className="bg-background border-border rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Todos los tipos</option>
          {tiposDisponibles.map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t] ?? t}
            </option>
          ))}
        </select>
        <select
          name="dias"
          defaultValue={String(dias)}
          className="bg-background border-border rounded-lg border px-3 py-2 text-sm"
        >
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
        >
          Filtrar
        </button>
      </form>

      {/* Tabla */}
      <div className="bg-card overflow-hidden rounded-xl border">
        <div className="border-b px-4 py-3">
          <h2 className="text-foreground text-sm font-semibold">
            {logs.length} registros{logs.length === 200 ? ' (máximo — aplica más filtros)' : ''}
          </h2>
        </div>

        {logs.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Sin registros para el filtro seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium">Usuario</th>
                  <th className="px-4 py-2 text-left font-medium">Acción</th>
                  <th className="px-4 py-2 text-left font-medium">Recurso</th>
                  <th className="px-4 py-2 text-left font-medium">ID</th>
                  <th className="px-4 py-2 text-left font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(({ log, userName, userEmail }) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="text-muted-foreground px-4 py-2.5 text-xs tabular-nums">
                      {new Date(log.createdAt).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-foreground text-xs font-medium">
                        {userName ?? 'Sistema'}
                      </div>
                      {userEmail && (
                        <div className="text-muted-foreground text-[10px]">{userEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACCION_COLOR[log.accion] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {ACCION_LABEL[log.accion] ?? log.accion}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs">
                      {TIPO_LABEL[log.recursoTipo] ?? log.recursoTipo}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 font-mono text-[10px]">
                      {log.recursoId ? log.recursoId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.cambios ? (
                        <details className="text-[10px]">
                          <summary className="text-primary cursor-pointer hover:underline">
                            Ver cambios
                          </summary>
                          <pre className="bg-muted text-muted-foreground mt-1 max-w-sm overflow-auto rounded p-2 text-[9px]">
                            {JSON.stringify(log.cambios, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
