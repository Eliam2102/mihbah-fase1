import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { listSyncHistory, getLastSuccessfulSync } from '@/lib/services/monday.service'
import { MondaySyncButton } from '@/components/monday/sync-button'
import { CheckCircle, XCircle, AlertCircle, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react'

export const metadata = { title: 'Sincronización Monday · BM CORP' }

export default async function MondayPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'monday')
  const tenantId = user.tenantId!

  const [history, lastSync] = await Promise.all([
    listSyncHistory(empresaId, tenantId, 50),
    getLastSuccessfulSync(empresaId, tenantId),
  ])

  // Tableros que ya tienen al menos un COMPLETADO → mostrar indicador verde
  const syncedBoardIds = new Set(
    history
      .filter((s) => s.estado === 'COMPLETADO')
      .map((s) => s.tablero)
      .filter(Boolean) as string[],
  )

  const hasBoardId = Boolean(process.env.MONDAY_BOARD_ID)
  const hasApiKey = Boolean(process.env.MONDAY_API_KEY)
  const configured = hasBoardId && hasApiKey

  return (
    <section className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Sincronización Monday.com</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Por defecto importa solo{' '}
            <span className="text-foreground font-medium">VENTAS 2026</span> (formato homologado).
            Los boards históricos 2020-2025 siguen disponibles, pero no se sincronizan salvo que los
            marques a propósito.
          </p>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            configured
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
          {configured ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {configured ? 'Configurado' : 'Faltan variables de entorno'}
        </div>
      </div>

      {/* Config warning */}
      {!configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Variables de entorno faltantes</p>
              <p className="mt-1 text-xs">
                Agrega en{' '}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code>:
              </p>
              <pre className="mt-2 rounded-lg bg-amber-100 p-2 text-xs dark:bg-amber-900/50">
                {!hasApiKey && 'MONDAY_API_KEY=tu_api_key_aqui\n'}
                {!hasBoardId && 'MONDAY_BOARD_ID=id_del_tablero_seguimiento_general'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Last successful sync */}
      {lastSync && (
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">Última sincronización exitosa:</span>
            <span className="text-foreground font-medium">
              {new Date(lastSync.finalizadaEn!).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-green-600">
              {lastSync.registrosCreados} creados, {lastSync.registrosActualizados} actualizados
            </span>
          </div>
        </div>
      )}

      {/* Sync button (client component) */}
      <div className="border-border bg-card rounded-xl border p-5">
        <p className="text-foreground mb-1 text-sm font-semibold">Ejecutar sincronización</p>
        <p className="text-muted-foreground mb-4 text-xs">
          El sistema auto-detecta tus boards y preselecciona solo <strong>VENTAS 2026</strong>.
          Puedes agregar boards históricos manualmente (con advertencia). Operación idempotente — no
          duplica registros. Las comisiones solo se calculan para ventas{' '}
          <strong>Finalizadas</strong>.
        </p>
        <MondaySyncButton empresaId={empresaId} syncedBoardIds={[...syncedBoardIds]} />
      </div>

      {/* Sync history */}
      <div>
        <h2 className="text-foreground mb-3 text-lg font-semibold">
          Historial de sincronizaciones
        </h2>

        {history.length === 0 ? (
          <div className="border-border bg-card flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
            <RefreshCw className="text-muted-foreground h-8 w-8" />
            <p className="text-foreground font-medium">Sin sincronizaciones aún</p>
            <p className="text-muted-foreground text-sm">
              Ejecuta la primera sincronización para importar ventas de Monday.
            </p>
          </div>
        ) : (
          <div className="border-border bg-card overflow-hidden overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  {[
                    { label: 'Iniciada', align: 'text-left' },
                    { label: 'Duración', align: 'text-right' },
                    { label: 'Estado', align: 'text-left' },
                    { label: 'Creados', align: 'text-right' },
                    { label: 'Actualizados', align: 'text-right' },
                    { label: 'Errores', align: 'text-right' },
                    { label: 'Tablero', align: 'text-left' },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`text-muted-foreground px-4 py-3 ${h.align} text-xs font-semibold tracking-wide uppercase`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((s) => {
                  const duration =
                    s.finalizadaEn && s.iniciadaEn
                      ? (
                          (new Date(s.finalizadaEn).getTime() - new Date(s.iniciadaEn).getTime()) /
                          1000
                        ).toFixed(1) + 's'
                      : '—'

                  return (
                    <tr
                      key={s.id}
                      className="border-border hover:bg-muted/30 border-b last:border-0"
                    >
                      <td className="text-muted-foreground px-4 py-3 tabular-nums">
                        {new Date(s.iniciadaEn).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                        {duration}
                      </td>
                      <td className="px-4 py-3">
                        {s.estado === 'COMPLETADO' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" /> Completado
                          </span>
                        ) : s.estado === 'ERROR' ? (
                          <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                            <XCircle className="h-3 w-3" /> Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" /> {s.estado}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 tabular-nums">
                        {s.registrosCreados}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-500 tabular-nums">
                        {s.registrosActualizados}
                      </td>
                      <td className="text-destructive px-4 py-3 text-right font-semibold tabular-nums">
                        {s.registrosErrores}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                        {s.tablero}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
