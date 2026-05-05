import { requireUser } from '@/lib/auth/helpers'
import { getProyectosBmcorp } from '@/lib/services/proyectos-bmcorp.service'
import { Building2, TrendingUp, CheckCircle, Clock } from 'lucide-react'

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  })
}

export default async function ProyectosPage({
  params,
}: {
  params: Promise<{ empresaId: string }>
}) {
  const { empresaId } = await params
  const user = await requireUser()
  const tenantId = user.tenantId

  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }

  const proyectos = await getProyectosBmcorp(empresaId, tenantId)

  return (
    <section className="p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Proyectos (Desarrollos)</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rendimiento y ventas por cada desarrollo inmobiliario comercializado.
          </p>
        </div>
      </div>

      {proyectos.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border p-12 text-center">
          <Building2 className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
          <h3 className="text-foreground text-lg font-medium">Sin desarrollos registrados</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Aún no hay ventas asignadas a desarrollos en la base de datos sincronizada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => (
            <div
              key={p.id}
              className="border-border bg-card hover:border-primary/50 group flex flex-col rounded-xl border shadow-sm transition-colors"
            >
              {/* Header Card */}
              <div className="border-border border-b p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-foreground font-semibold">{p.nombre}</h3>
                    <p className="text-muted-foreground text-xs tracking-wider uppercase">
                      {p.desarrolladora || 'Sin desarrolladora'}
                    </p>
                  </div>
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Building2 className="text-primary h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Body Card */}
              <div className="flex-1 p-5">
                <div className="mb-4">
                  <p className="text-muted-foreground text-xs font-medium">Volumen Total Vendido</p>
                  <p className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
                    {formatMXN(p.montoTotal)}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{formatMXN(p.comisionesTotal)} comisiones</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-foreground font-semibold tabular-nums">
                        {p.ventasProceso}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">En Proceso</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-foreground font-semibold tabular-nums">
                        {p.ventasFinalizadas}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">Finalizadas</p>
                  </div>
                </div>
              </div>

              {/* Footer Card */}
              <div className="bg-muted/30 border-border rounded-b-xl border-t px-5 py-3">
                <div className="flex w-full items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Total de ventas</span>
                  <span className="text-foreground bg-background border-border rounded-full border px-2.5 py-0.5">
                    {p.ventasTotal} operacion{p.ventasTotal === 1 ? '' : 'es'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
