import Link from 'next/link'
import { requireUser } from '@/lib/auth/helpers'
import { listUploads } from '@/lib/services/excel.service'
import { Upload, Plus, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CargasPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const user = await requireUser()
  const tenantId = user.tenantId!

  const uploads = await listUploads(empresaId, tenantId)

  return (
    <section className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Cargas Excel</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Historial de importaciones de movimientos
          </p>
        </div>
        <Link
          href={`/empresa/${empresaId}/cargas/nueva`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva carga
        </Link>
      </div>

      {uploads.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-xl">
            <Upload className="text-muted-foreground h-7 w-7" />
          </div>
          <div>
            <p className="text-foreground font-semibold">Sin cargas aún</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Importa tu primer archivo Excel para comenzar.
            </p>
          </div>
          <Link
            href={`/empresa/${empresaId}/cargas/nueva`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Subir archivo
          </Link>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b">
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Archivo
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Fecha
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wide uppercase">
                  Estado
                </th>
                <th className="text-muted-foreground px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase">
                  Importadas
                </th>
                <th className="text-muted-foreground px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase">
                  Duplicadas
                </th>
                <th className="text-muted-foreground px-4 py-3 text-center text-xs font-semibold tracking-wide uppercase">
                  Errores
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id} className="border-border hover:bg-muted/30 border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{u.filename}</td>
                  <td className="text-muted-foreground px-4 py-3 tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {u.estado === 'COMPLETADO' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" /> Completado
                      </span>
                    ) : u.estado === 'ERROR' ? (
                      <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                        <XCircle className="h-3 w-3" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" /> Procesando
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-green-600 tabular-nums">
                    {u.importedRows}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-500 tabular-nums">
                    {u.duplicateRows}
                  </td>
                  <td className="text-destructive px-4 py-3 text-center font-semibold tabular-nums">
                    {u.errorRows}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/empresa/${empresaId}/cargas/${u.id}`}
                      className={cn('text-primary text-xs font-medium hover:underline')}
                    >
                      Ver detalle →
                    </Link>
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
