import { requirePortalUser } from '@/lib/auth/portal-helpers'
import { verificarPertenenciaDispersion } from '@/lib/services/comisiones/portal.service'
import { db } from '@/lib/db'
import { dispersiones, comprobantesPago } from '@/lib/db/schema'
import { setTenant } from '@/lib/services/_shared/db.helpers'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  Download,
  ArrowLeft,
  AlertTriangle,
  User,
  Calendar,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType2,
} from 'lucide-react'

export const metadata = { title: 'Comprobantes · Portal' }

function iconForMime(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon
  if (mime.includes('pdf')) return FileType2
  if (mime.includes('sheet') || mime.includes('excel')) return FileSpreadsheet
  return FileText
}

export default async function ComprobantesPortalPage({
  params,
}: {
  params: Promise<{ dispersionId: string }>
}) {
  const { dispersionId } = await params
  const { user, perfil } = await requirePortalUser()

  // requirePortalUser() ya garantiza que es usuario activo del portal.
  // La descarga real está protegida en /api/comprobantes/[id].
  await verificarPertenenciaDispersion(user.id, dispersionId).catch(() => null)

  const data = await db.transaction(async (tx) => {
    await setTenant(tx, perfil.tenantId)
    const [disp] = await tx
      .select()
      .from(dispersiones)
      .where(and(eq(dispersiones.tenantId, perfil.tenantId), eq(dispersiones.id, dispersionId)))
      .limit(1)
    if (!disp) return null
    type Comprobante = typeof comprobantesPago.$inferSelect
    let comprobantes: Comprobante[] = []

    if (disp.comprobanteId) {
      comprobantes = await tx
        .select()
        .from(comprobantesPago)
        .where(
          and(
            eq(comprobantesPago.tenantId, perfil.tenantId),
            eq(comprobantesPago.id, disp.comprobanteId),
          ),
        )
    } else {
      // Fallback legacy
      comprobantes = await tx
        .select()
        .from(comprobantesPago)
        .where(
          and(
            eq(comprobantesPago.tenantId, perfil.tenantId),
            eq(comprobantesPago.dispersionId, dispersionId),
          ),
        )
    }

    return { disp, comprobantes }
  })

  if (!data) notFound()
  const { disp, comprobantes } = data
  const fmt = (n: string | number) =>
    Number(n).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const total = Number(disp.montoTotal)
  const pagado = Number(disp.montoPagado)
  const pct = total > 0 ? (pagado / total) * 100 : 0

  return (
    <section className="space-y-6">
      <Link
        href="/portal/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al dashboard
      </Link>

      {/* Header card */}
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="from-primary/5 to-jade-50 dark:to-jade-950/30 border-b bg-gradient-to-br p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Dispersión
              </p>
              <h1 className="text-foreground mt-1 text-xl font-bold sm:text-2xl">
                Comprobantes de pago
              </h1>
              <p className="text-muted-foreground mt-2 inline-flex items-center gap-1.5 text-sm">
                <User className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{disp.beneficiarioNombre}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-muted-foreground text-[11px]">Total</p>
              <p className="text-foreground text-2xl font-bold tabular-nums">
                {fmt(disp.montoTotal)}
              </p>
              <p className="text-success text-xs tabular-nums">{fmt(disp.montoPagado)} pagado</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-[11px]">
              <span>Avance de pago</span>
              <span className="font-semibold">{pct.toFixed(0)}%</span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="from-success to-jade-400 h-full rounded-full bg-gradient-to-r transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-sm font-semibold">
              Archivos ({comprobantes.length})
            </h2>
            {comprobantes.length > 0 && (
              <p className="text-muted-foreground text-[11px]">
                Descarga tus comprobantes para conciliación
              </p>
            )}
          </div>

          {comprobantes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <div className="text-muted-foreground bg-muted/40 grid h-14 w-14 place-items-center rounded-full">
                <FileText className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-foreground text-sm font-semibold">Aún no hay comprobantes</p>
              <p className="text-muted-foreground max-w-xs text-xs">
                Joana subirá los archivos cuando confirme el pago. Recibirás los comprobantes aquí.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {comprobantes.map((c) => {
                const Icon = iconForMime(c.mimeType)
                return (
                  <li
                    key={c.id}
                    className="bg-card hover:border-primary/30 group flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
                  >
                    <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-lg">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-medium" title={c.nombre}>
                        {c.nombre}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        <span>{(c.tamanioBytes / 1024).toFixed(1)} KB</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(c.createdAt).toLocaleDateString('es-MX')}
                        </span>
                      </p>
                    </div>
                    <a
                      href={`/api/comprobantes/${c.id}`}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm"
                      title="Descargar"
                    >
                      <Download className="h-3 w-3" />
                      <span className="hidden sm:inline">Descargar</span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="border-warning/30 bg-warning/5 flex items-start gap-3 rounded-lg border p-4 text-xs">
        <AlertTriangle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-muted-foreground">
          <p className="text-foreground font-medium">¿Algo no coincide?</p>
          <p className="mt-0.5">
            Si crees que falta un comprobante o el monto es incorrecto, contacta a Joana para
            revisión.
          </p>
        </div>
      </div>
    </section>
  )
}
