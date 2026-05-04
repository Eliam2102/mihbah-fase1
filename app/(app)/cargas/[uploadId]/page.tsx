import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/helpers'
import { getUploadById, getUploadSummaries } from '@/lib/services/excel.service'
import { db } from '@/lib/db'
import { movimientos, empresas } from '@/lib/db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { CheckCircle, AlertCircle, XCircle, ArrowLeft, Building2 } from 'lucide-react'

export default async function DetalleCargaGlobalPage({
  params,
}: {
  params: Promise<{ uploadId: string }>
}) {
  const { uploadId } = await params
  const user = await requireUser()
  const tenantId = user.tenantId!

  const upload = await getUploadById(uploadId, tenantId)
  if (!upload) notFound()

  // Per-empresa summaries (for maestro uploads)
  const summaries = await getUploadSummaries(uploadId, tenantId)

  // Fetch all movimientos linked to this upload (across all empresas)
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    return tx
      .select({
        id: movimientos.id,
        fecha: movimientos.fecha,
        tipo: movimientos.tipo,
        monto: movimientos.monto,
        concepto: movimientos.concepto,
        nombre: movimientos.nombre,
        comentarios: movimientos.comentarios,
        empresaId: movimientos.empresaId,
      })
      .from(movimientos)
      .where(eq(movimientos.uploadId, uploadId))
      .orderBy(movimientos.fecha)
  })

  // Build empresa name lookup
  const empresaIds = [...new Set(rows.map((r) => r.empresaId))]
  const empresasList =
    empresaIds.length > 0
      ? await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
          return tx
            .select({ id: empresas.id, name: empresas.name })
            .from(empresas)
            .where(inArray(empresas.id, empresaIds))
        })
      : []
  const empresaMap = new Map(empresasList.map((e) => [e.id, e.name]))

  return (
    <section className="p-6">
      <div className="mb-6">
        <Link
          href="/cargas"
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al historial
        </Link>
        <h1 className="text-foreground text-2xl font-bold">{upload.filename}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {new Date(upload.createdAt).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Status */}
      <div className="mb-6">
        {upload.estado === 'COMPLETADO' ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" /> Carga completada exitosamente
          </div>
        ) : upload.estado === 'ERROR' ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium">
            <XCircle className="h-4 w-4" /> {upload.errorMessage ?? 'Error durante la importación'}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> Procesando…
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total filas', value: upload.totalRows, color: 'text-foreground' },
          { label: 'Importadas', value: upload.importedRows, color: 'text-green-600' },
          { label: 'Duplicadas', value: upload.duplicateRows, color: 'text-amber-500' },
          { label: 'Omitidas', value: upload.omittedRows ?? '0', color: 'text-blue-500' },
          { label: 'Errores', value: upload.errorRows, color: 'text-destructive' },
        ].map((s) => (
          <div key={s.label} className="border-border bg-card rounded-xl border p-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-empresa breakdown (maestro uploads) */}
      {summaries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5" /> Desglose por empresa
          </h2>
          <div className="border-border bg-card overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border bg-muted/50 border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                    Empresa
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-green-600 uppercase">
                    Importadas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-amber-500 uppercase">
                    Duplicadas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold tracking-wide text-blue-500 uppercase">
                    Omitidas
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.id} className="border-border border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{s.empresaNombre}</td>
                    <td className="px-4 py-3 text-center font-semibold text-green-600 tabular-nums">
                      {s.filasImportadas}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-500 tabular-nums">
                      {s.filasOmitidas}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-500 tabular-nums">
                      {s.filasOmitidas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movimientos table */}
      <h2 className="text-foreground mb-3 text-lg font-semibold">
        Movimientos importados ({rows.length})
      </h2>

      {rows.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
          No hay movimientos vinculados a esta carga.
        </p>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Empresa', 'Fecha', 'Tipo', 'Monto', 'Concepto', 'Nombre', 'Comentarios'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-border hover:bg-muted/30 border-b last:border-0">
                  <td className="text-muted-foreground px-4 py-2.5 text-xs font-medium">
                    {empresaMap.get(m.empresaId) ?? '—'}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                    {new Date(m.fecha).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                      {m.tipo}
                    </span>
                  </td>
                  <td className="text-foreground px-4 py-2.5 font-medium tabular-nums">
                    {Number(m.monto).toLocaleString('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                    })}
                  </td>
                  <td className="text-foreground max-w-xs truncate px-4 py-2.5">{m.concepto}</td>
                  <td className="text-muted-foreground px-4 py-2.5">{m.nombre ?? '—'}</td>
                  <td className="text-muted-foreground max-w-xs truncate px-4 py-2.5">
                    {m.comentarios ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
