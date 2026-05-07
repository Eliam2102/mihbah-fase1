import { requireUser } from '@/lib/auth/helpers'
import { getEmpresasForUser } from '@/lib/services/empresas'
import { TrendingUp, FolderOpen, Receipt, BarChart3, ChevronRight, Building2 } from 'lucide-react'
import Link from 'next/link'

interface ReportDef {
  tipo: string
  titulo: string
  descripcion: string
  icon: React.ComponentType<{ className?: string }>
}

const REPORTS_EXCEL: ReportDef[] = [
  {
    tipo: 'flujo',
    titulo: 'Flujo de Caja',
    descripcion: 'Reporte mensual de ingresos y egresos del año. Exportable a PDF.',
    icon: BarChart3,
  },
  {
    tipo: 'proyectos',
    titulo: 'Proyectos',
    descripcion: 'Resumen financiero por proyecto: ingresos, egresos y avance.',
    icon: FolderOpen,
  },
  {
    tipo: 'cuentas',
    titulo: 'Cuentas Pendientes',
    descripcion: 'CXC y CXP con antigüedad de saldos y estado de cobro/pago.',
    icon: Receipt,
  },
  {
    tipo: 'movimientos',
    titulo: 'Movimientos Detallados',
    descripcion: 'Listado completo de movimientos importados desde Excel.',
    icon: TrendingUp,
  },
]

const REPORTS_BMCORP: ReportDef[] = [
  {
    tipo: 'ventas',
    titulo: 'Reporte de Ventas',
    descripcion: 'Listado completo de ventas sincronizadas desde Monday.com.',
    icon: TrendingUp,
  },
  {
    tipo: 'comisiones',
    titulo: 'Comisiones',
    descripcion: 'Comisiones por asesor y reparto por alianza.',
    icon: Receipt,
  },
  {
    tipo: 'flujo',
    titulo: 'Flujo Semanal',
    descripcion: 'Histórico de ingresos y egresos agrupado por semana.',
    icon: BarChart3,
  },
]

export default async function ReportesConsolidadoPage() {
  const user = await requireUser()
  const tenantId = user.tenantId!

  const allEmpresas = await getEmpresasForUser(user.id, tenantId)

  return (
    <section className="space-y-8 p-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Selecciona la empresa y el reporte que deseas consultar o exportar.
        </p>
      </div>

      {allEmpresas.map((empresa) => {
        const reports = empresa.tipo === 'COMERCIAL' ? REPORTS_BMCORP : REPORTS_EXCEL
        const anio = new Date().getFullYear()

        return (
          <div key={empresa.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="text-muted-foreground h-4 w-4" />
              <h2 className="text-foreground font-semibold">{empresa.name}</h2>
              <span className="text-muted-foreground text-xs">
                · {empresa.tipo === 'COMERCIAL' ? 'Datos de Monday.com' : 'Datos de Excel'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reports.map((r) => {
                const Icon = r.icon
                return (
                  <div
                    key={r.tipo}
                    className="border-border bg-card hover:border-primary/50 group flex flex-col rounded-xl border shadow-sm transition-colors"
                  >
                    <div className="flex-1 p-5">
                      <div className="mb-4 flex items-start justify-between">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                          <Icon className="text-primary h-5 w-5" />
                        </div>
                        {empresa.tipo !== 'COMERCIAL' && r.tipo === 'flujo' && (
                          <a
                            href={`/empresa/${empresa.id}/reportes/${r.tipo}/pdf?anio=${anio}`}
                            download
                            className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs font-medium transition-colors"
                            title="Descargar PDF"
                          >
                            PDF ↓
                          </a>
                        )}
                      </div>
                      <h3 className="text-foreground mb-1 font-semibold">{r.titulo}</h3>
                      <p className="text-muted-foreground text-sm">{r.descripcion}</p>
                    </div>
                    <div className="border-border border-t px-5 py-3">
                      <Link
                        href={`/empresa/${empresa.id}/reportes/${r.tipo}`}
                        className="text-primary group-hover:text-primary/80 flex items-center gap-1.5 text-sm font-medium transition-colors"
                      >
                        Ver reporte <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
