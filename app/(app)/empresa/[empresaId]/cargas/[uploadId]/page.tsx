import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/helpers'
import { requireEmpresaAccess } from '@/lib/auth/empresa-guards'
import { getUploadById } from '@/lib/services/excel.service'
import { db } from '@/lib/db'
import { movimientos } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { CheckCircle, AlertCircle, XCircle, ArrowLeft } from 'lucide-react'

export default async function DetalleCargaPage({
  params,
}: {
  params: Promise<{ empresaId: string; uploadId: string }>
}) {
  const { empresaId, uploadId } = await params
  const user = await requireUser()
  await requireEmpresaAccess(user, empresaId, 'cargas')
  const tenantId = user.tenantId!

  const upload = await getUploadById(uploadId, tenantId)
  if (!upload) notFound()

  // Fetch movimientos linked to this upload
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`)
    return tx
      .select()
      .from(movimientos)
      .where(and(eq(movimientos.uploadId, uploadId), eq(movimientos.empresaId, empresaId)))
      .orderBy(movimientos.fecha)
  })

  return (
    <section className="p-4 sm:p-6">
      <div className="mb-6">
        <Link
          href={`/empresa/${empresaId}/cargas`}
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

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: upload.totalRows, color: 'text-foreground' },
          { label: 'Importadas', value: upload.importedRows, color: 'text-green-600' },
          { label: 'Duplicadas', value: upload.duplicateRows, color: 'text-amber-500' },
          { label: 'Errores', value: upload.errorRows, color: 'text-destructive' },
        ].map((s) => (
          <div key={s.label} className="border-border bg-card rounded-xl border p-4">
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{s.label}</p>
          </div>
        ))}
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

      {/* Movimientos table */}
      <h2 className="text-foreground mb-3 text-lg font-semibold">
        Movimientos importados ({rows.length})
      </h2>

      {rows.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-xl border p-8 text-center text-sm">
          No hay movimientos vinculados a esta carga.
        </p>
      ) : (
        <div className="border-border bg-card overflow-hidden overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                {['Fecha', 'Tipo', 'Monto', 'Concepto', 'Nombre', 'Comentarios'].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-border hover:bg-muted/30 border-b last:border-0">
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
